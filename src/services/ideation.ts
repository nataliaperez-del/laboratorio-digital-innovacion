/**
 * Ideación: el proceso de vocación + tres temas de la app Fase 1 como herramienta
 * independiente. El insumo puede ser un tema, un archivo, una señal del Observatorio o
 * el Estudio Territorial.
 */
import { beginGenerationFlow, defaultCallOptions, leerNucleoTexto } from '@/services/ai';
import { generateReviewedPart } from '@/services/reviewedPart';
import { assertSafeInput } from '@/lib/ethicsGuard';
import { useStore, type Prompt0Data } from '@/store/useStore';
import { getMaxThemeStepContainerChars, truncateAtBoundary, truncateContainerForDocument } from '@/lib/promptBudget';
import { fichaIdentity } from '@/lib/fichaIdentity';
import { trackGeneration } from '@/services/labCollector';
import { radarPromptBlock } from '@/services/observatorio';
import { extractContenedor2Section } from '@/prompts/contenedor2Sections';
import {
  assembleParts,
  buildThemeVocationPartPrompt,
  buildVocationSelfRepairSuffix,
  reviewVocationPart,
  VOCATION_PARTS,
  type GenerationPartProgress,
  type GenerationPartResult,
  type InputSource,
  type VocationPromptInputs,
} from '@/prompts/themeAndInnovationPrompts';

/** Documento generado por partes: Markdown completo y partes con su estado. */
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
  const { text, notice } = truncateContainerForDocument(source.text, Math.max(maxC - institucional.text.length, Math.floor(maxC * 0.5)));

  const isStudy = source.kind === 'estudio';
  const focus = isStudy ? fichaIdentity(prompt0Data).focusText : '';
  // El Radar revisa el tema: las tendencias afines entran al análisis aunque nadie las haya elegido.
  // Si el insumo ya es una señal del Radar, no se repite.
  const observatoryBlock =
    source.kind === 'observatorio' ? '' : await radarPromptBlock(`${source.label} ${focus} ${source.text.slice(0, 2000)}`, { fill: isStudy, tag: 'Ideación' });
  return {
    inputs: {
      source: { ...source, text: text + notice },
      fodaMatrix: isStudy ? extractContenedor2Section(source.text, 'Matriz FODA territorial') : '',
      contenedor1: institucional.text + institucional.notice,
      fichaBlock: formatFichaCompact(prompt0Data),
      focusHypothesis: focus,
      observatoryBlock,
      institutionalVocacionPromptText: template,
    },
    // Con un tema o un archivo no hay diagnóstico detrás: la consulta web lo suple con fuentes citadas.
    options: { ...defaultCallOptions(aiProvider), googleSearch: !isStudy },
  };
}

async function generateVocationPart(ctx: VocationContext, partIndex: number, previous: string): Promise<GenerationPartResult> {
  const meta = VOCATION_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de vocación inválida: ${partIndex + 1}`);
  return generateReviewedPart({
    number: meta.number,
    title: meta.title,
    prompt: buildThemeVocationPartPrompt(ctx.inputs, partIndex, previous),
    options: ctx.options,
    review: (markdown) => reviewVocationPart(partIndex, markdown),
    repairSuffix: (issue) => buildVocationSelfRepairSuffix(partIndex, issue),
    logTag: 'Ideación',
  });
}

/** Genera la Ideación (vocación y tres temas) parte por parte, con revisión y reparación. */
async function generateThemeVocationAndOptionsUntracked(source: InputSource, onProgress?: (p: GenerationPartProgress) => void): Promise<GeneratedDocument> {
  beginGenerationFlow();
  if (source.kind === 'texto') assertSafeInput(source.text);
  const ctx = await prepareVocationContext(source);
  const sections: GenerationPartResult[] = [];
  for (let i = 0; i < VOCATION_PARTS.length; i++) {
    const meta = VOCATION_PARTS[i];
    onProgress?.({ currentPart: meta.number, totalParts: VOCATION_PARTS.length, partTitle: meta.title });
    sections.push(await generateVocationPart(ctx, i, assembleParts(sections)));
  }
  return { markdown: assembleParts(sections), sections };
}

/** Vuelve a generar una sola parte de la Ideación con las demás como contexto. */
export async function regenerateVocationSection(
  source: InputSource,
  partIndex: number,
  current: readonly GenerationPartResult[],
): Promise<GenerationPartResult> {
  beginGenerationFlow();
  if (source.kind === 'texto') assertSafeInput(source.text);
  const ctx = await prepareVocationContext(source);
  return generateVocationPart(ctx, partIndex, assembleParts(current.slice(0, partIndex)));
}

/** `generateThemeVocationAndOptions` con medición: anota en el concentrador si la generación terminó y cuánto tardó. */
export function generateThemeVocationAndOptions(...args: Parameters<typeof generateThemeVocationAndOptionsUntracked>): ReturnType<typeof generateThemeVocationAndOptionsUntracked> {
  return trackGeneration('ideacion', () => generateThemeVocationAndOptionsUntracked(...args));
}
