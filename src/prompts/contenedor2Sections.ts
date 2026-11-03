import { LAB_SCOPE_RULES, scopeIssue, tailForCoherence } from '@/prompts/labGuardrails';
import { buildTrazabilidadAppendix, type Procedencia } from '@/repositorio/procedencia';

/**
 * Un punto de entrega que redacta el modelo. `parts` permite partirlo en varias llamadas
 * que se concatenan bajo el **mismo** encabezado, para los puntos cuyo contenido no cabe
 * con calidad en una sola respuesta.
 */
type AiPoint = {
  number: number;
  title: string;
  phase: string;
  kind: 'ai';
  parts: readonly string[];
};

/**
 * Un punto que **escribe la app**, no el modelo, porque su contenido es verificable de
 * forma determinista: pedírselo a la IA solo abriría la puerta a que lo aproximara.
 */
type AppPoint = {
  number: number;
  title: string;
  phase: string;
  kind: 'app';
};

/** Uno de los doce puntos del Estudio Territorial (metodología MDVT). */
export type Contenedor2Point = AiPoint | AppPoint;

/** Número, título, fase y extensión mínima de un punto del estudio. */
export type Contenedor2SectionMeta = Contenedor2Point;

/**
 * `ok` = bloque utilizable; `warning` = se redactó pero la autoevaluación detectó
 * un defecto (muy corto, sin encabezado o con marcadores); `failed` = no hay texto usable o error de red.
 * Los dos últimos habilitan el botón «Regenerar» de ese bloque en la Fase 2.
 */
export type Contenedor2SectionStatus = 'ok' | 'warning' | 'failed';

/** Un punto generado del estudio con su estado de revisión. */
export type Contenedor2SectionResult = {
  number: number;
  title: string;
  phase: string;
  kind: 'ai' | 'app';
  markdown: string;
  status: Contenedor2SectionStatus;
  /** Motivo legible del defecto o error (se muestra junto al botón «Regenerar»). */
  issue?: string;
};

/** Estudio Territorial completo: Markdown y puntos. */
export type Contenedor2DocumentResult = {
  markdown: string;
  sections: Contenedor2SectionResult[];
};

const MIN_C2_SECTION_CHARS = 180;

/**
 * Sanitiza el fragmento Markdown de un bloque del Contenedor 2:
 * - Elimina líneas de separación de prompts (`═════`, `-----`).
 * - Elimina líneas horizontales sueltas (`---`, `___`, `***`, `——`) que se ven como rayas.
 * - Limpia filas separadoras de tabla duplicadas.
 */
