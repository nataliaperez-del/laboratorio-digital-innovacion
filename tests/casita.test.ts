import { describe, expect, it } from 'vitest';
import { parseZoeCommand } from '@/lib/zoeContext';

describe('orden de voz: ZOE a su casita', () => {
  it('la reconoce dicha de muchas formas', () => {
    for (const said of [
      'Zoe, ve a tu casita',
      'vete a tu casa',
      'Zoe vete a tu casa',
      'vete a casa',
      'ya vete a tu casita',
      'ya puedes irte a tu casa',
      '¿Puedes irte a tu casita?',
      'regresa a tu casita',
      'vuelve a la casa',
      'métete en tu casita',
      'ándate para tu casa',
      'a tu casita',
      'a tu casa, Zoe',
      'a casa',
      'Zoé, a la casita',
      'Soe vete a tu casa por favor',
      'escóndete',
      'guárdate un rato',
      'vete a dormir a tu casita',
    ]) {
      expect(parseZoeCommand(said), said).toEqual({ type: 'home' });
    }
  });

  it('no la confunde con una pregunta ni con un lugar del territorio', () => {
    expect(parseZoeCommand('¿Tienes una casita?')).toBeNull();
    expect(parseZoeCommand('¿Dónde queda tu casa?')).toBeNull();
    expect(parseZoeCommand('ve a la casa de la cultura de Pitalito')).toBeNull();
    expect(parseZoeCommand('mi casa queda en Garzón')).toBeNull();
  });

  it('las demás órdenes siguen igual', () => {
    expect(parseZoeCommand('Zoe, a dormir')).toEqual({ type: 'sleep' });
    expect(parseZoeCommand('Llévame al árbol')).toEqual({ type: 'navigate', tool: 'arbol' });
    expect(parseZoeCommand('Zoé, siéntate')).toEqual({ type: 'sit' });
  });
});
