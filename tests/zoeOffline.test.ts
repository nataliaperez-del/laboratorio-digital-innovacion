import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bestEntry, crisisReply, feelingReply, nextStepAdvice, OFFLINE_FALLBACK, offlineAnswer, parseBank, sectionLines } from '@/lib/zoeOffline';
import {
  describeProgress,
  firstSentence,
  joinNames,
  parseTourReply,
  readyQuestion,
  TOUR_STEPS,
  type TourContext,
  type TourSnapshot,
  type TourTarget,
} from '@/lib/zoeTour';
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
  /** Un Laboratorio de mentira: registra lo que ZOE dice, escribe y presiona, y «genera» al instante. */
  function fakeLab(initial: Partial<TourSnapshot> = {}) {
    const snap: TourSnapshot = {
      study: { blocks: 0, issues: 0 },
      ideation: { has: false, themes: [] },
      tree: { has: false, global: 0, nacional: 0, territorial: 0, hojas: 0, frutos: [] },
      prototype: { has: false, phases: 0, metrics: [] },
      bank: { studies: 0, ideations: 0, trees: 0, prototypes: 0 },
      ...initial,
    };
    const log: string[] = [];
    const said: string[] = [];
    const show = (t: TourTarget) => `${t.selector ?? ''} ${t.text ?? ''}`.trim();
    const ctx: TourContext = {
      alive: () => true,
      wait: async () => undefined,
      say: async (text) => void said.push(text),
      show: async (_t, text) => (said.push(text), true),
      set: async (t, value) => (log.push(`set ${show(t)} = ${value}`), true),
      check: async (t) => (log.push(`check ${show(t)}`), true),
      press: async (t) => (log.push(`press ${show(t)}`), true),
      exists: () => true,
      label: () => 'Bioinsumos. Área Agro, impacto 80%, adopción 40%, prioridad alta',
      snapshot: () => snap,
      generate: async (button, done, narration) => {
        log.push(`generate ${show(button)}`);
        said.push(...narration.map((b) => b.say));
        // La IA «termina»: cada herramienta deja su resultado real en el estado.
        snap.study = { blocks: 12, issues: 1, municipality: 'Sogamoso' };
        if (/vocaci/.test(String(button.text)))
          snap.ideation = { has: true, vocation: 'Abono para fincas.', themes: ['A', 'B', 'C'], chosen: 'A', chosenBody: 'Cuerpo.' };
        if (/árbol/.test(String(button.text))) snap.tree = { has: true, tema: 'A', global: 10, nacional: 5, territorial: 3, hojas: 9, frutos: ['F1', 'F2'] };
        if (/plan/.test(String(button.text))) {
          snap.prototype = {
            has: true,
            name: 'Compostera',
            hypothesis: 'Si hacemos esto, pasará aquello.',
            trl: 'TRL 4',
            weeks: 12,
            phases: 3,
            metrics: ['uso', 'costo'],
          };
          snap.bank = { ...snap.bank, prototypes: snap.bank.prototypes + 1 };
        }
        return done() ? 'ok' : 'error';
      },
    };
    return { ctx, log, said, snap };
  }

  it('pasa por todas las herramientas, empezando por el inicio', () => {
    expect(TOUR_STEPS.map((s) => s.tool)).toEqual(['portal', 'radar', 'estudio', 'ideacion', 'arbol', 'prototipado', 'banco']);
    expect(readyQuestion(0)).toContain('Estoy aquí contigo');
    expect(readyQuestion(2)).toBe('¿Seguimos con Ideación? Estoy aquí contigo.');
  });

  it('hace el ejercicio completo de punta a punta, encadenando cada resultado', async () => {
    const lab = fakeLab();
    for (const step of TOUR_STEPS) await step.run(lab.ctx);
    const generated = lab.log.filter((l) => l.startsWith('generate'));
    expect(generated).toHaveLength(4);
    // La ideación parte del estudio recién hecho; el árbol, del tema elegido; el prototipo, de un fruto.
    expect(lab.log).toContain('press [aria-label="Tipo de insumo"] button /Estudio Territorial/');
    expect(lab.log).toContain('set #tree-theme = A');
    expect(lab.log).toContain('check label /Usar el Estudio Territorial/');
    expect(lab.log).toContain('press [aria-label="Datos del plan"] button.lab-card');
    // Explica el resultado real, no uno inventado.
    const all = lab.said.join(' ');
    expect(all).toContain('12 bloques');
    expect(all).toContain('«A», «B» y «C»');
    expect(all).toContain('10 tendencias globales');
    expect(all).toContain('«Compostera»');
  });

  it('si la herramienta tiene trabajo, la limpia antes; y nunca presiona «Regenerar» ni «Eliminar»', async () => {
    const lab = fakeLab({
      study: { blocks: 12, issues: 0, municipality: 'Pasto' },
      ideation: { has: true, themes: ['X'] },
      tree: { has: true, tema: 'X', global: 1, nacional: 1, territorial: 1, hojas: 1, frutos: ['F'] },
      prototype: { has: true, phases: 1, metrics: [] },
    });
    for (const step of TOUR_STEPS.slice(2, 6)) await step.run(lab.ctx);
    expect(lab.log.filter((l) => l === 'press button /^Limpiar$/')).toHaveLength(4);
    expect(lab.log.some((l) => /Regenerar|de nuevo|Eliminar|Detener/.test(l))).toBe(false);
  });

  it('sin IA no se angustia: explica y deja todo listo', async () => {
    const lab = fakeLab();
    lab.ctx.generate = async () => 'offline';
    await TOUR_STEPS[2].run(lab.ctx);
    expect(lab.said.join(' ')).toContain('paseíto');
  });

  it('el repaso no vuelve a generar', async () => {
    const lab = fakeLab();
    for (const step of TOUR_STEPS) await step.recap(lab.ctx);
    expect(lab.log.filter((l) => l.startsWith('generate') || l.includes('Limpiar'))).toEqual([]);
  });

  it('lee el avance real y deja frases cortas para la voz', () => {
    expect(describeProgress('Bloque 3 de 12: Pilares de competitividadDetener')).toBe('el bloque 3 de 12, Pilares de competitividad');
    expect(describeProgress('Parte 2 de 4: Vocación')).toBe('la parte 2 de 4, Vocación');
    expect(describeProgress('Cargando…')).toBeNull();
    expect(firstSentence('## Vocación\n\n**Fortalecer** la economía circular del agro. Segunda frase.')).toBe('Fortalecer la economía circular del agro.');
    expect(joinNames(['A', 'B', 'C'])).toBe('«A», «B» y «C»');
  });

  it('entiende lo que se dice entre parada y parada', () => {
    expect(parseTourReply('sí')).toBe('next');
    expect(parseTourReply('sigamos')).toBe('next');
    expect(parseTourReply('listo, continúa')).toBe('next');
    expect(parseTourReply('empecemos')).toBe('next');
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
