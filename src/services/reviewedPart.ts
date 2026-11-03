/**
 * Una parte de documento generada con autoevaluación y autorreparación, el ciclo que comparten
 * Ideación y el Árbol de Innovación:
 *
 *   1. se pide la parte al modelo y se revisa (estructura esperada, menciones prohibidas…);
 *   2. si la revisión encuentra un problema, se pide de nuevo con la instrucción de corregirlo;
 *   3. se queda la reparación si quedó bien (o si la primera vino vacía); si no, la primera.
 *
 * Nunca se inventa contenido: si el modelo falla, la parte vuelve con estado «failed» y su motivo,
 * y la interfaz la marca para revisión. «Detener generación» se propaga tal cual.
 */
import { callAI, GenerationCancelledError, stripOuterMarkdownFence, type CallAIOptions } from '@/services/ai';
import { sanitizePartMarkdown, type GenerationPartResult, type GenerationPartStatus } from '@/prompts/themeAndInnovationPrompts';

export interface PartReview {
  status: GenerationPartStatus;
  issue?: string;
}

export interface ReviewedPartRequest {
  number: number;
  title: string;
  prompt: string;
  options: CallAIOptions;
  /** Revisa el Markdown generado. */
  review: (markdown: string) => PartReview;
  /** Instrucción que se agrega al prompt para corregir el problema que encontró la revisión. */
  repairSuffix: (issue: string) => string;
  /** Nombre de la herramienta para el registro de la consola, p. ej. «Ideación». */
  logTag: string;
}

/** Genera, revisa y, si hace falta, repara una parte. Ver el ciclo completo en la cabecera del módulo. */
export async function generateReviewedPart(request: ReviewedPartRequest): Promise<GenerationPartResult> {
  const { number, title } = request;
  const ask = async (prompt: string) => sanitizePartMarkdown(stripOuterMarkdownFence(await callAI(prompt, request.options)));

  let markdown = '';
  let review: PartReview;
  try {
    markdown = await ask(request.prompt);
    review = request.review(markdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    return { number, title, markdown: '', status: 'failed', issue: e instanceof Error ? e.message : String(e) };
  }

  if (review.status !== 'ok') {
    try {
      const repaired = await ask(request.prompt + request.repairSuffix(review.issue || ''));
      const second = request.review(repaired);
      if (second.status === 'ok' || !markdown) {
        markdown = repaired;
        review = second;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[${request.logTag}] El reintento de ${title} tampoco funcionó.`);
    }
  }
  return { number, title, markdown, status: review.status, issue: review.issue };
}
