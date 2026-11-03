/**
 * Lectura estructurada de los bloques del Estudio Territorial para mostrarlos como matriz,
 * medidores y tarjetas. Si un bloque no trae la forma esperada, el análisis devuelve vacío
 * y la vista cae al lector genérico: nunca se inventa contenido.
 */
import { buildDocumentPlan, inlineToPlainText, type InlineNode, type PlanBlock } from '@/lib/documentPlan';

export type EvidenceRating = 'alto' | 'medio' | 'bajo' | 'sin evidencia';

export interface Pillar {
  /** Subtítulo tal como aparece en el documento. */
  title: string;
  shortTitle: string;
  evidence: EvidenceRating | null;
  markdownBlocks: PlanBlock[];
}

export const EVIDENCE_SCORE: Record<EvidenceRating, number> = { alto: 100, medio: 66, bajo: 33, 'sin evidencia': 6 };

/** Tolera «Nivel de evidencia: alto», «…declarada: Medio» y «…de este pilar: Alto». */
const EVIDENCE_RE = /nivel\s+de\s+evidencia[^.\n]{0,40}?[:\s]\**\s*(alto|alta|medio|media|bajo|baja|sin\s+evidencia)\b/i;

function evidenceRating(raw: string): EvidenceRating {
  const t = raw.toLowerCase().replace(/\s+/g, ' ');
  if (t.startsWith('alt')) return 'alto';
  if (t.startsWith('med')) return 'medio';
  if (t.startsWith('baj')) return 'bajo';
  return 'sin evidencia';
}

function plain(block: PlanBlock): string {
  if (block.kind === 'paragraph' || block.kind === 'heading') return inlineToPlainText(block.inline);
  if (block.kind === 'list') return block.items.map((i) => inlineToPlainText(i.inline)).join(' ');
  return '';
}

/** Subtítulos y sus bloques; los títulos en negrilla en línea propia cuentan como subtítulo. */
function sections(markdown: string): Array<{ title: string; blocks: PlanBlock[] }> {
  const out: Array<{ title: string; blocks: PlanBlock[] }> = [];
  for (const block of buildDocumentPlan(markdown).blocks) {
    if (block.kind === 'heading' && block.depth <= 2) continue;
    const boldTitle =
      block.kind === 'paragraph' && block.inline.length > 0 && block.inline.every((n) => n.bold || !n.text.trim())
        ? inlineToPlainText(block.inline).replace(/[:.]\s*$/, '')
        : null;
    // «**Nivel de evidencia: alto**» cierra un pilar: no es un subtítulo.
    if (block.kind === 'heading' || (boldTitle && boldTitle.length <= 90 && !/nivel\s+de\s+evidencia/i.test(boldTitle))) {
      out.push({ title: block.kind === 'heading' ? block.plainText : (boldTitle as string), blocks: [] });
    } else if (out.length) {
      out[out.length - 1].blocks.push(block);
    }
  }
  return out;
}

/** Los cinco pilares de competitividad con el nivel de evidencia que declara cada uno. */
export function parsePillars(markdown: string): Pillar[] {
  return sections(markdown)
    .filter((s) => s.blocks.length > 0)
    .map((s) => {
      const match = s.blocks.map(plain).join(' ').match(EVIDENCE_RE);
      const evidence = match ? evidenceRating(match[1]) : null;
      return { title: s.title, shortTitle: s.title.replace(/^(?:pilar\s*)?\(?\d+\)?\s*[.):—–-]?\s*/i, ''), evidence, markdownBlocks: s.blocks };
    });
}

export interface FodaMatrix {
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  amenazas: string[];
}

type FodaKey = keyof FodaMatrix;

function fodaKey(text: string): FodaKey | null {
  const t = text.toLowerCase();
  if (/fortaleza/.test(t)) return 'fortalezas';
  if (/debilidad/.test(t)) return 'debilidades';
  if (/oportunidad/.test(t)) return 'oportunidades';
  if (/amenaza/.test(t)) return 'amenazas';
  return null;
}

/** Líneas de una celda: el modelo suele separar varios elementos con <br>. */
function cellLines(cell: readonly InlineNode[]): string[] {
  const lines: InlineNode[][] = [[]];
  for (const node of cell) {
    if (node.lineBreak) lines.push([]);
    else lines[lines.length - 1].push(node);
  }
  return lines.map((l) => inlineToPlainText(l).replace(/^[•·-]\s*/, '')).filter(Boolean);
}

