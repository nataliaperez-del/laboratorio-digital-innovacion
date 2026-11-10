/**
 * Frases grabadas de ZOE: lo que ZOE dice siempre igual suena con la voz grabada (archivos estáticos
 * en `public/assets/zoe/voz/`, sin ningún servicio externo). Si una frase no tiene grabación, se usa
 * la voz de siempre.
 */

export interface RecordedPhrase {
  id: string;
  text: string;
}

const BASE = '/assets/zoe/voz/';

/** Mismo texto aunque cambien mayúsculas, tildes, comillas o puntuación. */
export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

export function buildIndex(phrases: RecordedPhrase[]): Map<string, string> {
  return new Map(phrases.map((p) => [normalizePhrase(p.text), p.id]));
}

let index: Promise<Map<string, string>> | null = null;

function loadIndex(): Promise<Map<string, string>> {
  index ??= fetch(`${BASE}frases.json`)
    .then((r) => (r.ok ? (r.json() as Promise<RecordedPhrase[]>) : []))
    .then(buildIndex)
    .catch(() => new Map<string, string>());
  return index;
}

/** Adelanta la carga del índice para que la primera frase no espere. */
export function preloadRecorded(): void {
  void loadIndex();
}

/**
 * Reproduce la grabación de la frase si existe. `onMissing` se llama si no hay grabación o falla el
 * archivo (entonces el llamador usa la voz de siempre); si no, `onEnd` al terminar. Devuelve cómo cortarla.
 */
export function playRecorded(text: string, onEnd: () => void, onMissing: () => void, onPlay?: () => void): () => void {
  let stopped = false;
  let audio: HTMLAudioElement | null = null;
  void loadIndex().then((map) => {
    if (stopped) return;
    const id = map.get(normalizePhrase(text));
    if (!id) return onMissing();
    let started = false;
    audio = new Audio(`${BASE}${id}.mp3`);
    audio.onplaying = () => {
      started = true;
      onPlay?.();
    };
    audio.onended = () => !stopped && onEnd();
    audio.onerror = () => !stopped && !started && onMissing();
    audio.play().catch(() => !stopped && onMissing());
  });
  return () => {
    stopped = true;
    audio?.pause();
  };
}