export function sanitizeContenedor2SectionMarkdown(markdown: string): string {
  let text = markdown.trim();
  // Quitar cercas markdown si quedaron
  text = text
    .replace(/^```(?:markdown)?\r?\n/i, '')
    .replace(/\r?\n```$/i, '')
    .trim();
  // Quitar líneas de borde de prompt tipo ══════ o ──────
  text = text.replace(/^[═─—_\-]{3,}\s*$/gm, '');
  // Quitar líneas divisorias sueltas (---, ***, ___)
  text = text.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
  // Normalizar saltos de línea triples
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Autoevaluación local de un bloque del Contenedor 2 recién redactado:
 * Detecta si quedó vacío,
 * sin encabezado, cortado, con marcadores de relleno o con "rayas" (líneas divisorias,
 * cajas ASCII o tablas rotas). No consume llamadas al modelo.
 */
export function reviewContenedor2Section(point: Contenedor2Point, markdown: string): { status: Contenedor2SectionStatus; issue?: string } {
  const text = markdown.trim();
  if (!text) {
    return { status: 'failed', issue: 'El bloque quedó vacío o no devolvió texto utilizable.' };
  }

  if (point.kind === 'app') {
    return { status: 'ok' };
  }

  const minChars = point.number === 1 ? 90 : MIN_C2_SECTION_CHARS;
  if (text.length < minChars) {
    return {
      status: 'warning',
      issue: `El bloque es muy breve (${text.length} caracteres; esperado mínimo ${minChars}).`,
    };
  }

  const hasExpectedHeading = new RegExp(`##\\s*\\**\\s*${point.number}\\.`, 'i').test(text);
  if (!hasExpectedHeading) {
    return {
      status: 'warning',
      issue: `Falta el encabezado oficial «${contenedor2Heading(point)}».`,
    };
  }

  const outOfScope = scopeIssue(text);
  if (outOfScope) return { status: 'warning', issue: outOfScope };

  const placeholders = text.match(/\[(?:completar|tbd|rellenar|insertar|lorem|ipsum)[^\]]*\]/gi);
  if (placeholders) {
    return {
      status: 'warning',
      issue: `Contiene marcadores pendientes de redactar: ${placeholders.slice(0, 2).join(', ')}.`,
    };
  }

  const lastLine = text.split('\n').filter(Boolean).pop() ?? '';
  if (/(?:,|;|:|\b(?:y|o|e|u|de|del|en|con|por|para|la|el|los|las))\s*$/i.test(lastLine.trim())) {
    return {
      status: 'warning',
      issue: 'El texto parece haber quedado cortado a mitad de frase.',
    };
  }

  // Comprobaciones estrictas contra "rayas", arte ASCII y tablas defectuosas
  const lines = text.split('\n');
  const asciiBoxRe = /\+[-–—]{2,}|[│┌┐└┘├┤┬┴┼╭╮╰╯╬╦╩╠╣═]{2,}/;
  const hrOnlyRe = /^\s*([-*_])\1{2,}\s*$/; // línea completa de ---, *** o ___ (raya suelta)
  const isSepRow = (ln: string): boolean => {
    const t = ln.trim();
    if (!t.includes('|') || !t.includes('-')) return false;
    const stripped = t.replace(/[\s|:]/g, '');
    return stripped.length >= 3 && /^-+$/.test(stripped);
  };
  const isDashOnlyRow = (ln: string): boolean => {
    const t = ln.trim();
    if (!t.startsWith('|') || !t.endsWith('|')) return false;
    const cells = t
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
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
      issue: 'El bloque contiene un diagrama o caja en arte ASCII; debe redactarse en prosa o tabla estándar.',
    };
  }

  if (repeatedSep) {
    return {
      status: 'warning',
      issue: 'El bloque tiene filas separadoras de tabla repetidas que aparecen como líneas de guiones.',
    };
  }

  if (hrCount >= 1) {
    return {
      status: 'warning',
      issue: `El bloque contiene ${hrCount} línea(s) divisoria(s) suelta(s) (---) que se ven como rayas; debe regenerarse sin ellas.`,
    };
  }

  if (dashOnlyCount >= 2) {
    return {
      status: 'warning',
      issue: 'El bloque contiene filas de tabla vacías con solo guiones (- - -) que generan rayas; debe completarse con datos.',
    };
  }

  return { status: 'ok' };
}

/** Instrucción de autorreparación inyectada cuando la autoevaluación local detecta un defecto. */
export function buildContenedor2SelfRepairSuffix(point: Contenedor2Point, issue: string): string {
  return `\n\n══════════════════════════════════════════════════
CORRECCIÓN OBLIGATORIA (tu intento anterior tuvo este defecto):
${issue}
══════════════════════════════════════════════════
Vuelve a redactar ÚNICAMENTE el punto ${point.number} («${point.title}») corrigiendo el defecto:
- Asegúrate de incluir el encabezado oficial «${contenedor2Heading(point)}».
- Desarrollo sustantivo, ejecutivo y sin relleno.
- PROHIBIDO incluir líneas de separación horizontales (---, ___, ***, ——, ═══) ni antes ni después de los encabezados.
- PROHIBIDO usar arte ASCII o cajas de caracteres.
- En las tablas Markdown escribe la fila separadora (|---|---|) una sola vez y no dejes filas vacías con solo guiones.`;
}

