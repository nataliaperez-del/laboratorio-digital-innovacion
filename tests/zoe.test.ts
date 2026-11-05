import { describe, expect, it } from 'vitest';
import { cleanZoeReply, describeWork, isDoneReply, parseZoeCommand, seemsUnfinished, TOOL_NAMES, wantsMoreTime } from '@/lib/zoeContext';
import { recognitionLang, splitSentences } from '@/components/zoe/useZoeVoice';
import { normalizeClipName, pickClips } from '@/components/zoe/zoeClipDirector';

describe('órdenes de voz', () => {
  it('navega solo con un verbo de acción', () => {
    expect(parseZoeCommand('Llévame al árbol')).toEqual({ type: 'navigate', tool: 'arbol' });
    expect(parseZoeCommand('abre el estudio territorial')).toEqual({ type: 'navigate', tool: 'estudio' });
    expect(parseZoeCommand('vamos a prototipado')).toEqual({ type: 'navigate', tool: 'prototipado' });
  });

  it('navega también por el título grande de cada módulo', () => {
    expect(parseZoeCommand('llévame a identificar oportunidades')).toEqual({ type: 'navigate', tool: 'estudio' });
    expect(parseZoeCommand('abre crear conceptos')).toEqual({ type: 'navigate', tool: 'ideacion' });
    expect(parseZoeCommand('vamos a validar conceptos')).toEqual({ type: 'navigate', tool: 'arbol' });
    expect(parseZoeCommand('llévame a desarrollar soluciones')).toEqual({ type: 'navigate', tool: 'prototipado' });
    expect(parseZoeCommand('abre el contenedor de resultados')).toEqual({ type: 'navigate', tool: 'banco' });
    expect(TOOL_NAMES.estudio).toBe('Identificar Oportunidades');
    expect(TOOL_NAMES.arbol).toBe('Validar Conceptos');
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
    // Acostarse ya no es dormir: se echa y sigue escuchando.
    expect(parseZoeCommand('acuéstate')).toEqual({ type: 'lie' });
    expect(parseZoeCommand('Zoe, por favor siéntate')).toEqual({ type: 'sit' });
    expect(parseZoeCommand('levántate')).toEqual({ type: 'stand' });
    expect(parseZoeCommand('zoe camina un poco')).toEqual({ type: 'walk' });
    expect(parseZoeCommand('¿Cómo camina un proyecto de innovación?')).toBeNull();
    expect(parseZoeCommand('Zoe, ve a tu casita')).toEqual({ type: 'home' });
    expect(parseZoeCommand('vete a tu casa')).toEqual({ type: 'home' });
    expect(parseZoeCommand('a la casita')).toEqual({ type: 'home' });
    expect(parseZoeCommand('escóndete')).toEqual({ type: 'home' });
    expect(parseZoeCommand('¿Tienes una casita?')).toBeNull();
    expect(recognitionLang(['es-419', 'es'])).toBe('es-CO');
    expect(recognitionLang(['en-US', 'es-MX'])).toBe('es-MX');
  });

  it('entiende los movimientos, dichos como se digan', () => {
    const cases: Array<[string, string]> = [
      ['sacúdete', 'shake'],
      ['Zoe, sacúdete', 'shake'],
      ['¿puedes sacudirte?', 'shake'],
      ['quiero que te sacudas', 'shake'],
      ['da vueltas', 'spin'],
      ['Zoe, da una vuelta', 'spin'],
      ['gira', 'spin'],
      ['persigue tu cola', 'spin'],
      ['siéntate', 'sit'],
      ['quiero que te sientes', 'sit'],
      ['párate', 'stand'],
      ['ponte de pie', 'stand'],
      ['échate', 'lie'],
      ['da un paseo', 'walk'],
      ['Zoe, ven', 'come'],
      ['ven aquí', 'come'],
      ['acércate', 'come'],
      ['muévete', 'move'],
      ['hazte a un lado', 'move'],
      ['me estás tapando', 'move'],
      ['mueve la cola', 'wag'],
      ['salta', 'jump'],
      ['haz una reverencia', 'bow'],
      ['saluda', 'bow'],
      ['quieto', 'still'],
      ['vete a tu casa', 'home'],
    ];
    for (const [said, type] of cases) expect(parseZoeCommand(said), said).toEqual({ type });
  });

  it('una conversación sobre esos temas no mueve a ZOE', () => {
    expect(parseZoeCommand('¿Por qué te sacudes tanto?')).toBeNull();
    expect(parseZoeCommand('el mercado gira alrededor del café')).toBeNull();
    expect(parseZoeCommand('las ventajas del prototipo')).toBeNull();
    expect(parseZoeCommand('vengo de Pitalito')).toBeNull();
  });

  it('pide el recorrido guiado', () => {
    for (const said of [
      'Muéstrame el laboratorio',
      'hazme un recorrido',
      'quiero una demostración guiada',
      '¿me muestras el laboratorio?',
      'Zoe, guíame por el laboratorio',
    ]) {
      expect(parseZoeCommand(said), said).toEqual({ type: 'tour' });
    }
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

  it('nunca empieza con «mmm» ni otro titubeo, sin comerse palabras', () => {
    expect(cleanZoeReply('Mmm, buena pregunta.')).toBe('Buena pregunta.');
    expect(cleanZoeReply('Hmm… mmm. El árbol tiene tres niveles.')).toBe('El árbol tiene tres niveles.');
    expect(cleanZoeReply('Ehh, claro que sí.')).toBe('Claro que sí.');
    expect(cleanZoeReply('Empecemos por la ficha.')).toBe('Empecemos por la ficha.');
    expect(cleanZoeReply('¡Woa, woa! Déjame pensarlo.')).toBe('¡Woa, woa! Déjame pensarlo.');
  });
});

describe('contexto de ZOE', () => {
  it('describe solo lo que existe', () => {
    const empty = describeWork({ studyBlocks: 0, studyIssues: 0, hasProposal: false, prototypes: [] });
    expect(empty).toContain('Sin Estudio Territorial');
    expect(empty).toContain('Sin árbol');
    const full = describeWork({
      municipality: 'Pitalito',
      department: 'Huila',
      studyBlocks: 12,
      studyIssues: 1,
      ideationSource: 'Café',
      hasProposal: true,
      chosenTheme: 'Biofábricas',
      treeTheme: 'Café',
      treeCounts: { frutos: 3, territorial: 3 },
      prototypes: ['Plan A'],
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

describe('director de clips', () => {
  it('reconoce los clips de un autorig de cuadrúpedos (afk.ai)', () => {
    const roles = pickClips(['Idle', 'Idle Alert', 'Walk', 'Trot', 'Sit', 'Lie Down', 'Sleep', 'Tail Wag', 'Play Bow', 'Beg', 'Ear Scratch', 'Shake', 'Bark']);
    expect(roles).toMatchObject({
      idle: 'Idle',
      alert: 'Idle Alert',
      walk: 'Walk',
      trot: 'Trot',
      sit: 'Sit',
      lie: 'Lie Down',
      sleep: 'Sleep',
      happy: 'Tail Wag',
      play: 'Play Bow',
      wave: 'Beg',
      scratch: 'Ear Scratch',
      shake: 'Shake',
    });
  });

  it('entiende los nombres de este proyecto y los prefijos de Blender', () => {
    expect(pickClips(['walk', 'sit', 'lie'])).toEqual({ walk: 'walk', sit: 'sit', lie: 'lie' });
    expect(normalizeClipName('Armature|Lie Down|baselayer')).toBe('liedown');
    expect(pickClips(['Armature|Walking|baselayer'])).toEqual({ walk: 'Armature|Walking|baselayer' });
  });

  it('no confunde «Idle Alert» con el reposo cuando falta «Idle»', () => {
    expect(pickClips(['Idle Alert'])).toEqual({ alert: 'Idle Alert' });
  });
});
