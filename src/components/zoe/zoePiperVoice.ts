/**
 * Voz propia de ZOE: Piper con la voz «es_MX-claude-high» (licencia Apache 2.0), ejecutada en el
 * navegador con ONNX. Es la variante «tierna» que eligió el equipo
 * (`muestras-voz-zoe/zoe-mexico-claude-tierna.wav`): tres semitonos más aguda y al mismo ritmo.
 *
 * Para subir el tono sin acelerar, el modelo habla un poco más lento (su `length_scale` sube en la
 * misma proporción) y el audio se reproduce más rápido.
 *
 * El motor es propio: la sesión de `@mintplex-labs/piper-tts-web` vuelve a crear el fonetizador
 * (espeak-ng) en cada frase, unos 2 s de espera cada vez; aquí se crea una sola vez. De esa librería
 * solo se usa el fonetizador compilado (alias `piper-phonemize` en vite.config.ts), y el modelo se
 * guarda donde ella lo guarda.
 *
 * El modelo pesa 63 MB: se descarga una vez, cuando el navegador está desocupado, y queda guardado.
 * Mientras tanto, o si algo falla, ZOE habla con la voz del sistema.
 */
const VOICE_FILE = 'es_MX-claude-high.onnx';
const MODEL_URL = `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/es/es_MX/claude/high/${VOICE_FILE}`;
const ONNX_WASM = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
const PHONEMIZER_WASM = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
/** Tres semitonos más aguda: la muestra «tierna». */
export const TENDER_RATE = 2 ** (3 / 12);
/** Ritmo final de la muestra: un 5 % más pausado que la voz original. */
const PACE = 0.95;
/** Marca de la configuración ajustada: si cambia el ajuste, se rehace. */
const TUNING = 'tierna-v1';

interface VoiceConfig {
  zoe?: string;
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  speaker_id_map?: Record<string, number>;
}

interface Engine {
  sampleRate: number;
  /** Fonemas de cada oración del texto. */
  phonemize(text: string): number[][];
  speak(ids: number[]): Promise<Float32Array>;
}

let engine: Promise<Engine> | null = null;
let ready = false;
let failed = false;
let audio: AudioContext | null = null;
/** El modelo atiende una frase a la vez. */
let queue: Promise<unknown> = Promise.resolve();

const context = () => (audio ??= new AudioContext());

export const isZoeVoiceReady = () => ready;

/** Con datos ahorrados, conexión lenta o sin dónde guardar el modelo, ZOE usa la voz del sistema. */
function supported(): boolean {
  if (typeof window === 'undefined' || !('AudioContext' in window) || !('WebAssembly' in window) || !navigator.storage?.getDirectory) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !/2g|3g/.test(connection?.effectiveType ?? '');
}

/** Desbloquea el audio dentro de un gesto de la persona: el navegador lo exige para sonar. */
export function unlockZoeAudio(): void {
  try {
    void context().resume();
  } catch {
    /* Sin Web Audio queda la voz del sistema. */
  }
}

// ── Almacenamiento del navegador (OPFS), en la misma carpeta que usa la librería ──

const storage = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('piper', { create: true });

async function readStored(name: string): Promise<File | undefined> {
  try {
    return await (await (await storage()).getFileHandle(name)).getFile();
  } catch {
    return undefined;
  }
}

async function writeStored(name: string, data: Blob): Promise<void> {
  try {
    const writable = await (await (await storage()).getFileHandle(name, { create: true })).createWritable();
    await writable.write(data);
    await writable.close();
  } catch (e) {
    // Sin guardar, la próxima visita la vuelve a descargar.
    console.warn('[ZOE] No se pudo guardar la voz en el navegador:', e);
  }
}