/**
 * Ensambla el Contenedor 2 completo a partir de sus bloques individuales y el apéndice de procedencia.
 */
export function assembleContenedor2Document(sections: readonly Contenedor2SectionResult[], procedencia?: Procedencia | null): string {
  const parts = sections.map((s) => s.markdown.trim()).filter(Boolean);
  let assembled = parts.join('\n\n');
  if (procedencia) {
    const appendix = buildTrazabilidadAppendix(procedencia);
    if (appendix && !assembled.includes('Nota de trazabilidad documental') && !assembled.includes('Fuentes propias del territorio consultadas')) {
      assembled += (assembled ? '\n\n' : '') + appendix;
    }
  }
  return assembled;
}

/** Frase de cierre obligatoria del Contenedor 2, literal y sin variantes. */
export const CONTENEDOR2_CLOSING_STATEMENT =
  'Este estudio entrega un diagnóstico territorial verificable. No declara la vocación de servicio del territorio ni sus temas estratégicos; esa definición corresponde a la herramienta de Ideación del Laboratorio.';

/**
 * Los **doce puntos de entrega** del Contenedor 2, en el orden y con los títulos que
 * declara `prompt_contenedor2_contexto_territorial.txt` en Google Drive, que es la única
 * fuente de verdad de la metodología MDVT.
 *
 * Aquí no vive el método: ni las cuatro fases, ni sus criterios de calidad, ni las reglas
 * de citación o de vacíos. Todo eso llega desde Drive en cada ejecución. Esta lista es el
 * andamio que parte la redacción en llamadas al modelo y que fija qué puntos escribe la
 * app. Si la estructura de salida cambia en Drive, esta lista cambia con ella.
 *
 * Los puntos 4, 5 y 6 usan el nombre de categoría que el paso de Vocación Territorial
 * espera literalmente: no se renombran sin cambiar también ese prompt.
 *
 * Esta es la **estructura de salida oficial**; los puntos que se ejecutan en una
 * generación concreta los devuelve `contenedor2Points`.
 */
