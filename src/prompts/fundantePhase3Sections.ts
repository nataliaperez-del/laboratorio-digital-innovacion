import type { Prompt0Data } from '@/store/useStore';
import { cipDisplayName, cipTitleLabel } from '@/lib/cipIdentity';
import { DRIVE_REFERENCE_INSTRUCCION_FUNDANTE } from '@/constants/cipDocumentReferences';
import { formatEscuelasForPrompt } from '@/constants/unadEscuelas';
import type { FundanteWorkflowExtras } from '@/prompts/fundantePhase3';
import { buildFundanteInputsBlock, buildFundanteNormativaBlock } from '@/prompts/fundantePhase3';

export type FundanteSectionMeta = {
  /** 1–13 */
  number: number;
  /** Texto tras "## N. " */
  title: string;
  /** Instrucción breve específica del apartado */
  focus: string;
};

export const FUNDANTE_SECTIONS: readonly FundanteSectionMeta[] = [
  {
    number: 1,
    title: 'Introducción y justificación estratégica',
    focus:
      'Formaliza el CIP, pertinencia territorial, alineación con misión UNAD y con el **tema humano elegido** y la vocación descrita en los insumos del flujo intermedio. No adelantes tablas SIGIIP ni el árbol detallado: eso va en los apartados 3 y 6.',
  },
  {
    number: 2,
    title: 'Marco Referencial, Normativo y Contextual',
    focus:
      'Integra fundamento institucional, normativo, teórico y contextual. Cuando las fuentes lo permitan, usa **únicamente** subapartados **2.1** Marco normativo institucional, **2.2** Marco teórico, **2.3** Análisis de contexto y del entorno y **2.4** Marco conceptual. Si falta material, indícalo con la ALERTA de verificación humana. **No** incluyas aquí listados o matrices extensas de proyectos SIGIIP ni una subsección "Experiencias previas": eso pertenece al **apartado 6**.',
  },
  {
    number: 3,
    title: 'Árbol de innovación',
    focus:
      'Debe reflejar el **mismo enfoque** que el paso intermedio: plantilla **prompt_arbol_innovacion.txt** (tablas 10→5→3, Raíz/Tronco/Ramas/Hojas/Frutos/Suelo y síntesis). No sustituyas por otro marco incompatible con ese insumo.',
  },
  {
    number: 4,
    title: 'Articulación metasistémica UNAD',
    focus:
      'Vincula el CIP con el metasistema, responsabilidades sustantivas, intersistémico y horizonte UNAD 5.0 según lo que respalden las fuentes.',
  },
  {
    number: 5,
    title: 'Plataforma estratégica del CIP',
    focus:
      'Visión, líneas o ejes alineados al territorio y al tema elegido; lenguaje accionable, sin inventar programas no mencionados en fuentes.',
  },
  {
    number: 6,
    title: 'Experiencias previas de investigación',
    focus:
      '**Único apartado principal** para proyectos de investigación registrados, trayectoria en la zona y tablas de experiencias. La matriz se construye **transcribiendo** el bloque REGISTRO SIGIIP de las entradas: **nombre textual del proyecto entre comillas**, código, tipo, investigador responsable, escuela, zona, estado y convocatoria, más una columna de **contribución al CIP** que sí razonas tú. Los campos que el registro no publica (grupo de investigación, categoría, líneas, número de investigadores) se escriben como "No disponible en la fuente consultada" con su ALERTA. No asumas que el lector "ya vio" una tabla en el apartado 2: aquí va el desarrollo completo.',
  },
  {
    number: 7,
    title: 'Portafolio de servicios',
    focus:
      'Macroservicios y microservicios alineados al territorio y al tema elegido; usa numeración interna tipo **7.1**, **7.2** si aplica. Referencia las **experiencias del apartado 6** cuando convenga, sin volver a pegar matrices largas.',
  },
  {
    number: 8,
    title: 'Acceso al servicio y operacionalización',
    focus:
      'Canales, flujos o lógica operativa solo con base en fuentes o marcos genéricos señalando verificación humana donde falte detalle. Incluye el subapartado **8.4 Infraestructura y recursos** con las viñetas **Talento humano**, **Recursos físicos y tecnológicos** y **Recursos administrativos**, siguiendo las reglas del bloque TALENTO HUMANO Y RECURSOS del apartado 8.',
  },
  {
    number: 9,
    title: 'Indicadores de cumplimiento y productos esperados',
    focus:
      'Indicadores y productos realistas; si no hay cifras en fuentes, plantea criterios cualitativos y ALERTA donde haga falta validación.',
  },
  {
    number: 10,
    title: 'Alcance',
    focus: 'Delimita alcance geográfico, poblacional y temático según Contenedor 2 y ficha.',
  },
  {
    number: 11,
    title: 'Ruta de maduración',
    focus: 'Fases o hitos de maduración del CIP de forma coherente con el resto del documento y las fuentes.',
  },
  {
    number: 12,
    title: 'Referencias',
    focus:
      'Listado **APA (séptima edición)** ordenado alfabéticamente con **enlaces accesibles obligatorios (DOI: https://doi.org/... o URL oficial canónica: https://...)** para cada documento citado (planes de desarrollo, CONPES, DANE, normas oficiales, artículos científicos y documentos institucionales). **Prohibido** listar como referencia el «Contenedor 1», «Contenedor 2» ni insumos internos: cita los documentos originales con sus enlaces activos.',
  },
  {
    number: 13,
    title: 'Anexos y matrices',
    focus:
      'Matrices en Markdown con varias filas cuando haya datos; si no hay datos, una fila explicativa + ALERTA, sin tablas ficticias. **Prioriza** anexos distintos al relato del apartado 6 (p. ej. cronograma, riesgos, actores, MEV); **evita** duplicar la matriz extensa de SIGIIP ya desarrollada en el apartado 6 salvo un resumen tabular de una página con otro enfoque.',
  },
] as const;

