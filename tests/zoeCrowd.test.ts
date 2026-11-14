import { describe, expect, it } from 'vitest';
import { addressedText, CROWD_EXTRA_DB, CROWD_MIN_CONFIDENCE, heardNearVoice, joinRecognized, NEAR_VOICE_WINDOW_MS } from '@/lib/zoeCrowd';
import { createNoiseGate, GATE_MARGIN_DB } from '@/lib/zoeGate';

describe('escuchar entre mucha gente', () => {
  it('toma lo que sigue al nombre de ZOE, como lo transcriba el reconocedor', () => {
    expect(addressedText('ZOE, ¿qué es un árbol de innovación?')).toBe('¿qué es un árbol de innovación?');
    expect(addressedText('zoe llévame a ideación')).toBe('llévame a ideación');
    expect(addressedText('Soe muéstrame el radar')).toBe('muéstrame el radar');
    expect(addressedText('Zoé: abre el estudio')).toBe('abre el estudio');
    expect(addressedText('oye Zoey cuéntame del prototipado')).toBe('cuéntame del prototipado');
  });

  it('deja fuera la charla de otros que venía antes del nombre', () => {
    expect(addressedText('y entonces le dije que no podía ir ZOE qué hora es')).toBe('qué hora es');
  });

  it('acepta el nombre al final de la frase', () => {
    expect(addressedText('¿qué es un árbol, ZOE?')).toBe('¿qué es un árbol');
  });

  it('sin el nombre no le hablaban a ella', () => {
    expect(addressedText('qué vamos a almorzar hoy')).toBeNull();
    expect(addressedText('')).toBeNull();
    // Palabras que solo contienen las letras del nombre no cuentan.
    expect(addressedText('el zoológico queda lejos')).toBeNull();
    expect(addressedText('yo soy de Duitama')).toBeNull();
    expect(addressedText('eso es lo que hay')).toBeNull();
  });

  it('solo el nombre, sin nada más, no es una pregunta todavía', () => {
    expect(addressedText('ZOE')).toBe('');
  });

  it('lo entendido cuenta solo si hubo una voz cercana hace un instante', () => {
    const now = 1_000_000;
    expect(heardNearVoice(0, now)).toBe(false); // nunca se oyó una voz cercana
    expect(heardNearVoice(now - 500, now)).toBe(true);
    expect(heardNearVoice(now - NEAR_VOICE_WINDOW_MS - 1, now)).toBe(false);
  });

  it('en multitud descarta lo que el reconocedor entendió con poca seguridad', () => {
    const pieces = [
      { transcript: 'ZOE qué es', confidence: 0.9, isFinal: true },
      { transcript: 'ruido de fondo', confidence: CROWD_MIN_CONFIDENCE - 0.1, isFinal: true },
      { transcript: 'un árbol', confidence: 0, isFinal: true }, // 0: el navegador no la calculó
      { transcript: 'de innovación', isFinal: false }, // aún provisional
    ];
    expect(joinRecognized(pieces, true)).toBe('ZOE qué es un árbol de innovación');
    expect(joinRecognized(pieces, false)).toBe('ZOE qué es ruido de fondo un árbol de innovación');
  });

  it('en multitud la compuerta exige más volumen que con sensibilidad baja', () => {
    const feed = (gate: ReturnType<typeof createNoiseGate>, db: number, ms: number) => {
      let reading = gate.update(10 ** (db / 20), 80);
      for (let t = 80; t < ms; t += 80) reading = gate.update(10 ** (db / 20), 80);
      return reading;
    };
    const normal = createNoiseGate({ sensitivity: 'baja' });
    const crowd = createNoiseGate({ sensitivity: 'media' });
    crowd.setSensitivity('baja');
    crowd.setExtraDb(CROWD_EXTRA_DB);
    // Murmullo de sala a −45 dB y una voz 18 dB por encima: abre con «baja» (16) pero no en multitud (21).
    feed(normal, -45, 1200);
    feed(crowd, -45, 1200);
    expect(feed(normal, -27, 400).open).toBe(true);
    expect(feed(crowd, -27, 400).open).toBe(false);
    // Quien habla cerca supera el margen de multitud.
    expect(feed(crowd, -45 + GATE_MARGIN_DB.baja + CROWD_EXTRA_DB + 4, 400).open).toBe(true);
  });
});