export const CONTENEDOR2_SECTIONS: readonly Contenedor2Point[] = [
  {
    number: 1,
    title: 'Identificación del territorio',
    phase: 'Apertura',
    kind: 'ai',
    parts: [
      'Municipio, departamento y Zona UNAD de la Ficha Base, con la ubicación y el papel del municipio en su región según las fuentes. Es un apartado breve de identificación: no adelantes caracterización productiva ni diagnóstico.',
    ],
  },
  {
    number: 2,
    title: 'Ficha de caracterización productiva',
    phase: 'Fase 1 — Caracterización productiva',
    kind: 'ai',
    // Dos llamadas bajo el mismo encabezado: la Fase 1 pide el perfil productivo y el
    // cuadro de indicadores, y ambos juntos no caben con calidad en una sola respuesta.
    parts: [
      'Primera parte del apartado: **perfil productivo**. Vocación productiva actual declarada oficialmente (según el instrumento que la declara, citado), sectores económicos predominantes y cadenas de valor presentes en el territorio.',
      'Segunda parte del **mismo** apartado: **cuadro de indicadores socioeconómicos**, preferentemente en tabla con columna de fuente y año: población (total, urbana y rural), PIB municipal o departamental si existe, tasa de desempleo e informalidad. Ningún dato numérico se aproxima sin decirlo. No repitas el encabezado del apartado ni el perfil productivo ya redactado: continúa donde quedó.',
    ],
  },
  {
    number: 3,
    title: 'Lectura por pilar de competitividad',
    phase: 'Fase 2 — Lectura sistémica de competitividad',
    kind: 'ai',
    parts: [
      'Un subapartado por cada uno de los cinco pilares: (1) gobierno e instituciones, (2) desarrollo económico, (3) infraestructura productiva, (4) capital humano y (5) eficiencia empresarial. Los cinco deben abordarse, aun si alguno queda con vacío de información declarado. Cierra cada pilar con esta línea literal, eligiendo un valor: `Nivel de evidencia: alto`, `medio`, `bajo` o `sin evidencia`.',
    ],
  },
  {
    number: 4,
    title: 'Dinámicas territoriales',
    phase: 'Fase 2 — Lectura sistémica de competitividad',
    kind: 'ai',
    parts: [
      'Tendencias económicas y sociales relevantes detectadas durante la lectura por pilares: cómo se está moviendo el territorio, qué está cambiando y con qué evidencia. Título de categoría que el paso siguiente espera literalmente.',
    ],
  },
  {
    number: 5,
    title: 'Brechas regionales',
    phase: 'Fase 2 — Lectura sistémica de competitividad',
    kind: 'ai',
    parts: [
      'Vacíos estructurales del territorio frente a otros territorios comparables o frente a estándares nacionales, cada uno con el dato que lo respalda. Título de categoría que el paso siguiente espera literalmente.',
    ],
  },
  {
    number: 6,
    title: 'Oportunidades del entorno',
    phase: 'Fase 2 — Lectura sistémica de competitividad',
    kind: 'ai',
    parts: [
      'Condiciones favorables detectadas: mercados emergentes, proyectos de infraestructura anunciados y política pública en curso, cada una con su fuente. Título de categoría que el paso siguiente espera literalmente.',
    ],
  },
  {
    number: 7,
    title: 'Matriz FODA territorial',
    phase: 'Fase 3 — Síntesis FODA territorial',
    kind: 'ai',
    parts: [
      'Matriz de fortalezas, debilidades, oportunidades y amenazas con foco explícito en **industria y comercio**. Cada elemento debe ser rastreable hasta un dato concreto de los apartados anteriores, redactado de forma específica para este territorio. No se aceptan formulaciones genéricas aplicables a cualquier territorio colombiano. No concluyas cuál sería la vocación.',
    ],
  },
  {
    number: 8,
    title: 'Resultado del contraste participativo',
    phase: 'Fase 4 — Contraste participativo',
    kind: 'ai',
    parts: [
      'Confronta los apartados anteriores contra los insumos institucionales del territorio cargados en Drive: qué queda confirmado, qué queda matizado y qué se contradice. Si una fuente de internet y una institucional se contradicen, repórtalo como alerta y no lo resuelvas a favor de ninguna. Si no había insumos institucionales del territorio, dilo abiertamente: el diagnóstico queda sin contraste.',
    ],
  },
  {
    number: 9,
    title: 'Alertas de verificación humana consolidadas',
    phase: 'Fase 4 — Contraste participativo',
    // Lo escribe la app: recorre el documento ya redactado y extrae las marcas reales. Al
    // modelo solo le llega la cola del documento en cada llamada, así que no puede verlas
    // todas y acabaría reconstruyendo la lista de memoria.
    kind: 'app',
  },
  {
    number: 10,
    title: 'Fuentes consultadas',
    phase: 'Cierre',
    kind: 'ai',
    parts: [
      'Listado en **APA 7**, agrupado por tipo de fuente (insumos institucionales de Drive, entidades oficiales, academia, prensa). Cita siempre la fuente original del dato, nunca el contenedor o el prompt donde apareció.',
    ],
  },
  {
    number: 11,
    title: 'Observaciones de trazabilidad',
    phase: 'Cierre',
    kind: 'ai',
    parts: [
      'Ambigüedades y coincidencias parciales de la carpeta del territorio (usa **exactamente** los hechos de ejecución que se te entregaron arriba; no los reinterpretes ni los completes), y las fuentes secundarias que tuviste que usar por ausencia de una primaria.',
    ],
  },
  {
    number: 12,
    title: 'Declaración de cierre',
    phase: 'Cierre',
    // La escribe la app para garantizar que sea literal: es una frase fija y pedirle una
    // llamada al modelo solo arriesga que la adorne.
    kind: 'app',
  },
] as const;

