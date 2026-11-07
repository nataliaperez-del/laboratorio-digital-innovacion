/**
 * Tono de ZOE: baja la voz sin cambiar su timbre ni su velocidad (TD-PSOLA).
 *
 * Acelerar o frenar el audio cambia el tono, pero arrastra con él el timbre (la voz suena a ardilla
 * o a monstruo) y, en Chrome, añade el ruido metálico de su interpolación lineal. Aquí la frase se
 * corta en granos de dos períodos, centrados en cada pulso de la voz, y se vuelven a sumar con
 * los pulsos más separados: el tono baja y las resonancias de la boca (formantes) quedan donde
 * estaban. Las consonantes sordas se copian tal cual.
 *
 * Los valores salen de comparar la voz con la muestra de referencia
 * (`muestras-voz-zoe/referencia-voice-preview.mp3`): la voz Piper ronda los 118 Hz y la
 * referencia los 106 Hz, con una entonación casi el doble de amplia.
 */

export interface ToneSettings {
  /** Desplazamiento del tono medio, en semitonos (negativo = más grave). */
  semitones: number;
  /** Cuánto se amplía la entonación alrededor del centro: 1 = igual, 1,4 = un 40 % más expresiva. */
  expansion: number;
  /** Tono medio de la voz original (Hz): el centro desde el que se amplía la entonación. */
  centerHz: number;
}

/** Voz de ZOE: 2,3 semitonos más grave y una entonación un 40 % más amplia que la de Piper. */
export const ZOE_TONE: ToneSettings = { semitones: -2.3, expansion: 1.4, centerHz: 118 };

/** Límites del cambio por pulso: más allá, el método empieza a sonar áspero. */
const MIN_RATIO = 0.75;
const MAX_RATIO = 1.2;
const F0_MIN = 60;
const F0_MAX = 420;
/** Paso del seguimiento del tono. */
const HOP_S = 0.005;
const YIN_THRESHOLD = 0.15;

/** Pasa-bajos de 2.º orden (Butterworth) para seguir el tono sin que los formantes lo confundan. */
function lowpass(pcm: Float32Array, sampleRate: number, cutoff: number): Float32Array {
  const w = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w) / Math.SQRT2;
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 - cos) / 2 / a0;
  const b1 = (1 - cos) / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(pcm.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < pcm.length; i++) {
    const x = pcm[i];
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/**
 * Tono de la frase cada 5 ms (0 = sordo o silencio), por el método YIN sobre la señal filtrada y
 * a media frecuencia de muestreo. Un cuadro sonoro aislado entre saltos se corrige con la mediana
 * de sus vecinos, para que un error de octava no deforme un grano.
 */
export function trackPitch(pcm: Float32Array, sampleRate: number): Float32Array {
  const step = Math.max(1, Math.floor(sampleRate / 11025));
  const rate = sampleRate / step;
  const filtered = lowpass(pcm, sampleRate, 1800);
  const x = new Float32Array(Math.floor(filtered.length / step));
  for (let i = 0; i < x.length; i++) x[i] = filtered[i * step];

  const hop = Math.max(1, Math.round(HOP_S * rate));
  const size = Math.round(0.04 * rate);
  const tauMin = Math.floor(rate / F0_MAX);
  const tauMax = Math.floor(rate / F0_MIN);
  const width = size - tauMax;
  const count = x.length >= size ? 1 + Math.floor((x.length - size) / hop) : 0;
  const f0 = new Float32Array(count);
  if (!count) return f0;

  const energy = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    let sum = 0;
    for (let j = 0; j < size; j++) sum += x[k * hop + j] ** 2;
    energy[k] = sum / size;
  }
  const sorted = Float32Array.from(energy).sort();
  const gate = Math.max(1e-7, sorted[Math.min(count - 1, Math.floor(0.9 * (count - 1)))] * 0.02);

  // Diferencia normalizada acumulada (YIN): el primer valle bajo el umbral es el período.
  const norm = new Float64Array(tauMax + 1);
  for (let k = 0; k < count; k++) {
    if (energy[k] < gate) continue;
    const start = k * hop;
    let running = 0;
    norm[0] = 1;
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let j = 0; j < width; j++) {
        const d = x[start + j] - x[start + j + tau];
        sum += d * d;
      }
      running += sum;
      norm[tau] = running > 0 ? (sum * tau) / running : 1;
    }
    let best = -1;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (norm[tau] < YIN_THRESHOLD) {
        while (tau + 1 <= tauMax && norm[tau + 1] < norm[tau]) tau++;
        best = tau;
        break;
      }
    }
    if (best < 0) {
      best = tauMin;
      for (let tau = tauMin + 1; tau <= tauMax; tau++) if (norm[tau] < norm[best]) best = tau;
      if (norm[best] > 0.35) continue;
    }
    let shift = 0;
    if (best > 1 && best < tauMax) {
      const a = norm[best - 1];
      const b = norm[best];
      const c = norm[best + 1];
      const den = a - 2 * b + c;
      if (Math.abs(den) > 1e-12) shift = (0.5 * (a - c)) / den;
    }
    f0[k] = rate / (best + shift);
  }

  const smooth = Float32Array.from(f0);
  for (let k = 2; k < count - 2; k++) {
    if (!f0[k]) continue;
    const near = Array.from(f0.subarray(k - 2, k + 3)).filter((v) => v > 0);
    if (near.length >= 3) smooth[k] = near.sort((p, q) => p - q)[Math.floor(near.length / 2)];
  }
  return smooth;
}

