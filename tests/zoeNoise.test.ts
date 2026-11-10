import { describe, expect, it } from 'vitest';
import { createNoiseDetector, NOISY_LEVEL, NOISY_MS } from '@/lib/zoeNoise';

const run = (detector: (l: number, ms: number) => boolean, level: number, ms: number) => {
  let hit = false;
  for (let t = 0; t < ms; t += 80) hit = detector(level, 80) || hit;
  return hit;
};

describe('detector de ruido de ZOE', () => {
  it('avisa tras ruido fuerte sostenido', () => {
    expect(run(createNoiseDetector(), NOISY_LEVEL * 3, NOISY_MS + 200)).toBe(true);
  });

  it('no avisa en un cuarto tranquilo', () => {
    expect(run(createNoiseDetector(), NOISY_LEVEL / 3, 60_000)).toBe(false);
  });

  it('un golpe aislado no cuenta', () => {
    const detector = createNoiseDetector();
    expect(run(detector, NOISY_LEVEL * 5, 800)).toBe(false);
    expect(run(detector, 0.001, 2000)).toBe(false);
    expect(run(detector, NOISY_LEVEL * 5, 800)).toBe(false);
  });

  it('el ruido intermitente se descuenta al doble de velocidad', () => {
    const detector = createNoiseDetector();
    let hit = false;
    for (let i = 0; i < 200; i++) hit = run(detector, i % 3 === 0 ? NOISY_LEVEL * 4 : 0, 80) || hit;
    expect(hit).toBe(false);
  });
});
