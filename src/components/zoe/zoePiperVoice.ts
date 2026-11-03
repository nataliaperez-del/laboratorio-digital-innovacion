/**
 * Voz propia de ZOE: Piper con la voz «es_MX-claude-high» (licencia Apache 2.0), ejecutada en el
 * navegador con ONNX. Es la variante «tierna» que eligió el equipo
 * (`muestras-voz-zoe/zoe-mexico-claude-tierna.wav`, tres semitonos más aguda), llevada un 50 % más
 * allá a pedido de la usuaria: cuatro semitonos y medio, masculina y fluida
 * (`muestras-voz-zoe/zoe-tierna-masculina-fluida.wav`).
 *
 * Para subir el tono sin acelerar, el modelo habla un poco más lento (su `length_scale` sube en la
 * misma proporción) y el audio se reproduce más rápido. Ese cambio de tono también aclara el timbre:
 * la salida le devuelve cuerpo en los graves y suaviza los agudos para que siga sonando masculina.
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
/** Cuatro semitonos y medio más aguda: un 50 % más tierna que la muestra elegida (3 semitonos). */
export const TENDER_RATE = 2 ** (4.5 / 12);
/** Ritmo final de la muestra: un 5 % más pausado que la voz original. */
const PACE = 0.95;
/** Marca de la configuración ajustada: si cambia el ajuste, se rehace. */
const TUNING = 'tierna-v2';

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
  // noise_w 0,8: duraciones más parejas entre sílabas, un hablar más fluido.
  config.inference = { length_scale: (config.inference?.length_scale ?? 1) * PACE * TENDER_RATE, noise_scale: 0.7, noise_w: 0.8 };
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

// ── Que suene natural: el texto que se le da al modelo y cómo se unen las frases ──
// espeak ya lee bien «ZOE», «IA» (i-a), «UNAD», «VIEM» y deletrea «TRL» o «MDVT». Lo que sonaba
// robótico era otra cosa: frases pegadas sin respirar, oraciones partidas a mitad de idea,
// los silencios y clics propios de cada frase y abreviaturas que cortaban la oración.

/** Abreviaturas tras las que un punto no cierra la oración («No.» solo antes de un número: «claro que no.» sí cierra). */
const ABBREVIATIONS = new Set([
  'sr',
  'sra',
  'srta',
  'dr',
  'dra',
  'lic',
  'ing',
  'prof',
  'aprox',
  'núm',
  'num',
  'pág',
  'pag',
  'ej',
  'ud',
  'uds',
  'vs',
  'cap',
  'art',
  'av',
  'tel',
]);
/** espeak lee estas abreviaturas como fin de oración: se escriben completas. */
const EXPANSIONS: Record<string, string> = {
  sr: 'señor',
  sra: 'señora',
  srta: 'señorita',
  dr: 'doctor',
  dra: 'doctora',
  aprox: 'aproximadamente',
  núm: 'número',
  pág: 'página',
};
/** Una oración más larga que esto se parte por su «;» o su «,» más central. */
const MAX_SENTENCE_CHARS = 400;
/** La primera parte se dice corta: es la que hace esperar mientras se genera. */
const QUICK_START_CHARS = 100;

