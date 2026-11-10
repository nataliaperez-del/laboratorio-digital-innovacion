import { describe, expect, it } from 'vitest';
import frases from '../public/assets/zoe/voz/frases.json';
import { buildIndex, normalizePhrase } from '../src/lib/zoeRecorded';

describe('frases grabadas de ZOE', () => {
  it('ignora tildes, mayúsculas y puntuación al buscar', () => {
    expect(normalizePhrase('¡Hola! Qué alegría…')).toBe(normalizePhrase('hola, que alegria'));
  });

  it('cada frase del catálogo tiene id único y se encuentra por su texto', () => {
    const ids = frases.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const index = buildIndex(frases);
    expect(index.size).toBe(frases.length);
    for (const f of frases) expect(index.get(normalizePhrase(f.text))).toBe(f.id);
  });
});
