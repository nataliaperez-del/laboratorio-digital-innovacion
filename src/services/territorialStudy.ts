/**
 * Estudio Territorial: el mismo diagnóstico de la app Fase 1 (metodología MDVT en doce puntos
 * de entrega, procedencia de fuentes, autoevaluación y regeneración por bloque).
 */
import {
  beginGenerationFlow,
  callAI,
  GenerationCancelledError,
  getUnadGeminiMaxOutputTokens,
  leerNucleoTexto,
  stripOuterMarkdownFence,
} from '@/services/ai';
import { useStore, type AIProvider, type Prompt0Data } from '@/store/useStore';
import { getMaxC2TerritorialPromptDocCharsForContainer, getMaxCombinedSourceChars, truncateAtBoundary } from '@/lib/promptBudget';
import {
  assembleContenedor2Document,
  buildContenedor2AppPoint,
  buildContenedor2SectionPrompt,
  buildContenedor2SelfRepairSuffix,
  contenedor2Points,
  CONTENEDOR2_SECTIONS,
  reviewContenedor2Section,
  sanitizeContenedor2SectionMarkdown,
  type Contenedor2DocumentResult,
  type Contenedor2Point,
  type Contenedor2SectionProgress,
  type Contenedor2SectionResult,
  type Contenedor2SectionStatus,
} from '@/prompts/contenedor2Sections';
import { fichaIdentity } from '@/lib/fichaIdentity';
import { buildPrioritizedInstitutionalBlock, findTerritoryMatch } from '@/services/institutionalDrive';
import { cargarManifest, manifestActual } from '@/repositorio/cargarRepositorio';
import { construirProcedencia, notaTrazabilidadSinFuentes, type Procedencia } from '@/repositorio/procedencia';

export type { Contenedor2DocumentResult, Contenedor2SectionProgress, Contenedor2SectionResult, Contenedor2SectionStatus };

/**
 * Bloque de CONDICIÓN DE PROCEDENCIA que se inyecta en el prompt del sistema, antes de las
 * instrucciones de fase (§6). No negociable: fija qué puede y qué no puede afirmar el modelo
 * según haya o no fuentes primarias propias del territorio.
 */
function buildProcedenceSystemBlock(procedencia: Procedencia): string {
  const version = procedencia.repositorio.version;
  if (procedencia.fuentesPropias.modo === 'sin_fuentes') {
    return [
      '══════════════════════════════════════════════════',
      'CONDICIÓN DE PROCEDENCIA: SIN FUENTES PRIMARIAS PROPIAS.',
      '══════════════════════════════════════════════════',
      'El equipo del territorio no habilitó repositorio de fuentes propias para esta generación.',
      'Reglas obligatorias:',
      '1. No afirmes, insinúes ni supongas que existen fuentes primarias del territorio.',
      '2. No atribuyas ningún dato territorial a fuente primaria, entrevista, acta o registro interno.',
      '3. Todo dato territorial se marca como CANDIDATO — PENDIENTE DE VERIFICACIÓN, con la fuente secundaria de la que proviene.',
      '4. La aplicación añadirá al final del documento la «Nota de trazabilidad documental» literal; respeta su contenido y no la reproduzcas tú (para no duplicarla).',
      '5. Si una sección exige fuente primaria y no la hay, declara el vacío en la matriz de vacíos. No lo rellenes con inferencia.',
      '',
      'Texto de referencia de la nota (la añade la aplicación, no la copies):',
      notaTrazabilidadSinFuentes(version),
    ].join('\n');
  }

  const docs = procedencia.fuentesPropias.documentos;
  const inventario = docs.length
    ? docs
        .map((d) => `- ${d.nombre} (${d.mimeType}${d.modificado ? `, modificado ${d.modificado}` : ''})`)
        .join('\n')
    : '- (sin documentos legibles en el inventario)';
  return [
    '══════════════════════════════════════════════════',
    'CONDICIÓN DE PROCEDENCIA: CON FUENTES PRIMARIAS PROPIAS.',
    '══════════════════════════════════════════════════',
    'El equipo del territorio habilitó las siguientes fuentes propias (inventario verificado por la aplicación):',
    inventario,
    '',
    'Reglas obligatorias:',
    '1. Solo puedes atribuir un dato a fuente primaria si el documento correspondiente está EN ESTE INVENTARIO. No cites nada fuera de él.',
    '2. El contenido extraído de estas fuentes se transcribe más abajo, en «MATERIAL DE LAS FUENTES». Úsalo como fuente de prioridad.',
    '3. La aplicación añadirá al final del documento una «Tabla de fuentes propias consultadas» con este inventario; no la reproduzcas tú.',
    '4. Si un dato no está respaldado por el inventario ni por fuente secundaria pública, márcalo como CANDIDATO — PENDIENTE DE VERIFICACIÓN.',
  ].join('\n');
}

