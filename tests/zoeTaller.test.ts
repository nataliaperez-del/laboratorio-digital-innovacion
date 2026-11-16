import { describe, expect, it } from 'vitest';
import { CONFIRM_NO, CONFIRM_QUESTIONS, CONFIRM_YES, isTallerCommand, parseTallerReply, reviewPrompt, TALLER_PHASES } from '../src/lib/zoeTaller';

describe('modo taller de ZOE', () => {
  it('se activa diciendo «Taller de innovación», con o sin acentos y con el nombre de ZOE', () => {
    expect(isTallerCommand('Taller de innovación')).toBe(true);
    expect(isTallerCommand('zoe, activa el taller de innovacion')).toBe(true);
    expect(isTallerCommand('quiero hacer un taller de innovación hoy')).toBe(true);
    expect(isTallerCommand('llévame al árbol')).toBe(false);
    expect(isTallerCommand('innovación')).toBe(false);
  });

  it('las cuatro fases suman 33 minutos y siguen el orden de las herramientas', () => {
    expect(TALLER_PHASES.map((p) => p.tool)).toEqual(['estudio', 'ideacion', 'arbol', 'prototipado']);
    expect(TALLER_PHASES.reduce((n, p) => n + p.minutes, 0)).toBe(33);
    for (const p of TALLER_PHASES) expect(p.intro.length).toBeGreaterThan(80);
  });

  it('al empezar, «listos» arranca y «terminamos» todavía no significa nada', () => {
    expect(parseTallerReply('listos', 'start')).toBe('yes');
    expect(parseTallerReply('sí, empecemos', 'start')).toBe('yes');
    expect(parseTallerReply('terminamos', 'start')).toBeNull();
  });

  it('mientras trabajan, «terminamos» pasa a la discusión y un comentario cualquiera no', () => {
    expect(parseTallerReply('terminamos', 'working')).toBe('done');
    expect(parseTallerReply('ya terminamos', 'working')).toBe('done');
    expect(parseTallerReply('ZOE, ya quedó', 'working')).toBe('done');
    expect(parseTallerReply('qué es un árbol de innovación', 'working')).toBeNull();
  });

  it('al discutir, «ya volvimos» lleva a la pregunta de validación', () => {
    expect(parseTallerReply('ya volvimos', 'discussing')).toBe('done');
    expect(parseTallerReply('regresamos', 'discussing')).toBe('done');
    expect(parseTallerReply('estamos pensando', 'discussing')).toBeNull();
  });

  it('en la validación, el sí avanza y el no regresa a discutir', () => {
    expect(parseTallerReply('sí', 'confirm')).toBe('yes');
    expect(parseTallerReply('sí, ya validamos', 'confirm')).toBe('yes');
    expect(parseTallerReply('revisamos todo', 'confirm')).toBe('yes');
    expect(parseTallerReply('no', 'confirm')).toBe('no');
    expect(parseTallerReply('todavía no', 'confirm')).toBe('no');
    expect(parseTallerReply('todavía no', 'working')).toBe('wait');
    expect(parseTallerReply('falta algo', 'confirm')).toBe('no');
  });

  it('«repite», «atrás», «espera» y «terminar taller» valen en cualquier etapa', () => {
    for (const stage of ['start', 'working', 'discussing', 'confirm'] as const) {
      expect(parseTallerReply('repite', stage)).toBe('repeat');
      expect(parseTallerReply('atrás', stage)).toBe('back');
      expect(parseTallerReply('espera un momento', stage)).toBe('wait');
      expect(parseTallerReply('terminar taller', stage)).toBe('stop');
      expect(parseTallerReply('terminar el modo taller', stage)).toBe('stop');
    }
  });

  it('saltar vale mientras trabajan, pero no responde por el grupo en la validación', () => {
    expect(parseTallerReply('saltar', 'working')).toBe('next');
    expect(parseTallerReply('siguiente', 'discussing')).toBe('next');
    expect(parseTallerReply('siguiente', 'confirm')).toBeNull();
  });

  it('el guion de ZOE pide discutir, cambiar y validar, y celebra con humor', () => {
    const phase = TALLER_PHASES[0];
    const review = reviewPrompt(phase);
    expect(review).toMatch(/discútanlo en grupo/i);
    expect(review).toMatch(/cambios/i);
    expect(review).toMatch(/valídenlo/i);
    expect(review).toContain(phase.deliverable);
    expect(CONFIRM_QUESTIONS.every((q) => /valid/i.test(q))).toBe(true);
    // Celebra y avanza, sin poner en duda al grupo ni reírse de él.
    expect(CONFIRM_YES.every((q) => /siguiente paso/i.test(q))).toBe(true);
    expect(CONFIRM_YES.some((q) => /seguros|les creo|jaja/i.test(q))).toBe(false);
    expect(CONFIRM_NO.length).toBeGreaterThan(1);
  });
});