/** Pulsos de la voz: uno por período en lo sonoro (máximo local) y uno cada 5 ms en lo sordo. */
function pitchMarks(pcm: Float32Array, sampleRate: number, f0: Float32Array): { marks: number[]; voiced: boolean[] } {
  const n = pcm.length;
  const span = Math.max(3, Math.round(sampleRate * 0.0008));
  const kernel = Array.from({ length: span }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 1)) / (span + 1)));
  const half = Math.floor(span / 2);
  const smooth = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < span; j++) {
      const at = i + j - half;
      if (at >= 0 && at < n) sum += pcm[at] * kernel[j];
    }
    smooth[i] = sum;
  }
  const unvoicedStep = Math.round(sampleRate * HOP_S);
  const marks: number[] = [];
  const voiced: boolean[] = [];
  let t = 0;
  while (t < n) {
    const f = f0.length ? f0[Math.min(f0.length - 1, Math.floor(t / sampleRate / HOP_S))] : 0;
    if (f > 0) {
      const period = sampleRate / f;
      const fresh = !marks.length || !voiced[voiced.length - 1];
      const lo = Math.floor(fresh ? t : t + 0.75 * period);
      const hi = Math.min(Math.floor(fresh ? t + period : t + 1.25 * period), n - 1);
      if (hi <= lo) break;
      let mark = lo;
      for (let i = lo + 1; i < hi; i++) if (smooth[i] > smooth[mark]) mark = i;
      marks.push(mark);
      voiced.push(true);
      // Si cae en el mismo punto, el siguiente se busca ya a tres cuartos de período: siempre avanza.
      t = mark;
    } else {
      t += unvoicedStep;
      marks.push(Math.min(t, n - 1));
      voiced.push(false);
    }
  }
  return { marks, voiced };
}

/** La frase con el tono de ZOE: misma duración y mismo timbre, tono y entonación ajustados. */
export function applyTone(pcm: Float32Array, sampleRate: number, settings: ToneSettings = ZOE_TONE): Float32Array {
  if (pcm.length < sampleRate * 0.05 || (!settings.semitones && settings.expansion === 1)) return pcm;
  const f0 = trackPitch(pcm, sampleRate);
  if (!f0.some((v) => v > 0)) return pcm;
  const { marks, voiced } = pitchMarks(pcm, sampleRate, f0);
  if (!marks.length) return pcm;
  const n = pcm.length;
  const out = new Float32Array(n);
  const weight = new Float32Array(n);
  const fallbackPeriod = Math.round(sampleRate * HOP_S);
  let ts = marks[0];
  let idx = 0;
  while (ts < n) {
    // Pulso original más cercano al instante de salida: la duración no cambia.
    while (idx + 1 < marks.length && Math.abs(marks[idx + 1] - ts) <= Math.abs(marks[idx] - ts)) idx++;
    const mark = marks[idx];
    const period = Math.max(1, (idx + 1 < marks.length ? marks[idx + 1] : mark + fallbackPeriod) - mark);
    let next = period;
    if (voiced[idx]) {
      const st = 12 * Math.log2(sampleRate / period / settings.centerHz);
      const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, 2 ** ((st * (settings.expansion - 1) + settings.semitones) / 12)));
      next = period / ratio;
    }
    const half = Math.max(8, Math.floor(period));
    const place = Math.round(ts) - mark;
    for (let j = -half; j <= half; j++) {
      const from = mark + j;
      const to = from + place;
      if (from < 0 || from >= n || to < 0 || to >= n) continue;
      const w = 0.5 - 0.5 * Math.cos((Math.PI * (j + half)) / half);
      out[to] += pcm[from] * w;
      weight[to] += w;
    }
    ts += next;
  }
  for (let i = 0; i < n; i++) out[i] /= Math.max(weight[i], 0.5);
  return out;
}
