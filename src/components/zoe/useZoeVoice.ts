import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isZoeVoiceReady,
  pauseAfter,
  playZoe,
  prepareZoeVoice,
  speechSentences,
  synthesizeZoe,
  unlockZoeAudio,
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
export type ZoeListenFailure = 'sin-permiso' | 'sin-microfono' | 'mic-mudo' | 'sin-https' | 'sin-red' | 'sin-voz' | 'error';

/** Espera a que la persona empiece a hablar; el reconocedor solo aguanta unos segundos y se reabre. */
const LISTEN_WINDOW_MS = 12000;
/** Silencio que da por terminada la frase: permite pausar a media oración sin que corte. */
const END_OF_SPEECH_MS = 1700;
/** Por debajo de este volumen no entró sonido alguno: el problema es el micrófono, no la persona. */
const SILENT_MIC_LEVEL = 0.002;
/** Si la voz propia no tiene lista una frase en este tiempo, la dice la del sistema. */
const OWN_VOICE_TIMEOUT_MS = 15000;

/**
 * Idioma del reconocedor. Exige país: con «es-419», que es lo que reportan muchos navegadores
 * en Latinoamérica, el servicio de voz puede no reconocer nada.
 */
export function recognitionLang(preferred: readonly string[]): string {
  return preferred.find((lang) => /^es-[a-z]{2}$/i.test(lang)) ?? 'es-CO';
}

/** Volumen del micrófono mientras se escucha: da una señal visible y distingue un micrófono mudo. */
async function openLevelMeter(onLevel?: (level: number) => void) {
  // En Android el reconocedor y otra captura de audio se estorban.
  if (/android/i.test(navigator.userAgent) || !navigator.mediaDevices) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  const meter = { peak: 0, close: () => undefined as void };
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const level = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
    meter.peak = Math.max(meter.peak, level);
    onLevel?.(level);
  }, 80);
  meter.close = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  return meter;
}

/** Voz de ZOE: su voz propia (o la del sistema mientras carga) por frases, y reconocimiento del navegador. */
export function useZoeVoice() {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('innovahub_zoe_muted') === '1';
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ abort: () => void } | null>(null);
  const listenSession = useRef(0);
  const speechRun = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  /** Corta la voz propia; con `andFinish` además da la locución por terminada. */
  const cutOwnVoice = useRef<((andFinish: boolean) => void) | null>(null);
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
      cutOwnVoice.current?.(false);
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [canSpeak]);

  const stopSpeaking = useCallback(() => {
    speechRun.current += 1;
    window.clearTimeout(timerRef.current);
    cutOwnVoice.current?.(false);
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

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
      const run = speechRun.current;
      const finish = () => {
        if (run === speechRun.current) onEnd?.();
      };
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
            // Si la voz propia falla a mitad de camino, el resto lo dice la del sistema.
            if (stopped || run !== speechRun.current) return;
            console.warn('[ZOE] Falló la voz propia; sigue la del sistema:', e);
            stopped = true;
            cutOwnVoice.current = null;
            return systemVoice(splitSentences(parts.slice(i).join(' ')));
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
          timerRef.current = window.setTimeout(advance, buffer.duration * 1000 + 1500);
        };
        void playFrom(0);
      };

      if (muted) return silent();
      // La voz propia va por oraciones completas; la del sistema, en tramos cortos que no corte.
      if (isZoeVoiceReady()) return ownVoice(withQuickStart(speechSentences(text)));
      // Mientras la voz propia se descarga, habla la del sistema.
      void prepareZoeVoice()?.catch(() => undefined);
      systemVoice(splitSentences(text));
    },
    [muted, canSpeak, stopSpeaking],
  );

  /** Pide el micrófono dentro del gesto de la persona y dice con precisión qué falla. */
  const checkMic = useCallback(async (): Promise<ZoeListenFailure | null> => {
    if (!window.isSecureContext || !navigator.mediaDevices) return 'sin-https';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    (onText: (text: string) => void, onFail: (reason: ZoeListenFailure) => void, onPartial?: (text: string) => void, onLevel?: (level: number) => void) => {
      stopSpeaking();
      recognitionRef.current?.abort();
      const session = ++listenSession.current;
      const isCurrent = () => session === listenSession.current;
      let lang = recognitionLang(navigator.languages ?? []);
      let spoken = '';
      let failure: ZoeListenFailure | null = null;
      let endTimer: number | undefined;
      let meter: Awaited<ReturnType<typeof openLevelMeter>> = null;

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
        close();
        if (text) onText(text);
        else if (failure) onFail(failure);
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
        recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
          if (!isCurrent()) return;
          spoken = Array.from(event.results, (result) => result[0]?.transcript ?? '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          onPartial?.(spoken);
          window.clearTimeout(endTimer);
          endTimer = window.setTimeout(finish, END_OF_SPEECH_MS);
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
      void openLevelMeter(onLevel)
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

  return { muted, toggleMuted, listening, speak, stopSpeaking, checkMic, listen, stopListening, canListen: Boolean(RecognitionCtor) };
}
