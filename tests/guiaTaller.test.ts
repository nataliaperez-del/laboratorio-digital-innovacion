import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import BANK_JSON from '@/content/zoe/banco-unadista.json';
import MASTER from '@/content/zoe/documento-maestro.md?raw';
import { GUIDE_SOURCE, guideAnswer, knowledgeBlock, type UnadistaBank } from '@/lib/zoeKnowledge';
import { offlineAnswer } from '@/lib/zoeOffline';

const bank = BANK_JSON as unknown as UnadistaBank & { fuentes: Array<{ archivo: string; hash: string }> };
const GUIDE_DOCX = 'docs/taller/Guia de facilitacion - Taller de Innovacion con IA.docx';
const ctx = { tool: 'portal' as const, bank, random: () => 0 };

describe('la guía de facilitación del taller es parte de lo que ZOE sabe', () => {
  it('el Word de la guía está en el repositorio y el banco de ZOE está al día con él', () => {
    // Si alguien edita el Word y no se vuelve a armar el banco (npm run zoe:banco, o cualquier build), esto falla.
    const bytes = readFileSync(path.resolve(GUIDE_DOCX));
    const hash = `sha256-${createHash('sha256').update(bytes.toString('base64')).digest('hex').slice(0, 16)}`;
    const source = bank.fuentes.find((f) => f.archivo === GUIDE_DOCX);
    expect(source, 'el banco no registra la guía').toBeDefined();
    expect(source!.hash, 'el Word cambió: corre «npm run zoe:banco»').toBe(hash);
  });

  it('el banco trae las secciones de la guía, pero no los pendientes internos del equipo', () => {
    const passages = bank.pasajes.filter((p) => p.fuente === GUIDE_SOURCE);
    expect(passages.length).toBeGreaterThan(15);
    const titles = passages.map((p) => p.titulo).join('\n');
    for (const t of ['Los 40 minutos', 'Qué hace ZOE', 'plan B', 'Cómo apoyan los demás']) expect(titles).toContain(t);
    expect(titles).not.toMatch(/Pendientes/);
  });

  it('con IA, una pregunta del taller trae el pasaje de la guía como consulta', () => {
    const block = knowledgeBlock(bank, '¿Qué hacemos en el taller si no hay internet?');
    expect(block).toMatch(/Guía del taller/);
    expect(block).toMatch(/datos del celular/);
  });

  it('sin IA, ZOE responde con la guía lo que pregunten del taller', () => {
    const sinInternet = offlineAnswer('¿Qué hacemos en el taller si no hay internet?', MASTER, ctx);
    expect(sinInternet).toMatch(/guía del taller/i);
    expect(sinInternet).toMatch(/datos del celular/);
    const anfitrion = offlineAnswer('¿Qué hace un anfitrión de mesa en el taller?', MASTER, ctx);
    expect(anfitrion).toMatch(/guía del taller/i);
    expect(anfitrion).toMatch(/Anfitrión de mesa/);
  });

  it('no se mete cuando no se habla del taller', () => {
    expect(guideAnswer(bank, '¿Qué es la reticularidad?')).toBeNull();
    expect(guideAnswer(null, 'plan b del taller')).toBeNull();
  });
});