/**
 * Cierre del punto 8 cuando la Ficha Base declara un **tema previsto** en lugar de un
 * nombre. Va como segunda parte del mismo apartado —no como punto nuevo— porque la
 * estructura de salida de la instrucción de Drive tiene doce puntos y porque contrastar
 * una hipótesis contra la evidencia es exactamente la Fase 4 de la MDVT.
 *
 * El veredicto es cerrado a propósito: si al modelo se le anuncia un tema y se le deja
 * redactar libremente, encuentra algo que lo confirme en cualquier territorio. Con tres
 * salidas obligatorias, «no hay evidencia» y «el territorio dice otra cosa» son
 * resultados legítimos del apartado, y son los que le sirven al líder de zona.
 */
function focusContrastPart(focusText: string): string {
  return `Cierre del **mismo** apartado: contraste del **tema previsto**. El equipo de zona declaró que prevé trabajar «${focusText}». Esa declaración es una **hipótesis de trabajo, no evidencia**: no la sustenta ninguna fuente por el hecho de estar declarada. Confróntala contra el diagnóstico que ya redactaste y contra las fuentes disponibles, y cierra con **uno** de estos tres veredictos, escrito literalmente:
- **SUSTENTADO POR LAS FUENTES** — di con qué datos y de qué fuentes.
- **SIN EVIDENCIA SUFICIENTE** — el material disponible no lo confirma ni lo niega; añade la alerta con la etiqueta (VACÍO-VERIFICAR).
- **CONTRADICHO POR EL TERRITORIO** — el diagnóstico apunta a otra actividad; di a cuál y con qué dato, y añade la alerta con la etiqueta (REQUIERE CONTRASTE).
Empieza con la línea en negrilla \`**Contraste del tema previsto: «${focusText}»**\` y continúa donde quedó el contraste institucional, sin repetir el encabezado del apartado. Da el veredicto que sostengan las fuentes aunque desmienta la hipótesis: un tema previsto sin respaldo, declarado a tiempo, vale más que un diagnóstico complaciente. Esto **no** te autoriza a declarar la vocación ni a proponer temas: eso sigue siendo del paso siguiente.`;
}

/**
 * Los puntos a ejecutar en una generación concreta. Es la misma estructura de salida de
 * doce puntos; lo único que cambia es que el punto 8 se redacta en dos llamadas cuando
 * hay un tema previsto que contrastar.
 */
export function contenedor2Points(focusText: string): readonly Contenedor2Point[] {
  const focus = focusText.trim();
  if (!focus) return CONTENEDOR2_SECTIONS;
  return CONTENEDOR2_SECTIONS.map((point) =>
    point.kind === 'ai' && point.number === 8 ? { ...point, parts: [...point.parts, focusContrastPart(focus)] } : point,
  );
}

/** Avance mientras se genera el estudio. */
export type Contenedor2SectionProgress = {
  currentSection: number;
  totalSections: number;
  sectionTitle: string;
};

/** Cola del contenedor parcial reenviada en cada llamada para coherencia sin inflar el prompt. */
const MAX_PREVIOUS_CONTEXT_CHARS = 12_000;

/** Encabezado exacto con el que empieza cada punto de entrega. */
export function contenedor2Heading(point: Contenedor2Point): string {
  return `## ${point.number}. ${point.title}`;
}

/**
 * Extrae un punto de entrega del Contenedor 2 ya redactado, por su título.
 *
 * Lo usa el paso de Vocación Territorial para recibir la **Matriz FODA territorial**
 * como insumo principal, en lugar de releer el contenedor completo. Tolera que el
 * modelo haya cambiado el nivel del encabezado o el número, pero no el nombre.
 */
