import type { AIProvider } from '@/store/useStore';
import { useStore } from '@/store/useStore';

/** Límites de prompt más bajos para modelos de razonamiento (o1/o3), peor para pegar megadocumentos. */
function openaiCombinedCharsForModel(modelId: string): number {
  const m = modelId.toLowerCase();
  if (m.startsWith('o1') || m.startsWith('o3')) return 55_000;
  return 120_000;
}

function openaiDocumentCharsForModel(modelId: string): number {
  const m = modelId.toLowerCase();
  if (m.startsWith('o1') || m.startsWith('o3')) return 65_000;
  return 150_000;
}

/**
 * Límite aproximado de caracteres del texto institucional de Google Drive en `generateContainer` (Fase 2),
 * para no exceder el contexto del modelo (p. ej. OpenAI 128k tokens).
 */
export function getMaxCombinedSourceChars(provider: AIProvider): number {
  const raw = import.meta.env.VITE_MAX_COMBINED_SOURCE_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 20_000) return Math.min(Math.floor(n), 2_000_000);
  }
  switch (provider) {
    case 'openai': {
      const model = (useStore.getState().openaiModel || 'gpt-4o').trim() || 'gpt-4o';
      return openaiCombinedCharsForModel(model);
    }
    case 'anthropic':
      return 380_000;
    /** Proxy UNAD: prompts grandes suelen devolver 500 en el gateway. Override con `VITE_MAX_COMBINED_SOURCE_CHARS`. */
    case 'unadGemini':
      return 80_000;
    case 'gemini':
      return 1_200_000;
    case 'ollama':
      return 80_000;
    default:
      return 150_000;
  }
}

/**
 * Texto bruto adicional de Google Drive que se reenvía en Fase 3 junto al contenedor,
 * para que el documento fundante pueda desarrollar detalle que el Contenedor 2 resumió.
 */
export function getMaxSupplementaryDocumentChars(provider: AIProvider): number {
  const raw = import.meta.env.VITE_MAX_DOCUMENT_SUPPLEMENTARY_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 5_000) return Math.min(Math.floor(n), 1_500_000);
  }
  switch (provider) {
    case 'openai':
      return 120_000;
    case 'anthropic':
      return 90_000;
    /** Bajo, porque este bloque se suma al contenedor + instrucción en cada uno de los 13 apartados. */
    case 'unadGemini':
      return 80_000;
    case 'gemini':
      return 500_000;
    case 'ollama':
      return 50_000;
    default:
      return 80_000;
  }
}

/** Límite para el bloque CONTENEDOR en generateDocument (Fase 3). */
export function getMaxDocumentContainerChars(provider: AIProvider): number {
  const raw = import.meta.env.VITE_MAX_DOCUMENT_CONTAINER_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 20_000) return Math.min(Math.floor(n), 2_000_000);
  }
  switch (provider) {
    case 'openai': {
      const model = (useStore.getState().openaiModel || 'gpt-4o').trim() || 'gpt-4o';
      return openaiDocumentCharsForModel(model);
    }
    case 'anthropic':
      return 450_000;
    /** Coherente con el tope de Fase 2: el proxy UNAD devuelve 500 con prompts muy grandes. */
    case 'unadGemini':
      return 120_000;
    case 'gemini':
      return 1_000_000;
    case 'ollama':
      return 100_000;
    default:
      return 180_000;
  }
}

/** Tope de caracteres del Contenedor 2 en pasos intermedios (temas / árbol) para no saturar el proxy. */
export function getMaxThemeStepContainerChars(provider: AIProvider): number {
  const raw = import.meta.env.VITE_MAX_THEME_STEP_CONTAINER_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 8_000) return Math.min(Math.floor(n), 500_000);
  }
  switch (provider) {
    case 'unadGemini':
      return 72_000;
    case 'gemini':
      return 200_000;
    case 'openai':
      return 100_000;
    case 'anthropic':
      return 80_000;
    case 'ollama':
      return 48_000;
    default:
      return 72_000;
  }
}

