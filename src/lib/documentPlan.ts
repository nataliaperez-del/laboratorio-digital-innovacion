/**
 * Plan de documento: representación intermedia entre el Markdown que produce la IA
 * y las dos salidas finales (Word .docx e impresión a PDF). Aquí se resuelven las
 * decisiones editoriales que deben ser idénticas en ambas salidas: numeración de
 * tablas y figuras, epígrafes en normas APA e inserción de las figuras de datos.
 */

import { marked, type Token, type Tokens } from 'marked';
import { normalizeAsciiDiagrams } from '@/lib/formatMarkdownDoc';
import { buildMaturityFigure, buildPillarsFigure, buildSigiipFigures, type FigureSpec } from '@/lib/figures';
import type { SigiipSnapshot } from '@/store/useStore';

export interface InlineNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  /** Alertas de verificación humana (`==…==`): se resaltan en amarillo. */
  highlight?: boolean;
  href?: string;
  /** Salto de línea dentro del mismo párrafo. */
  lineBreak?: boolean;
}

export interface PlanListItem {
  inline: InlineNode[];
  children: PlanBlock[];
}

export type PlanBlock =
  | { kind: 'heading'; depth: number; inline: InlineNode[]; plainText: string }
  | { kind: 'paragraph'; inline: InlineNode[] }
  | { kind: 'list'; ordered: boolean; items: PlanListItem[] }
  | { kind: 'quote'; blocks: PlanBlock[] }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | {
      kind: 'table';
      /** Número de tabla en el documento, empezando en 1. */
      number: number;
      title: string;
      header: InlineNode[][];
      rows: InlineNode[][][];
    }
  | { kind: 'figure'; number: number; spec: FigureSpec };

export interface DocumentPlan {
  blocks: PlanBlock[];
  /** Índice de tablas, en orden de aparición. */
  tables: Array<{ number: number; title: string }>;
  /** Índice de figuras, en orden de aparición. */
  figures: Array<{ number: number; title: string; spec: FigureSpec }>;
}

export interface DocumentMeta {
  cipName: string;
  zonaUNAD: string;
  municipality: string;
  department: string;
  country: string;
  /** Persona que generó el documento (correo o nombre de la sesión institucional). */
  generatedBy?: string;
  generatedAt: Date;
}

const ALERT_PATTERN = /==([^=]+)==/g;
const URL_PATTERN = /(https?:\/\/[^\s<>()]+|doi\.org\/[^\s<>()]+)/g;

function splitUrls(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (node.href || !node.text) {
      out.push(node);
      continue;
    }
    const text = node.text;
    let cursor = 0;
    URL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = URL_PATTERN.exec(text)) !== null) {
      if (match.index > cursor) {
        out.push({ ...node, text: text.slice(cursor, match.index) });
      }
      let rawUrl = match[1];
      let trail = '';
      const trailMatch = rawUrl.match(/[.,;:)]+$/);
      if (trailMatch) {
        trail = trailMatch[0];
        rawUrl = rawUrl.slice(0, -trail.length);
      }
      const fullHref = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      out.push({ ...node, text: rawUrl, href: fullHref });
      if (trail) {
        out.push({ ...node, text: trail });
      }
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) {
      out.push({ ...node, text: text.slice(cursor) });
    }
  }
  return out;
}

/** Divide el texto plano marcando como resaltado lo que venga entre `==…==` y detectando enlaces URL/DOI. */
function splitHighlights(text: string, base: InlineNode): InlineNode[] {
  if (!text) return [];
  const out: InlineNode[] = [];
  let cursor = 0;
  ALERT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ALERT_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) out.push({ ...base, text: text.slice(cursor, match.index) });
    out.push({ ...base, text: match[1], highlight: true, bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) out.push({ ...base, text: text.slice(cursor) });
  return splitUrls(out);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Convierte los tokens en línea de marked en una lista plana con marcas de formato. */
function flattenInline(tokens: readonly Token[] | undefined, base: InlineNode = { text: '' }): InlineNode[] {
  if (!tokens || tokens.length === 0) return [];
  const out: InlineNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        out.push(...flattenInline((token as Tokens.Strong).tokens, { ...base, bold: true }));
        break;
      case 'em':
        out.push(...flattenInline((token as Tokens.Em).tokens, { ...base, italic: true }));
        break;
      case 'del':
        out.push(...flattenInline((token as Tokens.Del).tokens, { ...base, strike: true }));
        break;
      case 'codespan':
        out.push({ ...base, code: true, text: decodeEntities((token as Tokens.Codespan).text) });
        break;
      case 'link': {
        const link = token as Tokens.Link;
        const children = flattenInline(link.tokens, { ...base, href: link.href });
        out.push(...(children.length ? children : [{ ...base, href: link.href, text: link.href }]));
        break;
      }
      case 'br':
        out.push({ ...base, text: '', lineBreak: true });
        break;
      case 'image':
        out.push({ ...base, text: (token as Tokens.Image).text || '' });
        break;
      case 'html':
        // El Markdown de la IA no debe traer HTML; si llega, se conserva el texto sin etiquetas.
        out.push(...splitHighlights(decodeEntities((token as Tokens.HTML).raw.replace(/<[^>]*>/g, '')), base));
        break;
      case 'escape':
        out.push({ ...base, text: (token as Tokens.Escape).text });
        break;
      case 'text': {
        const textToken = token as Tokens.Text;
        if (textToken.tokens?.length) {
          out.push(...flattenInline(textToken.tokens, base));
        } else {
          out.push(...splitHighlights(decodeEntities(textToken.text), base));
        }
        break;
      }
      default: {
        const raw = (token as { raw?: string }).raw;
        if (raw) out.push(...splitHighlights(decodeEntities(raw), base));
      }
    }
  }
  return out;
}

