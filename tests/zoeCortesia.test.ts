import { describe, expect, it } from 'vitest';
import BANK_JSON from '@/content/zoe/banco-unadista.json';
import MASTER from '@/content/zoe/documento-maestro.md?raw';
import { OFFLINE_FALLBACK, offlineAnswer, sectionLines } from '@/lib/zoeOffline';
import type { UnadistaBank } from '@/lib/zoeKnowledge';

const bank = BANK_JSON as unknown as UnadistaBank;
const ctx = (random = () => 0) => ({ tool: 'portal' as const, bank, random });
const thanks = sectionLines(MASTER, /cuando te dan las gracias/i);
const praise = sectionLines(MASTER, /cuando te halagan/i);

describe('ZOE y las palabras mágicas', () => {
  it('trae sus respuestas a las gracias, a los halagos y a «por favor» en su memoria', () => {
    expect(thanks.length).toBeGreaterThanOrEqual(4);
    expect(praise.length).toBeGreaterThanOrEqual(4);
    expect(sectionLines(MASTER, /palabras m[aá]gicas/i).some((l) => /necesitas/.test(l))).toBe(true);
  });

  it('agradece las gracias, de cualquier forma corta', () => {
    for (const frase of ['gracias', 'Muchas gracias ZOE', 'mil gracias', 'te agradezco', 'Gracias, ZOE, me sirvió mucho']) {
      expect(thanks, frase).toContain(offlineAnswer(frase, MASTER, ctx()));
    }
  });

  it('recibe los halagos con humildad y buen humor', () => {
    for (const frase of ['eres genial', 'Eres muy inteligente', 'qué lindo eres', 'buen trabajo', 'eres el mejor', 'me encantas', 'te quiero', 'eres increíble']) {
      expect(praise, frase).toContain(offlineAnswer(frase, MASTER, ctx()));
    }
  });

  it('varía la respuesta y no repite siempre la misma', () => {
    const vistas = new Set([0, 0.25, 0.5, 0.75, 0.99].map((r) => offlineAnswer('gracias', MASTER, ctx(() => r))));
    expect(vistas.size).toBeGreaterThanOrEqual(3);
  });

  it('con solo «por favor» pregunta qué necesita', () => {
    for (const frase of ['por favor', 'porfa', 'por favor, gracias']) expect(offlineAnswer(frase, MASTER, ctx())).toMatch(/qué necesitas/);
  });

  it('con «por favor» y un pedido real, lo celebra y responde', () => {
    const r = offlineAnswer('por favor, ¿qué es el MHUS 5.0?', MASTER, ctx());
    expect(r).toMatch(/^(Con gusto|Claro que sí|Por supuesto|Con mucho gusto)/);
    expect(r).toMatch(/Modelo Heutagógico Unadista Solidario 5\.0/);
    const sin = offlineAnswer('¿qué es el MHUS 5.0?', MASTER, ctx());
    expect(r.endsWith(sin)).toBe(true);
  });

  it('no confunde las gracias de una pregunta con solo darlas, ni un «no, gracias»', () => {
    const r = offlineAnswer('gracias, ¿qué es el MHUS 5.0?', MASTER, ctx());
    expect(r).toMatch(/Modelo Heutagógico Unadista Solidario 5\.0/);
    expect(offlineAnswer('no gracias', MASTER, ctx())).not.toBe(OFFLINE_FALLBACK);
    expect(thanks).not.toContain(offlineAnswer('no, gracias', MASTER, ctx()));
  });

  it('el halago no pisa a la tristeza ni a una crisis: esos caminos van primero', () => {
    const triste = offlineAnswer('me siento muy triste, gracias por escucharme', MASTER, ctx());
    expect(thanks).not.toContain(triste);
    expect(praise).not.toContain(triste);
  });

  it('la IA recibe la regla de las palabras mágicas', async () => {
    const source = (await import('@/services/zoeAi?raw')).default as string;
    expect(source).toMatch(/PALABRAS MÁGICAS Y HALAGOS/);
  });
});
