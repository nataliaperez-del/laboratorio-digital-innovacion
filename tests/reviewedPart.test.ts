import { beforeEach, describe, expect, it, vi } from 'vitest';

// La IA se simula: estas pruebas fijan el ciclo generar → revisar → reparar que comparten Ideación y el Árbol.
const callAI = vi.fn<(prompt: string) => Promise<string>>();
vi.mock('@/services/ai', async () => {
  const actual = await vi.importActual<typeof import('@/services/ai')>('@/services/ai');
  return { ...actual, callAI: (prompt: string) => callAI(prompt) };
});

const { generateReviewedPart } = await import('@/services/reviewedPart');
const { GenerationCancelledError } = await import('@/services/ai');

const ok = { status: 'ok' as const };
const warn = { status: 'warning' as const, issue: 'Falta la tabla' };
const base = {
  number: 2,
  title: 'Tendencias',
  prompt: 'PROMPT',
  options: { maxOutputTokens: 1000 },
  repairSuffix: (i: string) => ` [REPARA: ${i}]`,
  logTag: 'Prueba',
};

beforeEach(() => {
  callAI.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('parte con autoevaluación y autorreparación', () => {
  it('si la primera respuesta pasa la revisión, no repara', async () => {
    callAI.mockResolvedValueOnce('## Parte\nBien');
    const r = await generateReviewedPart({ ...base, review: () => ok });
    expect(r).toMatchObject({ number: 2, title: 'Tendencias', status: 'ok' });
    expect(r.markdown).toContain('Bien');
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('si la revisión encuentra un problema, pide reparar con el motivo y se queda la reparación buena', async () => {
    callAI.mockResolvedValueOnce('primera').mockResolvedValueOnce('reparada');
    const r = await generateReviewedPart({ ...base, review: (md) => (md.includes('reparada') ? ok : warn) });
    expect(callAI).toHaveBeenLastCalledWith('PROMPT [REPARA: Falta la tabla]');
    expect(r).toMatchObject({ status: 'ok', markdown: 'reparada' });
  });

  it('si la reparación tampoco pasa, conserva la primera con su aviso', async () => {
    callAI.mockResolvedValueOnce('primera').mockResolvedValueOnce('reparada');
    const r = await generateReviewedPart({ ...base, review: () => warn });
    expect(r).toMatchObject({ status: 'warning', issue: 'Falta la tabla', markdown: 'primera' });
  });

  it('si el modelo falla, la parte vuelve como fallida con el motivo, sin contenido inventado', async () => {
    callAI.mockRejectedValueOnce(new Error('UNAD Gemini (500)'));
    const r = await generateReviewedPart({ ...base, review: () => ok });
    expect(r).toMatchObject({ status: 'failed', markdown: '', issue: 'UNAD Gemini (500)' });
  });

  it('«Detener generación» se propaga', async () => {
    callAI.mockRejectedValueOnce(new GenerationCancelledError());
    await expect(generateReviewedPart({ ...base, review: () => ok })).rejects.toBeInstanceOf(GenerationCancelledError);
  });
});
