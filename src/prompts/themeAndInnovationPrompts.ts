/**
 * Pasos intermedios entre Contenedor 2 y proyecto de innovación: vocación + 3 temas, y árbol de innovación.
 * Ambos se generan **por partes** (una llamada al modelo por parte, como el Contenedor 2 y el fundante)
 * para que cada bloque disponga del presupuesto completo de tokens de salida y no llegue cortado.
 */

import { tailForCoherence } from '@/prompts/fundantePhase3Sections';
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

// ─────────────────────────────────────────────────
// Paso 1 · Vocación territorial + 3 opciones de tema
// ─────────────────────────────────────────────────

export const VOCATION_PARTS: readonly GenerationPartMeta[] = [
  { number: 1, title: 'Vocación territorial' },
  { number: 2, title: 'Tres opciones de tema Centro de Innovación' },
] as const;

/**
 * Insumos del paso de vocación. Es el único paso del proceso que cruza los dos
 * contenedores: el diagnóstico del territorio (Contenedor 2, con su matriz FODA como
 * síntesis) y la capacidad institucional real de la UNAD (Contenedor 1). Por eso la
 * vocación se declara aquí y no en el Contenedor 2.
 */
export interface VocationPromptInputs {
  /** Contenedor 2 completo (recortado al presupuesto), como respaldo del diagnóstico. */
  containerTrimmed: string;
  /** Punto «Matriz FODA territorial» del Contenedor 2: el insumo principal de este paso. */
  fodaMatrix: string;
  /** Resultado del Contenedor 1: capacidad institucional con la que se verifica la vocación. */
  contenedor1: string;
  fichaBlock: string;
  /**
   * Tema que el equipo de zona declaró prever en la Ficha Base, cuando lo hizo. Llega
   * como hipótesis ya contrastada por el Contenedor 2, no como orientación a seguir:
   * vacío si no se declaró ninguno.
   */
  focusHypothesis: string;
  /** Contenido de `prompt_vocacion_cip_v2.txt` desde Google Drive. */
  institutionalVocacionPromptText: string;
}

