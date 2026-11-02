/**
 * Prompts internos de Ideación (vocación + 3 temas) y del Árbol de Innovación.
 * Copian el proceso de la app Fase 1: se generan por partes, una llamada al modelo por
 * parte, para que cada bloque disponga del presupuesto completo de salida. Lo único que
 * cambia es el insumo: el diagnóstico puede sustituirse por un tema o un archivo cualquiera.
 */

import { LAB_SCOPE_RULES, scopeIssue, tailForCoherence } from '@/prompts/labGuardrails';
import { parseThemeProposal } from '@/lib/themeProposal';

export type GenerationPartMeta = {
  /** 1-based, dentro de su flujo */
  number: number;
  /** Título corto para el indicador de avance de la UI */
  title: string;
};

export type GenerationPartProgress = {
  currentPart: number;
  totalParts: number;
  partTitle: string;
};

export type GenerationPartStatus = 'ok' | 'warning' | 'failed';

export interface GenerationPartResult {
  number: number;
  title: string;
  markdown: string;
  status: GenerationPartStatus;
  issue?: string;
}

/** De dónde sale el insumo de una herramienta; todas pueden trabajar solas o encadenadas. */
export type InputSourceKind = 'texto' | 'archivo' | 'estudio' | 'ideacion' | 'observatorio';

export interface InputSource {
  kind: InputSourceKind;
  /** Rótulo legible: nombre del archivo, señal del Radar, etc. */
  label: string;
  text: string;
}

/** Cola del resultado parcial reenviada en cada parte para coherencia sin inflar el prompt. */
const MAX_PREVIOUS_CONTEXT_CHARS = 12_000;

function previousBlock(previousMarkdown: string, label: string): string {
  const prev = tailForCoherence(previousMarkdown, MAX_PREVIOUS_CONTEXT_CHARS);
  if (!prev) return '';
  return `
══════════════════════════════════════════════════
${label} (solo para coherencia; no lo copies ni repitas)
══════════════════════════════════════════════════
${prev}
`;
}