export const FUNDANTE_SECTION_COUNT = FUNDANTE_SECTIONS.length;

/**
 * Apartados que reciben el registro de proyectos: 6 lo tabula, 7 lo usa como evidencia
 * de capacidades y 13 hace un resumen cruzado.
 */
const SECTIONS_WITH_SIGIIP = new Set([6, 7, 13]);

export type FundanteSectionProgress = {
  currentSection: number;
  totalSections: number;
  sectionTitle: string;
};

/**
 * `ok` = apartado utilizable; `warning` = se redactó pero la autoevaluación detectó
 * un defecto (quedó corto, cortado o con marcadores); `failed` = no hay texto usable.
 * Los dos últimos habilitan el botón «Regenerar» de ese apartado en la Fase 3.
 */
export type FundanteSectionStatus = 'ok' | 'warning' | 'failed';

export type FundanteSectionResult = {
  number: number;
  title: string;
  markdown: string;
  status: FundanteSectionStatus;
  /** Motivo legible del defecto detectado (se muestra junto al botón «Regenerar»). */
  issue?: string;
};

/** Texto mínimo para considerar que un apartado tiene desarrollo sustantivo. */
const MIN_SECTION_CHARS = 350;

/**
 * Autoevaluación local de un apartado recién redactado: detecta los defectos que en
 * la práctica dejan el documento inservible sin que el proveedor reporte ningún error.
 * No consume llamadas al modelo.
 */