/** Contexto común a las dos partes: insumos del caso + plantilla institucional completa. */
function vocationSharedContext(inputs: VocationPromptInputs): string {
  const { containerTrimmed, fodaMatrix, contenedor1, fichaBlock, focusHypothesis, institutionalVocacionPromptText } =
    inputs;
  return `
Eres analista estratégico territorial experto en innovación, desarrollo regional y formulación de Centro de Innovación UNAD.

══════════════════════════════════════════════════
INSUMOS DEL CASO
══════════════════════════════════════════════════

Ficha mínima (identificación):
${fichaBlock}
${
  focusHypothesis.trim()
    ? `
**Tema previsto por el equipo de zona (hipótesis, no insumo)**: antes de existir el diagnóstico, la zona declaró que preveía trabajar «${focusHypothesis.trim()}». El Contenedor 2 ya lo confrontó con la evidencia en su apartado «Resultado del contraste participativo»: lo que vale es **ese veredicto**, no la declaración.
- La hipótesis no es evidencia ni una decisión tomada. Si la matriz FODA apunta a otra actividad, declara la vocación que sostenga el diagnóstico, sin forzarla hacia el tema anunciado.
- Si lo que declaras se aparta de ese tema previsto, añade una nota breve recomendando revisar el nombre y el enfoque anunciados del Centro de Innovación, para que el equipo de zona lo corrija a tiempo.
`
    : ''
}
${
  fodaMatrix.trim()
    ? `**INSUMO PRINCIPAL — Matriz FODA territorial** (síntesis estratégica del diagnóstico del territorio; es el punto de partida de la vocación):
${fodaMatrix.trim()}`
    : `AVISO: el Contenedor 2 no trae un punto «Matriz FODA territorial» identificable. Trabaja con el diagnóstico completo de abajo y señala con **ALERTA DE VERIFICACIÓN HUMANA** que la síntesis FODA no estaba disponible como insumo.`
}

**Contenedor 2 validado — diagnóstico territorial completo** (respaldo factual de la matriz anterior; no inventes lo que no conste):
${containerTrimmed}

${
  contenedor1.trim()
    ? `**Contenedor 1 — capacidad institucional de la UNAD** (con qué cuenta realmente la universidad: escuelas, programas, grupos, infraestructura y experiencia en la zona). Sirve para **verificar** que la vocación que declares sea sostenible con la capacidad existente, no para copiar su contenido:
${contenedor1.trim()}`
    : `AVISO: no llegó el Contenedor 1. Declara la vocación solo con el diagnóstico territorial y añade **ALERTA DE VERIFICACIÓN HUMANA: la vocación no se pudo verificar contra la capacidad institucional de la UNAD.**`
}

══════════════════════════════════════════════════
PLANTILLA INSTITUCIONAL (Google Drive: prompt_vocacion_cip.txt)
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

  const shared = vocationSharedContext(inputs);
  const prev = previousBlock(previousMarkdown, 'PARTE YA REDACTADA DE LA PROPUESTA');

  const partTask =
    meta.number === 1
      ? `
En ESTA llamada redacta **solo la primera parte** del entregable: el análisis y la declaración de la **vocación territorial**, siguiendo el proceso y las reglas de calidad de la plantilla **en orden**.
- Tu salida debe **empezar** con el encabezado \`## Vocación territorial\` (o el título equivalente que exija la plantilla, siempre como encabezado de nivel 2).
- **NO** incluyas todavía las opciones de tema: van en la siguiente llamada.
`
      : `
La vocación territorial ya está redactada (bloque anterior). En ESTA llamada redacta **solo** las **tres opciones de tema Centro de Innovación** y el cierre o traspaso que exija la plantilla:
- \`## Opción de tema 1:\` … \`## Opción de tema 2:\` … \`## Opción de tema 3:\` — cada una con título persuasivo y **justificación breve** anclada en brechas y oportunidades del Contenedor 2, **coherente** con la vocación ya declarada.
- Este **rótulo de encabezado es obligatorio y prevalece** sobre la numeración de la plantilla: escribe \`## Opción de tema 2: <título>\`, nunca \`## 3.2 <título>\` ni las tres opciones dentro de una tabla. La aplicación los usa para armar las tarjetas de decisión del equipo y para heredar el tema elegido al árbol de innovación.
- **NO** repitas ni reescribas la vocación.
`;

  return `
${shared}
${prev}
══════════════════════════════════════════════════
TAREA — PARTE ${meta.number} DE ${VOCATION_PARTS.length}: ${meta.title} (generación por partes)
══════════════════════════════════════════════════

1) Respeta el **principio rector** de la plantilla: la vocación y los temas surgen del **análisis territorial** (brechas y oportunidades de la matriz FODA), no de un catálogo genérico de la UNAD.
2) Orden de los insumos: parte de la **matriz FODA territorial**, respáldala en el diagnóstico completo del Contenedor 2 y **verifica** contra la capacidad institucional del Contenedor 1 que lo que declaras es realizable. La ficha solo aporta la ubicación. No introduzcas hechos que no consten en esos insumos.
${partTask}
3) **Marcas heredadas del Contenedor 2**: todo dato que venga marcado con **VACÍO-VERIFICAR** o **REQUIERE CONTRASTE** **no es evidencia sólida**. No apoyes la vocación ni un tema en un dato marcado; no "resuelvas" la marca por tu cuenta; si necesitas mencionarlo, arrástrale la misma marca. Usa además esas marcas en tu propia redacción donde corresponda, y **ALERTA DE VERIFICACIÓN HUMANA: información pendiente de validación o ajuste manual.** donde falte evidencia.
4) PROHIBIDO enumerar listas masivas de números o citas (p. ej. \`[cita: 1, 2, 3, …]\`): cita como máximo 3–5 fuentes por afirmación y hazlo por su nombre, nunca por índices numéricos.
5) **CITACIÓN EN NORMAS APA (séptima edición) — REGLA CRÍTICA.** El **Contenedor 1**, el **Contenedor 2**, la **matriz FODA territorial**, el **listado/registro SIGIIP** y la plantilla institucional son **documentos internos de trabajo, NO fuentes citables**:
   - **PROHIBIDO** escribir citas del tipo "(Contenedor 2)", "según el Contenedor 1", "fuente: Contenedor 2", "(Contenedor 2, s.f.)", "tomado del Contenedor 1", "matriz FODA" o "listado SIGIIP" como referencia. Nunca los uses como origen del dato.
   - Cuando uses un dato tomado de un contenedor, **rastrea y cita el documento original** (autor institucional, entidad, año) tal como aparece dentro de ese insumo. Si el insumo no permite identificar la fuente original, **no inventes la cita**: márcalo con **ALERTA DE VERIFICACIÓN HUMANA: información pendiente de validación o ajuste manual.**
   - Los datos de proyectos previos de la UNAD se citan como registro institucional de la Universidad Nacional Abierta y a Distancia (con su año), nunca como "Contenedor 1" ni "listado SIGIIP".
6) En las tablas Markdown escribe la fila separadora (\`|---|---|\`) **una sola vez**, justo bajo el encabezado, y máximo 10 filas de datos por tabla. Nunca repitas filas separadoras ni líneas de guiones.
7) Salida **solo en Markdown**, sin prefacio del asistente. Sin envolver en \`\`\`markdown\`\`\`.

Redacta ahora **únicamente** esta parte.
`.trim();
}

