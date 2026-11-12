import { describe, expect, it } from 'vitest';
import { isResumeRequest, remainingAfter } from '@/lib/zoeInterrupt';

const FULL = 'El Radar muestra tendencias. Cada señal tiene un nivel de madurez. Puedes llevarlas a Validar Conceptos.';

describe('interrumpir a ZOE sin perder el hilo', () => {
  it('lo que faltaba, tras la última frase que sonó', () => {
    expect(remainingAfter(FULL, ['El Radar muestra tendencias.'])).toBe('Cada señal tiene un nivel de madurez. Puedes llevarlas a Validar Conceptos.');
    expect(remainingAfter(FULL, ['El Radar muestra tendencias.', 'Cada señal tiene un nivel de madurez.'])).toBe('Puedes llevarlas a Validar Conceptos.');
  });

  it('si no sonó nada, falta todo; si sonó todo, no falta nada', () => {
    expect(remainingAfter(FULL, [])).toBe(FULL);
    expect(remainingAfter(FULL, ['Puedes llevarlas a Validar Conceptos.'])).toBe('');
  });

  it('si la voz reescribió el texto, cuenta por frases', () => {
    expect(remainingAfter(FULL, ['El radar muestra tendencias'])).not.toBe('');
    expect(remainingAfter('Hay 3 niveles. Luego sigues. Fin.', ['Hay tres niveles.'])).toBe('Luego sigues. Fin.');
  });

  it('reconoce el «sigue» y no confunde un tema nuevo', () => {
    for (const t of ['sigue', 'Continúa por favor', 'dale, sigue', 'termina lo que decías', '¿Qué me decías?', 'y luego', 'sigamos con eso']) expect(isResumeRequest(t), t).toBe(true);
    for (const t of ['sigue el radar a la izquierda de la pantalla del árbol', 'llévame al radar', '¿qué es el TRL?', 'no, otra cosa']) expect(isResumeRequest(t), t).toBe(false);
  });
});