export function reviewFundanteSection(
  sectionIndex: number,
  markdown: string,
): { status: FundanteSectionStatus; issue?: string } {
  const meta = FUNDANTE_SECTIONS[sectionIndex];
  const text = markdown.trim();

  if (!text) return { status: 'failed', issue: 'El modelo no devolvió texto para este apartado.' };

  if (text.length < MIN_SECTION_CHARS) {
    return {
      status: 'failed',
      issue: `El apartado quedó demasiado corto (${text.length} caracteres) para considerarse desarrollado.`,
    };
  }

  // El encabezado correcto es lo que permite ensamblar y navegar el documento final.
  const headingRe = new RegExp(`^#{1,3}\\s*\\**\\s*${meta.number}\\s*[.)-]`, 'm');
  if (!headingRe.test(text)) {
    return {
      status: 'warning',
      issue: `Falta el encabezado «## ${meta.number}. ${meta.title}» al inicio del apartado.`,
    };
  }

  if (/\[(?:completar|pendiente|tbd|por definir|insertar|xxx)\b[^\]]*\]/i.test(text)) {
    return { status: 'warning', issue: 'El texto contiene marcadores de relleno sin completar.' };
  }

  if (/ALERTA DE VERIFICACIÓN HUMANA: (?:el final de este bloque|este bloque pudo quedar incompleto)/i.test(text)) {
    return {
      status: 'warning',
      issue: 'El apartado se cortó por el límite de longitud del modelo y puede estar incompleto al final.',
    };
  }

  // Comprobaciones estrictas contra "rayas", arte ASCII y tablas defectuosas
  const lines = text.split('\n');
  const asciiBoxRe = /\+[-–—]{2,}|[│┌┐└┘├┤┬┴┼╭╮╰╯╬╦╩╠╣═]{2,}/;
  const hrOnlyRe = /^\s*([-*_])\1{2,}\s*$/; // línea completa de ---, *** o ___ (raya suelta, sin tabla)
  const isSepRow = (ln: string): boolean => {
    const t = ln.trim();
    if (!t.includes('|') || !t.includes('-')) return false;
    const stripped = t.replace(/[\s|:]/g, '');
    return stripped.length >= 3 && /^-+$/.test(stripped);
  };
  const isDashOnlyRow = (ln: string): boolean => {
    const t = ln.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return false;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    return cells.length > 0 && cells.every((c) => /^[-–—\s.]+$/.test(c));
  };

  let hrCount = 0;
  let asciiBox = false;
  let repeatedSep = false;
  let dashOnlyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (asciiBoxRe.test(lines[i])) asciiBox = true;
    if (hrOnlyRe.test(lines[i])) hrCount++;
    if (i > 0 && isSepRow(lines[i]) && isSepRow(lines[i - 1])) repeatedSep = true;
    if (isDashOnlyRow(lines[i]) && !isSepRow(lines[i])) dashOnlyCount++;
  }

  if (asciiBox) {
    return {
      status: 'warning',
      issue: 'El apartado contiene un diagrama o caja en arte ASCII; debe reemplazarse por una lista jerárquica o tabla Markdown estándar.',
    };
  }

  if (repeatedSep) {
    return {
      status: 'warning',
      issue: 'El apartado tiene filas separadoras de tabla repetidas que aparecen como líneas de guiones.',
    };
  }

  if (hrCount >= 1) {
    return {
      status: 'warning',
      issue: `El apartado tiene ${hrCount} línea(s) divisoria(s) suelta(s) (---) que se ven como rayas; debe regenerarse sin ellas.`,
    };
  }

  if (dashOnlyCount >= 2) {
    return {
      status: 'warning',
      issue: 'El apartado contiene filas de tabla vacías con solo guiones (- - -) que generan rayas; debe completarse con datos o eliminarse.',
    };
  }

  // Comprobación de extensión para asegurar que el documento se mantenga bajo el tope de 60 páginas
  if (text.length > 25_000) {
    return {
      status: 'warning',
      issue: `El apartado excede la extensión ejecutiva recomendada (${text.length} caracteres). Conviene sintetizar para mantener el documento bajo el tope institucional de 60 páginas.`,
    };
  }

  // Comprobación de enlaces accesibles obligatorios en el apartado 12 (Referencias)
  if (meta.number === 12) {
    const urlMatches = text.match(/https?:\/\/[^\s)]+|doi\.org\/[^\s)]+/gi) || [];
    if (urlMatches.length < 3) {
      return {
        status: 'warning',
        issue: 'El apartado 12 (Referencias) debe incluir los enlaces accesibles (DOI activo: https://doi.org/... o URL canónica: https://...) para cada una de las fuentes bibliográficas citadas en formato APA 7ma edición.',
      };
    }
  }

  return { status: 'ok' };
}