/**
 * Tope del TXT metodológico `PROMPTS_FUENTES_CONSULTA_CONTENEDOR2_TERRITORIAL 1.txt` en `generateContainer`.
 * Override: `VITE_MAX_C2_PROMPT_DOC_CHARS`.
 */
export function getMaxC2TerritorialPromptDocChars(): number {
  const raw = import.meta.env.VITE_MAX_C2_PROMPT_DOC_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 12_000) return Math.min(Math.floor(n), 500_000);
  }
  return 120_000;
}

/** Tope de metodología C2 en `generateContainer`; con UNAD se capa más bajo para evitar 500 del proxy. */
export function getMaxC2TerritorialPromptDocCharsForContainer(provider: AIProvider): number {
  const cap = getMaxC2TerritorialPromptDocChars();
  if (provider === 'unadGemini') return Math.min(cap, 48_000);
  return cap;
}

/**
 * Tope de caracteres del TXT `instruccion_documento_fundante_CIP_actualizada.txt` embebido en cada apartado del fundante.
 * Override: `VITE_MAX_INSTRUCCION_FUNDANTE_CHARS`.
 */
export function getMaxInstruccionFundantePromptChars(): number {
  const raw = import.meta.env.VITE_MAX_INSTRUCCION_FUNDANTE_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 8_000) return Math.min(Math.floor(n), 600_000);
  }
  return 180_000;
}

/**
 * Caracteres máximos de la **cola** del documento ya generado que se reenvían en cada apartado (Fase 3),
 * para coherencia sin inflar demasiado el prompt. Override: `VITE_MAX_FUNDANTE_PREV_CONTEXT_CHARS`.
 */
export function getMaxFundantePreviousContextChars(): number {
  const raw = import.meta.env.VITE_MAX_FUNDANTE_PREV_CONTEXT_CHARS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 2_000) return Math.min(Math.floor(n), 250_000);
  }
  return 18_000;
}

/**
 * Recorta un texto **normativo** (una metodología, una instrucción) respetando su
 * estructura: corta en el último salto de párrafo —o de línea— antes del límite, para
 * no partir una fase o un criterio de calidad a media frase. El aviso resultante se
 * incrusta en el prompt para que el modelo sepa que el texto llegó incompleto.
 */
export function truncateAtBoundary(
  text: string,
  maxChars: number,
  label: string,
): { text: string; wasTruncated: boolean; notice: string } {
  if (text.length <= maxChars) return { text, wasTruncated: false, notice: '' };
  const head = text.slice(0, maxChars);
  // Se busca el corte limpio en el último 20% para no perder demasiado contenido.
  const minCut = Math.floor(maxChars * 0.8);
  const paragraphCut = head.lastIndexOf('\n\n');
  const lineCut = head.lastIndexOf('\n');
  const cut = paragraphCut >= minCut ? paragraphCut : lineCut >= minCut ? lineCut : maxChars;
  return {
    text: head.slice(0, cut).trimEnd(),
    wasTruncated: true,
    notice: `\n\n[… ${label} recortado en este punto por el límite de contexto del modelo: llegaron ${cut.toLocaleString()} de ${text.length.toLocaleString()} caracteres. Aplica íntegro lo que sí recibiste y no inventes lo que falte …]`,
  };
}

export function truncateContainerForDocument(
  containerData: string,
  maxChars: number,
): { text: string; wasTruncated: boolean; notice: string } {
  if (containerData.length <= maxChars) {
    return { text: containerData, wasTruncated: false, notice: '' };
  }
  return {
    text: containerData.slice(0, maxChars),
    wasTruncated: true,
    notice: `\n\n--- AVISO ---\nContenedor truncado de ${containerData.length.toLocaleString()} a ${maxChars.toLocaleString()} caracteres por límite del modelo.\n`,
  };
}
