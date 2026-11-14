import { useCallback, useEffect, useRef, useState } from 'react';
import { createNoiseDetector, NOISY_LEVEL } from '@/lib/zoeNoise';
import { BARGE_IN_EXTRA_DB, createNoiseGate, isNoisyRoom, isSensitivity, type GateReading, type Sensitivity } from '@/lib/zoeGate';
import { seemsUnfinished } from '@/lib/zoeContext';
import { addressedText, CROWD_EXTRA_DB, heardNearVoice, joinRecognized, VOICE_BAND_HZ } from '@/lib/zoeCrowd';
import { playBark, splitBarks } from '@/lib/zoeBark';
import { playRecorded } from '@/lib/zoeRecorded';
import {
  isZoeVoiceReady,
  isZoeVoiceUnavailable,
  pauseAfter,
  playZoe,
  speechSentences,
  synthesizeZoe,
  unlockZoeAudio,
  waitForZoeVoice,
  warmZoeVoice,
  withQuickStart,
} from './zoePiperVoice';

/** Voz latina masculina si existe; si no, cualquier voz en español. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const latin = (v: SpeechSynthesisVoice) => /^es-(419|MX|CO|US|AR|CL|PE|VE)/i.test(v.lang);
  const male = (v: SpeechSynthesisVoice) => /raul|jorge|diego|carlos|alonso|gonzalo|male|natural/i.test(v.name);
  return voices.find((v) => latin(v) && male(v)) || voices.find(latin) || voices.find((v) => v.lang.toLowerCase().startsWith('es'));
}

/** Una locución más larga que esto puede pasar de 15 segundos, y Chrome la corta a la mitad (solo para la voz del sistema). */
const MAX_UTTERANCE_CHARS = 180;

/** Corta un tramo largo por sus comas y, si aún sobra, por palabras. */
function splitLong(sentence: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const word of sentence.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    // Se prefiere cortar justo después de una coma; si no hay, al llegar al límite.
    if (candidate.length > MAX_UTTERANCE_CHARS && current) {
      const comma = current.lastIndexOf(', ');
      if (comma > MAX_UTTERANCE_CHARS * 0.4) {
        parts.push(current.slice(0, comma + 1));
        current = `${current.slice(comma + 2)} ${word}`;
      } else {
        parts.push(current);
        current = word;
      }
    } else current = candidate;
  }
  if (current) parts.push(current);
  return parts;
}

/** Frases por separado, y las muy largas partidas: así ninguna respuesta queda a medias. */
export function splitSentences(text: string): string[] {
  const sentences = (text.match(/[^.!?¡¿…\n]*[¡¿]?[^.!?…\n]+[.!?…]*\s*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  return sentences.flatMap((sentence) => (sentence.length <= MAX_UTTERANCE_CHARS ? [sentence] : splitLong(sentence)));
}

/** Por qué ZOE no pudo escuchar: permiso, micrófono, HTTPS, red, silencio u otro error. */
export type ZoeListenFailure = 'sin-permiso' | 'sin-microfono' | 'mic-mudo' | 'sin-https' | 'sin-red' | 'sin-voz' | 'ruido' | 'error';

/** Espera a que la persona empiece a hablar; el reconocedor solo aguanta unos segundos y se reabre. */
const LISTEN_WINDOW_MS = 12000;
/** Silencio que da por terminada la frase: permite pausar a media oración sin que corte. */
const END_OF_SPEECH_MS = 1500;
/** Con la compuerta de ruido: tras callar este tiempo se da por terminada la frase (más ágil que esperar al reconocedor). */
const FAST_END_MS = 950;
/** Para interrumpir a ZOE hace falta voz sostenida este tiempo (un golpe o una tos no cuentan). */
const BARGE_IN_ATTACK_MS = 260;
/** Al empezar una frase de ZOE se ignora el micrófono este tiempo: ahí se cuela más su propia voz. */
const BARGE_IN_GRACE_MS = 700;
const SENSITIVITY_KEY = 'innovahub_zoe_sensitivity';
/** Audio del micrófono con las mejoras del navegador: cancelación de eco, supresión de ruido y ganancia. */
const MIC_CONSTRAINTS: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
/**
 * Audio para medir el volumen: sin la ganancia automática. Esa ganancia sube el ruido de fondo en los
 * silencios y hace que una voz lejana se mida casi igual que una cercana; sin ella, los decibelios dicen
 * de verdad qué tan cerca habla alguien.
 */
const METER_CONSTRAINTS: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } };
const CROWD_KEY = 'innovahub_zoe_multitud';

