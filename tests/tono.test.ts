import { describe, expect, it } from 'vitest';
import { ZOE_TONE, applyTone, trackPitch } from '@/components/zoe/zoeTone';

const SR = 22050;

/** Una vocal sintética: armónicos de `f0` con una resonancia hacia 700 Hz, como una «a». */
function vowel(f0: number, seconds = 1): Float32Array {
  const pcm = new Float32Array(Math.round(SR * seconds));
  for (let h = 1; h * f0 < 5000; h++) {
    const f = h * f0;
    const gain = 1 / (1 + ((f - 700) / 300) ** 2) + 0.2 / h;
    for (let i = 0; i < pcm.length; i++) pcm[i] += gain * Math.sin((2 * Math.PI * f * i) / SR);
  }
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  return pcm.map((v) => (v / peak) * 0.8);
}

const median = (values: Float32Array) => {
  const voiced = Array.from(values)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  return voiced[Math.floor(voiced.length / 2)] ?? 0;
};

/** Frecuencia con más energía entre 400 y 1200 Hz (la resonancia de la vocal). */
function resonance(pcm: Float32Array): number {
  const slice = pcm.subarray(2000, 2000 + 8192);
  let best = 0;
  let bestPower = -1;
  for (let f = 400; f <= 1200; f += 5) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < slice.length; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (slice.length - 1));
      re += slice[i] * w * Math.cos((2 * Math.PI * f * i) / SR);
      im += slice[i] * w * Math.sin((2 * Math.PI * f * i) / SR);
    }
    // Cambiar el tono acelerando el audio la movería con él (unos 90 Hz con −2,3 semitonos).
    const power = re * re + im * im;
    if (power > bestPower) {
      bestPower = power;
      best = f;
    }
  }
  return best;
}

describe('tono de ZOE: seguimiento del tono', () => {
  it('mide el tono de una vocal', () => {
    expect(median(trackPitch(vowel(120), SR))).toBeCloseTo(120, -0.5);
    expect(median(trackPitch(vowel(180), SR))).toBeCloseTo(180, -0.5);
  });

  it('no inventa tono en el silencio', () => {
    expect(trackPitch(new Float32Array(SR), SR).every((v) => v === 0)).toBe(true);
  });
});

describe('tono de ZOE: cambio de tono', () => {
  it('sin cambio pedido devuelve la frase tal cual', () => {
    const pcm = vowel(118);
    expect(applyTone(pcm, SR, { semitones: 0, expansion: 1, centerHz: 118 })).toBe(pcm);
  });

  it('baja 2,3 semitonos sin cambiar la duración', () => {
    const pcm = vowel(ZOE_TONE.centerHz);
    const out = applyTone(pcm, SR);
    expect(out.length).toBe(pcm.length);
    const expected = ZOE_TONE.centerHz * 2 ** (ZOE_TONE.semitones / 12);
    expect(Math.abs(median(trackPitch(out, SR)) - expected)).toBeLessThan(expected * 0.03);
  });

  it('amplía la entonación alrededor del centro', () => {
    const tone = { semitones: 0, expansion: 1.4, centerHz: 118 };
    // 4 semitonos sobre el centro pasan a ~5,6; 4 por debajo, a ~−5,6.
    const high = median(trackPitch(applyTone(vowel(118 * 2 ** (4 / 12)), SR, tone), SR));
    const low = median(trackPitch(applyTone(vowel(118 * 2 ** (-4 / 12)), SR, tone), SR));
    expect(12 * Math.log2(high / low)).toBeGreaterThan(10.4);
    expect(12 * Math.log2(high / low)).toBeLessThan(12);
  });

  it('conserva el timbre: la resonancia de la vocal no se mueve', () => {
    const pcm = vowel(ZOE_TONE.centerHz);
    expect(Math.abs(resonance(applyTone(pcm, SR)) - resonance(pcm))).toBeLessThanOrEqual(60);
  });

  it('deja pasar el silencio y el ruido sin valores inválidos', () => {
    const noise = Float32Array.from({ length: SR / 2 }, (_, i) => Math.sin(i * 12.9898) * 0.1);
    for (const pcm of [new Float32Array(SR / 2), noise]) {
      const out = applyTone(pcm, SR);
      expect(out.length).toBe(pcm.length);
      expect(out.every(Number.isFinite)).toBe(true);
    }
  });
});
