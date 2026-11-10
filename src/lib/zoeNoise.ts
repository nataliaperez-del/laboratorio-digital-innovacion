/**
 * Ruido ambiente: cuándo ZOE da por hecho que no puede escucharte y pasa al chat.
 *
 * El reconocedor del navegador no avisa de que hay ruido: solo deja de entender. Pero el medidor de
 * volumen del micrófono sí lo ve. Si el micrófono recibe sonido fuerte de forma sostenida y el
 * reconocedor no ha entendido ni una palabra, lo más probable es que haya mucho ruido alrededor
 * (o que la voz no se distinga): escribir es entonces más fiable que insistir hablando.
 */

/** Volumen (RMS 0–1) por encima del cual el sonido se cuenta como ruido. Una voz tranquila ronda 0,01–0,05. */
export const NOISY_LEVEL = 0.03;
/** Tiempo de ruido sostenido, sin entender nada, tras el cual ZOE pide que le escriban. */
export const NOISY_MS = 4000;

/**
 * Acumulador de ruido sostenido: suma el tiempo con volumen alto y lo descuenta al doble de
 * velocidad cuando baja, para que un golpe aislado no cuente. Devuelve `true` al llegar al límite.
 */
export function createNoiseDetector(threshold = NOISY_LEVEL, limitMs = NOISY_MS) {
  let noisyMs = 0;
  return (level: number, elapsedMs: number): boolean => {
    noisyMs = level > threshold ? noisyMs + elapsedMs : Math.max(0, noisyMs - elapsedMs * 2);
    return noisyMs >= limitMs;
  };
}