interface Contenedor2Context {
  aiProvider: AIProvider;
  sharedContext: string;
  identity: ReturnType<typeof fichaIdentity>;
  procedencia: Procedencia;
}

async function prepareContenedor2Context(
  prompt0Data: Prompt0Data,
  institutionalDriveText?: string,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2Context> {
  const { aiProvider, institutionalDriveBundle, fuentesMode, fuentesConexion } = useStore.getState();
  await cargarManifest();
  const procedencia =
    procedenciaArg ?? construirProcedencia({ manifest: manifestActual(), fuentesMode, fuentesConexion });
  const driveCombined =
    (institutionalDriveText && institutionalDriveText.trim()) ||
    institutionalDriveBundle?.text?.trim() ||
    '';
  const territoryMatch = findTerritoryMatch(institutionalDriveBundle?.territories, prompt0Data.municipality || '');
  const territory = territoryMatch?.sources ?? null;
  const identity = fichaIdentity(prompt0Data);

  const c2Methodology = await leerNucleoTexto('CONTENEDOR_2', 'contenedor2_contexto_territorial');
  if (!c2Methodology?.trim()) {
    throw new Error('No se encontró la metodología del Estudio Territorial en el núcleo del Laboratorio. Ejecuta «npm run sellar» y recarga.');
  }

  const maxMeth = getMaxC2TerritorialPromptDocCharsForContainer(aiProvider);
  const methodology = truncateAtBoundary(
    c2Methodology.trim(),
    maxMeth,
    'Marco metodológico del Estudio Territorial',
  );
  const instructionSlice = methodology.text + methodology.notice;
  if (methodology.wasTruncated) {
    console.warn(
      `[Contenedor 2] La instrucción institucional de Drive (${c2Methodology.length.toLocaleString()} caracteres) excede el presupuesto del proveedor (${maxMeth.toLocaleString()}). Sube \`VITE_MAX_C2_PROMPT_DOC_CHARS\` en .env.local para enviarla completa.`,
    );
  }

  const maxSources = Math.max(
    getMaxCombinedSourceChars(aiProvider) - methodology.text.length,
    Math.floor(getMaxCombinedSourceChars(aiProvider) * 0.3),
  );

  let territoryTrimmed = '';
  let territoryNotice = '';
  let focusMatchedFiles: string[] = [];
  let generalBudget = maxSources;
  if (territory?.text.trim()) {
    const territoryBlock = buildPrioritizedInstitutionalBlock(territory.text, Math.floor(maxSources * 0.6), {
      keywords: identity.focusKeywords,
    });
    territoryTrimmed = territoryBlock.text;
    territoryNotice = territoryBlock.notice;
    focusMatchedFiles = territoryBlock.keywordMatchedFiles;
    generalBudget = Math.max(maxSources - territoryTrimmed.length, Math.floor(maxSources * 0.3));
  }

  const institutionalBlock = buildPrioritizedInstitutionalBlock(driveCombined, generalBudget, {
    keywords: identity.focusKeywords,
  });
  const instTrimmed = institutionalBlock.text;
  const budgetNotice = institutionalBlock.notice;
  if (institutionalBlock.includedFiles.length) {
    console.info(
      `[Contenedor 2] Fuentes generales enviadas al modelo: ${institutionalBlock.includedFiles.join(', ')}`,
    );
  }
  focusMatchedFiles = [...focusMatchedFiles, ...institutionalBlock.keywordMatchedFiles];
  if (identity.focusText) {
    console.info(
      `[Contenedor 2] Tema previsto «${identity.focusText}»: ${
        focusMatchedFiles.length
          ? `lo mencionan ${focusMatchedFiles.join(', ')}`
          : 'ningún archivo del repositorio lo menciona'
      }.`,
    );
  }

  const territoryFacts = territoryMatch
    ? [
        `- Subcarpeta del territorio: **encontrada** → \`C_TERRITORIO_ESPECIFICO/${territoryMatch.sources.name}\`.`,
        `- Tipo de coincidencia con «${prompt0Data.municipality}»: ${
          territoryMatch.tier === 'exact'
            ? 'exacta (el nombre de la subcarpeta corresponde al municipio).'
            : territoryMatch.tier === 'nested'
              ? 'por carpeta anidada (la zona organizó las fuentes en un nivel más profundo, p. ej. por departamento). Repórtalo como observación de trazabilidad.'
              : '**parcial** (el nombre no coincide exactamente). Repórtalo como observación de trazabilidad, no como error.'
        }`,
        `- Archivos leídos en esa subcarpeta: ${territoryMatch.sources.fileNames.join(', ')}.`,
        territoryMatch.alsoMatched.length
          ? `- **Ambigüedad real**: también correspondían al municipio estas subcarpetas: ${territoryMatch.alsoMatched.join(', ')}. Solo se envió el material de la primera. Genera una alerta de verificación humana pidiendo confirmar cuál aplica.`
          : '- No había otras subcarpetas candidatas: no hay ambigüedad que reportar.',
      ].join('\n')
    : `- Subcarpeta del territorio: **no encontrada**. La aplicación recorrió \`C_TERRITORIO_ESPECIFICO/\` y no existe ninguna subcarpeta que corresponda a «${prompt0Data.municipality}»${
        institutionalDriveBundle?.diagnostics?.territoryFolderNames?.length
          ? ` (las que sí existen son: ${institutionalDriveBundle.diagnostics.territoryFolderNames.join(', ')})`
          : ' (esa carpeta está vacía)'
      }. No había insumo institucional propio del territorio en el momento de la ejecución: la Fase 4 no tiene con qué contrastar y debes declararlo.`;

  const appWrittenPoints = CONTENEDOR2_SECTIONS.filter((p) => p.kind === 'app')
    .map((p) => `${p.number} («${p.title}»)`)
    .join(' y ');

  const identityFacts = identity.focusText
    ? `- La casilla de la Ficha Base se usó para declarar un tema, no un nombre; el rótulo provisional es «${identity.displayName}».
- **Tema previsto por el equipo de zona: «${identity.focusText}»**. Es una hipótesis de trabajo declarada antes del diagnóstico: no es un hecho verificado, no es una fuente y no es una decisión tomada.

Qué debes hacer con ese tema previsto (obligatorio):
- Trátalo como **hipótesis a verificar**, nunca como premisa. No acomodes el diagnóstico para que encaje, no lo cites como si fuera fuente y no supongas que el territorio lo respalda.
- Búscalo de forma **dirigida**: además del diagnóstico territorial general, comprueba en cada apartado que lo admita (caracterización productiva, pilares, brechas y oportunidades) si las fuentes del territorio y la consulta por internet dicen algo **específico** sobre ese tema en este municipio. Si no dicen nada, dilo; no lo compenses con generalidades del sector.
- Insumos del repositorio que mencionan el tema: ${focusMatchedFiles.length ? focusMatchedFiles.join(', ') : '**ninguno**; si tampoco aparece en la consulta por internet, el tema queda sin respaldo documental y debes declararlo así'}.
- El veredicto sobre la hipótesis se da **solo** en el punto 8, donde se te pedirá expresamente. No lo adelantes en los apartados anteriores y no declares por él la vocación ni los temas estratégicos.`
    : `- Nombre del proyecto o idea: ${prompt0Data.labName}
- El equipo de zona no declaró ningún tema previsto: el diagnóstico no tiene hipótesis de enfoque que verificar y ninguna orientación temática debe darse por supuesta.`;

  const sharedContext = `
${buildProcedenceSystemBlock(procedencia)}

══════════════════════════════════════════════════
INSTRUCCIÓN INSTITUCIONAL DEL CONTENEDOR 2 — VIGENTE Y OBLIGATORIA
══════════════════════════════════════════════════

Lo que sigue es la instrucción que debes **ejecutar**: su metodología, sus criterios de calidad por fase, su manejo de vacíos, su estructura de salida y sus prohibiciones son de aplicación literal. No es una referencia opcional ni un ideal aspiracional.

${instructionSlice}

══════════════════════════════════════════════════
HECHOS DE EJECUCIÓN (verificados por la aplicación — no los reinterpretes ni los completes)
══════════════════════════════════════════════════

Ficha Base:
${identityFacts}
- Zona UNAD: ${prompt0Data.zonaUNAD}
- Municipio: ${prompt0Data.municipality}
- Departamento: ${prompt0Data.department}
- País: ${prompt0Data.country}${prompt0Data.isCapital || prompt0Data.capitalSede ? `\n- Cobertura Capital: ${prompt0Data.capitalSede || 'Distrito Capital / Sede Central'}` : ''}${prompt0Data.specificLocation ? `\n- Ubicación específica / Localidad / Sede: ${prompt0Data.specificLocation}` : ''}

Recorrido de Google Drive (ya realizado por la aplicación; tú **no** navegas carpetas: el material que corresponde se transcribe más abajo):
${territoryFacts}
- Insumos institucionales generales enviados: ${institutionalBlock.includedFiles.length ? institutionalBlock.includedFiles.join(', ') : 'ninguno'}.
- El resultado del Contenedor 1 **no se envía**: la instrucción declara que no es fuente de contexto territorial. No lo cites ni supongas su contenido.

Búsqueda por internet: la aplicación la solicita en cada llamada. Si el proveedor no la habilita, no dispondrás de ella; en ese caso trabaja solo con el material transcrito abajo y declara los vacíos según la instrucción, sin recurrir a datos de memoria no verificables.

Puntos que **no** debes redactar: los puntos ${appWrittenPoints} los escribe la aplicación de forma automática y verificable. Si te toca otro punto, no los adelantes ni los dupliques.
${budgetNotice}
══════════════════════════════════════════════════
MATERIAL DE LAS FUENTES
══════════════════════════════════════════════════
${
  territoryTrimmed
    ? `
INSUMOS DEL TERRITORIO — \`C_TERRITORIO_ESPECIFICO/${territory!.name}\` (fuente de prioridad 1)
Archivos: ${territory!.fileNames.join(', ')}

${territoryTrimmed}${territoryNotice}
`
    : `
(No hay insumos del territorio: ver los hechos de ejecución de arriba.)
`
}${
    instTrimmed
      ? `
OTROS DOCUMENTOS INSTITUCIONALES DEL REPOSITORIO (PDF, DOCX, TXT, Google Docs, imágenes con OCR ya extraído)

${instTrimmed}
`
      : `
(No llegó texto institucional general del repositorio.)
`
  }`.trim();

  return {
    aiProvider,
    sharedContext,
    identity,
    procedencia,
  };
}

async function generateContenedor2Section(
  ctx: Contenedor2Context,
  point: Contenedor2Point,
  previousMarkdown: string,
): Promise<Contenedor2SectionResult> {
  if (point.kind === 'app') {
    const md = buildContenedor2AppPoint(point, previousMarkdown);
    return {
      number: point.number,
      title: point.title,
      phase: point.phase,
      kind: point.kind,
      markdown: md,
      status: 'ok',
    };
  }

  let blockMarkdown = '';
  let review: { status: Contenedor2SectionStatus; issue?: string } = { status: 'ok' };

  try {
    for (let part = 0; part < point.parts.length; part++) {
      const prompt = buildContenedor2SectionPrompt(
        ctx.sharedContext,
        point,
        part,
        previousMarkdown + (blockMarkdown ? '\n\n' + blockMarkdown : ''),
        ctx.identity.displayName,
      );
      const raw = await callAI(prompt, {
        googleSearch: true,
        ...(ctx.aiProvider === 'unadGemini' ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() } : {}),
      });
      const chunk = sanitizeContenedor2SectionMarkdown(stripOuterMarkdownFence(raw));
      blockMarkdown += (blockMarkdown ? '\n\n' : '') + chunk;
    }
    blockMarkdown = sanitizeContenedor2SectionMarkdown(blockMarkdown);
    review = reviewContenedor2Section(point, blockMarkdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Contenedor 2] Falló el punto ${point.number} (${point.title}): ${msg}`);
    return {
      number: point.number,
      title: point.title,
      phase: point.phase,
      kind: point.kind,
      markdown: '',
      status: 'failed',
      issue: msg,
    };
  }

  if (review.status !== 'ok') {
    console.info(`[Contenedor 2] Autoevaluación del punto ${point.number}: ${review.issue} Reintentando con autorreparación…`);
    try {
      let repairedBlock = '';
      for (let part = 0; part < point.parts.length; part++) {
        const basePrompt = buildContenedor2SectionPrompt(
          ctx.sharedContext,
          point,
          part,
          previousMarkdown + (repairedBlock ? '\n\n' + repairedBlock : ''),
          ctx.identity.displayName,
        );
        const repairPrompt =
          part === 0
            ? basePrompt + buildContenedor2SelfRepairSuffix(point, review.issue || '')
            : basePrompt;
        const repairedRaw = await callAI(repairPrompt, {
          googleSearch: true,
          ...(ctx.aiProvider === 'unadGemini' ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() } : {}),
        });
        const chunk = sanitizeContenedor2SectionMarkdown(stripOuterMarkdownFence(repairedRaw));
        repairedBlock += (repairedBlock ? '\n\n' : '') + chunk;
      }
      repairedBlock = sanitizeContenedor2SectionMarkdown(repairedBlock);
      const repairedReview = reviewContenedor2Section(point, repairedBlock);
      if (repairedReview.status === 'ok' || (repairedReview.status === 'warning' && review.status === 'failed')) {
        blockMarkdown = repairedBlock;
        review = repairedReview;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Contenedor 2] El reintento del punto ${point.number} tampoco funcionó.`);
    }
  }

  return {
    number: point.number,
    title: point.title,
    phase: point.phase,
    kind: point.kind,
    markdown: blockMarkdown,
    status: review.status,
    issue: review.issue,
  };
}

export async function generateContainer(
  prompt0Data: Prompt0Data,
  institutionalDriveText?: string,
  onProgress?: (p: Contenedor2SectionProgress) => void,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2DocumentResult> {
  beginGenerationFlow();
  const ctx = await prepareContenedor2Context(prompt0Data, institutionalDriveText, procedenciaArg);
  const points = contenedor2Points(ctx.identity.focusText);
  const sections: Contenedor2SectionResult[] = [];
  let accumulated = '';

  for (const point of points) {
    onProgress?.({
      currentSection: point.number,
      totalSections: points.length,
      sectionTitle: point.title,
    });

    const result = await generateContenedor2Section(ctx, point, accumulated);
    sections.push(result);
    if (result.markdown.trim()) {
      accumulated += (accumulated ? '\n\n' : '') + result.markdown.trim();
    }
  }

  const markdown = assembleContenedor2Document(sections, ctx.procedencia);
  return { markdown, sections };
}

/**
 * Rehace un solo punto de entrega del Contenedor 2 conservando los demás (botón «Regenerar» de la Fase 2).
 * Usa como contexto de coherencia los puntos anteriores ya aceptados.
 */
export async function regenerateContenedor2Section(
  sectionIndex: number,
  currentSections: readonly Contenedor2SectionResult[],
  prompt0Data: Prompt0Data,
  institutionalDriveText?: string,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2SectionResult> {
  beginGenerationFlow();
  const identity = fichaIdentity(prompt0Data);
  const points = contenedor2Points(identity.focusText);
  const point = points[sectionIndex];
  if (!point) throw new Error(`Punto de entrega inválido: ${sectionIndex + 1}`);

  const ctx = await prepareContenedor2Context(prompt0Data, institutionalDriveText, procedenciaArg);
  const previous = currentSections
    .slice(0, sectionIndex)
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');

  return generateContenedor2Section(ctx, point, previous);
}