// ─────────────────────────────────────────────────
// Paso 2 · Árbol de innovación
// ─────────────────────────────────────────────────

export const INNOVATION_TREE_PARTS: readonly GenerationPartMeta[] = [
  { number: 1, title: 'Tema central y 10 tendencias globales (Tabla 1)' },
  { number: 2, title: 'Tendencias Colombia y territorio (Tablas 2 y 3)' },
  { number: 3, title: 'Árbol de innovación estructurado' },
  { number: 4, title: 'Oportunidades y proyectos (Tabla 4)' },
  { number: 5, title: 'Fuentes, alertas y síntesis estratégica' },
] as const;

const TREE_PART_SCOPES: readonly string[] = [
  `El **tema central de innovación** (heredado de la opción elegida), la **explicación general del tema** y la **Tabla 1 completa: las 10 tendencias globales**, con las columnas exactas que exige la plantilla.`,
  `La **Tabla 2 completa: las 5 tendencias con impacto en Colombia** y la **Tabla 3 completa: las 3 tendencias con impacto en el territorio**, con las columnas exactas de la plantilla y **coherentes** con la Tabla 1 ya generada (no introduzcas tendencias nuevas que no estén en ella).`,
  `El **Árbol de innovación estructurado** completo (Suelo, Raíz, Tronco, Ramas globales, Ramas nacionales, Ramas territoriales, Hojas y Frutos, según la plantilla), coherente con las tablas ya generadas. Las secciones **Hojas** y **Frutos** son OBLIGATORIAS aquí: preséntalas como listas breves (un renglón por elemento); su desarrollo completo va en la parte siguiente.`,
  `Las **oportunidades de innovación** derivadas de las 3 tendencias territoriales y los **posibles proyectos, servicios o prototipos** (incluida la **Tabla 4 de conversión en oportunidades** si la plantilla la exige), coherentes con el árbol ya estructurado.`,
  `Las **Fuentes consultadas** (formato APA 7, diferenciando origen según la plantilla), el apartado **"Alertas pendientes de verificación"** (acumula TODAS las marcas generadas en las partes anteriores) y la **síntesis estratégica final** en un párrafo académico.`,
] as const;

/**
 * @param institutionalArbolPromptText Contenido completo de `prompt_arbol_innovacion.txt` desde Google Drive.
 */
function treeSharedContext(
  containerTrimmed: string,
  fichaBlock: string,
  themeProposalMarkdown: string,
  selectedOptionNumber: 1 | 2 | 3,
  institutionalArbolPromptText: string,
): string {
  return `
Eres analista de tendencias en innovación, productividad y desarrollo territorial, al servicio de un Centro de Innovación UNAD.

══════════════════════════════════════════════════
DATOS DEL CASO (rellenan la plantilla institucional)
══════════════════════════════════════════════════

FICHA (identificación territorial e institucional):
${fichaBlock}

CONTENEDOR 2 (contexto territorial, brechas, oportunidades, actores — evidencia principal; no inventes lo que no conste):
${containerTrimmed}

PROPUESTA DE TEMAS (el equipo humano eligió la **opción ${selectedOptionNumber}**):
${themeProposalMarkdown}

══════════════════════════════════════════════════
PLANTILLA INSTITUCIONAL (Google Drive: prompt_arbol_innovacion.txt)
══════════════════════════════════════════════════

${institutionalArbolPromptText.trim()}
`.trim();
}

