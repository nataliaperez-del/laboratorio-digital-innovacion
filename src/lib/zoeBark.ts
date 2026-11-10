/**
 * Ladridos de ZOE: cuando el texto dice «¡Woa, woa!» (lo que ZOE dice al pensar), suena un ladrido
 * real en lugar de que la voz lo pronuncie. Lo demás de la frase se dice con su voz de siempre.
 */

/** «Woa, woa», «¡Woa woa!», «guau, guau»… con su puntuación alrededor. */
const BARK_PATTERN = /¡?\s*(?:woa|guau)[\s,.…-]*(?:woa|guau)?[!.…]*/gi;

export interface BarkSplit {
  /** Cuántas veces aparecía el ladrido en el texto. */
  barks: number;
  /** El texto sin el ladrido ni la puntuación que lo rodeaba. */
  rest: string;
}

/** Quita los «woa woa» del texto y cuenta cuántos eran. */
export function splitBarks(text: string): BarkSplit {
  let barks = 0;
  const rest = text
    .replace(BARK_PATTERN, () => {
      barks += 1;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:¡!…-]+/, '')
    .replace(/\s+([,.;:!?…])/g, '$1')
    .trim();
  return { barks, rest };
}

/** Ladridos grabados, en `public/assets/zoe/`. */
export const BARK_FILES = ['/assets/zoe/ladrido-doble.mp3', '/assets/zoe/ladrido-simple.mp3'] as const;

/** Elige un ladrido; cada vez uno distinto al anterior para que no suene a repetición. */
export function pickBark(previous: number, random: () => number = Math.random): number {
  if (BARK_FILES.length < 2) return 0;
  const next = Math.floor(random() * (BARK_FILES.length - 1));
  return next >= previous ? next + 1 : next;
}

let lastBark = -1;

/**
 * Hace sonar un ladrido y avisa al terminar. Devuelve cómo cortarlo. Si el navegador no deja sonar
 * (sin gesto previo) o el archivo falla, avisa enseguida para que la conversación no se quede esperando.
 */
export function playBark(onEnd: () => void): () => void {
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    window.clearTimeout(fallback);
    onEnd();
  };
  lastBark = pickBark(lastBark);
  const audio = new Audio(BARK_FILES[lastBark]);
  audio.volume = 0.9;
  // Un ladrido dura poco más de un segundo: si nada avisa, se sigue.
  const fallback = window.setTimeout(end, 2500);
  audio.onended = end;
  audio.onerror = end;
  audio.play().catch(end);
  return () => {
    if (done) return;
    done = true;
    window.clearTimeout(fallback);
    audio.pause();
  };
}