/** Sanitiza una parte eliminando cercas, rayas y líneas de borde. */
export function sanitizePartMarkdown(markdown: string): string {
  let text = markdown.trim();
  text = text.replace(/^```(?:markdown)?\r?\n/i, '').replace(/\r?\n```$/i, '').trim();
  text = text.replace(/^[═─—_\-]{3,}\s*$/gm, '');
  text = text.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/** Comprobaciones comunes a toda parte; `null` si no hay defecto. */
function reviewCommon(markdown: string, minChars: number): { status: GenerationPartStatus; issue?: string } | null {
  const clean = markdown.trim();
  if (!clean) return { status: 'failed', issue: 'El modelo no generó contenido para esta parte.' };
  if (clean.length < minChars) return { status: 'warning', issue: 'El contenido generado es inusualmente breve.' };
  if (/\[\s*(?:completar|TBD|por definir|rellenar|inserte?)\s*\]/i.test(clean)) {
    return { status: 'warning', issue: 'Contiene marcadores de texto no resueltos.' };
  }
  const outOfScope = scopeIssue(clean);
  if (outOfScope) return { status: 'warning', issue: outOfScope };
  return null;
}

function selfRepairSuffix(title: string, issue: string, extra = ''): string {
  return `\n\n══════════════════════════════════════════════════
INSTRUCCIÓN OBLIGATORIA DE AUTOCORRECCIÓN
══════════════════════════════════════════════════
La versión anterior de «${title}» tuvo esta observación: ${issue}
Redacta el contenido completo sin rayas divisorias (---) y sin texto truncado.${extra}`;
}

export function assembleParts(sections: readonly GenerationPartResult[]): string {
  return sections
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');
}

// ─────────────────────────────────────────────────
// Ideación · Vocación + 3 opciones de tema
// ─────────────────────────────────────────────────

export const VOCATION_PARTS: readonly GenerationPartMeta[] = [
  { number: 1, title: 'Vocación' },
  { number: 2, title: 'Tres opciones de tema' },
] as const;

export interface VocationPromptInputs {
  source: InputSource;
  /** Matriz FODA, solo cuando el insumo es un Estudio Territorial que la trae. */
  fodaMatrix: string;
  /** Marco institucional UNAD: solo verifica alineación, nunca origina la vocación. */
  contenedor1: string;
  fichaBlock: string;
  /** Tema declarado en la Ficha Base: hipótesis ya contrastada por el estudio; vacío si no hay. */
  focusHypothesis: string;
  institutionalVocacionPromptText: string;
}

/** Cómo debe leerse el insumo: la plantilla habla del estudio territorial; aquí puede ser otra cosa. */
function sourceFrame(source: InputSource): string {
  if (source.kind === 'estudio') {
    return 'El insumo es un **Estudio Territorial completo**: es lo que la plantilla llama diagnóstico territorial. Aplica el proceso tal como está.';
  }
  const origin =
    source.kind === 'archivo'
      ? `el archivo «${source.label}»`
      : source.kind === 'observatorio'
        ? `la señal del Observatorio «${source.label}»`
        : 'un tema escrito por el usuario';
  return `El insumo es ${origin}, **no un diagnóstico territorial**, y esta herramienta funciona sola. Ejecuta el MISMO proceso de la plantilla adaptado así:
- Donde la plantilla diga «territorio», entiende el ámbito que se desprende del insumo (si no hay ninguno, el campo del tema en Colombia), y la vocación es la **vocación de servicio** de ese tema o ámbito.
- Extrae dinámicas, brechas y oportunidades del insumo; lo que no conste búscalo en fuentes públicas verificables con la consulta web cuando esté disponible, y cítalo en APA 7. Aquí sí se permite buscar fuentes nuevas.
- Si no puedes sustentar algo, márcalo con las alertas de la plantilla. Declara «VOCACIÓN NO FORMULABLE» solo si, aun consultando fuentes públicas, no hay un solo cruce sólido de brecha y oportunidad.`;
}

function vocationSharedContext(inputs: VocationPromptInputs): string {
  const { source, fodaMatrix, contenedor1, fichaBlock, focusHypothesis, institutionalVocacionPromptText } = inputs;
  return `
${LAB_SCOPE_RULES}

Eres analista estratégico experto en innovación y desarrollo regional.

══════════════════════════════════════════════════
INSUMOS DEL CASO
══════════════════════════════════════════════════

Ficha (si está vacía, el usuario no indicó territorio):
${fichaBlock}

${sourceFrame(source)}
${
  focusHypothesis.trim()
    ? `
**Tema previsto por el equipo (hipótesis, no insumo)**: «${focusHypothesis.trim()}». Lo que vale es el veredicto del contraste del estudio, no la declaración. Si la evidencia apunta a otra actividad, declara la vocación que sostenga el diagnóstico y añade una nota breve recomendando revisar ese enfoque.
`
    : ''
}
${
  fodaMatrix.trim()
    ? `**INSUMO PRINCIPAL — Matriz FODA territorial**:
${fodaMatrix.trim()}
`
    : ''
}
**Insumo${source.kind === 'estudio' ? ' — Estudio Territorial' : ''}** (no inventes lo que no conste):
${source.text}

${
  contenedor1.trim()
    ? `**Marco institucional de la UNAD** (solo para el paso de verificación de alineación; no origina la vocación):
${contenedor1.trim()}`
    : '**AVISO:** el marco institucional no llegó. Añade **ALERTA DE VERIFICACIÓN HUMANA: no se pudo verificar la alineación institucional.**'
}

══════════════════════════════════════════════════
PLANTILLA INTERNA DEL PROCESO
══════════════════════════════════════════════════

${institutionalVocacionPromptText.trim()}
`.trim();
}

export function buildThemeVocationPartPrompt(
  inputs: VocationPromptInputs,
  partIndex: number,
  previousMarkdown: string,
): string {
  const meta = VOCATION_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de vocación inválida: ${partIndex}`);

  const partTask =
    meta.number === 1
      ? `
En ESTA llamada redacta **solo** el análisis y la declaración de la **vocación** y su justificación (apartados 1 y 2 del formato).
- Tu salida debe **empezar** con el encabezado \`## Vocación\`.
- **NO** incluyas todavía las opciones de tema: van en la siguiente llamada.
`
      : `
La vocación ya está redactada (bloque anterior). En ESTA llamada redacta **solo** las **tres opciones de tema** y los apartados de cierre del formato:
- \`## Opción de tema 1: <título>\`, \`## Opción de tema 2: <título>\`, \`## Opción de tema 3: <título>\`. Bajo cada una, estas dos viñetas literales: \`- **Brechas que atiende:** …\` y \`- **Oportunidades que aprovecha:** …\`, y un párrafo breve de justificación.
- Este rótulo es obligatorio y prevalece sobre la numeración de la plantilla: la aplicación lo usa para armar las tarjetas de decisión. No uses tablas para las opciones.
- Después, como encabezados de nivel 2: \`## Verificación de alineación institucional\`, \`## Fuentes consultadas\` (APA 7) y \`## Alertas pendientes de verificación\`.
- **NO** repitas ni reescribas la vocación.
`;

  return `
${vocationSharedContext(inputs)}
${previousBlock(previousMarkdown, 'PARTE YA REDACTADA')}
══════════════════════════════════════════════════
TAREA — PARTE ${meta.number} DE ${VOCATION_PARTS.length}: ${meta.title}
══════════════════════════════════════════════════
${partTask}
1) Respeta el **principio rector**: la vocación y los temas surgen del análisis del insumo, no de un catálogo genérico de la UNAD.
2) Todo dato marcado **VACÍO-VERIFICAR** o **REQUIERE CONTRASTE** no es evidencia sólida: no apoyes en él la vocación ni un tema; si lo mencionas, arrástrale la marca. Escribe las alertas con la forma \`==⚠️ ALERTA DE VERIFICACIÓN HUMANA: detalle (VACÍO-VERIFICAR)==\`.
3) Cita en APA 7 por el nombre de la fuente original, máximo 3–5 por afirmación. Si no puedes identificar la fuente original, no inventes la cita: usa la alerta.
4) En tablas Markdown, la fila separadora (\`|---|---|\`) una sola vez y máximo 10 filas de datos.
5) Salida **solo en Markdown**, sin prefacio del asistente, sin envolver en \`\`\`markdown\`\`\`.

Redacta ahora **únicamente** esta parte.
`.trim();
}

export function reviewVocationPart(partIndex: number, markdown: string): { status: GenerationPartStatus; issue?: string } {
  const common = reviewCommon(markdown, 120);
  if (common) return common;
  if (partIndex === 0 && !/vocaci[oó]n/i.test(markdown)) {
    return { status: 'warning', issue: 'No se detectó una declaración explícita de la vocación.' };
  }
  if (partIndex === 1) {
    // La parte 2 se valida con una vocación ficticia: el analizador exige texto antes de las opciones.
    const parsed = parseThemeProposal(`## Vocación\n\n.\n\n${markdown}`);
    if (!parsed || parsed.themes.length < 3) {
      return { status: 'warning', issue: 'Se esperaban 3 opciones con el formato «## Opción de tema N: <título>».' };
    }
  }
  return { status: 'ok' };
}

export function buildVocationSelfRepairSuffix(partIndex: number, issue: string): string {
  return selfRepairSuffix(
    VOCATION_PARTS[partIndex]?.title ?? 'esta parte',
    issue,
    partIndex === 1 ? '\nEscribe EXACTAMENTE las 3 opciones con el encabezado «## Opción de tema N: <título>».' : '',
  );
}

// ─────────────────────────────────────────────────
// Árbol de innovación (10 → 5 → 3)
// ─────────────────────────────────────────────────

export const INNOVATION_TREE_PARTS: readonly GenerationPartMeta[] = [
  { number: 1, title: 'Tema central y 10 tendencias globales' },
  { number: 2, title: 'Tendencias en Colombia y en el territorio' },
  { number: 3, title: 'Árbol de innovación estructurado' },
  { number: 4, title: 'Oportunidades y proyectos' },
  { number: 5, title: 'Fuentes, alertas y síntesis estratégica' },
] as const;

const TREE_PART_SCOPES: readonly string[] = [
  `El **tema central de innovación**, la **explicación general del tema** y la **Tabla 1 completa: las 10 tendencias globales**, con las columnas exactas de la plantilla.`,
  `La **Tabla 2 completa: las 5 tendencias con impacto en Colombia** y la **Tabla 3 completa: las 3 tendencias con impacto en el territorio**, con las columnas exactas de la plantilla. Usa los nombres de tendencia de forma **literal** a como quedaron en la Tabla 1: no introduzcas tendencias nuevas.`,
  `El **Árbol de innovación estructurado** completo con encabezado \`## Árbol de innovación estructurado\` y estas etiquetas en líneas propias: SUELO, RAÍZ, TRONCO, RAMAS GLOBALES, RAMAS NACIONALES, RAMAS TERRITORIALES, HOJAS, FRUTOS. HOJAS y FRUTOS son obligatorias, como listas breves de un renglón por elemento.`,
  `Las **oportunidades de innovación** derivadas de las 3 tendencias territoriales y los **posibles proyectos, servicios o prototipos**, incluida la **Tabla 4 de conversión en oportunidades** con la columna «Tipo de resultado» escrita como Proyecto, Servicio o Prototipo.`,
  `Las **Fuentes consultadas** (APA 7), el apartado **«Alertas pendientes de verificación»** (acumula TODAS las marcas de las partes anteriores) y la **síntesis estratégica final** en un párrafo académico.`,
] as const;

export interface TreePromptInputs {
  themeName: string;
  themeExplanation: string;
  territoryBlock: string;
  /** Estudio Territorial, cuando existe y el usuario decidió usarlo. */
  territorialContext: string;
  /** Señales del Radar relacionadas con el tema: origen N1 de los nodos que las usen. */
  observatoryBlock: string;
  institutionalArbolPromptText: string;
}

function treeSharedContext(inputs: TreePromptInputs): string {
  return `
${LAB_SCOPE_RULES}

Eres analista de tendencias en innovación, productividad y desarrollo territorial.

══════════════════════════════════════════════════
DATOS DEL CASO (completan la plantilla)
══════════════════════════════════════════════════

TEMA CENTRAL: ${inputs.themeName}
${inputs.themeExplanation.trim() ? `EXPLICACIÓN O DOCUMENTO DEL USUARIO:\n${inputs.themeExplanation.trim()}\n` : ''}
TERRITORIO ESPECÍFICO:
${inputs.territoryBlock}

${inputs.territorialContext.trim() ? `ESTUDIO TERRITORIAL (evidencia principal de la RAÍZ; no inventes lo que no conste):\n${inputs.territorialContext.trim()}\n` : 'No hay Estudio Territorial: sustenta la RAÍZ con fuentes públicas verificables y marca las alertas que correspondan.\n'}
${inputs.observatoryBlock.trim() ? `SEÑALES DEL RADAR DEL OBSERVATORIO INNOVAHUB360 RELACIONADAS (dato real del Observatorio; úsalas si son pertinentes y nómbralas igual):\n${inputs.observatoryBlock.trim()}\n` : ''}
══════════════════════════════════════════════════
PLANTILLA INTERNA DEL PROCESO
══════════════════════════════════════════════════

${inputs.institutionalArbolPromptText.trim()}
`.trim();
}

export function buildInnovationTreePartPrompt(inputs: TreePromptInputs, partIndex: number, previousMarkdown: string): string {
  const meta = INNOVATION_TREE_PARTS[partIndex];
  const scope = TREE_PART_SCOPES[partIndex];
  if (!meta || !scope) throw new Error(`Parte de árbol de innovación inválida: ${partIndex}`);

  return `
${treeSharedContext(inputs)}
${previousBlock(previousMarkdown, 'PARTES YA REDACTADAS DEL ÁRBOL')}
══════════════════════════════════════════════════
TAREA — PARTE ${meta.number} DE ${INNOVATION_TREE_PARTS.length}: ${meta.title}
══════════════════════════════════════════════════

El árbol completo se genera en ${INNOVATION_TREE_PARTS.length} llamadas que se concatenan en un único documento. En ESTA llamada redacta **solo**:
${scope}

1) Aplica exactamente la lógica, estructura y formato de la plantilla para esta parte (columnas de tablas, marcas de calidad).
2) País de análisis: Colombia.
3) Respeta las reglas de la plantilla sobre **no inventar datos** y las alertas \`==⚠️ ALERTA DE VERIFICACIÓN HUMANA: detalle (VACÍO-VERIFICAR)==\`.
4) **NO** repitas contenido de las partes anteriores ni adelantes el de las siguientes.
5) Cita por el nombre de la fuente, máximo 3–5 por afirmación, nunca por índices numéricos.
6) En tablas Markdown, la fila separadora (\`|---|---|\`) una sola vez. La Tabla 1 lleva sus 10 filas.
7) Salida **solo en Markdown**, sin prefacio del asistente, sin envolver en \`\`\`markdown\`\`\`.

Redacta ahora **únicamente** esta parte.
`.trim();
}

export function reviewInnovationTreePart(partIndex: number, markdown: string): { status: GenerationPartStatus; issue?: string } {
  const common = reviewCommon(markdown, 150);
  if (common) return common;
  const checks: Array<[RegExp, string]> = [
    [/tabla\s*1|tendencias?\s+global/i, 'No se detectó la Tabla 1 de tendencias globales.'],
    [/tabla\s*2|colombia/i, 'Falta la Tabla 2 (Colombia).'],
    [/hojas?[\s\S]*frutos?|frutos?[\s\S]*hojas?/i, 'Faltan las secciones Hojas y Frutos del árbol estructurado.'],
    [/tabla\s*4|oportunidad/i, 'No se identificaron las oportunidades de innovación.'],
    [/fuente|referencia|s[ií]ntesis/i, 'No se identificó el apartado de fuentes o la síntesis estratégica.'],
  ];
  const [re, issue] = checks[partIndex] ?? [];
  if (re && !re.test(markdown)) return { status: 'warning', issue };
  return { status: 'ok' };
}

export function buildInnovationTreeSelfRepairSuffix(partIndex: number, issue: string): string {
  return selfRepairSuffix(INNOVATION_TREE_PARTS[partIndex]?.title ?? 'esta parte', issue);
}

/** Convierte el documento ya redactado en el grafo que dibuja el árbol interactivo. */
export function buildTreeGraphPrompt(themeName: string, documentMarkdown: string): string {
  return `
Eres un analista que convierte un documento en datos estructurados, SIN inventar nada: todo sale del documento.

TEMA CENTRAL: ${themeName}

DOCUMENTO:
${documentMarkdown}

Devuelve ÚNICAMENTE un objeto JSON válido, sin texto alrededor, con esta forma:
{
  "nodos": [
    {
      "codigo": "TG-01",
      "nivel": "suelo|raiz|tronco|global|nacional|territorial|hoja|fruto",
      "nombre": "nombre breve (máximo 70 caracteres)",
      "descripcion": "una o dos frases tomadas del documento",
      "evidencia": "N1|N2|N3",
      "deriva_de": ["códigos de los nodos de los que deriva"],
      "tipo_fruto": "proyecto|servicio|prototipo (solo en frutos)",
      "solucion": "posible solución (solo en frutos)",
      "impacto_esperado": "impacto esperado (solo en frutos)",
      "fuentes": ["fuentes citadas para este nodo"],
      "alertas": ["alertas de verificación de este nodo"]
    }
  ]
}

Códigos y derivación:
- TR-01: el tronco (tema central). Exactamente uno.
- TG-01…: tendencias globales de la Tabla 1; deriva_de ["TR-01"].
- TN-01…: tendencias de Colombia de la Tabla 2; deriva_de la tendencia global de la que salieron.
- TT-01…: tendencias territoriales de la Tabla 3; deriva_de la tendencia de Colombia de la que salieron.
- HO-01…: hojas (oportunidades); deriva_de la tendencia territorial que las origina.
- FR-01…: frutos (proyectos, servicios, prototipos); deriva_de su hoja.
- RZ-01…: raíces (problemas y brechas), máximo 6; deriva_de ["TR-01"].
- SU-01…: suelo (fuentes de sustento), máximo 8; deriva_de ["TR-01"].

Evidencia: N1 si proviene del Radar del Observatorio; N2 si el documento cita una fuente verificable; N3 si es hipótesis o lleva alerta de verificación.
Si el documento trae menos elementos que los esperados, entrega solo los que existen: nunca completes para llegar a un número.
`.trim();
}
