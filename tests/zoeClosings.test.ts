import { describe, expect, it } from 'vitest';
import { CLOSINGS, splitClosing, varyClosing } from '@/lib/zoeClosings';

const SAME = '¿Todo listo para continuar? Estoy aquí contigo.';

describe('cierres de ZOE', () => {
  it('separa el cuerpo de la respuesta de su cierre', () => {
    expect(splitClosing(`El árbol convierte tendencias en frutos. ${SAME}`)).toEqual({ body: 'El árbol convierte tendencias en frutos.', closing: SAME });
    expect(splitClosing('El árbol convierte tendencias en frutos.')).toEqual({ body: 'El árbol convierte tendencias en frutos.', closing: '' });
    // Una oración larga que solo menciona «seguimos» es contenido, no un cierre.
    expect(splitClosing('Después de elegir el tema seguimos con el árbol, que parte de las diez tendencias globales y las aterriza.').closing).toBe('');
  });

  it('deja la respuesta igual si su cierre no se ha usado hace poco', () => {
    const reply = `Ya quedó el estudio. ${SAME}`;
    expect(varyClosing(reply, [])).toBe(reply);
    expect(varyClosing(reply, ['Hola.', 'El radar muestra tendencias. ¿Seguimos? Voy a tu ritmo.'])).toBe(reply);
    expect(varyClosing('Ya quedó el estudio.', [reply])).toBe('Ya quedó el estudio.');
  });

  it('cambia el cierre cuando repite el de una respuesta reciente', () => {
    const before = [`Ya quedó el estudio. ${SAME}`];
    const out = varyClosing(`Listo, generé la ideación. ${SAME}`, before, () => 0);
    expect(out).not.toContain(SAME);
    expect(out.startsWith('Listo, generé la ideación. ')).toBe(true);
    expect(CLOSINGS).toContain(out.replace('Listo, generé la ideación. ', ''));
  });

  it('en una charla larga nunca dice el mismo cierre dos veces seguidas', () => {
    const history: string[] = [];
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) % 1000) / 1000;
    for (let i = 0; i < 30; i++) history.push(varyClosing(`Respuesta ${i}. ${SAME}`, history, random));
    const closings = history.map((r) => splitClosing(r).closing);
    for (let i = 1; i < closings.length; i++) {
      expect(closings[i]).not.toBe(closings[i - 1]);
      // Tampoco repite ninguno de los cuatro anteriores.
      expect(closings.slice(Math.max(0, i - 4), i)).not.toContain(closings[i]);
    }
    expect(new Set(closings).size).toBeGreaterThan(5);
  });

  it('reconoce como cierre repetido aunque cambien tildes, mayúsculas o signos', () => {
    const out = varyClosing('Hecho. ¿todo listo para continuar? estoy aqui contigo', [`Antes. ${SAME}`], () => 0);
    expect(out).not.toMatch(/todo listo para continuar/i);
  });

  it('una respuesta que es solo el cierre repetido también cambia', () => {
    const out = varyClosing(SAME, [SAME], () => 0);
    expect(out).not.toBe(SAME);
    expect(CLOSINGS).toContain(out);
  });
});
