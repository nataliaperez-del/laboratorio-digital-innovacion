import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bestEntry, crisisReply, feelingReply, nextStepAdvice, OFFLINE_FALLBACK, offlineAnswer, parseBank, sectionLines } from '@/lib/zoeOffline';
import { parseTourReply, TOUR_STEPS } from '@/lib/zoeTour';
import { parseAgentReply } from '@/lib/zoeScreen';

const DOC = readFileSync(resolve(__dirname, '../src/content/zoe/documento-maestro.md'), 'utf8');
const bank = parseBank(DOC);
const first = () => 0;
const ask = (text: string, tool: Parameters<typeof offlineAnswer>[2]['tool'] = 'portal') => offlineAnswer(text, DOC, { tool, random: first });

describe('banco de preguntas sin conexión', () => {
  it('lee del documento maestro las preguntas frecuentes y las pantallas', () => {
    expect(bank.length).toBeGreaterThan(80);
    expect(bank.some((e) => e.question === '¿Qué es TRL?')).toBe(true);
    expect(bank.some((e) => e.question === 'Árbol de Innovación')).toBe(true);
    // Las reglas de estilo («Sin presión.») no son respuestas para decir en voz alta.
    expect(bank.some((e) => /Sin presión|Responde completo|Calidez primero/.test(e.question))).toBe(false);
  });

  it('encuentra la respuesta aunque se diga distinto y sin tildes', () => {
    expect(bestEntry(bank, 'que es el trl')?.question).toBe('¿Qué es TRL?');
    expect(bestEntry(bank, '¿quién eres tú?')?.question).toBe('¿Quién eres?');
    expect(bestEntry(bank, 'explícame la matriz foda')?.question).toBe('¿Qué es la matriz FODA?');
    expect(bestEntry(bank, 'qué significan n1 n2 y n3')?.question).toBe('¿Qué significan N1, N2 y N3?');
    expect(bestEntry(bank, 'cómo empiezo el recorrido')?.question).toBe('¿Cómo empiezo el recorrido?');
    expect(bestEntry(bank, 'para qué sirve el radar del observatorio')?.question).toBe('Radar del Observatorio');
  });

  it('no fuerza una respuesta que no tiene', () => {
    expect(bestEntry(bank, 'cuál es la capital de Francia')).toBeNull();
    expect(ask('cuál es la capital de Francia')).toBe(OFFLINE_FALLBACK);
  });

  it('chistes, ánimo y cariño salen del documento', () => {
    expect(sectionLines(DOC, /Chistes/i).length).toBeGreaterThan(10);
    expect(ask('cuéntame un chiste')).toBe(sectionLines(DOC, /Chistes/i)[0]);
    expect(ask('motívame')).toBe(sectionLines(DOC, /motivacionales/i)[0]);
  });

  it('el siguiente paso sale del trabajo real, sin inventar', () => {
    expect(nextStepAdvice({ studyBlocks: 0, studyIssues: 0, hasProposal: false, prototypes: [] })).toContain('muéstrame el laboratorio');
    expect(nextStepAdvice({ municipality: 'Sogamoso', studyBlocks: 12, studyIssues: 0, hasProposal: false, prototypes: [] })).toContain('Ideación');
    expect(nextStepAdvice({ studyBlocks: 0, studyIssues: 0, hasProposal: true, chosenTheme: null, prototypes: [] })).toContain('tres temas');
    expect(
      nextStepAdvice({ studyBlocks: 0, studyIssues: 0, hasProposal: true, treeTheme: 'Café', treeCounts: { frutos: 4, territorial: 3 }, prototypes: [] }),
    ).toContain('4 frutos');
  });

  it('sabe en qué pantalla está', () => {
    expect(ask('¿dónde estoy?', 'arbol')).toContain('Árbol de Innovación');
  });
});

describe('acompañamiento emocional', () => {
  it('reconoce cómo se siente la persona y la acompaña', () => {
    expect(feelingReply('estoy muy estresada con este trabajo', first)?.id).toBe('estres');
    expect(feelingReply('me siento cansado', first)?.id).toBe('cansancio');
    expect(feelingReply('no me sale nada, me rindo', first)?.id).toBe('frustracion');
    expect(feelingReply('hoy me siento muy triste', first)?.id).toBe('tristeza');
    expect(feelingReply('no sé si soy capaz de hacer esto', first)?.id).toBe('inseguridad');
    expect(feelingReply('no se me ocurre nada', first)?.id).toBe('bloqueo');
    expect(feelingReply('¡lo logré!', first)?.id).toBe('alegria');
    expect(ask('estoy muy estresado')).toContain('inhala');
  });

  it('un tema de trabajo no se confunde con una emoción', () => {
    expect(feelingReply('estoy trabajando en el estrés hídrico de los cultivos')).toBeNull();
    expect(feelingReply('el tema es la presión arterial en adultos mayores')).toBeNull();
    expect(feelingReply('¿qué es la ansiedad tecnológica?')).toBeNull();
  });

  it('ante una señal de riesgo da la ruta de ayuda, y no ante un tema de estudio', () => {
    for (const said of ['ya no quiero vivir', 'me quiero morir', 'estoy pensando en suicidarme', 'quiero hacerme daño']) {
      const reply = crisisReply(said);
      expect(reply, said).toContain('Línea 106');
      expect(reply, said).toContain('1 2 3');
      expect(ask(said)).toBe(reply);
    }
    expect(crisisReply('prevención del suicidio en jóvenes rurales')).toBeNull();
  });
});

describe('recorrido guiado', () => {
  it('pasa por todas las herramientas, empezando por el inicio', () => {
    expect(TOUR_STEPS.map((s) => s.tool)).toEqual(['portal', 'radar', 'estudio', 'ideacion', 'arbol', 'prototipado', 'banco']);
    for (const step of TOUR_STEPS) expect(step.explain.length, step.tool).toBeGreaterThan(100);
  });

  it('el ejemplo nunca presiona un botón: solo deja valores en campos', () => {
    for (const step of TOUR_STEPS) for (const field of step.example?.fields ?? []) expect(field.target.selector).toMatch(/^(#|textarea)/);
  });

  it('entiende lo que se dice entre parada y parada', () => {
    expect(parseTourReply('sí')).toBe('next');
    expect(parseTourReply('sigamos')).toBe('next');
    expect(parseTourReply('listo, continúa')).toBe('next');
    expect(parseTourReply('repite')).toBe('repeat');
    expect(parseTourReply('no te entendí')).toBe('repeat');
    expect(parseTourReply('volvamos a la anterior')).toBe('back');
    expect(parseTourReply('espera')).toBe('wait');
    expect(parseTourReply('todavía no')).toBe('wait');
    expect(parseTourReply('terminar recorrido')).toBe('stop');
    expect(parseTourReply('¿qué diferencia hay entre una tendencia y una señal del observatorio en el radar?')).toBeNull();
  });
});

describe('la IA puede pedir movimientos', () => {
  it('acepta «animar» con un movimiento conocido y descarta los que cortan la charla', () => {
    const reply = parseAgentReply(
      '{"decir": "¡Mira!", "acciones": [{"hacer": "animar", "movimiento": "sacudirse"}, {"hacer": "animar", "movimiento": "Girar"}, {"hacer": "animar", "movimiento": "casita"}, {"hacer": "animar", "movimiento": "volar"}]}',
    );
    expect(reply.acciones).toEqual([
      { hacer: 'animar', movimiento: 'shake' },
      { hacer: 'animar', movimiento: 'spin' },
    ]);
  });
});