export function extractContenedor2Section(markdown: string, title: string): string {
  if (!markdown.trim()) return '';
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp(`^#{2,6}\\s*\\**\\s*(?:\\d+\\.?\\s*)?${escaped}\\s*\\**\\s*$`, 'im');
  const match = start.exec(markdown);
  if (!match) return '';
  const from = match.index;
  const rest = markdown.slice(from + match[0].length);
  const nextHeading = /^#{1,6}\s+\S/m.exec(rest);
  return (match[0] + (nextHeading ? rest.slice(0, nextHeading.index) : rest)).trim();
}

/** Etiquetas de calidad que el paso de Vocación Territorial hereda y reconoce. */
const ALERT_LABELS = ['VACÍO-VERIFICAR', 'REQUIERE CONTRASTE'] as const;

/**
 * Recorre el documento redactado y devuelve las alertas `==…==` reales, con el apartado
 * donde aparece cada una. Es la base del punto 9: se cuenta lo que hay, no lo que el
 * modelo recuerde haber escrito.
 */
function collectAlerts(markdown: string): { section: string; label: string; detail: string }[] {
  const found: { section: string; label: string; detail: string }[] = [];
  let section = '—';
  for (const line of markdown.split('\n')) {
    const heading = /^#{2,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1].replace(/\*\*/g, '').trim();
      continue;
    }
    for (const match of line.matchAll(/==\s*(.+?)\s*==/g)) {
      const raw = match[1].replace(/^⚠️\s*/, '').replace(/^ALERTA DE VERIFICACIÓN HUMANA:\s*/i, '');
      const label = ALERT_LABELS.find((l) => raw.toUpperCase().includes(l)) ?? 'SIN ETIQUETA';
      const detail = raw
        .replace(new RegExp(`\\(?\\s*(?:${ALERT_LABELS.join('|')})\\s*\\)?`, 'gi'), '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      found.push({ section, label, detail: detail || '(sin detalle)' });
    }
  }
  return found;
}

/** Contenido de los puntos que escribe la app (no el modelo). */
export function buildContenedor2AppPoint(point: AppPoint, documentSoFar: string): string {
  const heading = contenedor2Heading(point);

  if (point.number === 12) {
    return `${heading}\n\n${CONTENEDOR2_CLOSING_STATEMENT}`;
  }

  const alerts = collectAlerts(documentSoFar);
  if (!alerts.length) {
    return [
      heading,
      '',
      'No se registró ninguna alerta de verificación humana en los apartados anteriores.',
      '',
      '==⚠️ ALERTA DE VERIFICACIÓN HUMANA: un diagnóstico territorial sin ningún vacío declarado es inusual. Antes de dar por validado este estudio, revisa que los datos de cada apartado tengan fuente real y que no se hayan completado por inferencia (REQUIERE CONTRASTE).==',
    ].join('\n');
  }

  const counts = ALERT_LABELS.map((label) => `${label}: ${alerts.filter((a) => a.label === label).length}`);
  const unlabelled = alerts.filter((a) => a.label === 'SIN ETIQUETA').length;
  if (unlabelled) counts.push(`sin etiqueta: ${unlabelled}`);

  return [
    heading,
    '',
    `Alertas generadas en este estudio: **${alerts.length}** (${counts.join(' · ')}).`,
    '',
    '| Apartado | Etiqueta | Qué falta confirmar |',
    '|---|---|---|',
    ...alerts.map((a) => `| ${a.section} | ${a.label} | ${a.detail.replace(/\|/g, '\\|')} |`),
    '',
    'Esta consolidación la extrae la aplicación de las alertas realmente presentes en los apartados anteriores; la herramienta de Ideación hereda estas mismas etiquetas.',
  ].join('\n');
}

/**
 * Una llamada al modelo por parte de cada punto de entrega: así cada bloque dispone del
 * presupuesto de salida completo y el documento no se corta por límite de tokens.
 */
