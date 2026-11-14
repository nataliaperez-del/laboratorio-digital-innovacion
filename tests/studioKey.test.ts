import { describe, expect, it } from 'vitest';
import { describeStudioProblem, isProviderOutage, pickStudioModel, studioKeyShape, studioProblemFromStatus, usableStudioModels } from '@/lib/studioKey';
import { validateStudioKey } from '@/services/studio';

const KEY = `AIza${'a'.repeat(35)}`;
const model = (name: string, methods = ['generateContent']) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

describe('clave personal de AI Studio', () => {
  it('reconoce la forma de una clave de Google', () => {
    expect(studioKeyShape('')).toBe('vacia');
    expect(studioKeyShape('   ')).toBe('vacia');
    expect(studioKeyShape(KEY)).toBe('ok');
    // El formato nuevo de AI Studio.
    expect(studioKeyShape(`AQ.${'b'.repeat(50)}`)).toBe('ok');
    expect(studioKeyShape('AQ.corta')).toBe('extrana');
    expect(studioKeyShape(`${KEY} otra`)).toBe('extrana');
    expect(studioKeyShape(` ${KEY} `)).toBe('ok');
    expect(studioKeyShape('sk-ant-123')).toBe('extrana');
    expect(studioKeyShape('AIza_corta')).toBe('extrana');
  });

  it('de los modelos de la clave deja solo los de texto que generan contenido', () => {
    const usable = usableStudioModels([
      model('gemini-2.5-flash'),
      model('gemini-2.5-pro'),
      model('gemini-embedding-001', ['embedContent']),
      model('gemini-2.5-flash-image'),
      model('gemini-2.5-flash-preview-tts'),
      model('gemini-live-2.5-flash'),
      model('gemma-3-27b-it'),
      model('text-embedding-004', ['embedContent']),
      model('gemini-2.5-flash'),
    ]);
    expect(usable).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(usableStudioModels([])).toEqual([]);
  });

  it('escoge un flash estable y reciente; sin flash, el mejor disponible', () => {
    expect(pickStudioModel(['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])).toBe('gemini-2.5-flash');
    expect(pickStudioModel(['gemini-3.5-flash-preview', 'gemini-2.5-flash'])).toBe('gemini-3.5-flash-preview');
    expect(pickStudioModel(['gemini-3.5-flash-preview', 'gemini-3.5-flash'])).toBe('gemini-3.5-flash');
    expect(pickStudioModel(['gemini-3.5-flash-lite', 'gemini-3.5-flash'])).toBe('gemini-3.5-flash');
    expect(pickStudioModel(['gemini-2.5-pro', 'gemini-3.1-pro'])).toBe('gemini-3.1-pro');
    expect(pickStudioModel([])).toBeNull();
  });

  it('traduce los errores de Google a algo que la persona pueda resolver', () => {
    expect(studioProblemFromStatus(400)).toBe('clave-invalida');
    expect(studioProblemFromStatus(403)).toBe('sin-permiso');
    expect(studioProblemFromStatus(429)).toBe('cuota');
    expect(studioProblemFromStatus(500)).toBe('otro');
    expect(describeStudioProblem('sin-permiso')).toMatch(/administrador del dominio/);
    expect(describeStudioProblem('clave-invalida')).toMatch(/completa y sin espacios/);
  });

  it('valida la clave listando los modelos, con la clave en el encabezado y no en la dirección', async () => {
    let seen: { url: string; key: string | null } | null = null;
    const ok = (async (url: string, init?: RequestInit) => {
      seen = { url, key: new Headers(init?.headers).get('x-goog-api-key') };
      return new Response(JSON.stringify({ models: [model('gemini-2.5-pro'), model('gemini-2.5-flash')] }), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await validateStudioKey(` ${KEY} `, ok);
    expect(result).toEqual({ ok: true, models: ['gemini-2.5-pro', 'gemini-2.5-flash'], recommended: 'gemini-2.5-flash' });
    expect(seen!.key).toBe(KEY);
    expect(seen!.url).not.toContain(KEY);
  });

  it('dice qué pasó cuando la clave no sirve', async () => {
    const status = (code: number) => (async () => new Response('{}', { status: code })) as unknown as typeof fetch;
    expect(await validateStudioKey(KEY, status(400))).toMatchObject({ ok: false, problem: 'clave-invalida' });
    expect(await validateStudioKey(KEY, status(403))).toMatchObject({ ok: false, problem: 'sin-permiso' });
    expect(await validateStudioKey(KEY, status(429))).toMatchObject({ ok: false, problem: 'cuota' });
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await validateStudioKey(KEY, offline)).toMatchObject({ ok: false, problem: 'sin-red' });
    const empty = (async () => new Response(JSON.stringify({ models: [model('gemini-embedding-001', ['embedContent'])] }), { status: 200 })) as unknown as typeof fetch;
    expect(await validateStudioKey(KEY, empty)).toMatchObject({ ok: false });
  });
});

describe('cuándo se pasa al respaldo', () => {
  it('ante una caída de la IA institucional sí', () => {
    for (const message of [
      'Error 503 de la pasarela',
      'No hay conexión con el servidor del Laboratorio',
      'La IA no está configurada en el servidor (IA_NO_CONFIGURADA)',
      'Failed to fetch',
      'La voz propia tardó demasiado',
      '429 Too Many Requests',
      'Revisa las credenciales: define UNAD_GEMINI_X_API_KEY (401)',
      '502 Bad Gateway',
    ]) {
      expect(isProviderOutage(message), message).toBe(true);
    }
  });

  it('ante un pedido mal hecho o bloqueado no: fallaría igual en el respaldo', () => {
    for (const message of [
      'Error 400: Cuerpo de petición inválido. Se requiere "contents".',
      'Modelo no permitido. Use uno de: gemini-3.5-flash',
      'Suele deberse a un prompt demasiado grande para el proxy UNAD (400)',
      'La respuesta fue bloqueada por seguridad (safety)',
    ]) {
      expect(isProviderOutage(message), message).toBe(false);
    }
  });
});
