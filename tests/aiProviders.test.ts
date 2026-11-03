import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pruebas de caracterización del motor de IA: fijan cómo habla con cada proveedor
// (dirección, cabeceras, cuerpo, lectura de la respuesta y errores) para poder reorganizarlo sin cambiarlo.

const unad = vi.fn();
vi.mock('@/lib/unadGeminiProxy', () => ({ generateContentUnadGemini: (...args: unknown[]) => unad(...args) }));
const geminiGenerate = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: (...args: unknown[]) => geminiGenerate(...args) };
  },
}));

const { callAI, cancelActiveGeneration, beginGenerationFlow, GenerationCancelledError } = await import('@/services/ai');
const { useStore } = await import('@/store/useStore');

const noKeys = { unadGemini: '', gemini: '', openai: '', anthropic: '', ollama: '' };
function use(provider: string, keys: Partial<typeof noKeys> = {}, extra: Record<string, unknown> = {}) {
  useStore.setState({ aiProvider: provider as never, apiKeys: { ...noKeys, ...keys }, ...extra });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const lastFetch = (fetch: ReturnType<typeof vi.fn>) => {
  const [url, init] = fetch.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> };
};

beforeEach(() => {
  vi.unstubAllGlobals();
  unad.mockReset();
  geminiGenerate.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  beginGenerationFlow();
});

describe('motor de IA: un proveedor cada vez', () => {
  it('UNAD: pasa por el proxy con el modelo elegido y la señal de «Detener»', async () => {
    use('unadGemini', {}, { providerModels: { unadGemini: 'gemini-3.6-flash' } });
    unad.mockResolvedValueOnce({ text: 'Hola UNAD', finishReason: 'STOP' });
    await expect(callAI('pregunta', { maxOutputTokens: 512, googleSearch: true })).resolves.toBe('Hola UNAD');
    const [prompt, opts] = unad.mock.calls[0];
    expect(prompt).toBe('pregunta');
    expect(opts).toMatchObject({ maxOutputTokens: 512, model: 'gemini-3.6-flash', googleSearch: true });
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('OpenAI: llama a chat/completions con la clave; los modelos de razonamiento usan max_completion_tokens', async () => {
    const fetch = vi.fn().mockImplementation(async () => json({ choices: [{ message: { content: 'Hola OpenAI' }, finish_reason: 'stop' }] }));
    vi.stubGlobal('fetch', fetch);
    use('openai', { openai: 'sk-prueba' }, { providerModels: { openai: 'gpt-4o' } });
    await expect(callAI('p', { maxOutputTokens: 300 })).resolves.toBe('Hola OpenAI');
    let req = lastFetch(fetch);
    expect(req.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(req.headers.Authorization).toBe('Bearer sk-prueba');
    expect(req.body).toMatchObject({ model: 'gpt-4o', max_tokens: 300, messages: [{ role: 'user', content: 'p' }] });

    use('openai', { openai: 'sk-prueba' }, { providerModels: { openai: 'o3-mini' } });
    await callAI('p', { maxOutputTokens: 300 });
    req = lastFetch(fetch);
    expect(req.body.max_completion_tokens).toBe(300);
    expect(req.body.max_tokens).toBeUndefined();
  });

  it('OpenAI sin clave o con error del servicio: el mensaje dice el proveedor y la causa', async () => {
    use('openai');
    await expect(callAI('p')).rejects.toThrow('Error con openai: OpenAI API Key is required.');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { message: 'cuota agotada' } }, 429)));
    use('openai', { openai: 'sk' });
    await expect(callAI('p')).rejects.toThrow('Error con openai: cuota agotada');
  });

  it('Anthropic: mensajes con su versión de API; un modelo inexistente se explica', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ content: [{ text: 'Hola Claude' }], stop_reason: 'end_turn' }));
    vi.stubGlobal('fetch', fetch);
    use('anthropic', { anthropic: 'sk-ant' }, { providerModels: { anthropic: 'claude-sonnet-5' } });
    await expect(callAI('p', { maxOutputTokens: 20000 })).resolves.toBe('Hola Claude');
    const req = lastFetch(fetch);
    expect(req.url).toMatch(/\/v1\/messages$/);
    expect(req.headers['x-api-key']).toBe('sk-ant');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.body).toMatchObject({ model: 'claude-sonnet-5', max_tokens: 8192 });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { type: 'not_found_error', message: 'model: x' } }, 404)));
    await expect(callAI('p')).rejects.toThrow(/no está disponible en tu cuenta de Anthropic/);
  });

  it('Ollama: usa la URL local sin barra final y limita la salida con num_predict', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ message: { content: 'Hola local' }, done_reason: 'stop' }));
    vi.stubGlobal('fetch', fetch);
    use('ollama', {}, { ollamaUrl: 'http://localhost:11434/', providerModels: { ollama: 'mistral' } });
    await expect(callAI('p', { maxOutputTokens: 100 })).resolves.toBe('Hola local');
    const req = lastFetch(fetch);
    expect(req.url).toBe('http://localhost:11434/api/chat');
    expect(req.body).toMatchObject({ model: 'mistral', stream: false, options: { num_predict: 100 } });
  });

  it('Gemini directo: SDK con razonamiento acotado en 2.5 y búsqueda web si se pide; sin clave, lo dice', async () => {
    geminiGenerate.mockResolvedValueOnce({ text: 'Hola Gemini', candidates: [{ finishReason: 'STOP' }] });
    use('gemini', { gemini: 'AIza' }, { providerModels: { gemini: 'gemini-2.5-flash' } });
    await expect(callAI('p', { maxOutputTokens: 1000, googleSearch: true })).resolves.toBe('Hola Gemini');
    expect(geminiGenerate.mock.calls[0][0]).toMatchObject({
      model: 'gemini-2.5-flash',
      contents: 'p',
      config: { maxOutputTokens: 1000, thinkingConfig: { thinkingBudget: 500 }, tools: [{ googleSearch: {} }] },
    });
    use('gemini');
    await expect(callAI('p')).rejects.toThrow(/Falta la API Key de Google Gemini/);
  });

  it('un proveedor desconocido se rechaza con su nombre', async () => {
    use('otro');
    await expect(callAI('p')).rejects.toThrow('Error con otro: Unsupported AI Provider: otro');
  });

  it('«Detener generación» corta la llamada en curso y llega como GenerationCancelledError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
      ),
    );
    use('openai', { openai: 'sk' });
    const pending = callAI('p');
    await Promise.resolve();
    cancelActiveGeneration();
    await expect(pending).rejects.toBeInstanceOf(GenerationCancelledError);
  });
});
