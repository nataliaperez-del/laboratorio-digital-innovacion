import { describe, expect, it } from 'vitest';
import {
  COME_OUT_GREETINGS,
  INITIAL_GREETINGS,
  OFFLINE_GREETINGS,
  READY_YES_RESPONSES,
  READY_NO_RESPONSES,
  pickComeOutGreeting,
  pickInitialGreeting,
  pickOfflineGreeting,
  pickReadyYes,
  pickReadyNo,
} from '@/lib/zoeGreetings';

describe('saludos de ZOE', () => {
  it('tiene suficientes saludos para evitar monotonía', () => {
    expect(COME_OUT_GREETINGS.length).toBeGreaterThanOrEqual(8);
    expect(INITIAL_GREETINGS.length).toBeGreaterThanOrEqual(6);
    expect(OFFLINE_GREETINGS.length).toBeGreaterThanOrEqual(6);
    expect(READY_YES_RESPONSES.length).toBeGreaterThanOrEqual(3);
    expect(READY_NO_RESPONSES.length).toBeGreaterThanOrEqual(3);
  });

  it('al salir de la casita devuelve un saludo válido', () => {
    const greeting = pickComeOutGreeting(() => 0);
    expect(COME_OUT_GREETINGS).toContain(greeting);
    expect(greeting).toMatch(/¡|hola|aquí|presente/i);
  });

  it('evita repetir el saludo inicial reciente', () => {
    const first = INITIAL_GREETINGS[0];
    const next = pickInitialGreeting([first], () => 0);
    expect(next).not.toBe(first);
    expect(INITIAL_GREETINGS).toContain(next);
  });

  it('evita repetir el saludo offline reciente', () => {
    const first = OFFLINE_GREETINGS[0];
    const next = pickOfflineGreeting([first], () => 0);
    expect(next).not.toBe(first);
    expect(OFFLINE_GREETINGS).toContain(next);
  });

  it('ofrece respuestas variadas al confirmar listo o no listo', () => {
    const yes = pickReadyYes(() => 0);
    const no = pickReadyNo(() => 0);
    expect(READY_YES_RESPONSES).toContain(yes);
    expect(READY_NO_RESPONSES).toContain(no);
  });

  it('todos los saludos conservan la calidez y el lenguaje del laboratorio sin términos prohibidos', () => {
    const all = [
      ...COME_OUT_GREETINGS,
      ...INITIAL_GREETINGS,
      ...OFFLINE_GREETINGS,
      ...READY_YES_RESPONSES,
      ...READY_NO_RESPONSES,
    ];

    for (const text of all) {
      expect(text).not.toMatch(/\bCIP\b/);
      expect(text).not.toMatch(/Centro de Innovación y Productividad/i);
      expect(text).not.toMatch(/Contenedor 1|Contenedor 2/i);
      expect(text).not.toMatch(/documento fundante/i);
    }
  });
});
