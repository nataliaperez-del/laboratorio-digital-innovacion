import { describe, expect, it } from 'vitest';
import { pauseAfter, shapeSentence, speechSentences, speechText, withQuickStart } from '@/components/zoe/zoePiperVoice';

describe('voz propia: texto para pronunciar', () => {
  it('expande las abreviaturas que espeak toma como fin de oración', () => {
    expect(speechText('El Sr. Pérez y la Dra. Gómez, aprox. 20 personas.')).toBe('El señor Pérez y la doctora Gómez, aproximadamente 20 personas.');
    expect(speechText('Ver el No. 5, pág. 3.')).toBe('Ver el número 5, página 3.');
  });

  it('respeta las pausas de los puntos suspensivos y lee «y/o»', () => {
    expect(speechText('Bien… sigamos.')).toBe('Bien, sigamos.');
    expect(speechText('A ver...')).toBe('A ver.');
    expect(speechText('Ideas y/o retos.')).toBe('Ideas y o retos.');
  });

  it('quita el formato y los emojis, y nombra bien el Observatorio', () => {
    expect(speechText('**Hola** 🙂 desde InnovaHub360.')).toBe('Hola desde Innova Jab tres sesenta.');
    // Siglas: espeak ya las lee bien («i-a», «unad», «te erre ele»); no se tocan.
    expect(speechText('La IA de la UNAD y el TRL.')).toBe('La IA de la UNAD y el TRL.');
  });
});

describe('voz propia: oraciones', () => {
  it('parte donde termina una idea', () => {
    expect(speechSentences('¡Hola, hola! ¿Qué tenemos hoy? Yo olfateo ideas.')).toEqual(['¡Hola, hola!', '¿Qué tenemos hoy?', 'Yo olfateo ideas.']);
  });

  it('no parte en abreviaturas, iniciales, decimales ni «no» antes de un número', () => {
    expect(speechSentences('Por ejemplo, p. ej. Pitalito. Cuesta 3.5 millones. Lo dijo el Sr. Pérez y J. Gómez.')).toEqual([
      'Por ejemplo, p. ej. Pitalito.',
      'Cuesta 3.5 millones.',
      'Lo dijo el Sr. Pérez y J. Gómez.',
    ]);
    expect(speechSentences('Mira el No. 5 de la lista. Claro que no. Pero sí.')).toEqual(['Mira el No. 5 de la lista.', 'Claro que no.', 'Pero sí.']);
  });

  it('deja entera una oración larga y solo parte las desmedidas por su coma central', () => {
    const long = `${'palabra '.repeat(30).trim()}, ${'otra '.repeat(30).trim()}.`;
    expect(speechSentences(long)).toEqual([long]);
    const huge = `${'palabra '.repeat(40).trim()}, ${'otra '.repeat(45).trim()}.`;
    const parts = speechSentences(huge);
    expect(parts).toHaveLength(2);
    expect(parts[0].endsWith(',')).toBe(true);
    expect(parts.join(' ')).toBe(huge);
  });

  it('dice primero un tramo corto si la primera oración es larga', () => {
    const first = 'Cuando quieras empezamos por el árbol de innovación, que tiene raíces, tronco, hojas y frutos para explorar.';
    expect(withQuickStart([first, 'Luego seguimos.'])).toEqual([
      'Cuando quieras empezamos por el árbol de innovación,',
      'que tiene raíces, tronco, hojas y frutos para explorar.',
      'Luego seguimos.',
    ]);
    expect(withQuickStart(['Hola.', first])).toEqual(['Hola.', first]);
  });
});

describe('voz propia: ritmo y bordes', () => {
  it('respira más tras una pregunta o unos puntos suspensivos que tras una coma', () => {
    const fixed = () => 0.5;
    expect(pauseAfter('¿Seguimos?', fixed)).toBe(380);
    expect(pauseAfter('Listo.', fixed)).toBe(320);
    expect(pauseAfter('Bueno…', fixed)).toBe(520);
    expect(pauseAfter('Primero,', fixed)).toBe(150);
    expect(pauseAfter('Dijo «hola».', fixed)).toBe(320);
    const varied = pauseAfter('Listo.', () => 1);
    expect(varied).toBeGreaterThan(320);
    expect(varied).toBeLessThanOrEqual(360);
  });

  it('recorta el silencio de los bordes, iguala el volumen y suaviza la entrada', () => {
    const rate = 1000;
    const pcm = new Float32Array(1000);
    for (let i = 300; i < 700; i++) pcm[i] = 0.3 * Math.sin(i / 3);
    const out = shapeSentence(pcm, rate);
    // 30 ms antes y 60 ms después del sonido.
    expect(out.length).toBeGreaterThanOrEqual(400);
    expect(out.length).toBeLessThan(500);
    expect(Math.max(...Array.from(out, Math.abs))).toBeCloseTo(0.9, 1);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(0);
    expect(shapeSentence(new Float32Array(50), rate)).toHaveLength(0);
  });
});
