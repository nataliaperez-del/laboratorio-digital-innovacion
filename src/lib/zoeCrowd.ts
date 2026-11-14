/**
 * Escuchar entre mucha gente. El reconocedor de voz del navegador entiende a cualquiera que hable
 * cerca, así que en una sala llena ZOE terminaba contestándole a otras conversaciones. Aquí están
 * las reglas para distinguir a quien le habla a ella:
 *
 *  - Banda de la voz: el volumen se mide solo entre 250 y 3800 Hz, donde está la voz humana, y sin
 *    la ganancia automática del micrófono (que en los silencios sube el ruido de fondo y borra la
 *    diferencia entre quien está cerca y quien está lejos).
 *  - Voz cercana: solo cuenta lo que se entendió mientras el micrófono oía una voz clara y próxima.
 *  - Modo multitud: además hay que nombrarla («ZOE, ¿qué es…?»), la compuerta exige más volumen y
 *    se descarta lo que el reconocedor entendió con poca seguridad.
 *
 * Lógica pura, para poder probarla; quien la aplica es `useZoeVoice.ts`.
 */

/** Paso de banda de la voz humana, en Hz. */
export const VOICE_BAND_HZ = { low: 250, high: 3800 } as const;
/** Decibelios extra que debe superar una voz en modo multitud, sobre el margen de sensibilidad baja. */
export const CROWD_EXTRA_DB = 5;
/** En modo multitud, lo que el reconocedor entendió con menos seguridad que esto se descarta (0 a 1). */
export const CROWD_MIN_CONFIDENCE = 0.45;
/** Lo entendido cuenta si el micrófono oyó una voz cercana hace menos de esto (el reconocedor llega con retraso). */
export const NEAR_VOICE_WINDOW_MS = 2500;

/** Cómo transcribe el reconocedor en español el nombre de ZOE. */
const NAME = /(?:^|[^\p{L}])(zo[eé]y?|so[eé]|zoi|zoy|sohe|zohe)(?=$|[^\p{L}])/iu;

/**
 * Lo que la persona le dijo a ZOE: el texto que sigue a su nombre, o lo que lo precede si el nombre
 * va al final («¿qué es un árbol, ZOE?»). Devuelve null si no la nombró: no le hablaban a ella.
 */
export function addressedText(transcript: string): string | null {
  const text = transcript.replace(/\s+/g, ' ').trim();
  const match = NAME.exec(text);
  if (!match) return null;
  const nameStart = match.index + match[0].indexOf(match[1]);
  const after = text
    .slice(nameStart + match[1].length)
    .replace(/^[\s,.:;!?]+/, '')
    .trim();
  if (after) return after;
  // Solo se cuenta lo de antes si el nombre cierra la frase: así no se arrastra la charla previa de otros.
  return text
    .slice(0, nameStart)
    .replace(/[\s,.:;!?¿¡]+$/, '')
    .trim();
}

/** ¿El micrófono oyó una voz cercana hace poco? */
export function heardNearVoice(lastVoiceAt: number, now: number): boolean {
  return lastVoiceAt > 0 && now - lastVoiceAt < NEAR_VOICE_WINDOW_MS;
}

interface RecognizedPiece {
  transcript: string;
  /** 0 a 1; algunos navegadores entregan 0 cuando no la calculan. */
  confidence?: number;
  isFinal?: boolean;
}

/** Une lo que entendió el reconocedor; en modo multitud deja fuera lo que entendió con poca seguridad. */
export function joinRecognized(pieces: readonly RecognizedPiece[], crowd: boolean): string {
  return pieces
    .filter((p) => !(crowd && p.isFinal && typeof p.confidence === 'number' && p.confidence > 0 && p.confidence < CROWD_MIN_CONFIDENCE))
    .map((p) => p.transcript)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
