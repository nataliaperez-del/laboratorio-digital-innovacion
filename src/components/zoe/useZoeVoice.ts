import { useCallback, useEffect, useRef, useState } from 'react';

/** Voz latina masculina si existe; si no, cualquier voz en español. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const latin = (v: SpeechSynthesisVoice) => /^es-(419|MX|CO|US|AR|CL|PE|VE)/i.test(v.lang);
  const male = (v: SpeechSynthesisVoice) => /raul|jorge|diego|carlos|alonso|gonzalo|male|natural/i.test(v.name);
  return (
    voices.find((v) => latin(v) && male(v)) ||
    voices.find(latin) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es'))
  );
}

/** Frases por separado: Chrome corta las locuciones largas a los 15 segundos. */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?¡¿…\n]*[¡¿]?[^.!?…\n]+[.!?…]*\s*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

export type ZoeListenFailure = 'sin-permiso' | 'sin-microfono' | 'mic-mudo' | 'sin-https' | 'sin-red' | 'sin-voz' | 'error';

/** Espera a que la persona empiece a hablar; el reconocedor solo aguanta unos segundos y se reabre. */
const LISTEN_WINDOW_MS = 12000;
/** Silencio que da por terminada la frase: permite pausar a media oración sin que corte. */
const END_OF_SPEECH_MS = 1300;
/** Por debajo de este volumen no entró sonido alguno: el problema es el micrófono, no la persona. */
const SILENT_MIC_LEVEL = 0.002;

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

/** Voz de ZOE: síntesis por frases y reconocimiento del navegador. */
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
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const RecognitionCtor =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : undefined;

  // Las voces llegan de forma asíncrona: esto las deja listas para la primera frase.
  useEffect(() => {
    if (!canSpeak) return;
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [canSpeak]);

  const stopSpeaking = useCallback(() => {
    speechRun.current += 1;
    window.clearTimeout(timerRef.current);
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
      if (next && canSpeak) window.speechSynthesis.cancel();
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
      if (muted || !canSpeak) {
        // En silencio queda el subtítulo: se da tiempo de leerlo.
        onPart?.(text);
        timerRef.current = window.setTimeout(finish, Math.max(2000, text.length * 55));
        return;
      }
      // Algunos navegadores nunca avisan el final: esto evita que la conversación se quede colgada.
      // Si ni siquiera empieza a sonar, se sigue pronto: mientras tanto nadie la escucharía.
      let started = false;
      timerRef.current = window.setTimeout(() => {
        if (started) timerRef.current = window.setTimeout(finish, 1000 + text.length * 120);
        else finish();
      }, 3000);
      window.speechSynthesis.resume();
      const voice = pickVoice();
      const parts = splitSentences(text);
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
          spoken = Array.from(event.results, (result) => result[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim();
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
