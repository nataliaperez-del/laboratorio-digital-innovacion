import { describe, expect, it } from 'vitest';
import { cleanZoeReply, describeWork, isDoneReply, parseZoeCommand, seemsUnfinished, wantsMoreTime } from '@/lib/zoeContext';
import { recognitionLang, splitSentences } from '@/components/zoe/useZoeVoice';

describe('órdenes de voz', () => {
  it('navega solo con un verbo de acción', () => {
    expect(parseZoeCommand('Llévame al árbol')).toEqual({ type: 'navigate', tool: 'arbol' });
    expect(parseZoeCommand('abre el estudio territorial')).toEqual({ type: 'navigate', tool: 'estudio' });
    expect(parseZoeCommand('vamos a prototipado')).toEqual({ type: 'navigate', tool: 'prototipado' });
  });

  it('una pregunta o una mención no cambian de pantalla', () => {
    expect(parseZoeCommand('¿Qué es el tema central del árbol?')).toBeNull();
    expect(parseZoeCommand('Me interesa el territorio de Pasto')).toBeNull();
    expect(parseZoeCommand('¿Cómo abro el radar?')).toBeNull();
    expect(parseZoeCommand('el día está claro')).toBeNull();
  });

  it('entiende el tema visual y el descanso', () => {
    expect(parseZoeCommand('pon el modo oscuro')).toEqual({ type: 'theme', value: 'dark' });
    expect(parseZoeCommand('Zoe, a dormir')).toEqual({ type: 'sleep' });
    expect(parseZoeCommand('acuéstate')).toEqual({ type: 'sleep' });
    expect(parseZoeCommand('Zoe, por favor siéntate')).toEqual({ type: 'sit' });
    expect(parseZoeCommand('levántate')).toEqual({ type: 'stand' });
    expect(parseZoeCommand('zoe camina un poco')).toEqual({ type: 'walk' });
    expect(parseZoeCommand('¿Cómo camina un proyecto de innovación?')).toBeNull();
    expect(recognitionLang(['es-419', 'es'])).toBe('es-CO');
    expect(recognitionLang(['en-US', 'es-MX'])).toBe('es-MX');
  });
});

describe('voz', () => {
  it('parte en frases sin perder texto', () => {
    const parts = splitSentences('¡Hola, hola! ¿Qué tenemos hoy? Yo olfateo ideas.');
    expect(parts).toEqual(['¡Hola, hola!', '¿Qué tenemos hoy?', 'Yo olfateo ideas.']);
    expect(splitSentences('Sin puntuación final')).toEqual(['Sin puntuación final']);
  });

  it('limpia la respuesta para leerla en voz alta', () => {
    expect(cleanZoeReply('ZOE: **¡Hola!** Mira:\n- esto')).toBe('¡Hola! Mira:\nesto');
  });
});

describe('contexto de ZOE', () => {
  it('describe solo lo que existe', () => {
    const empty = describeWork({ studyBlocks: 0, studyIssues: 0, hasProposal: false, prototypes: [] });
    expect(empty).toContain('Sin Estudio Territorial');
    expect(empty).toContain('Sin árbol');
    const full = describeWork({
      municipality: 'Pitalito', department: 'Huila', studyBlocks: 12, studyIssues: 1,
      ideationSource: 'Café', hasProposal: true, chosenTheme: 'Biofábricas',
      treeTheme: 'Café', treeCounts: { frutos: 3, territorial: 3 }, prototypes: ['Plan A'],
    });
    expect(full).toContain('Pitalito, Huila: 12 bloques, 1 por revisar');
    expect(full).toContain('tema elegido «Biofábricas»');
    expect(full).toContain('Plan A');
  });
});

describe('turno de palabra', () => {
  it('detecta una frase cortada por una pausa', () => {
    expect(seemsUnfinished('quiero hacer un prototipo para')).toBe(true);
    expect(seemsUnfinished('el municipio de Pitalito y')).toBe(true);
    expect(seemsUnfinished('¿qué es un árbol de innovación?')).toBe(false);
    expect(seemsUnfinished('ayúdame con la ficha base')).toBe(false);
  });

  it('reconoce cuando la persona confirma que terminó o pide tiempo', () => {
    expect(isDoneReply('sí, ya')).toBe(true);
    expect(isDoneReply('listo')).toBe(true);
    expect(isDoneReply('sí quiero agregar que el territorio es rural y tiene café')).toBe(false);
    expect(wantsMoreTime('espera, déjame pensar')).toBe(true);
    expect(wantsMoreTime('esperanza es el municipio')).toBe(false);
  });

  it('parte las frases muy largas para que el navegador no las corte', () => {
    const long = Array.from({ length: 12 }, (_, i) => `idea número ${i + 1} con algo de contexto`).join(', ') + '.';
    const parts = splitSentences(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 200)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });
});
