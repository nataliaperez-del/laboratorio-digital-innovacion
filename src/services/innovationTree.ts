/**
 * Árbol de Innovación: el proceso 10 → 5 → 3 de la app Fase 1 para cualquier tema.
 * Produce el documento formal por partes y, al final, el grafo que dibuja la vista interactiva.
 */
import { beginGenerationFlow, callAI, defaultCallOptions, GenerationCancelledError, leerNucleoTexto, parseJsonResponse } from '@/services/ai';
import { generateReviewedPart } from '@/services/reviewedPart';
import { useStore } from '@/store/useStore';
import { getMaxThemeStepContainerChars, truncateContainerForDocument } from '@/lib/promptBudget';
import { buildTreeFromMarkdown, parseTreeGraph, type TreeGraph } from '@/lib/innovationTreeGraph';
import { formatFichaCompact } from '@/services/ideation';
import { loadRadarFeed, relatedSignals } from '@/services/observatorio';
import {
  assembleParts,
  buildInnovationTreePartPrompt,
  buildInnovationTreeSelfRepairSuffix,
  buildTreeGraphPrompt,
  INNOVATION_TREE_PARTS,
  reviewInnovationTreePart,
  type GenerationPartProgress,
  type GenerationPartResult,
  type TreePromptInputs,
} from '@/prompts/themeAndInnovationPrompts';

/** Tema del árbol, su explicación y si se usa el Estudio Territorial como evidencia de la raíz. */
export interface InnovationTreeRequest {
  themeName: string;
  themeExplanation?: string;
  /** Usar el Estudio Territorial guardado como evidencia de la raíz. */
  useTerritorialStudy?: boolean;
}

/** Documento del árbol, sus partes y el grafo interactivo. */
export interface InnovationTreeResult {
  markdown: string;
  sections: GenerationPartResult[];
  graph: TreeGraph;
}

const GRAPH_STEP_TITLE = 'Armando el árbol interactivo';

interface TreeContext {
  inputs: TreePromptInputs;
  options: { maxOutputTokens: number; googleSearch: boolean };
}

async function prepareContext(request: InnovationTreeRequest): Promise<TreeContext> {
  const { prompt0Data, containerData, aiProvider } = useStore.getState();
  const themeName = request.themeName.trim();
  if (!themeName) throw new Error('Escribe un tema para construir el Árbol de Innovación.');

  const template = await leerNucleoTexto('GENERALES', 'arbol_innovacion');
  if (!template?.trim()) {
    throw new Error('No se encontró la plantilla del árbol en el núcleo del Laboratorio. Ejecuta «npm run sellar» y recarga.');
  }

  const maxC = getMaxThemeStepContainerChars(aiProvider);
  const study = request.useTerritorialStudy ? truncateContainerForDocument(containerData, maxC) : null;
  const explanation = truncateContainerForDocument(request.themeExplanation ?? '', Math.floor(maxC / 2));

  // Las señales del Observatorio enriquecen el árbol pero nunca lo bloquean si el Radar no responde.
  let observatoryBlock = '';
  try {
    const feed = await loadRadarFeed();
    observatoryBlock = relatedSignals(feed.senales, `${themeName} ${request.themeExplanation ?? ''}`)
      .map((s) => `- ${s.nombre} (${s.area}; prioridad ${s.prioridad}; ${s.accion}): ${s.descripcion}`)
      .join('\n');
  } catch (e) {
    console.info('[Árbol] Radar del Observatorio no disponible; se continúa sin sus señales.', e);
  }

  return {
    inputs: {
      themeName,
      themeExplanation: explanation.text + explanation.notice,
      territoryBlock: formatFichaCompact(prompt0Data),
      territorialContext: study ? study.text + study.notice : '',
      observatoryBlock,
      institutionalArbolPromptText: template,
    },
    options: { ...defaultCallOptions(aiProvider), googleSearch: true },
  };
}

async function generatePart(ctx: TreeContext, partIndex: number, previous: string): Promise<GenerationPartResult> {
  const meta = INNOVATION_TREE_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de árbol inválida: ${partIndex + 1}`);
  return generateReviewedPart({
    number: meta.number,
    title: meta.title,
    prompt: buildInnovationTreePartPrompt(ctx.inputs, partIndex, previous),
    options: ctx.options,
    review: (markdown) => reviewInnovationTreePart(partIndex, markdown),
    repairSuffix: (issue) => buildInnovationTreeSelfRepairSuffix(partIndex, issue),
    logTag: 'Árbol',
  });
}

/**
 * Grafo del árbol a partir del documento: lo pide al modelo y, si la respuesta no sirve,
 * lo reconstruye de las tablas del propio documento. Nunca usa nodos de ejemplo.
 */
export async function buildGraphFromDocument(themeName: string, markdown: string): Promise<TreeGraph> {
  const { aiProvider } = useStore.getState();
  try {
    const raw = await callAI(buildTreeGraphPrompt(themeName, markdown), defaultCallOptions(aiProvider));
    return parseTreeGraph(themeName, parseJsonResponse(raw));
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    console.warn('[Árbol] La conversión a nodos falló; se reconstruye desde las tablas del documento.', e);
    return buildTreeFromMarkdown(themeName, markdown);
  }
}

/** Genera el documento del Árbol por partes y al final su grafo interactivo. */
export async function generateInnovationTree(request: InnovationTreeRequest, onProgress?: (p: GenerationPartProgress) => void): Promise<InnovationTreeResult> {
  beginGenerationFlow();
  const ctx = await prepareContext(request);
  const total = INNOVATION_TREE_PARTS.length + 1;
  const sections: GenerationPartResult[] = [];
  for (let i = 0; i < INNOVATION_TREE_PARTS.length; i++) {
    const meta = INNOVATION_TREE_PARTS[i];
    onProgress?.({ currentPart: meta.number, totalParts: total, partTitle: meta.title });
    sections.push(await generatePart(ctx, i, assembleParts(sections)));
  }
  const markdown = assembleParts(sections);
  if (!markdown.trim()) {
    const reason = sections.find((s) => s.issue)?.issue;
    throw new Error(reason || 'El modelo no generó contenido para el árbol.');
  }
  onProgress?.({ currentPart: total, totalParts: total, partTitle: GRAPH_STEP_TITLE });
  return { markdown, sections, graph: await buildGraphFromDocument(ctx.inputs.themeName, markdown) };
}

/** Rehace una parte conservando las demás y vuelve a armar el grafo. */
export async function regenerateInnovationTreeSection(
  request: InnovationTreeRequest,
  partIndex: number,
  current: readonly GenerationPartResult[],
): Promise<InnovationTreeResult> {
  beginGenerationFlow();
  const ctx = await prepareContext(request);
  const part = await generatePart(ctx, partIndex, assembleParts(current.slice(0, partIndex)));
  const sections = current.map((s, i) => (i === partIndex ? part : s));
  const markdown = assembleParts(sections);
  return { markdown, sections, graph: await buildGraphFromDocument(ctx.inputs.themeName, markdown) };
}
