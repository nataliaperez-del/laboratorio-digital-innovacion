/**
 * Comprobación de la clave personal de Google AI Studio. Pregunta a Google qué modelos puede usar esa
 * clave: con una sola consulta (que no gasta cuota de generación) se sabe si la clave sirve y cuál
 * modelo conviene. La clave viaja solo a Google, en un encabezado, y no se guarda aquí.
 */
import { describeStudioProblem, pickStudioModel, STUDIO_MODELS_URL, studioProblemFromStatus, usableStudioModels, type StudioProblem } from '@/lib/studioKey';

export type StudioCheck = { ok: true; models: string[]; recommended: string } | { ok: false; problem: StudioProblem; message: string };

export async function validateStudioKey(key: string, fetchImpl: typeof fetch = fetch): Promise<StudioCheck> {
  const fail = (problem: StudioProblem): StudioCheck => ({ ok: false, problem, message: describeStudioProblem(problem) });
  let response: Response;
  try {
    response = await fetchImpl(STUDIO_MODELS_URL, { headers: { 'x-goog-api-key': key.trim() }, signal: AbortSignal.timeout(15_000) });
  } catch {
    return fail('sin-red');
  }
  if (!response.ok) return fail(studioProblemFromStatus(response.status));
  const body = (await response.json().catch(() => null)) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> } | null;
  const models = usableStudioModels(body?.models ?? []);
  const recommended = pickStudioModel(models);
  if (!recommended) return { ok: false, problem: 'otro', message: 'La clave es válida, pero Google no le ofrece ningún modelo de texto. Crea otra clave en un proyecto nuevo.' };
  return { ok: true, models, recommended };
}
