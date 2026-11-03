/** Una de las tres opciones de tema: su título y su justificación en Markdown. */
export interface ParsedTheme {
  title: string;
  body: string;
}

/** La propuesta de Ideación ya leída: vocación y los tres temas. */
export interface ParsedThemeProposal {
  vocationMarkdown: string;
  themes: ParsedTheme[];
}

/** Rótulo con el que la plantilla institucional o el modelo nombran cada opción. */
const THEME_LABEL = String.raw`(?:opci[oó]n|alternativa|propuesta|tema)`;

/** Numeración de la plantilla delante del rótulo o del título: «3.», «4.1)». */
const SECTION_NUMBER = String.raw`(?:\d+(?:\.\d+)*[.)]\s*)?`;

/** Separadores entre el número de la opción y su título: «:», «—», «-», «)». */
const TITLE_SEPARATOR = String.raw`\s*\**\s*[:.\-–—)]*\s*\**\s*`;

/** Nivel asignado a los títulos en negrilla: más profundo que cualquier encabezado ATX. */
const BOLD_LEVEL = 7;

/** Títulos que cierran o suceden a la sección de opciones (no son opciones). */
const CLOSING_TITLE = /(verificaci|traspaso|alineaci|siguiente\s+paso|cierre|s[ií]ntesis|alertas?|fuentes|referencias|anexo)/i;

/**
 * Encabezado de una opción en cualquiera de las formas que produce el modelo:
 * `## Opción de tema 1: …`, `### 3.1 Tema 1 — …`, `**Opción 1:** …`, `1. **Tema 1: …**`.
 * Grupo 1: número de la opción; grupo 2: título.
 */
function themeHeadingRegex(): RegExp {
  return new RegExp(
    String.raw`^(?:#{2,6}\s*|[-*+]\s+|\d+[.)]\s+)?\**\s*` +
      SECTION_NUMBER +
      THEME_LABEL +
      String.raw`\s*(?:de\s+)?(?:tema\s*)?(?:n[.°º]?\s*)?(\d)\b` +
      TITLE_SEPARATOR +
      String.raw`(.*?)\s*\**\s*$`,
    'gim',
  );
}

/**
 * La línea está rotulada como encabezado (ATX, negrilla o viñeta) o separa el número
 * del título. Evita confundir una mención en prosa («la opción 2 exige…») con un título.
 */
function isLabelledThemeLine(line: string): boolean {
  return /^\s*(?:#{2,6}\s|[-*+]\s|\d+[.)]\s|\*\*)/.test(line) || /\d\s*\**\s*[:.\-–—)]/.test(line);
}

/** Título de opción sin numeración, rótulo ni negrillas. */
function cleanThemeTitle(raw: string, index: number): string {
  const label = new RegExp(
    String.raw`^\s*` + SECTION_NUMBER + String.raw`(?:${THEME_LABEL}\s*(?:de\s+)?(?:tema\s*)?(?:n[.°º]?\s*)?\d*` + TITLE_SEPARATOR + String.raw`)?`,
    'i',
  );
  const cleaned = raw.replace(/\*+/g, '').replace(label, '').trim();
  return cleaned || `Tema ${index + 1}`;
}

/**
 * Tema a partir de la línea del título y del texto que le sigue. Cuando el título y
 * la justificación comparten línea («**Agroindustria** — cierra la brecha de valor»),
 * la parte en negrilla es el título y el resto encabeza la justificación; sin negrilla
 * solo se parte si el título es tan largo que claramente arrastra la justificación.
 */
function makeTheme(rawTitle: string, body: string, index: number): ParsedTheme {
  const inline =
    rawTitle.match(/^\s*\*\*\s*(.+?)\s*\*\*\s*[:—–]?\s*(.*)$/) ??
    (rawTitle.replace(/\*+/g, '').trim().length > 90 ? rawTitle.match(/^\s*(.+?)\s*(?:[—–]|\s-\s|:)\s*(.+)$/) : null);

  const title = cleanThemeTitle(inline ? inline[1] : rawTitle, index);
  const lead = inline ? inline[2].trim() : '';
  return { title, body: [lead, body].filter(Boolean).join('\n\n') };
}

/**
 * Fin del cuerpo de un tema: primera sección posterior que NO es otra opción/tema.
 * Corta en encabezados ATX (`## …`) o en títulos en negrilla de cierre
 * (Verificación, Traspaso, Alineación, Siguiente paso, Cierre, Síntesis, Alertas),
 * para que la justificación de la última opción no arrastre esas secciones.
 */
function themeBodyEnd(md: string, fromIndex: number): number {
  const re = /^(#{2,6}\s+.+|\*\*[^*]+\*\*[:.]?)\s*$/gm;
  re.lastIndex = fromIndex;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const line = m[0].trim();
    if (/^#{0,6}\s*\**\s*(?:opci[oó]n|tema)\b/i.test(line)) continue; // encabezado de opción/tema
    if (line.startsWith('#')) return m.index; // nueva sección (encabezado)
    if (CLOSING_TITLE.test(line)) return m.index; // título de cierre en negrilla
  }
  return md.length;
}

/**
 * Encabezados de las opciones 1, 2 y 3 en ese orden. Exigir la secuencia evita tomar
 * como opción una repetición posterior («la Opción 2 se descartó porque…»).
 */
function orderedThemeHeadings(md: string): RegExpMatchArray[] {
  const found: RegExpMatchArray[] = [];
  for (const m of md.matchAll(themeHeadingRegex())) {
    if (Number(m[1]) !== found.length + 1) continue;
    if (!isLabelledThemeLine(m[0])) continue;
    found.push(m);
    if (found.length === 3) break;
  }
  return found;
}

/** Vía principal: las tres opciones vienen rotuladas («Opción de tema 2», «Tema 2 —»). */
function themesFromHeadings(md: string): { start: number; themes: ParsedTheme[] } | null {
  const matches = orderedThemeHeadings(md);
  if (matches.length < 3) return null;

  const themes = matches.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    // El cuerpo termina en la siguiente opción o en la próxima sección posterior,
    // lo que ocurra primero (clave para la última opción, que si no llegaría al final).
    const nextThemeStart = i < matches.length - 1 ? (matches[i + 1].index ?? md.length) : md.length;
    const end = Math.min(nextThemeStart, themeBodyEnd(md, start));
    return makeTheme(m[2] ?? '', md.slice(start, end).trim(), i);
  });

  return { start: matches[0].index ?? 0, themes };
}