/** Conecta el micrófono a un medidor que solo oye la banda de la voz humana: ni zumbidos graves ni siseos. */
function voiceBandAnalyser(context: AudioContext, stream: MediaStream): AnalyserNode {
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = VOICE_BAND_HZ.low;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = VOICE_BAND_HZ.high;
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(highpass).connect(lowpass).connect(analyser);
  return analyser;
}

/** Por debajo de este volumen no entró sonido alguno: el problema es el micrófono, no la persona. */
const SILENT_MIC_LEVEL = 0.002;
/** Si la voz propia no tiene lista una frase en este tiempo, la dice la del sistema. */
const OWN_VOICE_TIMEOUT_MS = 40000;
/** Cuánto se espera a que la voz propia termine de cargar antes de recurrir a la del sistema: ZOE no cambia de voz por un instante de espera. */
const OWN_VOICE_LOAD_WAIT_MS = 25000;

/**
 * Idioma del reconocedor. Exige país: con «es-419», que es lo que reportan muchos navegadores
 * en Latinoamérica, el servicio de voz puede no reconocer nada.
 */
export function recognitionLang(preferred: readonly string[]): string {
  return preferred.find((lang) => /^es-[a-z]{2}$/i.test(lang)) ?? 'es-CO';
}

/** Volumen del micrófono mientras se escucha: da una señal visible y distingue un micrófono mudo. */
async function openLevelMeter(
  gate: ReturnType<typeof createNoiseGate>,
  onLevel?: (level: number, reading: GateReading) => void,
  onNoisy?: () => void,
  onTick?: (reading: GateReading) => void,
) {
  // En Android el reconocedor y otra captura de audio se estorban.
  if (/android/i.test(navigator.userAgent) || !navigator.mediaDevices) return null;
  const stream = await navigator.mediaDevices.getUserMedia(METER_CONSTRAINTS);
  const context = new AudioContext();
  const analyser = voiceBandAnalyser(context, stream);
  const samples = new Float32Array(analyser.fftSize);
  const meter = { peak: 0, sum: 0, count: 0, noisy: false, close: () => undefined as void };
  // La sala cuenta como ruidosa si su piso de ruido (en dB) es alto de forma sostenida.
  const isNoisy = createNoiseDetector(0.5);
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const level = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
    meter.peak = Math.max(meter.peak, level);
    meter.sum += level;
    meter.count += 1;
    const reading = gate.update(level, 80);
    onLevel?.(level, reading);
    onTick?.(reading);
    if (!meter.noisy && isNoisy(isNoisyRoom(reading.floorDb) ? 1 : 0, 80)) {
      meter.noisy = true;
      onNoisy?.();
    }
  }, 80);
  meter.close = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  return meter;
}

/**
 * ZOE tiene una sola voz en toda la aplicación. Este estado es compartido por todos los que usan
 * `useZoeVoice` (ZOE en pantalla y su presentación): así cualquier frase nueva calla la que esté
 * sonando, venga de donde venga. Con un estado por componente, dos de ellos hablaban encima.
 */
const speechRun = { current: 0 };
const timerRef: { current: number | undefined } = { current: undefined };
/** Corta lo que esté sonando; con `andFinish` además da la locución por terminada. */
const cutOwnVoice: { current: ((andFinish: boolean) => void) | null } = { current: null };
/** Quién dijo lo último: al desmontarse, un componente solo calla lo que él mismo inició. */
let speechOwner: symbol | null = null;

