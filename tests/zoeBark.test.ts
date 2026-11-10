import { describe, expect, it } from 'vitest';
import { BARK_FILES, pickBark, splitBarks } from '@/lib/zoeBark';

describe('ladridos de ZOE', () => {
  it('quita «woa, woa» y deja el resto de la frase', () => {
    expect(splitBarks('¡Woa, woa! Déjame pensarlo.')).toEqual({ barks: 1, rest: 'Déjame pensarlo.' });
    expect(splitBarks('Woa, woa… a ver, a ver.')).toEqual({ barks: 1, rest: 'a ver, a ver.' });
    expect(splitBarks('¡Woa, woa, quedó muy bien! La vocación dice: x.').rest).toBe('quedó muy bien! La vocación dice: x.');
  });

  it('una frase sin ladrido queda igual', () => {
    expect(splitBarks('Hola, ¿cómo estás?')).toEqual({ barks: 0, rest: 'Hola, ¿cómo estás?' });
  });

  it('solo el ladrido deja el resto vacío', () => {
    expect(splitBarks('¡Woa, woa!')).toEqual({ barks: 1, rest: '' });
  });

  it('no repite el mismo ladrido seguido', () => {
    for (let prev = 0; prev < BARK_FILES.length; prev++) {
      for (const r of [0, 0.3, 0.6, 0.99]) expect(pickBark(prev, () => r)).not.toBe(prev);
    }
  });
});