interface DocHeading {
  /** Inicio de la línea del título. */
  index: number;
  /** Primer carácter después de la línea del título. */
  bodyStart: number;
  /** 1-6 en encabezados ATX; `BOLD_LEVEL` en títulos en negrilla. */
  level: number;
  text: string;
}

/** Encabezados del documento: ATX (`## …`) y títulos en negrilla en línea propia. */
function documentHeadings(md: string): DocHeading[] {
  const re = /^(?:(#{1,6})\s+(.+?)|\*\*\s*(.+?)\s*\*\*[:.]?)\s*$/gm;
  return [...md.matchAll(re)].map((m) => {
    const index = m.index ?? 0;
    return {
      index,
      bodyStart: index + m[0].length,
      level: m[1] ? m[1].length : BOLD_LEVEL,
      text: (m[2] ?? m[3] ?? '').replace(/\*+/g, '').trim(),
    };
  });
}

/** Número de sección de la plantilla en un título («3. TRES OPCIONES DE TEMA» → 3). */
function topSectionNumber(text: string): number | null {
  const m = text.match(/^(\d+)(?:\.\d+)*[.)]?\s/);
  return m ? Number(m[1]) : null;
}

/** El título anuncia la sección que agrupa las tres opciones de tema. */
function isOptionsSectionTitle(text: string): boolean {
  if (!/tema/i.test(text)) return false;
  return /(opci[oó]n|alternativa|propuesta|tres|estrat[eé]gic)/i.test(text);
}

interface OptionsSection {
  /** Inicio del título de la sección: la vocación es todo lo anterior. */
  titleIndex: number;
  start: number;
  end: number;
  level: number;
}

/**
 * Secciones que pueden agrupar las tres opciones, de la más explícita a la menos
 * («TRES OPCIONES DE TEMA» antes que «PROPUESTA DE TEMA»), para probarlas en ese
 * orden. Cada sección va desde su título hasta el título que la cierra: un encabezado
 * de nivel igual o superior, otro número de sección de la plantilla («4. …» cuando las
 * opciones son la «3. …») o un título de cierre.
 */
function findOptionsSections(md: string): OptionsSection[] {
  const headings = documentHeadings(md);
  const candidates = headings.map((heading, i) => ({ heading, i })).filter(({ heading }) => isOptionsSectionTitle(heading.text));

  const sections = candidates.map(({ heading, i }) => {
    const sectionNumber = topSectionNumber(heading.text);
    const closing = headings.slice(i + 1).find((h) => {
      if (h.level < BOLD_LEVEL && h.level <= heading.level) return true;
      const number = topSectionNumber(h.text);
      if (number !== null && sectionNumber !== null && number !== sectionNumber) return true;
      return CLOSING_TITLE.test(h.text);
    });
    return {
      titleIndex: heading.index,
      start: heading.bodyStart,
      end: closing ? closing.index : md.length,
      level: heading.level,
      explicit: /(tres|3)\b/i.test(heading.text) || /(opciones|alternativas|temas)\b/i.test(heading.text),
    };
  });

  return [...sections.filter((s) => s.explicit), ...sections.filter((s) => !s.explicit)];
}

interface SectionItem {
  index: number;
  bodyStart: number;
  title: string;
}

/**
 * Opciones sin rótulo dentro de la sección: subencabezados («### 3.1 Agroindustria…»),
 * títulos en negrilla o elementos de una lista numerada, en ese orden de preferencia.
 */
function themesFromSectionItems(md: string, section: OptionsSection): ParsedTheme[] | null {
  const body = md.slice(section.start, section.end);

  const collect = (re: RegExp, titleGroup: number, ordered = false): SectionItem[] => {
    const items: SectionItem[] = [];
    for (const m of body.matchAll(re)) {
      if (ordered && Number(m[1]) !== items.length + 1) continue;
      const index = section.start + (m.index ?? 0);
      items.push({ index, bodyStart: index + m[0].length, title: m[titleGroup] ?? '' });
      if (items.length === 3) break;
    }
    return items;
  };

  const candidates = [collect(/^#{2,6}\s+(.+?)\s*$/gm, 1), collect(/^\*\*\s*(.+?)\s*\*\*[:.]?\s*$/gm, 1), collect(/^\s*(\d)[.)]\s+(.+?)\s*$/gm, 2, true)];

  const items = candidates.find((list) => list.length === 3);
  if (!items) return null;

  return items.map((item, i) => makeTheme(item.title, md.slice(item.bodyStart, items[i + 1]?.index ?? section.end).trim(), i));
}

/** Celdas de una fila de tabla Markdown, sin las barras de los extremos. */
function tableCells(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Último recurso: la sección presenta las opciones como filas de una tabla. */
function themesFromTable(md: string, section: OptionsSection): ParsedTheme[] | null {
  const lines = md.slice(section.start, section.end).split(/\r?\n/);
  const headerIndex = lines.findIndex((line, i) => /^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? ''));
  if (headerIndex < 0) return null;

  const headers = tableCells(lines[headerIndex]).map((h) => h.replace(/\*+/g, '').trim());
  const rows: string[][] = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) break;
    rows.push(tableCells(lines[i]));
  }
  if (rows.length < 3) return null;

  return rows.slice(0, 3).map((row, i) => {
    // La primera columna suele ser solo el rótulo de la opción («Opción 2», «2»).
    const isLabelColumn = new RegExp(`^(?:${THEME_LABEL}\\b.*)?\\s*\\d?\\s*$`, 'i').test(row[0]?.replace(/\*+/g, '') ?? '');
    const titleColumn = isLabelColumn ? 1 : 0;
    const body = row
      .map((cell, column) => {
        if (column === titleColumn || (isLabelColumn && column === 0) || !cell) return '';
        return headers[column] ? `**${headers[column]}:** ${cell}` : cell;
      })
      .filter(Boolean)
      .join('\n\n');
    return { title: cleanThemeTitle(row[titleColumn] ?? '', i), body };
  });
}

/**
 * Separa la propuesta en dos bloques: vocación/justificación (todo lo anterior a
 * la primera opción) y las tres opciones de tema con su título y justificación.
 * Primero busca opciones rotuladas («Opción de tema 1», «Opción 1», «Tema 1») como
 * encabezado, negrilla o elemento de lista; si la plantilla institucional numeró sus
 * propias secciones («3. TRES OPCIONES DE TEMA» con subtítulos sin rótulo), toma las
 * tres opciones de dentro de esa sección, ya sea como subtítulos, lista o tabla.
 * Devuelve null si no encuentra las tres opciones (la Fase 3 usa entonces la vista
 * de respaldo).
 */
export function parseThemeProposal(md: string): ParsedThemeProposal | null {
  if (!md.trim()) return null;

  const byHeading = themesFromHeadings(md);
  if (byHeading) return withVocation(md, byHeading.start, byHeading.themes);

  for (const section of findOptionsSections(md)) {
    const themes = themesFromSectionItems(md, section) ?? themesFromTable(md, section);
    const parsed = themes ? withVocation(md, section.titleIndex, themes) : null;
    if (parsed) return parsed;
  }
  return null;
}

function withVocation(md: string, themesStart: number, themes: ParsedTheme[]): ParsedThemeProposal | null {
  const vocationMarkdown = md.slice(0, themesStart).trim();
  if (!vocationMarkdown) return null;
  return { vocationMarkdown, themes };
}