export function buildInnovationTreePartPrompt(
  containerTrimmed: string,
  fichaBlock: string,
  themeProposalMarkdown: string,
  selectedOptionNumber: 1 | 2 | 3,
  institutionalArbolPromptText: string,
  partIndex: number,
  previousMarkdown: string,
): string {
  const meta = INNOVATION_TREE_PARTS[partIndex];
  const scope = TREE_PART_SCOPES[partIndex];
  if (!meta || !scope) throw new Error(`Parte de árbol de innovación inválida: ${partIndex}`);

  const shared = treeSharedContext(
    containerTrimmed,
    fichaBlock,
    themeProposalMarkdown,
    selectedOptionNumber,
    institutionalArbolPromptText,
  );
  const prev = previousBlock(previousMarkdown, 'PARTES YA REDACTADAS DEL ÁRBOL DE INNOVACIÓN');

  return `
${shared}
${prev}
══════════════════════════════════════════════════
TAREA — PARTE ${meta.number} DE ${INNOVATION_TREE_PARTS.length}: ${meta.title} (generación por partes)
══════════════════════════════════════════════════

El árbol de innovación completo se está generando en ${INNOVATION_TREE_PARTS.length} llamadas consecutivas que se concatenan en un único documento. En ESTA llamada redacta **solo**:
${scope}

1) Aplica **exactamente** la lógica, estructura y formato de la plantilla institucional para esta parte (títulos, columnas de tablas, marcas de calidad).
2) Sustituye en la plantilla los campos entre corchetes **concretamente** así:
   - **TEMA CENTRAL:** el título y enfoque del tema de la **opción ${selectedOptionNumber}** (toma el encabezado \`## Opción de tema ${selectedOptionNumber}\` y su párrafo de justificación como base).
   - **TERRITORIO ESPECÍFICO:** municipio, departamento, país y Zona UNAD de la ficha; añade precisiones del Contenedor 2 solo si están en el texto.
   - **SECTOR O CAMPO DE APLICACIÓN:** alinea con el tema elegido y el diagnóstico del Contenedor 2 (no inventes un sector ajeno a las fuentes).
3) **País de análisis:** Colombia (salvo que la plantilla y las fuentes indiquen lo contrario de forma explícita).
4) Respeta las reglas de la plantilla sobre **no inventar datos**, uso de **VACÍO-VERIFICAR** y fuentes sugeridas; las fuentes tipo OCDE, DANE, etc. son **orientativas** — no cites cifras concretas si no están en el Contenedor 2 o en el texto institucional disponible.
5) **NO** repitas contenido de las partes anteriores ni adelantes el de las siguientes; empieza directamente con el primer encabezado de esta parte.
6) PROHIBIDO enumerar listas masivas de números o citas (p. ej. \`[cita: 1, 2, 3, …]\`): cita como máximo 3–5 fuentes por afirmación y hazlo por su nombre, nunca por índices numéricos.
7) En las tablas Markdown escribe la fila separadora (\`|---|---|\`) **una sola vez**, justo bajo el encabezado, y máximo 10 filas de datos por tabla. Nunca repitas filas separadoras ni líneas de guiones.
8) Salida **solo en Markdown**, sin prefacio del asistente. Sin envolver en \`\`\`markdown\`\`\`.

Redacta ahora **únicamente** esta parte.
`.trim();
}

// ─────────────────────────────────────────────────
// Autoevaluación y Ensamblado de Vocación y Temas
// ─────────────────────────────────────────────────

export type VocationPartStatus = 'ok' | 'warning' | 'failed';

export interface VocationPartResult {
  number: number;
  title: string;
  markdown: string;
  status: VocationPartStatus;
  issue?: string;
}

export interface VocationDocumentResult {
  markdown: string;
  sections: VocationPartResult[];
}

