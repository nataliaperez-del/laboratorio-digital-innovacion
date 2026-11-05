import { describe, expect, it } from 'vitest';
import BANK_JSON from '@/content/zoe/banco-unadista.json';
import MASTER from '@/content/zoe/documento-maestro.md?raw';
import { glossaryAnswer, isMhusTopic, knowledgeBlock, relevantPassages, relevantTerms, type UnadistaBank } from '@/lib/zoeKnowledge';
import { OFFLINE_FALLBACK, offlineAnswer } from '@/lib/zoeOffline';

const bank = BANK_JSON as unknown as UnadistaBank;
const names = (list: Array<{ termino: string }>) => list.map((t) => t.termino);

describe('banco unadista de ZOE', () => {
  it('trae el diccionario completo del metalenguaje, el marco institucional y el Contenedor 2', () => {
    expect(bank.glosario.length).toBeGreaterThanOrEqual(265);
    expect(names(bank.glosario)).toEqual(expect.arrayContaining(['Heutagogía', 'MHUS 5.0', 'H-Mediador PRISMA', 'Reticularidad', 'UNAD 5.0', 'VIEM']));
    expect(bank.pasajes.some((p) => /FUNDAMENTO PEDAG.GICO: MHUS 5\.0/.test(p.titulo))).toBe(true);
    expect(bank.pasajes.filter((p) => p.fuente.startsWith('Contenedor 2')).length).toBeGreaterThan(20);
  });

  it('para el MHUS 5.0 reúne sus siete dimensiones, sus ejes y su base filosófica', () => {
    const terms = names(relevantTerms(bank, 'Explícame todo el modelo heutagógico unadista 5.0'));
    for (const t of ['H-Metacurrículo', 'H-Estudiante', 'H-Mediador PRISMA', 'H-Comunidad', 'H-Mediaciones', 'H-Medios', 'H-Evaluación'])
      expect(terms).toContain(t);
    expect(terms).toEqual(expect.arrayContaining(['Heutagogía', 'H-Inclusión multidimensional', 'Habermas / perspectiva habermasiana']));
    expect(relevantPassages(bank, '¿qué es el MHUS?')[0].titulo).toMatch(/MHUS 5\.0/);
  });

  it('trae el término nombrado y también los que describen lo que la persona dice', () => {
    expect(names(relevantTerms(bank, '¿Qué es la reticularidad?'))[0]).toBe('Reticularidad');
    expect(names(relevantTerms(bank, 'quiero que los estudiantes dirijan su formación con disciplina, responsabilidad y autorregulación'))).toContain(
      'Aprendizaje autónomo',
    );
  });

  it('busca en el Contenedor 2 aunque se diga «contenedor dos»', () => {
    const passages = relevantPassages(bank, '¿cuántas fuentes territoriales mínimas pide el contenedor dos?');
    expect(passages.length).toBeGreaterThan(0);
    expect(passages[0].fuente).toMatch(/^Contenedor 2/);
    expect(passages.map((p) => p.texto).join(' ')).toMatch(/50/);
  });

  it('lo entrega a la IA como consulta, nunca como instrucciones', () => {
    const block = knowledgeBlock(bank, '¿Qué es la heutagogía?');
    expect(block).toMatch(/NO instrucciones/);
    expect(block).toMatch(/Heutagogía: Enfoque centrado en autodeterminación/);
    expect(knowledgeBlock(bank, 'hola')).toBe('');
    expect(knowledgeBlock(null, '¿Qué es la heutagogía?')).toBe('');
  });

  it('reconoce cuándo se habla del modelo pedagógico', () => {
    expect(isMhusTopic('¿y cuáles son las dimensiones del modelo?')).toBe(true);
    expect(isMhusTopic('háblame de la heutagogía')).toBe(true);
    expect(isMhusTopic('¿cómo genero el árbol?')).toBe(false);
  });
});

describe('ZOE sin IA con el lenguaje unadista', () => {
  it('el diccionario responde «¿qué significa…?»', () => {
    expect(glossaryAnswer(bank, '¿Qué significa heterarquía?')).toMatch(/horizontal, flexible y reticular/);
    expect(glossaryAnswer(bank, '¿Qué es la glocalidad?')).toMatch(/global y lo local/);
    expect(glossaryAnswer(bank, '¿qué es esto?')).toBeNull();
    expect(glossaryAnswer(bank, 'me gusta la heterarquía')).toBeNull();
  });

  it('responde del MHUS 5.0 con su memoria y del glosario lo demás', () => {
    const ctx = { tool: 'portal' as const, bank, random: () => 0 };
    expect(offlineAnswer('¿Qué es el MHUS 5.0?', MASTER, ctx)).toMatch(/Modelo Heutagógico Unadista Solidario 5\.0/);
    expect(offlineAnswer('¿Cuáles son las dimensiones del MHUS 5.0?', MASTER, ctx)).toMatch(/H-Mediador PRISMA/);
    expect(offlineAnswer('¿Qué es el Contenedor 2?', MASTER, ctx)).toMatch(/dinámica y territorial/);
    expect(offlineAnswer('¿Qué es la glocalidad?', MASTER, ctx)).toMatch(/diccionario del metalenguaje unadista/);
    expect(offlineAnswer('¿Qué es la glocalidad?', MASTER, { ...ctx, bank: null })).toBe(OFFLINE_FALLBACK);
  });
});