/** El texto como se debe pronunciar: sin formato ni emojis, sin abreviaturas que corten y con pausas donde hay puntos suspensivos. */
export function speechText(text: string): string {
  return (
    text
      .replace(/[*_#`~>|]+/g, ' ')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/innova\s?hub\s?360/gi, 'Innova Jab tres sesenta')
      .replace(/\by\/o\b/gi, 'y o')
      .replace(/\b(Sr|Sra|Srta|Dr|Dra|aprox|Aprox|Núm|núm|Pág|pág)\.\s?/g, (_, word: string) => `${EXPANSIONS[word.toLowerCase()]} `)
      .replace(/\bNo\.\s?(?=\d)/g, 'número ')
      // Puntos suspensivos: en medio, una pausa breve (espeak pegaba las palabras); al final, un punto.
      .replace(/(\.\.\.|…)\s*$/, '.')
      .replace(/(\.\.\.|…)(?=\s*\S)/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/** Parte una oración demasiado larga por el «;» o la «,» más cercana a su mitad. */
function splitVeryLong(sentence: string): string[] {
  if (sentence.length <= MAX_SENTENCE_CHARS) return [sentence];
  const middle = sentence.length / 2;
  let best = -1;
  for (const match of sentence.matchAll(/[;,]\s/g)) {
    if (best < 0 || Math.abs(match.index! - middle) < Math.abs(best - middle)) best = match.index!;
  }
  if (best < 0) return [sentence];
  return [...splitVeryLong(sentence.slice(0, best + 1).trim()), ...splitVeryLong(sentence.slice(best + 1).trim())];
}

/**
 * Oraciones para la voz propia. A diferencia de `splitSentences` (para la voz del sistema, que
 * corta las locuciones largas), solo parte donde termina una idea: no en «p. ej.», «Sr.»,
 * iniciales ni decimales, y deja enteras las oraciones largas salvo que pasen de 400 caracteres.
 */
export function speechSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const boundary = /[.!?…]+["»”')\]]*\s+(?=[¿¡«"“(]?[\p{Lu}\d])|\n+/gu;
  for (const match of text.matchAll(boundary)) {
    const before = text.slice(start, match.index);
    if (match[0].startsWith('.') && !match[0].startsWith('..')) {
      const word = (/(\S+)$/.exec(before)?.[1] ?? '').replace(/^[(«"“¿¡]+/, '').toLowerCase();
      const numberAfter = /\d/.test(text[match.index! + match[0].length] ?? '');
      if (ABBREVIATIONS.has(word) || /^\p{L}$/u.test(word) || (word === 'no' && numberAfter)) continue;
    }
    out.push((before + match[0]).trim());
    start = match.index! + match[0].length;
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean).flatMap(splitVeryLong);
}

/** Si la primera oración es larga, se dice primero hasta su primera coma: así ZOE empieza a hablar antes. */
export function withQuickStart(parts: string[]): string[] {
  const [first, ...rest] = parts;
  if (!first || first.length <= QUICK_START_CHARS) return parts;
  const comma = first.indexOf(', ', 40);
  if (comma < 0 || comma > first.length - 30) return parts;
  return [first.slice(0, comma + 1), first.slice(comma + 2), ...rest];
}

/** Respiro después de una parte, según cómo termina; con algo de variación, como al hablar. */
export function pauseAfter(part: string, random: () => number = Math.random): number {
  const end = part.trim().replace(/["»”')\]]+$/, '');
  const base = /(\.\.\.|…)$/.test(end) ? 450 : /[?!]$/.test(end) ? 330 : /\.$/.test(end) ? 280 : /[;:]$/.test(end) ? 230 : /,$/.test(end) ? 130 : 200;
  return Math.round(base + (random() - 0.5) * 60);
}

/** Pico al que se lleva cada frase: todas con el mismo volumen. */
const TARGET_PEAK = 0.9;

/**
 * Deja una frase lista para unirla con otras: recorta el silencio que el modelo pone al inicio y
 * al final (las pausas las decide `pauseAfter`), iguala el volumen y suaviza los bordes para que no
 * suenen clics.
 */
export function shapeSentence(pcm: Float32Array, sampleRate: number): Float32Array {
  let peak = 0;
  for (const value of pcm) peak = Math.max(peak, Math.abs(value));
  if (peak < 1e-4) return new Float32Array(0);
  const floor = Math.max(0.003, peak * 0.015);
  let first = 0;
  while (first < pcm.length && Math.abs(pcm[first]) < floor) first++;
  let last = pcm.length - 1;
  while (last > first && Math.abs(pcm[last]) < floor) last--;
  const from = Math.max(0, first - Math.round(0.03 * sampleRate));
  const to = Math.min(pcm.length, last + 1 + Math.round(0.06 * sampleRate));
  const out = pcm.slice(from, to);
  const gain = Math.min(3, TARGET_PEAK / peak);
  const fadeIn = Math.max(1, Math.round(0.008 * sampleRate));
  const fadeOut = Math.max(1, Math.round(0.025 * sampleRate));
  for (let i = 0; i < out.length; i++) {
    const tail = out.length - 1 - i;
    out[i] *= gain * Math.min(1, i / fadeIn, tail / fadeOut);
  }
  return out;
}

/** Respiro entre oraciones de una misma parte (el mismo de Piper). */
const SENTENCE_SILENCE_S = 0.2;

/** Convierte una frase en audio con la voz de ZOE. */
export async function synthesizeZoe(text: string): Promise<AudioBuffer> {
  const loading = prepareZoeVoice();
  if (!loading) throw new Error('Voz propia no disponible.');
  const voice = await loading;
  const turn = queue.then(async () => {
    const pieces: Float32Array[] = [];
    for (const ids of voice.phonemize(speechText(text))) {
      const piece = shapeSentence(await voice.speak(ids), voice.sampleRate);
      if (piece.length) pieces.push(piece);
    }
    return pieces;
  });
  queue = turn.catch(() => undefined);
  const pieces = await turn;
  // El audio suena acelerado (TENDER_RATE): el silencio se alarga en la misma proporción.
  const gap = Math.round(SENTENCE_SILENCE_S * voice.sampleRate * TENDER_RATE);
  const length = pieces.reduce((sum, piece) => sum + piece.length, 0) + gap * Math.max(0, pieces.length - 1);
  if (!length) throw new Error('Frase sin sonido.');
  const buffer = context().createBuffer(1, length, voice.sampleRate);
  const channel = buffer.getChannelData(0);
  let offset = 0;
  for (const piece of pieces) {
    channel.set(piece, offset);
    offset += piece.length + gap;
  }
  return buffer;
}

let output: AudioNode | null = null;

/**
 * Salida de la voz: más cuerpo en los graves y agudos más suaves (el cambio de tono aclara el
 * timbre y lo vuelve estridente; así sigue sonando masculina), y un compresor suave que iguala lo
 * fuerte y lo débil.
 */
function voiceOutput(ctx: AudioContext): AudioNode {
  if (output?.context === ctx) return output;
  const body = ctx.createBiquadFilter();
  body.type = 'lowshelf';
  body.frequency.value = 220;
  body.gain.value = 2;
  const soften = ctx.createBiquadFilter();
  soften.type = 'highshelf';
  soften.frequency.value = 4500;
  soften.gain.value = -4.5;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  body.connect(soften).connect(compressor).connect(ctx.destination);
  output = body;
  return output;
}

/** Reproduce el audio con el tono de ZOE (TENDER_RATE); devuelve con qué detenerlo. */
export function playZoe(buffer: AudioBuffer, onEnded: () => void): () => void {
  const ctx = context();
  void ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = TENDER_RATE;
  source.connect(voiceOutput(ctx));
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