async function download(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.split('/').at(-1)} no disponible (${response.status}).`);
  return response.blob();
}

/** Configuración del modelo con el ritmo y la expresividad de la muestra. */
async function loadConfig(): Promise<VoiceConfig> {
  const name = `${VOICE_FILE}.json`;
  try {
    const saved = JSON.parse((await (await readStored(name))?.text()) ?? '') as VoiceConfig;
    if (saved.zoe === TUNING) return saved;
  } catch {
    /* Aún no está guardada, o es la original. */
  }
  const config = JSON.parse(await (await download(`${MODEL_URL}.json`)).text()) as VoiceConfig;
  config.zoe = TUNING;
  config.inference = { length_scale: (config.inference?.length_scale ?? 1) * PACE * TENDER_RATE, noise_scale: 0.7, noise_w: 0.9 };
  await writeStored(name, new Blob([JSON.stringify(config)], { type: 'application/json' }));
  return config;
}

/** Un modelo de menos de 1 MB es una descarga rota: se vuelve a bajar. */
const isWholeModel = (file?: File) => !!file && file.size > 1_000_000;

async function loadModel(): Promise<ArrayBuffer> {
  const saved = await readStored(VOICE_FILE);
  if (isWholeModel(saved)) return saved!.arrayBuffer();
  const blob = await download(MODEL_URL);
  await writeStored(VOICE_FILE, blob);
  return blob.arrayBuffer();
}

async function createEngine(): Promise<Engine> {
  const [ort, { createPiperPhonemize }, config, model] = await Promise.all([
    import('onnxruntime-web/wasm'),
    import('piper-phonemize'),
    loadConfig(),
    loadModel(),
  ]);
  ort.env.wasm.wasmPaths = ONNX_WASM;
  // Varios hilos solo existen con aislamiento de origen; sin él, uno.
  ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency) : 1;
  const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
  const lines: string[] = [];
  const phonemizer = await createPiperPhonemize({
    print: (line) => lines.push(line),
    printErr: (message) => console.warn('[ZOE] Fonetizador:', message),
    locateFile: (file) => (file.endsWith('.wasm') ? `${PHONEMIZER_WASM}.wasm` : file.endsWith('.data') ? `${PHONEMIZER_WASM}.data` : file),
  });
  const { noise_scale, length_scale, noise_w } = config.inference;
  const multiSpeaker = Object.keys(config.speaker_id_map ?? {}).length > 0;
  const created: Engine = {
    sampleRate: config.audio.sample_rate,
    phonemize(text) {
      lines.length = 0;
      phonemizer.callMain(['-l', config.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
      return lines.map((line) => (JSON.parse(line) as { phoneme_ids: number[] }).phoneme_ids).filter((ids) => ids.length);
    },
    async speak(ids) {
      const feeds: Record<string, InstanceType<typeof ort.Tensor>> = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([noise_scale, length_scale, noise_w]), [3]),
      };
      if (multiSpeaker) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
      const { output } = await session.run(feeds);
      return output.data as Float32Array;
    },
  };
  // La primera inferencia reserva memoria y es la más lenta: mejor ahora que en el primer saludo.
  await created.speak(created.phonemize('Hola.')[0]);
  return created;
}

/** Carga la voz (descargándola la primera vez). Devuelve null si ya se sabe que no funciona aquí. */
export function prepareZoeVoice(): Promise<Engine> | null {
  if (failed || !supported()) return null;
  engine ??= createEngine().then(
    (created) => {
      ready = true;
      return created;
    },
    (e) => {
      failed = true;
      engine = null;
      console.warn('[ZOE] La voz propia no está disponible; se usa la del sistema:', e);
      throw e;
    },
  );
  return engine;
}

/**
 * Deja la voz lista antes de la primera frase. Si ya está guardada se carga enseguida; si no, se
 * descarga cuando el navegador está desocupado, para no competir con la carga de la página.
 */
export function warmZoeVoice(): void {
  if (failed || !supported()) return;
  const load = () => void prepareZoeVoice()?.catch(() => undefined);
  void readStored(VOICE_FILE).then((saved) => {
    if (isWholeModel(saved)) load();
    else if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 8000 });
    else window.setTimeout(load, 3000);
  });
}

/** Lo que no se pronuncia: marcas de formato y emojis. */
const forVoice = (text: string) => text.replace(/[*_#`~>|]+/g, ' ').replace(/\p{Extended_Pictographic}/gu, '').trim();

/** Convierte una frase en audio con la voz de ZOE. */
export async function synthesizeZoe(text: string): Promise<AudioBuffer> {
  const loading = prepareZoeVoice();
  if (!loading) throw new Error('Voz propia no disponible.');
  const voice = await loading;
  const turn = queue.then(async () => {
    const pieces: Float32Array[] = [];
    for (const ids of voice.phonemize(forVoice(text))) pieces.push(await voice.speak(ids));
    return pieces;
  });
  queue = turn.catch(() => undefined);
  const pieces = await turn;
  const length = pieces.reduce((sum, piece) => sum + piece.length, 0);
  if (!length) throw new Error('Frase sin sonido.');
  const buffer = context().createBuffer(1, length, voice.sampleRate);
  const channel = buffer.getChannelData(0);
  let offset = 0;
  for (const piece of pieces) {
    channel.set(piece, offset);
    offset += piece.length;
  }
  return buffer;
}

/** Reproduce el audio tres semitonos más agudo; devuelve con qué detenerlo. */
export function playZoe(buffer: AudioBuffer, onEnded: () => void): () => void {
  const ctx = context();
  void ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = TENDER_RATE;
  source.connect(ctx.destination);
  source.onended = onEnded;
  source.start();
  return () => {
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* Ya había terminado. */
    }
  };
}