/** Ensambla el documento final a partir de los apartados que tienen texto utilizable. */
export function assembleFundanteDocument(sections: readonly FundanteSectionResult[]): string {
  return sections
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Instrucción extra que se añade al reintento automático cuando la autoevaluación
 * detecta un defecto: le dice al modelo exactamente qué corregir.
 */
export function buildSelfRepairSuffix(sectionIndex: number, issue: string): string {
  const meta = FUNDANTE_SECTIONS[sectionIndex];
  const isOverflow = /excede la extensi[oó]n|sintetizar|tope.*60 p[aá]ginas/i.test(issue);
  const overflowInstruction = isOverflow
    ? `\n- SÍNTESIS Y CONDENSACIÓN OBLIGATORIA: el apartado anterior fue demasiado extenso. Reduce y sintetiza el texto para que tenga entre 6.000 y 14.000 caracteres (máximo 8 a 10 filas en tablas de datos), eliminando párrafos repetitivos y manteniendo máxima densidad argumental, rigor técnico, coherencia y cohesión con el documento general.`
    : '';

  const isRefIssue = meta.number === 12 || /referencias|enlace accesible|doi|url/i.test(issue);
  const refInstruction = isRefIssue
    ? `\n- ENLACES ACCESIBLES OBLIGATORIOS: cada una de las referencias bibliográficas DEBE terminar con su enlace web accesible y canónico (DOI activo: https://doi.org/... o URL institucional/gubernamental: https://...). Prohibido dejar referencias sin su enlace digital.`
    : '';

  return `

══════════════════════════════════════════════════
CORRECCIÓN OBLIGATORIA — tu intento anterior de este apartado fue rechazado
══════════════════════════════════════════════════

Defecto detectado en la revisión automática: ${issue}

Vuelve a redactar el apartado **${meta.number}. ${meta.title}** COMPLETO corrigiendo ese defecto:
- Empieza exactamente por el encabezado \`## ${meta.number}. ${meta.title}\`.
- Redacción ejecutiva, sintética y de alta densidad (directa al grano, sin prefacios ni verborrea).${overflowInstruction}${refInstruction}
- PROHIBIDO incluir líneas de separación horizontales (\`---\`, \`___\`, \`***\`, \`——\`, \`════\`) ni antes ni después de los encabezados.
- PROHIBIDO arte ASCII o diagramas en cajas de caracteres (+---).
- En tablas escribe la fila separadora (|---|---|) una sola vez y no dejes filas vacías con solo guiones (- - -).
- Sin marcadores de relleno de ningún tipo.
- Si un dato no consta en las fuentes, escribe la ALERTA DE VERIFICACIÓN HUMANA en lugar de inventarlo.`;
}

/**
 * Quita subsecciones prohibidas que el modelo a veces inserta en el apartado 2 (p. ej. "2.5 Experiencias")
 * y limpia líneas de rayas o artefactos de prompt.
 * Índice 0-based: 1 = apartado "## 2. …".
 */
export function sanitizeFundanteSectionMarkdown(sectionIndex: number, markdown: string): string {
  let s = markdown.trim();
  // Quitar cercas markdown si quedaron
  s = s.replace(/^```(?:markdown)?\r?\n/i, '').replace(/\r?\n```$/i, '').trim();
  // Quitar líneas de borde de prompt tipo ══════ o ──────
  s = s.replace(/^[═─—_\-]{3,}\s*$/gm, '');
  // Quitar líneas divisorias sueltas (---, ***, ___)
  s = s.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
  // Normalizar saltos de línea triples
  s = s.replace(/\n{3,}/g, '\n\n');

  if (sectionIndex === 1) {
    s = s.replace(/\r?\n##\s*2\.5\b[\s\S]*$/i, '').trim();
    s = s.replace(/\r?\n###\s*2\.5\b[\s\S]*$/i, '').trim();
  }
  return s.trim();
}

/**
 * Reglas del subapartado 8.4: el talento humano debe proyectar el aporte de **cada**
 * escuela de la UNAD al CIP, y los recursos administrativos se describen en términos
 * generales, sin siglas ni acrónimos que dificulten la lectura externa.
 */
function talentoHumanoBlock(): string {
  return `
BLOQUE OBLIGATORIO — TALENTO HUMANO Y RECURSOS (subapartado **8.4 Infraestructura y recursos**)

- Viñeta **Talento humano**: nombra **una por una las seis escuelas de la UNAD**, con su **nombre oficial completo y sin siglas ni acrónimos**, y para **cada** escuela proyecta en dos o tres líneas su **aporte concreto al CIP** de este documento: qué disciplinas, programas, semilleros o capacidades aporta al tema elegido y al territorio. Ninguna escuela puede quedar sin su aporte. Las seis escuelas son:
${formatEscuelasForPrompt()}
  Preséntalas como lista de viñetas o como tabla de dos columnas (escuela / aporte proyectado al CIP). El aporte es una **proyección razonada** a partir del tema del CIP y del perfil disciplinar de cada escuela: redáctalo en potencial ("puede aportar…", "estaría en capacidad de…") y no lo presentes como un compromiso ya adquirido ni inventes programas, docentes o cifras que no consten en las fuentes.
- Viñeta **Recursos administrativos**: descríbelos de forma **general** (acompañamiento administrativo, financiero, jurídico, de talento humano, de comunicaciones y de gestión documental que respaldan la operación del CIP). **Prohibido** usar siglas, acrónimos o nombres codificados de dependencias, sistemas o unidades: escribe siempre la denominación completa en palabras. No detalles estructuras internas que no consten en las fuentes.
`.trim();
}

/**
 * Reglas del apartado 6: la matriz se transcribe del bloque REGISTRO SIGIIP. Antes se
 * pedían columnas que el registro público no trae (grupo, categoría, líneas, número de
 * investigadores) y el modelo terminaba rellenándolas o dejando la tabla en genérico.
 */
function experienciasSigiipBlock(): string {
  return `
BLOQUE OBLIGATORIO — MATRIZ DE EXPERIENCIAS PREVIAS (apartado 6)

- La matriz se construye **priorizando entre 8 y 12 proyectos estratégicos** del bloque **REGISTRO SIGIIP** de las entradas (los más pertinentes para la zona y el tema del CIP). Si ese bloque no llegó, escribe la ALERTA DE VERIFICACIÓN HUMANA por ausencia del registro y **no** inventes proyectos.
- Columnas obligatorias, en este orden: **Nombre del proyecto (textual)** | **Código** | **Tipo** | **Investigador responsable** | **Escuela** | **Zona** | **Estado** | **Convocatoria** | **Contribución proyectada al CIP**.
- El nombre va **entre comillas y palabra por palabra** como aparece en el registro. Nada de paráfrasis, títulos abreviados ni descripciones genéricas del estilo "un proyecto sobre turismo rural".
- La **contribución proyectada al CIP** es la única columna que razonas tú: una o dos líneas por proyecto, en potencial, conectando el proyecto con el tema del CIP y con el territorio.
- Escuelas siempre con **denominación completa, sin siglas**.
- Grupo de investigación, categoría del grupo, líneas de investigación y número de investigadores **no existen** en la fuente: si necesitas mencionarlos, escribe "No disponible en la fuente consultada" y añade la ALERTA DE VERIFICACIÓN HUMANA. Prohibido estimarlos.
- Acompaña la matriz con párrafos que lean la trayectoria: cuántos proyectos hay en la zona, qué tipos predominan, qué capacidades se pueden transferir al CIP. Usa los conteos reales del bloque, no cifras propias.
- SÍNTESIS EJECUTIVA: Mantén el apartado en una extensión ejecutiva controlada (máximo 8–12 proyectos en la tabla principal). Indica que los inventarios exhaustivos de proyectos o matrices complementarias se ubican en los Anexos (Apartado 13).
`.trim();
}

/**
 * Reglas del apartado 12: referencias APA 7ma edición con enlaces accesibles (DOI / URLs canónicas).
 */
function referenciasApaLinksBlock(): string {
  return `
BLOQUE OBLIGATORIO — REFERENCIAS CON ENLACE ACCESIBLE (DOI / URL) (apartado 12)

- Redacta el listado completo de referencias bibliográficas en **estricto formato APA (séptima edición)**, ordenado alfabéticamente por apellido del primer autor o nombre de la entidad rectora.
- **ENLACE ACCESIBLE OBLIGATORIO PARA CADA ENTRADA:** Cada referencia bibliográfica **DEBE incluir su hipervínculo digital accesible al final de la cita**:
  - Para artículos, libros o capítulos con identificador digital: incluye el **DOI canónico completo en formato URL activa**: \`https://doi.org/10.xxxx/xxxx\` o enlace Markdown \`[https://doi.org/10.xxxx/xxxx](https://doi.org/10.xxxx/xxxx)\`.
  - Para leyes, decretos, resoluciones, acuerdos y normatividad colombiana o de la UNAD: incluye la **URL oficial de consulta pública** (ej. \`https://www.funcionpublica.gov.co/eva/gestornormativo/...\` o \`https://sgeneral.unad.edu.co/...\`).
  - Para informes del DANE, DNP, CONPES, MinCiencias o ministerios: incluye la **URL oficial del portal institucional** (ej. \`https://www.dane.gov.co/...\`, \`https://www.dnp.gov.co/...\`, \`https://minciencias.gov.co/...\`).
  - Para planes de desarrollo territorial o documentos locales: incluye la **URL institucional del municipio o departamento** (ej. \`https://...gov.co/...\`).
  - Para documentos institucionales UNAD (Proyecto Académico Pedagógico Solidario, Estatutos, Acuerdos de Consejo Superior): incluye el enlace al repositorio o portal oficial \`https://repositorio.unad.edu.co/...\` o \`https://sgeneral.unad.edu.co/...\`.
- **PROHIBIDO:** Dejar referencias huérfanas sin enlace web o con texto vago como "Recuperado de internet".
- **PROHIBIDO:** Listar como referencia el «Contenedor 1», «Contenedor 2» o insumos internos: cita siempre el documento fuente original.
- **ESTRUCTURA DE CADA ENTRADA APA 7:**
  Autor, A. A. o Entidad. (Año). *Título de la obra o documento en cursiva*. Editorial, Entidad Publicadora o Nombre de la Revista, Volumen(Número), páginas. https://doi.org/... o https://...
`.trim();
}

function structureHintsFor(sectionNumber: number): string {
  const base = `El documento oficial tiene **13** apartados numerados; en esta llamada solo redactas el **apartado ${sectionNumber}** (no fusiones apartados).`;
  switch (sectionNumber) {
    case 2:
      return `${base} En el apartado 2 solo existen **2.1 a 2.4**. **Prohibido** crear **2.5**, **2.6** o "Experiencias previas" aquí: eso es el **apartado 6**.`;
    case 3:
      return `${base} El insumo del flujo intermedio sigue la plantilla **prompt_arbol_innovacion.txt**; no lo reemplaces por otro esquema.`;
    case 6:
      return `${base} Centraliza aquí el registro de proyectos y las experiencias previas; no delegues tablas extensas al apartado 2.\n\n${experienciasSigiipBlock()}`;
    case 8:
      return `${base}\n\n${talentoHumanoBlock()}`;
    case 12:
      return `${base} Las referencias son de **documentos reales** con enlaces accesibles obligatorios (DOI o URL canónica):\n\n${referenciasApaLinksBlock()}`;
    case 13:
      return `${base} Anexos **complementarios**; no repitas la matriz larga del apartado 6 salvo resumen cruzado breve.`;
    default:
      return base;
  }
}

export function tailForCoherence(full: string, maxChars: number): string {
  const t = full.trim();
  if (!t) return '';
  if (t.length <= maxChars) return t;
  return `…[se omitió el inicio del documento parcial (${(t.length - maxChars).toLocaleString()} caracteres) para mantener el contexto bajo control; continúa en coherencia con lo que sigue]…\n\n${t.slice(-maxChars)}`;
}

/**
 * Un apartado por llamada al modelo: evita documentos “mochos” por límite de tokens de salida.
 */
export function buildFundanteSectionPrompt(
  sectionIndex: number,
  containerTrimmed: string,
  docBudgetNotice: string,
  prompt0: Prompt0Data,
  supplementaryTerritorialRaw: string | undefined,
  workflowExtras: FundanteWorkflowExtras | null | undefined,
  previousSectionsMarkdown: string,
  maxPreviousContextChars: number,
  instruccionFundanteText: string,
  sigiipBlock?: string,
): string {
  const meta = FUNDANTE_SECTIONS[sectionIndex];
  if (!meta) throw new Error(`Sección fundante inválida: ${sectionIndex}`);

  // El registro solo viaja a los apartados que lo usan: en los demás gastaría contexto
  // e invitaría a repetir la matriz de experiencias fuera de su lugar.
  const usesSigiip = SECTIONS_WITH_SIGIIP.has(meta.number);
  const inputs = buildFundanteInputsBlock(
    containerTrimmed,
    docBudgetNotice,
    prompt0,
    supplementaryTerritorialRaw,
    workflowExtras,
    usesSigiip ? sigiipBlock : undefined,
  );
  const normativa = buildFundanteNormativaBlock();
  const cipLabel = cipTitleLabel(cipDisplayName(prompt0));
  const prev = tailForCoherence(previousSectionsMarkdown, maxPreviousContextChars);
  const prevBlock = prev
    ? `
══════════════════════════════════════════════════
DOCUMENTO PARCIAL YA REDACTADO (solo para coherencia de tono y contenido; no copies ni repitas estos apartados)
══════════════════════════════════════════════════
${prev}
`
    : '';

  const headingLine = `## ${meta.number}. ${meta.title}`;

  const firstSectionRules =
    meta.number === 1
      ? `
- La **primera línea** de tu salida debe ser exactamente el título de nivel 1:
  # Documento Fundante del ${cipLabel}
- En la **siguiente línea en blanco**, continúa con el encabezado de nivel 2 y el desarrollo:
  ${headingLine}
`
      : `
- Tu salida debe **empezar** con la línea exacta (encabezado nivel 2):
  ${headingLine}
- **No** incluyas el título H1 del documento ni otros apartados (ni siquiera resumidos).
`;

  const instruccionBlock = `
══════════════════════════════════════════════════
INSTRUCCIÓN INSTITUCIONAL DEL DOCUMENTO FUNDANTE (Google Drive: ${DRIVE_REFERENCE_INSTRUCCION_FUNDANTE})
══════════════════════════════════════════════════

${instruccionFundanteText.trim()}
`.trim();

  return `
${normativa}

${instruccionBlock}

══════════════════════════════════════════════════
ENTRADAS (mismas para todos los apartados)
══════════════════════════════════════════════════

${inputs}
${prevBlock}
══════════════════════════════════════════════════
TAREA — APARTADO ${meta.number} DE ${FUNDANTE_SECTION_COUNT} (generación por partes)
══════════════════════════════════════════════════

Estás redactando el Documento Fundante del CIP **por secciones**. Esta respuesta debe cubrir **solo** el apartado **${meta.number}**.

Enfoque obligatorio para este apartado:
${meta.focus}

${structureHintsFor(meta.number)}

${firstSectionRules}

EXTENSIÓN Y ESTILO — METODOLOGÍA DE SÍNTESIS EJECUTIVA (META INSTITUCIONAL: MÁXIMO 60 PÁGINAS):
- Redacción ejecutiva, argumental y de alta densidad de contenido. Ve directo a la tesis y a la evidencia sin introducciones ni conclusiones ceremoniales.
- El contenido total de los apartados 1 al 12 debe mantenerse consolidado entre 40 y 50 páginas oficiales para no exceder las 60 páginas de cuerpo antes de los anexos.
- Elimina redundancias: no repitas antecedentes de otros apartados ni uses párrafos de relleno.
- Enfoque directo: usa párrafos fluidos y estructurados; evita listas infinitas de viñetas genéricas (máximo 3–5 viñetas cuando sean indispensables).

REGLAS DE SALIDA Y PRESENTACIÓN
- Devuelve **solo** el fragmento Markdown indicado. Sin prefacio del asistente.
- PROHIBIDO envolver en \`\`\`markdown\`\`\`.
- PROHIBIDO incluir líneas de separación horizontales (\`---\`, \`___\`, \`***\`, \`——\`, \`════\`) ni antes ni después de los encabezados ni entre párrafos.
- PROHIBIDO marcadores tipo [completar], [TBD], "..." como placeholder.
- PROHIBIDO enumerar listas masivas de números o citas (p. ej. \`[cita: 1, 2, 3, …]\`): cita como máximo 3–5 fuentes por afirmación y hazlo en formato APA **(Entidad o autor, año)**, nunca por índices numéricos.
- PROHIBIDO citar como fuente el **Contenedor 1**, el **Contenedor 2**, la propuesta de temas o el árbol de innovación: son insumos internos. Cita siempre el **documento original** del que proviene el dato (ver punto 5 de la normativa).
- En las tablas Markdown escribe la fila separadora (\`|---|---|\`) **una sola vez**, justo bajo el encabezado, y máximo ${usesSigiip ? '12' : '10'} filas de datos por tabla (reserva inventarios exhaustivos de proyectos para el Apartado 13). Nunca repitas filas separadoras ni dejes filas vacías con solo guiones (- - -). Las matrices masivas complementarias se reservan para el Apartado 13.
- PROHIBIDO dibujar diagramas u organigramas en "arte ASCII" (cajas \`[...]\` unidas con \`|\`, \`+---\` o similares). Todo mapa, organigrama o estructura jerárquica (p. ej. el mapa de articulación institucional) se presenta como **lista jerárquica de Markdown**: viñetas anidadas donde cada nivel de sangría representa un nivel de dependencia, con el nombre de cada instancia en negrilla en el primer nivel.
- Sigue el bloque **INSTRUCCIÓN INSTITUCIONAL DEL DOCUMENTO FUNDANTE** de arriba para redactar **solo** este apartado; no contradigas criterios ni estructura oficial.

Redacta ahora **únicamente** este apartado.
`.trim();
}
