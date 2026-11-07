import { describe, expect, it, vi } from 'vitest';
import { createRadarReader, isForeignOrigin, proxyUnadGemini } from '../server/iaProxy';

const okFetch = () => vi.fn().mockResolvedValue(new Response('{"candidates":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));
const body = (extra: Record<string, unknown> = {}) => JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hola' }] }], ...extra });

describe('proxy de IA del servidor (Vercel, Vite y Hostinger comparten contrato)', () => {
  it('reenvía a la pasarela UNAD con las credenciales del servidor, sin el modelo ni credenciales en el cuerpo', async () => {
    const fetch = okFetch();
    const reply = await proxyUnadGemini(
      'POST',
      body({ generationConfig: { temperature: 0.2 } }),
      { UNAD_GEMINI_X_API_KEY: 'x\n', UNAD_GEMINI_BEARER: ' b ' },
      fetch,
    );
    expect(reply.status).toBe(200);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://chatbot-ia-360.unad.edu.co/api-proxy/v1/models/gemini-3.5-flash:generateContent');
    expect(init.headers).toMatchObject({ 'x-api-key': 'x', Authorization: 'Bearer b' });
    expect(JSON.parse(init.body)).toEqual({ contents: [{ role: 'user', parts: [{ text: 'hola' }] }], generationConfig: { temperature: 0.2 } });
  });

  it('las credenciales escritas en el panel «IA» tienen prioridad', async () => {
    const fetch = okFetch();
    await proxyUnadGemini('POST', body({ credentials: { xApiKey: 'ui-x', bearer: 'ui-b' } }), { UNAD_GEMINI_X_API_KEY: 'x', UNAD_GEMINI_BEARER: 'b' }, fetch);
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ 'x-api-key': 'ui-x', Authorization: 'Bearer ui-b' });
  });

  it('sin pasarela UNAD usa la clave directa de Google', async () => {
    const fetch = okFetch();
    await proxyUnadGemini('POST', body({ model: 'gemini-3.6-flash' }), { GEMINI_API_KEY: 'g' }, fetch);
    expect(fetch.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent');
  });

  it('sin credenciales responde 503 y no inventa nada', async () => {
    const fetch = okFetch();
    const reply = await proxyUnadGemini('POST', body(), {}, fetch);
    expect(reply.status).toBe(503);
    expect(JSON.parse(reply.body).code).toBe('IA_NO_CONFIGURADA');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rechaza método, JSON, modelo y cuerpo inválidos', async () => {
    const env = { UNAD_GEMINI_X_API_KEY: 'x', UNAD_GEMINI_BEARER: 'b' };
    expect((await proxyUnadGemini('GET', '', env)).status).toBe(405);
    expect((await proxyUnadGemini('POST', '{', env)).status).toBe(400);
    expect((await proxyUnadGemini('POST', body({ model: 'gpt-9' }), env)).status).toBe(400);
    expect((await proxyUnadGemini('POST', '{"contents":"no"}', env)).status).toBe(400);
  });

  it('un corte con la pasarela se informa como 502', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const reply = await proxyUnadGemini('POST', body(), { UNAD_GEMINI_X_API_KEY: 'x', UNAD_GEMINI_BEARER: 'b' }, fetch);
    expect(reply.status).toBe(502);
  });

  it('solo acepta peticiones del navegador desde el mismo sitio', () => {
    expect(isForeignOrigin('https://laboratorio.vercel.app', 'laboratorio.vercel.app')).toBe(false);
    expect(isForeignOrigin('http://localhost:3000', 'localhost:3000')).toBe(false);
    expect(isForeignOrigin('https://otra-web.com', 'laboratorio.vercel.app')).toBe(true);
    expect(isForeignOrigin(null, 'laboratorio.vercel.app')).toBe(false);
  });
});

describe('Radar del Observatorio', () => {
  const page = 'x\nconst EMBED_TENDENCIAS = [{"titulo":"IA"}];\n';

  it('lee las señales y las guarda 6 horas', async () => {
    let t = 0;
    const fetch = vi.fn().mockResolvedValue(new Response(page));
    const read = createRadarReader(fetch, () => t);
    expect(JSON.parse((await read()).body).senales).toEqual([{ titulo: 'IA' }]);
    t = 5 * 3600 * 1000;
    await read();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('si falla la lectura sirve la última copia buena, y sin copia responde 502', async () => {
    let t = 0;
    const fetch = vi.fn().mockResolvedValueOnce(new Response(page)).mockRejectedValue(new Error('sin red'));
    const read = createRadarReader(fetch, () => t);
    await read();
    t = 7 * 3600 * 1000;
    expect((await read()).status).toBe(200);
    expect((await createRadarReader(vi.fn().mockRejectedValue(new Error('sin red')))()).status).toBe(502);
  });
});