export function inlineToPlainText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((n) => (n.lineBreak ? ' ' : n.text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function listItemToPlan(item: Tokens.ListItem): PlanListItem {
  const inline: InlineNode[] = [];
  const children: PlanBlock[] = [];
  for (const token of item.tokens ?? []) {
    if (token.type === 'text' || token.type === 'paragraph') {
      const nodes = flattenInline((token as Tokens.Text).tokens ?? []);
      if (inline.length === 0) inline.push(...nodes);
      else children.push({ kind: 'paragraph', inline: nodes });
    } else {
      children.push(...tokenToBlocks(token));
    }
  }
  return { inline, children };
}

/** Convierte un token de bloque de marked en bloques del plan (sin tablas ni figuras). */
function tokenToBlocks(token: Token): PlanBlock[] {
  switch (token.type) {
    case 'heading': {
      const heading = token as Tokens.Heading;
      const inline = flattenInline(heading.tokens);
      return [{ kind: 'heading', depth: heading.depth, inline, plainText: inlineToPlainText(inline) }];
    }
    case 'paragraph':
      return [{ kind: 'paragraph', inline: flattenInline((token as Tokens.Paragraph).tokens) }];
    case 'text': {
      const text = token as Tokens.Text;
      return [{ kind: 'paragraph', inline: text.tokens?.length ? flattenInline(text.tokens) : splitHighlights(text.text, { text: '' }) }];
    }
    case 'list': {
      const list = token as Tokens.List;
      return [{ kind: 'list', ordered: Boolean(list.ordered), items: list.items.map(listItemToPlan) }];
    }
    case 'blockquote': {
      const quote = token as Tokens.Blockquote;
      return [{ kind: 'quote', blocks: quote.tokens.flatMap(tokenToBlocks) }];
    }
    case 'code':
      return [{ kind: 'code', text: (token as Tokens.Code).text }];
    case 'hr':
      return [{ kind: 'rule' }];
    case 'space':
      return [];
    case 'html': {
      const raw = (token as Tokens.HTML).raw.replace(/<[^>]*>/g, '').trim();
      return raw ? [{ kind: 'paragraph', inline: splitHighlights(decodeEntities(raw), { text: '' }) }] : [];
    }
    default: {
      const raw = (token as { raw?: string }).raw?.trim();
      return raw ? [{ kind: 'paragraph', inline: splitHighlights(raw, { text: '' }) }] : [];
    }
  }
}

/** Quita la numeración con la que la IA encabeza los apartados: «6. Experiencias…». */
function stripLeadingNumber(text: string): string {
  return text.replace(/^\d+(?:\.\d+)*\.?\s*/, '').trim();
}

/**
 * Título del epígrafe de una tabla. Se prefiere el texto que la introduce (una
 * línea corta que termina en dos puntos o que empieza por "Tabla"/"Matriz") y, si
 * no hay ninguno, el nombre del apartado en el que está la tabla.
 */
function tableTitleFrom(previous: PlanBlock | undefined, sectionTitle: string): {
  title: string;
  dropPrevious: boolean;
} {
  if (previous?.kind === 'paragraph') {
    const text = inlineToPlainText(previous.inline);
    if (text.length <= 170 && /^(tabla|matriz|cuadro)\b/i.test(text)) {
      // La IA escribió su propio epígrafe: se retira su numeración (la pone el
      // renderizador) y el párrafo se descarta para no duplicar el título.
      const cleaned = text
        .replace(/^(tabla|cuadro)\s*(n[.°º]?\s*)?\d+\s*[.:–—-]?\s*/i, '')
        .replace(/[.:]\s*$/, '')
        .trim();
      return { title: cleaned || text.replace(/[.:]\s*$/, '').trim(), dropPrevious: true };
    }
    if (text.length <= 170 && text.endsWith(':')) {
      return { title: text.slice(0, -1).trim(), dropPrevious: false };
    }
  }
  const fallback = stripLeadingNumber(sectionTitle) || 'Matriz del documento';
  return { title: fallback, dropPrevious: false };
}

function tableToBlock(token: Tokens.Table, number: number, title: string): PlanBlock {
  return {
    kind: 'table',
    number,
    title,
    header: token.header.map((cell) => flattenInline(cell.tokens)),
    rows: token.rows.map((row) => row.map((cell) => flattenInline(cell.tokens))),
  };
}

/**
 * Construye el plan del documento. Inserta infografías y figuras en sus
 * apartados temáticos correspondientes:
 *   · Apartado 5: Pilares estratégicos del CIP (infografía)
 *   · Apartado 6: Figuras de datos del registro SIGIIP (zonas, tipos en donut, escuelas)
 *   · Apartado 11: Ruta de maduración del CIP (línea de tiempo)
 */
export function buildDocumentPlan(
  markdown: string,
  snapshot: SigiipSnapshot | null = null,
  zoneLabel: string = '',
): DocumentPlan {
  const tokens = marked.lexer(normalizeAsciiDiagrams(markdown));
  const blocks: PlanBlock[] = [];
  const tables: Array<{ number: number; title: string }> = [];
  const usedTitles = new Set<string>();
  let sectionTitle = '';
  let tableNumber = 0;

  const sectionEndIndices: Record<number, number> = {};
  let currentSectionNum: number | null = null;

  for (const token of tokens) {
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      if (heading.depth <= 2) {
        const text = inlineToPlainText(flattenInline(heading.tokens));
        sectionTitle = text;
        if (currentSectionNum !== null) {
          sectionEndIndices[currentSectionNum] = blocks.length;
        }
        const match = text.trim().match(/^(\d+)\b/);
        currentSectionNum = match ? parseInt(match[1], 10) : null;
      }
    }

    if (token.type === 'table') {
      const tableToken = token as Tokens.Table;
      const headers = tableToken.header.map((cell) => inlineToPlainText(flattenInline(cell.tokens)));
      const { title, dropPrevious } = tableTitleFrom(blocks[blocks.length - 1], sectionTitle);
      if (dropPrevious) blocks.pop();
      let finalTitle = title;
      if (usedTitles.has(finalTitle.toLowerCase())) {
        const discriminator = headers.slice(0, 2).filter(Boolean).join(' y ');
        if (discriminator) finalTitle = `${title} (${discriminator})`;
      }
      usedTitles.add(finalTitle.toLowerCase());
      tableNumber += 1;
      tables.push({ number: tableNumber, title: finalTitle });
      blocks.push(tableToBlock(tableToken, tableNumber, finalTitle));
      continue;
    }

    blocks.push(...tokenToBlocks(token));
  }

  if (currentSectionNum !== null) {
    sectionEndIndices[currentSectionNum] = blocks.length;
  }

  // Ubicación de figuras según apartados temáticos
  const insertions: Array<{ index: number; specs: FigureSpec[] }> = [];
  const hasSec5 = typeof sectionEndIndices[5] === 'number';
  const hasSec6 = typeof sectionEndIndices[6] === 'number';
  const hasSec11 = typeof sectionEndIndices[11] === 'number';

  const sigiipSpecs = buildSigiipFigures(snapshot, zoneLabel);
  const pillarsSpec = buildPillarsFigure();
  const maturitySpec = buildMaturityFigure();

  if (hasSec5) {
    insertions.push({ index: sectionEndIndices[5], specs: [pillarsSpec] });
  }
  if (hasSec6 && sigiipSpecs.length > 0) {
    insertions.push({ index: sectionEndIndices[6], specs: sigiipSpecs });
  }
  if (hasSec11) {
    insertions.push({ index: sectionEndIndices[11], specs: [maturitySpec] });
  }

  // Fallback para documentos sin numeración estándar de secciones
  if (!hasSec5 && !hasSec6 && !hasSec11) {
    const fallbackSpecs = [...(sigiipSpecs.length > 0 ? sigiipSpecs : []), pillarsSpec, maturitySpec];
    if (fallbackSpecs.length > 0) {
      insertions.push({ index: blocks.length, specs: fallbackSpecs });
    }
  }

  // Insertar en orden descendente de índice para no alterar posiciones
  insertions.sort((a, b) => b.index - a.index);
  for (const ins of insertions) {
    const figureBlocks: PlanBlock[] = ins.specs.map((spec) => ({
      kind: 'figure',
      number: 0, // Se numera correlativamente abajo
      spec,
    }));
    blocks.splice(ins.index, 0, ...figureBlocks);
  }

  // Asignar numeración consecutiva a todas las figuras presentes
  const figures: Array<{ number: number; title: string; spec: FigureSpec }> = [];
  let figureNumber = 0;
  for (const block of blocks) {
    if (block.kind === 'figure') {
      figureNumber += 1;
      block.number = figureNumber;
      figures.push({ number: figureNumber, title: block.spec.title, spec: block.spec });
    }
  }

  return { blocks, tables, figures };
}

/** Territorio en una sola línea, para la portada y el encabezado. */
export function formatTerritory(meta: DocumentMeta): string {
  return [meta.municipality, meta.department, meta.country].map((p) => p?.trim()).filter(Boolean).join(', ');
}

export function formatSpanishDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
