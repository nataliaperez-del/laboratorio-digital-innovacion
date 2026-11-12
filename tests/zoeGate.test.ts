import { describe, expect, it } from 'vitest';
import { BARGE_IN_EXTRA_DB, createNoiseGate, formatDb, isNoisyRoom, meterFraction, toDb } from '@/lib/zoeGate';

const fromDb = (db: number) => 10 ** (db / 20);
const feed = (gate: ReturnType<typeof createNoiseGate>, db: number, ms: number) => {
  let last = gate.update(fromDb(db), 80);
  for (let t = 80; t < ms; t += 80) last = gate.update(fromDb(db), 80);
  return last;
};

describe('compuerta de ruido', () => {
  it('convierte volumen a decibelios', () => {
    expect(toDb(1)).toBeCloseTo(0);
    expect(toDb(0.1)).toBeCloseTo(-20);
    expect(toDb(0)).toBeLessThan(-100);
    expect(formatDb(-41.4)).toBe('-41 dB');
  });

  it('en un cuarto tranquilo no se abre', () => {
    const gate = createNoiseGate();
    expect(feed(gate, -58, 3000).open).toBe(false);
  });

  it('se abre con una voz sobre el piso y se cierra al callar', () => {
    const gate = createNoiseGate();
    feed(gate, -58, 800);
    expect(feed(gate, -30, 400).open).toBe(true);
    expect(feed(gate, -58, 1200).open).toBe(false);
  });

  it('el ruido constante no abre: el piso lo aprende', () => {
    const gate = createNoiseGate();
    const r = feed(gate, -42, 6000);
    expect(r.open).toBe(false);
    expect(r.floorDb).toBeGreaterThan(-46);
  });

  it('con ruido de fondo, una voz más fuerte sí pasa', () => {
    const gate = createNoiseGate();
    feed(gate, -45, 1500);
    expect(feed(gate, -25, 400).open).toBe(true);
  });

  it('un golpe muy corto no abre', () => {
    const gate = createNoiseGate();
    feed(gate, -58, 800);
    expect(feed(gate, -20, 80).open).toBe(false);
    expect(feed(gate, -58, 800).everOpened).toBe(false);
  });

  it('la sensibilidad cambia lo que cuenta como voz', () => {
    const quiet = -58;
    const soft = -44; // 14 dB sobre el piso: pasa en «alta» y «media», no en «baja»
    const run = (s: 'alta' | 'media' | 'baja') => {
      const gate = createNoiseGate({ sensitivity: s });
      feed(gate, quiet, 800);
      return feed(gate, soft, 400).open;
    };
    expect(run('alta')).toBe(true);
    expect(run('media')).toBe(true);
    expect(run('baja')).toBe(false);
  });

  it('puede cambiar de sensibilidad sobre la marcha', () => {
    const gate = createNoiseGate({ sensitivity: 'baja' });
    feed(gate, -58, 800);
    expect(feed(gate, -47, 400).open).toBe(false);
    gate.setSensitivity('alta');
    expect(feed(gate, -47, 400).open).toBe(true);
  });

  it('para interrumpir a ZOE exige más volumen', () => {
    const normal = createNoiseGate();
    const barge = createNoiseGate({ extraDb: BARGE_IN_EXTRA_DB });
    feed(normal, -58, 800);
    feed(barge, -58, 800);
    expect(feed(normal, -42, 400).open).toBe(true);
    expect(feed(barge, -42, 400).open).toBe(false);
  });

  it('detecta cuándo el lugar es demasiado ruidoso', () => {
    expect(isNoisyRoom(-55)).toBe(false);
    expect(isNoisyRoom(-35)).toBe(true);
    expect(isNoisyRoom(-50, -30)).toBe(true);
  });

  it('la barra de nivel sube con la voz', () => {
    expect(meterFraction(-58, -58)).toBe(0);
    expect(meterFraction(-28, -58)).toBe(1);
    expect(meterFraction(-43, -58)).toBeCloseTo(0.5);
  });
});
