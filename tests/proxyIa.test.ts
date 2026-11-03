import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_SERVER_MESSAGE, postToProxy } from '@/lib/unadGeminiProxy';

const noWait = () => Promise.resolve();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('conexión con el proxy de IA', () => {
  it('reintenta si el servidor no responde y sigue cuando vuelve', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const res = await postToProxy({ contents: [] }, undefined, noWait);
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('si el servidor sigue sin responder, lo explica en vez de «Failed to fetch»', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(postToProxy({ contents: [] }, undefined, noWait)).rejects.toThrow(NO_SERVER_MESSAGE);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('«Detener generación» no se reintenta', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetch);
    await expect(postToProxy({ contents: [] }, controller.signal, noWait)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