export function buildContenedor2SectionPrompt(
  sharedContext: string,
  point: AiPoint,
  partIndex: number,
  previousSectionsMarkdown: string,
  labName: string,
): string {
  const focus = point.parts[partIndex];
  if (!focus) throw new Error(`Parte inválida del punto ${point.number} del Contenedor 2: ${partIndex}`);

  const prev = tailForCoherence(previousSectionsMarkdown, MAX_PREVIOUS_CONTEXT_CHARS);
  const prevBlock = prev
    ? `
══════════════════════════════════════════════════
LO YA REDACTADO DEL CONTENEDOR 2 (solo para coherencia; no lo copies ni lo repitas)
══════════════════════════════════════════════════
${prev}
`
    : '';

  const isContinuation = partIndex > 0;
  const headingRule = isContinuation
    ? `- Este bloque **continúa** el apartado «${point.title}», que ya está abierto. **No** repitas su encabezado ni ningún otro: empieza directamente con el contenido.`
    : `- Tu salida debe **empezar** con el encabezado de nivel 2: \`${contenedor2Heading(point)}\`${
        point.number === 1
          ? `\n- Antes de ese encabezado, la **primera línea** de tu salida debe ser el título de nivel 1:\n  # Estudio Territorial${labName.trim() ? ` — ${labName.trim()}` : ''}`
          : ''
      }`;

  return `
${LAB_SCOPE_RULES}

${sharedContext}
${prevBlock}
══════════════════════════════════════════════════
TAREA — PUNTO ${point.number} DE ${CONTENEDOR2_SECTIONS.length}: ${point.title}${
    point.parts.length > 1 ? ` (parte ${partIndex + 1} de ${point.parts.length})` : ''
  }
══════════════════════════════════════════════════

Redactas el Contenedor 2 por partes, que se concatenan en un único documento de ${CONTENEDOR2_SECTIONS.length} puntos. Esta respuesta cubre **solo** lo que se indica aquí.

Fase de la MDVT que ejecutas: **${point.phase}**. Aplícale la base teórica, el contenido esperado y el **criterio de calidad** que esa fase define en la instrucción institucional de arriba.

Qué debe contener:
${focus}

INICIO EXACTO DE LA SALIDA
${headingRule}
- No incluyas otros puntos de entrega ni adelantes contenido de los siguientes.

EXTENSIÓN Y ESTILO: redacción ejecutiva de alta densidad argumental, directa al grano y sin prefacios ni conclusiones ceremoniales.

REGLAS DE FORMATO Y PRESENTACIÓN
- Devuelve **solo** el fragmento Markdown indicado. Sin prefacio del asistente.
- PROHIBIDO envolver la respuesta en \`\`\`markdown\`\`\`.
- PROHIBIDO incluir líneas de separación horizontales (\`---\`, \`___\`, \`***\`, \`——\`, \`════\`) ni antes ni después de los encabezados ni entre párrafos.
- PROHIBIDO usar arte ASCII, organigramas en cajas de caracteres (\`+---\`, \`│\`, \`┌\`) o líneas de guiones decorativas.
- PROHIBIDO usar marcadores tipo [completar], [TBD] o "..." como relleno: para eso están las alertas.
- PROHIBIDO transcribir la instrucción institucional o las fuentes íntegras: el espacio es para el análisis del territorio.
- PROHIBIDO enumerar listas masivas de citas (p. ej. \`[cita: 1, 2, 3, …]\`): cita como máximo 3–5 fuentes por afirmación, siempre por su nombre y nunca por índices numéricos.
- En las tablas Markdown escribe la fila separadora (\`|---|---|\`) **una sola vez**, justo bajo el encabezado, y máximo 10 filas de datos por tabla. Nunca repitas filas separadoras ni dejes filas vacías con solo guiones (- - -).

Redacta ahora **únicamente** esta parte.
`.trim();
}