/** Voz de ZOE: su voz propia (o la del sistema mientras carga) por frases, y reconocimiento del navegador. */
export function useZoeVoice() {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('innovahub_zoe_muted') === '1';
    } catch {
      return false;
    }
  });
  const [sensitivity, setSensitivityState] = useState<Sensitivity>(() => {
    try {
      const saved = localStorage.getItem(SENSITIVITY_KEY);
      return isSensitivity(saved) ? saved : 'media';
    } catch {
      return 'media';
    }
  });
  /** Modo multitud: para salas con muchas personas hablando. */
  const [crowd, setCrowdState] = useState(() => {
    try {
      return localStorage.getItem(CROWD_KEY) === '1';
    } catch {
      return false;
    }
  });
  const crowdRef = useRef(crowd);
  crowdRef.current = crowd;
  const [listening, setListening] = useState(false);
  /** La compuerta aprende el piso de ruido del lugar y lo conserva entre escuchas. */
  const gateRef = useRef<ReturnType<typeof createNoiseGate> | null>(null);
  // Entre mucha gente la compuerta usa el margen más exigente, y un poco más.
  if (!gateRef.current) gateRef.current = createNoiseGate({ sensitivity: crowd ? 'baja' : sensitivity, extraDb: crowd ? CROWD_EXTRA_DB : 0 });
  const recognitionRef = useRef<{ abort: () => void } | null>(null);
  const listenSession = useRef(0);
  const owner = useRef(Symbol('voz-de-zoe')).current;
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const RecognitionCtor =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : undefined;

  // Las voces llegan de forma asíncrona: esto las deja listas para la primera frase.
  useEffect(() => {
    warmZoeVoice();
    // El navegador solo deja sonar el audio después de un gesto de la persona.
    window.addEventListener('pointerdown', unlockZoeAudio, { once: true });
    if (canSpeak) window.speechSynthesis.getVoices();
    return () => {
      window.removeEventListener('pointerdown', unlockZoeAudio);
      // Solo se calla lo que inició este componente: otro puede estar hablando en ese momento.
      if (speechOwner !== owner) return;
      speechRun.current += 1;
      window.clearTimeout(timerRef.current);
      cutOwnVoice.current?.(false);
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [canSpeak, owner]);

  const stopSpeaking = useCallback(() => {
    speechRun.current += 1;
    window.clearTimeout(timerRef.current);
    cutOwnVoice.current?.(false);
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

  const setCrowd = useCallback(
    (next: boolean) => {
      setCrowdState(next);
      gateRef.current?.setSensitivity(next ? 'baja' : sensitivity);
      gateRef.current?.setExtraDb(next ? CROWD_EXTRA_DB : 0);
      try {
        localStorage.setItem(CROWD_KEY, next ? '1' : '0');
      } catch {
        /* Solo es una preferencia. */
      }
    },
    [sensitivity],
  );

  const setSensitivity = useCallback((next: Sensitivity) => {
    setSensitivityState(next);
    if (!crowdRef.current) gateRef.current?.setSensitivity(next);
    try {
      localStorage.setItem(SENSITIVITY_KEY, next);
    } catch {
      /* Solo es una preferencia. */
    }
  }, []);

  /**
   * Mientras ZOE habla, vigila el micrófono: si la persona empieza a hablar (voz sostenida y claramente
   * por encima del ruido y de la propia voz de ZOE), avisa para que se calle y escuche. Devuelve cómo parar.
   */
  const watchInterrupt = useCallback(
    (onInterrupt: () => void) => {
      if (/android/i.test(navigator.userAgent) || !navigator.mediaDevices || !window.isSecureContext) return () => undefined;
      // Entre mucha gente cualquier voz vecina la interrumpiría: ahí solo se la interrumpe tocándola.
      if (crowdRef.current) return () => undefined;
      let closed = false;
      let cleanup: (() => void) | undefined;
      const startedAt = Date.now();
      void navigator.mediaDevices
        .getUserMedia(METER_CONSTRAINTS)
        .then((stream) => {
          if (closed) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const context = new AudioContext();
          const analyser = voiceBandAnalyser(context, stream);
          const samples = new Float32Array(analyser.fftSize);
          // Una compuerta aparte, más exigente: la propia voz de ZOE puede colarse por los parlantes.
          const gate = createNoiseGate({ sensitivity, extraDb: BARGE_IN_EXTRA_DB, attackMs: BARGE_IN_ATTACK_MS, calibrationMs: 500 });
          let fired = false;
          const timer = window.setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
            const reading = gate.update(rms, 80);
            if (!fired && reading.open && Date.now() - startedAt > BARGE_IN_GRACE_MS) {
              fired = true;
              onInterrupt();
            }
          }, 80);
          cleanup = () => {
            window.clearInterval(timer);
            stream.getTracks().forEach((t) => t.stop());
            void context.close();
          };
        })
        .catch(() => undefined); // Sin micrófono no hay interrupción por voz: queda tocar a ZOE.
      return () => {
        closed = true;
        cleanup?.();
      };
    },
    [sensitivity],
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('innovahub_zoe_muted', next ? '1' : '0');
      } catch {
        /* Solo es una preferencia. */
      }
      if (next) {
        cutOwnVoice.current?.(true);
        if (canSpeak) window.speechSynthesis.cancel();
      }
      return next;
    });
  }, [canSpeak]);

  /** Dice el texto; `onEnd` llega al terminar, salvo si otra locución o `stopSpeaking` lo interrumpió. `onPart` avisa cada frase que empieza. */
  const speak = useCallback(
    (text: string, onEnd?: () => void, onPart?: (sentence: string) => void) => {
      stopSpeaking();
      speechOwner = owner;
      const run = speechRun.current;
      const finish = () => {
        if (run === speechRun.current) onEnd?.();
      };
      // «¡Woa, woa!» no se pronuncia: suena un ladrido real y luego sigue el resto de la frase.
      const { barks, rest } = splitBarks(text);
      if (barks > 0) {
        if (muted) {
          text = rest || '¡Guau!';
        } else {
          const stopBark = playBark(() => {
            cutOwnVoice.current = null;
            if (run !== speechRun.current) return;
            if (rest) speak(rest, onEnd, onPart);
            else finish();
          });
          cutOwnVoice.current = (andFinish) => {
            stopBark();
            cutOwnVoice.current = null;
            if (andFinish) finish();
          };
          return;
        }
      }
      const silent = () => {
        // En silencio queda el subtítulo: se da tiempo de leerlo.
        onPart?.(text);
        timerRef.current = window.setTimeout(finish, Math.max(2000, text.length * 55));
      };
      const systemVoice = (parts: string[]) => {
        if (!canSpeak) return silent();
        // Algunos navegadores nunca avisan el final: esto evita que la conversación se quede colgada.
        // Si ni siquiera empieza a sonar, se sigue pronto: mientras tanto nadie la escucharía.
        let started = false;
        const length = parts.join(' ').length;
        timerRef.current = window.setTimeout(() => {
          if (started) timerRef.current = window.setTimeout(finish, 1000 + length * 120);
          else finish();
        }, 3000);
        window.speechSynthesis.resume();
        const voice = pickVoice();
        parts.forEach((part, i) => {
          const utterance = new SpeechSynthesisUtterance(part);
          // Pequeña variación por frase: una entonación idéntica es lo que suena a robot.
          utterance.pitch = 1.32 + ((i * 37) % 10) / 100;
          utterance.rate = 1.04 + ((i * 53) % 7) / 100;
          utterance.lang = voice?.lang ?? 'es-419';
          if (voice) utterance.voice = voice;
          utterance.onstart = () => {
            started = true;
            if (run === speechRun.current) onPart?.(part);
          };
          if (i === parts.length - 1) {
            utterance.onend = finish;
            utterance.onerror = finish;
          }
          window.speechSynthesis.speak(utterance);
        });
      };
      /**
       * Voz propia: mientras suena una frase ya se está generando la siguiente, y entre una y otra
       * hay un respiro según la puntuación (pegadas, sin pausa, es lo que sonaba a robot).
       */
      const ownVoice = (parts: string[]) => {
        let stopped = false;
        let stopCurrent: (() => void) | undefined;
        let breath: number | undefined;
        let chain: Promise<unknown> = Promise.resolve();
        const audio = parts.map((part) => {
          const next = chain.then(() => (stopped ? Promise.reject(new Error('Interrumpida.')) : synthesizeZoe(part)));
          chain = next.catch(() => undefined);
          return next;
        });
        audio.forEach((pending) => pending.catch(() => undefined));
        cutOwnVoice.current = (andFinish) => {
          stopped = true;
          window.clearTimeout(breath);
          stopCurrent?.();
          cutOwnVoice.current = null;
          if (andFinish) finish();
        };
        const playFrom = async (i: number) => {
          if (stopped || run !== speechRun.current) return;
          if (i >= parts.length) {
            cutOwnVoice.current = null;
            return finish();
          }
          let buffer: AudioBuffer;
          try {
            const late = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('La voz propia tardó demasiado.')), OWN_VOICE_TIMEOUT_MS));
            buffer = await Promise.race([audio[i], late]);
          } catch (e) {
            if (stopped || run !== speechRun.current) return;
            console.warn('[ZOE] Falló una frase de la voz propia:', e);
            if (isZoeVoiceUnavailable()) {
              // La voz propia dejó de existir (no cargó): no queda otra que la del sistema.
              stopped = true;
              cutOwnVoice.current = null;
              return systemVoice(splitSentences(parts.slice(i).join(' ')));
            }
            // La voz sigue siendo la misma: se reintenta la frase una vez y, si no sale, se pasa a la siguiente.
            try {
              buffer = await synthesizeZoe(parts[i]);
            } catch {
              if (stopped || run !== speechRun.current) return;
              return void playFrom(i + 1);
            }
          }
          if (stopped || run !== speechRun.current) return;
          onPart?.(parts[i]);
          // Si el audio no llega a sonar (el navegador lo bloquea), no se queda esperando.
          let advanced = false;
          const advance = () => {
            if (advanced) return;
            advanced = true;
            window.clearTimeout(timerRef.current);
            if (i + 1 < parts.length) breath = window.setTimeout(() => void playFrom(i + 1), pauseAfter(parts[i]));
            else void playFrom(i + 1);
          };
          stopCurrent = playZoe(buffer, advance);
          // Si el aviso de fin no llega, se sigue; antes se corta esta frase, por si empezó tarde y aún
          // suena: sin eso, la siguiente le quedaba encima.
          timerRef.current = window.setTimeout(
            () => {
              stopCurrent?.();
              advance();
            },
            buffer.duration * 1000 + 1500,
          );
        };
        void playFrom(0);
      };

      const synthesized = () => {
        // La voz propia va por oraciones completas; la del sistema, en tramos cortos que no corte.
        if (isZoeVoiceReady()) return ownVoice(withQuickStart(speechSentences(text)));
        if (isZoeVoiceUnavailable()) return systemVoice(splitSentences(text));
        // Si la voz propia aún se está cargando, se espera un poco: ZOE no debe empezar con otra voz y cambiar después.
        void waitForZoeVoice(OWN_VOICE_LOAD_WAIT_MS).then((loaded) => {
          if (run !== speechRun.current) return;
          if (loaded) ownVoice(withQuickStart(speechSentences(text)));
          else systemVoice(splitSentences(text));
        });
      };
      if (muted) return silent();
      // Las frases fijas de ZOE tienen su grabación; si no la hay, se sintetiza como siempre.
      const stopRecorded = playRecorded(
        text,
        () => {
          cutOwnVoice.current = null;
          finish();
        },
        () => {
          cutOwnVoice.current = null;
          if (run === speechRun.current) synthesized();
        },
        () => onPart?.(text),
      );
      cutOwnVoice.current = (andFinish) => {
        stopRecorded();
        cutOwnVoice.current = null;
        if (andFinish) finish();
      };
    },
    [muted, canSpeak, stopSpeaking, owner],
  );

  /** Pide el micrófono dentro del gesto de la persona y dice con precisión qué falla. */
  const checkMic = useCallback(async (): Promise<ZoeListenFailure | null> => {
    if (!window.isSecureContext || !navigator.mediaDevices) return 'sin-https';
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      stream.getTracks().forEach((track) => track.stop());
      return null;
    } catch (e) {
      return (e as Error).name === 'NotAllowedError' ? 'sin-permiso' : 'sin-microfono';
    }
  }, []);

  /**
   * Escucha una frase completa. El reconocedor se reabre si se cierra antes de tiempo y la frase
   * termina tras un silencio, no en la primera pausa. `onPartial` entrega lo que va entendiendo.
   */
  const listen = useCallback(
    (onText: (text: string) => void, onFail: (reason: ZoeListenFailure) => void, onPartial?: (text: string) => void, onLevel?: (level: number, reading: GateReading) => void) => {
      stopSpeaking();
      recognitionRef.current?.abort();
      const session = ++listenSession.current;
      const isCurrent = () => session === listenSession.current;
      let lang = recognitionLang(navigator.languages ?? []);
      let spoken = '';
      let failure: ZoeListenFailure | null = null;
      let endTimer: number | undefined;
      let meter: Awaited<ReturnType<typeof openLevelMeter>> = null;
      /** Compuerta: cuándo se oyó voz de verdad por última vez, y si alguna vez se oyó en esta escucha. */
      let lastVoiceAt = 0;
      let voiceSeen = false;
      let ignoredByGate = 0;

      /** Cierra la sesión: desde aquí, ningún evento tardío del reconocedor cuenta. */
      const close = () => {
        listenSession.current += 1;
        window.clearTimeout(endTimer);
        window.clearTimeout(windowTimer);
        meter?.close();
        recognitionRef.current?.abort();
        setListening(false);
      };
      const finish = () => {
        const text = spoken.trim();
        const peak = meter?.peak;
        // Ruido: el medidor lo vio sostenido, o el volumen medio fue alto durante toda la escucha.
        const noisy = Boolean(meter && (meter.noisy || (meter.count > 25 && meter.sum / meter.count > NOISY_LEVEL)));
        close();
        if (text) onText(text);
        else if (failure) onFail(failure);
        else if (noisy) onFail('ruido');
        else onFail(peak !== undefined && peak < SILENT_MIC_LEVEL ? 'mic-mudo' : 'sin-voz');
      };
      const windowTimer = window.setTimeout(() => {
        if (isCurrent() && !spoken) finish();
      }, LISTEN_WINDOW_MS);

      const open = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (RecognitionCtor as any)();
        recognitionRef.current = recognition;
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => {
          if (isCurrent()) setListening(true);
        };
        recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }> & { isFinal?: boolean }> }) => {
          if (!isCurrent()) return;
          const inCrowd = crowdRef.current;
          // Compuerta de ruido: si el micrófono nunca oyó una voz clara sobre el ruido, lo «entendido» es
          // murmullo de fondo (otra persona lejos, un video…): se ignora en vez de contestarle.
          if (meter && meter.count > 12 && !voiceSeen && !spoken && ignoredByGate < 4) {
            ignoredByGate += 1;
            return;
          }
          // Entre mucha gente la regla es estricta y sin excepciones: lo entendido solo cuenta si el
          // micrófono oyó una voz cercana hace un instante. Lo demás es la conversación de otros.
          if (inCrowd && meter && meter.count > 12 && !spoken && !heardNearVoice(lastVoiceAt, Date.now())) return;
          let heard = joinRecognized(
            Array.from(event.results, (result) => ({ transcript: result[0]?.transcript ?? '', confidence: result[0]?.confidence, isFinal: result.isFinal })),
            inCrowd,
          );
          if (inCrowd) {
            // Hay que nombrarla: «ZOE, …». Sin su nombre, no le hablaban a ella y sigue escuchando.
            const addressed = addressedText(heard);
            if (!addressed) return;
            heard = addressed;
          }
          spoken = heard;
          onPartial?.(spoken);
          window.clearTimeout(endTimer);
          endTimer = window.setTimeout(finish, seemsUnfinished(spoken) ? END_OF_SPEECH_MS + 400 : END_OF_SPEECH_MS);
        };
        recognition.onerror = (event: { error?: string }) => {
          if (!isCurrent()) return;
          // «no-speech» y «aborted» solo cierran este reconocedor: `onend` lo reabre.
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') failure = 'sin-permiso';
          else if (event.error === 'audio-capture') failure = 'sin-microfono';
          else if (event.error === 'network') failure = 'sin-red';
          else if (event.error === 'language-not-supported' && lang !== 'es-ES') lang = 'es-ES';
          else if (event.error !== 'no-speech' && event.error !== 'aborted') failure = 'error';
        };
        recognition.onend = () => {
          if (!isCurrent()) return;
          if (failure || spoken) {
            finish();
            return;
          }
          setListening(false);
          window.setTimeout(() => {
            if (isCurrent()) open();
          }, 150);
        };
        try {
          recognition.start();
        } catch {
          failure = 'error';
          finish();
        }
      };
      open();
      // Ruido sostenido sin que el reconocedor entienda nada: no se espera al final, se avisa ya.
      const onNoisy = () => {
        // En modo multitud el ruido ya se da por hecho: no se abandona la escucha por él.
        if (isCurrent() && !spoken && !failure && !crowdRef.current) finish();
      };
      // Cada lectura del medidor alimenta la compuerta; al callar, la frase se cierra más ágil que esperando al reconocedor.
      const onTick = (reading: GateReading) => {
        if (!isCurrent()) return;
        if (reading.open) {
          voiceSeen = true;
          lastVoiceAt = Date.now();
        } else if (spoken && voiceSeen && Date.now() - lastVoiceAt > (seemsUnfinished(spoken) ? END_OF_SPEECH_MS + 400 : FAST_END_MS)) {
          finish();
        }
      };
      void openLevelMeter(gateRef.current!, onLevel, onNoisy, onTick)
        .then((opened) => {
          if (isCurrent()) meter = opened;
          else opened?.close();
        })
        .catch(() => undefined); // Sin medidor se sigue escuchando igual.
    },
    [RecognitionCtor, stopSpeaking],
  );

  const stopListening = useCallback(() => {
    listenSession.current += 1;
    recognitionRef.current?.abort();
    setListening(false);
  }, []);

  return {
    muted,
    toggleMuted,
    listening,
    speak,
    stopSpeaking,
    checkMic,
    listen,
    stopListening,
    watchInterrupt,
    sensitivity,
    setSensitivity,
    crowd,
    setCrowd,
    canListen: Boolean(RecognitionCtor),
  };
}
