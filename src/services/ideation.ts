/**
 * Ideación: el proceso de vocación + tres temas de la app Fase 1 como herramienta
 * independiente. El insumo puede ser un tema, un archivo, una señal del Observatorio o
 * el Estudio Territorial.
 */
import { beginGenerationFlow, callAI, defaultCallOptions, GenerationCancelledError, leerNucleoTexto, stripOuterMarkdownFence } from '@/services/ai';
import { useStore, type Prompt0Data } from '@/store/useStore';
import { getMaxThemeStepContainerChars, truncateAtBoundary, truncateContainerForDocument } from '@/lib/promptBudget';
import { fichaIdentity } from '@/lib/fichaIdentity';
import { extractContenedor2Section } from '@/prompts/contenedor2Sections';
import {
  assembleParts,
  buildThemeVocationPartPrompt,
  buildVocationSelfRepairSuffix,
  reviewVocationPart,
  sanitizePartMarkdown,
  VOCATION_PARTS,
  type GenerationPartProgress,
  type GenerationPartResult,
  type InputSource,
  type VocationPromptInputs,
} from '@/prompts/themeAndInnovationPrompts';

export interface GeneratedDocument {
  markdown: string;
  sections: GenerationPartResult[];
}

/** Ficha en texto para los prompts; vacía si el usuario no indicó territorio. */
export function formatFichaCompact(p: Prompt0Data): string {
  const parts = [
    p.labName?.trim() ? `Proyecto o idea: ${p.labName.trim()}` : '',
    p.zonaUNAD ? `Zona UNAD: ${p.zonaUNAD}` : '',
    p.municipality || p.department ? `Territorio: ${[p.municipality, p.department, p.country || 'Colombia'].filter(Boolean).join(', ')}` : '',
    p.isCapital || p.capitalSede ? `Cobertura capital: ${p.capitalSede || 'Distrito Capital / Sede Central'}` : '',
    p.specificLocation ? `Ubicación específica: ${p.specificLocation}` : '',
  ].filter(Boolean);
  return parts.join('\n') || '(sin territorio indicado)';
}

interface VocationContext {
  inputs: VocationPromptInputs;
  options: { maxOutputTokens: number; googleSearch: boolean };
}

async function prepareVocationContext(source: InputSource): Promise<VocationContext> {
  const { prompt0Data, aiProvider } = useStore.getState();
  if (!source.text.trim()) {
    throw new Error('Escribe un tema, carga un archivo o genera primero el Estudio Territorial.');
  }

  const template = await leerNucleoTexto('GENERALES', 'vocacion_cip');
  if (!template?.trim()) {
    throw new Error('No se encontró la plantilla de vocación en el núcleo del Laboratorio. Ejecuta «npm run sellar» y recarga.');
  }

  const maxC = getMaxThemeStepContainerChars(aiProvider);
  const institucional = truncateAtBoundary(
    ((await leerNucleoTexto('CONTENEDOR_1', 'contenedor_1')) || '').trim(),
    Math.floor(maxC * 0.4),
    'Marco institucional',
  );
  const { text, notice } = truncateContainerForDocument(
    source.text,
    Math.max(maxC - institucional.text.length, Math.floor(maxC * 0.5)),
  );

  const isStudy = source.kind === 'estudio';
  return {
    inputs: {
      source: { ...source, text: text + notice },
      fodaMatrix: isStudy ? extractContenedor2Section(source.text, 'Matriz FODA territorial') : '',
      contenedor1: institucional.text + institucional.notice,
      fichaBlock: formatFichaCompact(prompt0Data),
      focusHypothesis: isStudy ? fichaIdentity(prompt0Data).focusText : '',
      institutionalVocacionPromptText: template,
    },
    // Con un tema o un archivo no hay diagnóstico detrás: la consulta web lo suple con fuentes citadas.
    options: { ...defaultCallOptions(aiProvider), googleSearch: !isStudy },
  };
}

async function generateVocationPart(ctx: VocationContext, partIndex: number, previous: string): Promise<GenerationPartResult> {
  const meta = VOCATION_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de vocación inválida: ${partIndex + 1}`);
  const prompt = buildThemeVocationPartPrompt(ctx.inputs, partIndex, previous);

  let markdown = '';
  let review: ReturnType<typeof reviewVocationPart>;
  try {
    markdown = sanitizePartMarkdown(stripOuterMarkdownFence(await callAI(prompt, ctx.options)));
    review = reviewVocationPart(partIndex, markdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    return { number: meta.number, title: meta.title, markdown: '', status: 'failed', issue: e instanceof Error ? e.message : String(e) };
  }

  if (review.status !== 'ok') {
    try {
      const repaired = sanitizePartMarkdown(
        stripOuterMarkdownFence(await callAI(prompt + buildVocationSelfRepairSuffix(partIndex, review.issue || ''), ctx.options)),
      );
      const second = reviewVocationPart(partIndex, repaired);
      if (second.status === 'ok' || !markdown) {
        markdown = repaired;
        review = second;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Ideación] El reintento de ${meta.title} tampoco funcionó.`);
    }
  }
  return { number: meta.number, title: meta.title, markdown, status: review.status, issue: review.issue };
}

export async function generateThemeVocationAndOptions(
  source: InputSource,
  onProgress?: (p: GenerationPartProgress) => void,
): Promise<GeneratedDocument> {
  beginGenerationFlow();
  const ctx = await prepareVocationContext(source);
  const sections: GenerationPartResult[] = [];
  for (let i = 0; i < VOCATION_PARTS.length; i++) {
    const meta = VOCATION_PARTS[i];
    onProgress?.({ currentPart: meta.number, totalParts: VOCATION_PARTS.length, partTitle: meta.title });
    sections.push(await generateVocationPart(ctx, i, assembleParts(sections)));
  }
  return { markdown: assembleParts(sections), sections };
}

export async function regenerateVocationSection(
  source: InputSource,
  partIndex: number,
  current: readonly GenerationPartResult[],
): Promise<GenerationPartResult> {
  beginGenerationFlow();
  const ctx = await prepareVocationContext(source);
  return generateVocationPart(ctx, partIndex, assembleParts(current.slice(0, partIndex)));
}