/** Matriz FODA escrita como subtítulos con listas o como tabla; null si no es reconocible. */
export function parseFoda(markdown: string): FodaMatrix | null {
  const matrix: FodaMatrix = { fortalezas: [], debilidades: [], oportunidades: [], amenazas: [] };

  for (const block of buildDocumentPlan(markdown).blocks) {
    if (block.kind !== 'table') continue;
    const headers = block.header.map((h) => fodaKey(inlineToPlainText(h)));
    if (headers.filter(Boolean).length >= 2) {
      // Una columna por cuadrante.
      for (const row of block.rows) {
        row.forEach((cell, i) => {
          const key = headers[i];
          const value = inlineToPlainText(cell);
          if (key && value) matrix[key].push(value);
        });
      }
    } else {
      // Una fila por elemento, con el cuadrante en la primera columna.
      for (const row of block.rows) {
        const key = fodaKey(inlineToPlainText(row[0] ?? []));
        if (!key) continue;
        const elements = cellLines(row[1] ?? []);
        // El sustento va en la segunda columna; solo se empareja si trae una línea por elemento.
        const support = cellLines(row[2] ?? []);
        elements.forEach((element, i) => {
          matrix[key].push(support.length === elements.length ? `${element} — ${support[i]}` : element);
        });
      }
    }
  }

  for (const section of sections(markdown)) {
    const key = fodaKey(section.title);
    if (!key) continue;
    for (const block of section.blocks) {
      if (block.kind === 'list') matrix[key].push(...block.items.map((i) => inlineToPlainText(i.inline)));
      else if (block.kind === 'paragraph') matrix[key].push(inlineToPlainText(block.inline));
    }
  }

  const filled = Object.values(matrix).filter((items) => items.length > 0).length;
  return filled >= 2 ? matrix : null;
}

export interface InsightCard {
  title: string;
  body: string;
}

/** Elementos de un bloque (dinámicas, brechas, oportunidades) para presentarlos como tarjetas. */
export function parseInsightCards(markdown: string): InsightCard[] {
  const subsections = sections(markdown).filter((s) => s.blocks.length > 0);
  if (subsections.length >= 2) {
    return subsections.map((s) => ({ title: s.title.replace(/^\d+[.)]\s*/, ''), body: s.blocks.map(plain).filter(Boolean).join(' ') }));
  }
  const cards: InsightCard[] = [];
  for (const block of buildDocumentPlan(markdown).blocks) {
    if (block.kind !== 'list') continue;
    for (const item of block.items) {
      const bold = item.inline
        .filter((n) => n.bold)
        .map((n) => n.text)
        .join('')
        .replace(/[:.]\s*$/, '')
        .trim();
      const full = inlineToPlainText(item.inline);
      cards.push(
        bold && bold.length <= 90
          ? { title: bold, body: full.slice(bold.length).replace(/^[\s:.—–-]+/, '') }
          : { title: full.slice(0, 80), body: full.length > 80 ? full : '' },
      );
    }
  }
  return cards.length >= 2 ? cards : [];
}

export interface StudyAlert {
  label: 'VACÍO-VERIFICAR' | 'REQUIERE CONTRASTE' | 'SIN ETIQUETA';
  detail: string;
}

/** Alertas de verificación realmente presentes en el documento. */
export function parseAlerts(markdown: string): StudyAlert[] {
  const seen = new Set<string>();
  const out: StudyAlert[] = [];
  for (const match of markdown.matchAll(/==\s*([^=]+?)\s*==/g)) {
    const raw = match[1].replace(/^⚠️\s*/, '').replace(/^ALERTA DE VERIFICACIÓN HUMANA:\s*/i, '');
    const label = /VAC[IÍ]O-VERIFICAR/i.test(raw) ? 'VACÍO-VERIFICAR' : /REQUIERE CONTRASTE/i.test(raw) ? 'REQUIERE CONTRASTE' : 'SIN ETIQUETA';
    const detail = raw.replace(/\(?\s*(VAC[IÍ]O-VERIFICAR|REQUIERE CONTRASTE)\s*\)?/gi, '').trim();
    if (detail && !seen.has(detail)) {
      seen.add(detail);
      out.push({ label, detail });
    }
  }
  return out;
}

/** Referencias de la sección de fuentes, como lista plana. */
export function parseSources(markdown: string): string[] {
  const out: string[] = [];
  for (const block of buildDocumentPlan(markdown).blocks) {
    if (block.kind === 'list') out.push(...block.items.map((i) => inlineToPlainText(i.inline)));
    else if (block.kind === 'paragraph') {
      const text = inlineToPlainText(block.inline);
      if (/\(\d{4}|s\.\s?f\.|https?:/i.test(text)) out.push(text);
    }
  }
  return out.filter(Boolean);
}
