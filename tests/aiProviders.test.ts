import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ETHICS_PREAMBLE } from '@/lib/ethicsGuard';

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

const { callAI, cancelActiveGeneration, beginGenerationFlow, GenerationCancelledError, resetAiFallback } = await import('@/services/ai');
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
  resetAiFallback();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  beginGenerationFlow();
});

describe('motor de IA: un proveedor cada vez', () => {
  it('UNAD: pasa por el proxy con el modelo elegido y la señal de «Detener»', async () => {
    use('unadGemini', {}, { providerModels: { unadGemini: 'gemini-3.6-flash' } });
    unad.mockResolvedValueOnce({ text: 'Hola UNAD', finishReason: 'STOP' });
    await expect(callAI('pregunta', { maxOutputTokens: 512, googleSearch: true })).resolves.toBe('Hola UNAD');
    const [prompt, opts] = unad.mock.calls[0];
    expect(prompt).toBe(`${ETHICS_PREAMBLE}
pregunta`); // la regla ética viaja con cada llamada
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
    expect(req.body).toMatchObject({ model: 'gpt-4o', max_tokens: 300, messages: [{ role: 'user', content: `${ETHICS_PREAMBLE}
p` }] });

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
      contents: `${ETHICS_PREAMBLE}
p`,
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

describe('círculo de conexión de la IA', () => {
  it('la prueba mínima lo pone verde si la IA responde y rojo con el motivo si no', async () => {
    const { checkAiConnection } = await import('@/services/ai');
    const { useAiStatus } = await import('@/store/aiStatus');
    use('unadGemini');
    unad.mockResolvedValueOnce({ text: 'OK', finishReason: 'STOP' });
    await expect(checkAiConnection()).resolves.toBe(true);
    expect(useAiStatus.getState().status).toBe('ok');

    unad.mockRejectedValueOnce(new Error('No hay conexión con el servidor del Laboratorio'));
    await expect(checkAiConnection()).resolves.toBe(false);
    expect(useAiStatus.getState()).toMatchObject({ status: 'error', probing: false });
    expect(useAiStatus.getState().message).toContain('No hay conexión');
  });

  it('cada respuesta real lo mantiene verde sin gastar una llamada aparte', async () => {
    const { useAiStatus, reportAiDown } = await import('@/store/aiStatus');
    use('unadGemini');
    reportAiDown('antes');
    unad.mockResolvedValueOnce({ text: 'Hola', finishReason: 'STOP' });
    await callAI('pregunta real');
    expect(useAiStatus.getState().status).toBe('ok');
    expect(unad).toHaveBeenCalledTimes(1);
  });

  it('sin internet se pone rojo sin llamar a la IA', async () => {
    const { checkAiConnection } = await import('@/services/ai');
    const { useAiStatus } = await import('@/store/aiStatus');
    vi.stubGlobal('navigator', { onLine: false });
    await expect(checkAiConnection()).resolves.toBe(false);
    expect(useAiStatus.getState().status).toBe('error');
    expect(unad).not.toHaveBeenCalled();
  });
});

describe('regla ética en cada llamada', () => {
  it('si el modelo se niega, la llamada termina con un error claro y sin marcas internas', async () => {
    const { EthicsBlockedError, ETHICS_REFUSAL_MARKER } = await import('@/lib/ethicsGuard');
    const fetch = vi.fn().mockImplementation(async () =>
      json({ choices: [{ message: { content: `${ETHICS_REFUSAL_MARKER} No puedo ayudar con eso, pero sí a prevenir fraudes.` }, finish_reason: 'stop' }] }),
    );
    vi.stubGlobal('fetch', fetch);
    use('openai', { openai: 'sk-prueba' }, { providerModels: { openai: 'gpt-4o' } });
    const err = await callAI('algo dañino', { maxOutputTokens: 300 }).catch((e) => e);
    expect(err).toBeInstanceOf(EthicsBlockedError);
    expect(err.message).toBe('No puedo ayudar con eso, pero sí a prevenir fraudes.');
  });
});

describe('respaldo con la clave personal de AI Studio', () => {
  const outage = () => unad.mockRejectedValue(new Error('Error 503: la pasarela no responde'));

  it('sin clave personal, una caída de la IA institucional sigue siendo un error', async () => {
    use('unadGemini');
    outage();
    await expect(callAI('p')).rejects.toThrow(/Error con unadGemini/);
    expect(geminiGenerate).not.toHaveBeenCalled();
  });

  it('con clave personal, la caída pasa a AI Studio y el trabajo continúa', async () => {
    use('unadGemini', { gemini: 'AIza-prueba' }, { providerModels: { gemini: 'gemini-2.5-flash' } });
    outage();
    geminiGenerate.mockResolvedValue({ text: 'Respuesta de AI Studio', candidates: [{ finishReason: 'STOP' }] });
    await expect(callAI('p')).resolves.toBe('Respuesta de AI Studio');
    expect(geminiGenerate.mock.calls[0][0]).toMatchObject({ model: 'gemini-2.5-flash' });
  });

  it('una vez en el respaldo, las siguientes llamadas van directo a AI Studio sin esperar a la institucional', async () => {
    use('unadGemini', { gemini: 'AIza-prueba' });
    outage();
    geminiGenerate.mockResolvedValue({ text: 'ok', candidates: [{ finishReason: 'STOP' }] });
    await callAI('uno');
    unad.mockClear();
    await callAI('dos');
    expect(unad).not.toHaveBeenCalled();
    expect(geminiGenerate).toHaveBeenCalledTimes(2);
  });

  it('un pedido mal hecho no pasa al respaldo: fallaría igual', async () => {
    use('unadGemini', { gemini: 'AIza-prueba' });
    unad.mockRejectedValue(new Error('Error 400: Cuerpo de petición inválido'));
    await expect(callAI('p')).rejects.toThrow(/400/);
    expect(geminiGenerate).not.toHaveBeenCalled();
  });

  it('si el respaldo también falla, el error cuenta las dos causas', async () => {
    use('unadGemini', { gemini: 'AIza-prueba' });
    outage();
    geminiGenerate.mockRejectedValue(new Error('API key not valid'));
    await expect(callAI('p')).rejects.toThrow(/503.*Respaldo AI Studio: API key not valid/s);
  });

  it('el botón «Detener» no activa el respaldo', async () => {
    use('unadGemini', { gemini: 'AIza-prueba' });
    unad.mockImplementation(async (_prompt: string, opts: { signal: AbortSignal }) => {
      await new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('Failed to fetch'))));
    });
    const pending = callAI('p');
    await new Promise((r) => setTimeout(r, 20));
    cancelActiveGeneration();
    await expect(pending).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(geminiGenerate).not.toHaveBeenCalled();
  });
});