/** Sanitiza el markdown de una parte de la vocación eliminando rayas y líneas de borde. */
export function sanitizeVocationMarkdown(markdown: string): string {
  let text = markdown.trim();
  text = text.replace(/^```(?:markdown)?\r?\n/i, '').replace(/\r?\n```$/i, '').trim();
  text = text.replace(/^[═─—_\-]{3,}\s*$/gm, '');
  text = text.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function reviewVocationPart(
  partIndex: number,
  markdown: string,
): { status: VocationPartStatus; issue?: string } {
  const clean = markdown.trim();
  if (!clean) {
    return { status: 'failed', issue: 'El modelo no generó contenido para esta parte.' };
  }
  if (clean.length < 120) {
    return { status: 'warning', issue: 'El contenido generado es inusualmente breve.' };
  }
  if (/\[\s*(?:completar|TBD|por definir|rellenar|inserte?)\s*\]/i.test(clean)) {
    return { status: 'warning', issue: 'Contiene marcadores de texto no resueltos.' };
  }

  // Comprobaciones de rayas y cajas
  const lines = clean.split('\n');
  const hrOnlyRe = /^\s*([-*_])\1{2,}\s*$/;
  let hrCount = 0;
  for (const ln of lines) {
    if (hrOnlyRe.test(ln)) hrCount++;
  }
  if (hrCount >= 1) {
    return {
      status: 'warning',
      issue: `La parte contiene ${hrCount} línea(s) divisoria(s) suelta(s) (---) que se ven como rayas; debe regenerarse sin ellas.`,
    };
  }

  // Parte 0: Vocación territorial
  if (partIndex === 0) {
    if (!/vocaci[oó]n/i.test(clean)) {
      return { status: 'warning', issue: 'No se detectó un encabezado o declaración explícita de la vocación territorial.' };
    }
  }

  // Parte 1: Tres opciones de tema Centro de Innovación
  if (partIndex === 1) {
    const parsed = parseThemeProposal(clean);
    if (parsed.themes.length < 3) {
      const matchCount = (clean.match(/(?:opci[oó]n|tema)\s*(?:de\s+tema\s*)?(?:n[.°º]?\s*)?[123]/gi) || []).length;
      if (matchCount < 3) {
        return {
          status: 'warning',
          issue: `Se esperaban 3 opciones de tema con formato «## Opción de tema N: <Título>» y se detectaron ${parsed.themes.length}.`,
        };
      }
    }
  }

  return { status: 'ok' };
}

export function buildVocationSelfRepairSuffix(partIndex: number, issue: string): string {
  const meta = VOCATION_PARTS[partIndex];
  if (partIndex === 1) {
    return `\n\n══════════════════════════════════════════════════
INSTRUCCIÓN OBLIGATORIA DE AUTOCORRECCIÓN
══════════════════════════════════════════════════
La versión anterior tuvo la siguiente observación: ${issue}
Escribe EXACTAMENTE las 3 opciones de tema con el encabezado obligatorio:
## Opción de tema 1: <Título persuasivo>
<Párrafo de justificación breve anclada en brechas y oportunidades del Contenedor 2>

## Opción de tema 2: <Título persuasivo>
<Párrafo de justificación breve anclada en brechas y oportunidades del Contenedor 2>

## Opción de tema 3: <Título persuasivo>
<Párrafo de justificación breve anclada en brechas y oportunidades del Contenedor 2>

PROHIBIDO incluir líneas de separación horizontales (---, ___, ***, ——, ═══).
No omitas ninguna de las tres opciones y no uses tablas ni otra numeración para los encabezados.`;
  }
  return `\n\n══════════════════════════════════════════════════
INSTRUCCIÓN OBLIGATORIA DE AUTOCORRECCIÓN
══════════════════════════════════════════════════
La versión anterior para «${meta?.title ?? 'esta parte'}» tuvo la siguiente observación: ${issue}
Por favor, redacta el contenido completo asegurando el encabezado correspondiente, sin rayas divisoras (---) y sin texto truncado.`;
}

export function assembleVocationDocument(sections: readonly VocationPartResult[]): string {
  return sections
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');
}

// ─────────────────────────────────────────────────
// Autoevaluación y Ensamblado del Árbol de Innovación
// ─────────────────────────────────────────────────

export type InnovationTreePartStatus = 'ok' | 'warning' | 'failed';

export interface InnovationTreePartResult {
  number: number;
  title: string;
  markdown: string;
  status: InnovationTreePartStatus;
  issue?: string;
}

export interface InnovationTreeDocumentResult {
  markdown: string;
  sections: InnovationTreePartResult[];
}

/** Sanitiza el markdown de una parte del árbol eliminando rayas y líneas de borde. */
export function sanitizeInnovationTreeMarkdown(markdown: string): string {
  let text = markdown.trim();
  text = text.replace(/^```(?:markdown)?\r?\n/i, '').replace(/\r?\n```$/i, '').trim();
  text = text.replace(/^[═─—_\-]{3,}\s*$/gm, '');
  text = text.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function reviewInnovationTreePart(
  partIndex: number,
  markdown: string,
): { status: InnovationTreePartStatus; issue?: string } {
  const clean = markdown.trim();
  if (!clean) {
    return { status: 'failed', issue: 'El modelo no generó contenido para esta parte.' };
  }
  if (clean.length < 150) {
    return { status: 'warning', issue: 'El contenido generado es inusualmente breve.' };
  }
  if (/\[\s*(?:completar|TBD|por definir|rellenar|inserte?)\s*\]/i.test(clean)) {
    return { status: 'warning', issue: 'Contiene marcadores de texto no resueltos.' };
  }

  // Comprobaciones de rayas y cajas
  const lines = clean.split('\n');
  const hrOnlyRe = /^\s*([-*_])\1{2,}\s*$/;
  let hrCount = 0;
  for (const ln of lines) {
    if (hrOnlyRe.test(ln)) hrCount++;
  }
  if (hrCount >= 1) {
    return {
      status: 'warning',
      issue: `La parte contiene ${hrCount} línea(s) divisoria(s) suelta(s) (---) que se ven como rayas; debe regenerarse sin ellas.`,
    };
  }

  // Parte 0: Tema central y Tabla 1 (10 tendencias globales)
  if (partIndex === 0) {
    if (!/tabla\s*1|tendencias?\s+global/i.test(clean)) {
      return { status: 'warning', issue: 'No se detectó la Tabla 1 de tendencias globales.' };
    }
  }

  // Parte 1: Tablas 2 y 3 (Colombia y Territorio)
  if (partIndex === 1) {
    const hasCol = /tabla\s*2|colombia/i.test(clean);
    const hasTerr = /tabla\s*3|territor|local|municip/i.test(clean);
    if (!hasCol || !hasTerr) {
      return { status: 'warning', issue: 'Falta la Tabla 2 (Colombia) o la Tabla 3 (Territorio).' };
    }
  }

  // Parte 2: Árbol estructurado
  if (partIndex === 2) {
    const missing: string[] = [];
    if (!/(?:suelo|ra[ií]z)/i.test(clean)) missing.push('Suelo/Raíz');
    if (!/tronco/i.test(clean)) missing.push('Tronco');
    if (!/ramas?/i.test(clean)) missing.push('Ramas');
    if (!/(?:hojas?|frutos?)/i.test(clean)) missing.push('Hojas/Frutos');
    if (missing.length > 1) {
      return { status: 'warning', issue: `Faltan componentes clave del árbol estructurado: ${missing.join(', ')}.` };
    }
  }

  // Parte 3: Oportunidades y proyectos
  if (partIndex === 3) {
    if (!/(?:oportunidad|proyecto|servicio|prototipo|tabla\s*4)/i.test(clean)) {
      return { status: 'warning', issue: 'No se identificaron las oportunidades de innovación o la cartera de proyectos.' };
    }
  }

  // Parte 4: Fuentes, alertas y síntesis
  if (partIndex === 4) {
    if (!/(?:fuente|referencia|alerta|s[ií]ntesis)/i.test(clean)) {
      return { status: 'warning', issue: 'No se identificó el apartado de fuentes consultadas o síntesis estratégica.' };
    }
  }

  return { status: 'ok' };
}

export function buildInnovationTreeSelfRepairSuffix(partIndex: number, issue: string): string {
  const meta = INNOVATION_TREE_PARTS[partIndex];
  return `\n\n══════════════════════════════════════════════════
INSTRUCCIÓN OBLIGATORIA DE AUTOCORRECCIÓN
══════════════════════════════════════════════════
La versión anterior para «${meta?.title ?? 'esta parte'}» tuvo la siguiente observación: ${issue}
Por favor, asegúrate de redactar la sección completa siguiendo las tablas y encabezados exactos exigidos por la plantilla institucional, sin incluir rayas divisorias (---).`;
}

export function assembleInnovationTreeDocument(sections: readonly InnovationTreePartResult[]): string {
  return sections
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');
}

