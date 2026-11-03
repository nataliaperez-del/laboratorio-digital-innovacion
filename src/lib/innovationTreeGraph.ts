/**
 * Modelo del árbol interactivo. Los nodos nunca están escritos en el código: salen del
 * resultado de la IA (`parseTreeGraph`) o, si esa conversión falla, de las tablas y listas
 * del documento generado (`buildTreeFromMarkdown`).
 */
import { marked, type Tokens } from 'marked';

/** Nivel de un nodo del árbol: tronco global/nacional/territorial, hoja, fruto, raíz o suelo. */
export type TreeLevel = 'suelo' | 'raiz' | 'tronco' | 'global' | 'nacional' | 'territorial' | 'hoja' | 'fruto';
/** Tipo de fruto: proyecto, servicio o prototipo. */
export type FruitType = 'proyecto' | 'servicio' | 'prototipo';
/** Nivel de evidencia: N1 (del Observatorio), N2 (fuente citada) o N3 (hipótesis por verificar). */
export type EvidenceLevel = 'N1' | 'N2' | 'N3';

/** Un nodo del árbol interactivo con su nivel, evidencia, descripción y relaciones. */
export interface TreeNode {
  codigo: string;
  nivel: TreeLevel;
  nombre: string;
  descripcion: string;
  evidencia: EvidenceLevel;
  deriva_de: string[];
  derivan: string[];
  tipo_fruto?: FruitType;
  solucion?: string;
  impacto_esperado?: string;
  fuentes: string[];
  alertas: string[];
}

/** Árbol interactivo completo de un tema. */
export interface TreeGraph {
  tema: string;
  nodos: TreeNode[];
  /** `ia`: conversión del modelo; `documento`: reconstruido de las tablas del documento. */
  origen: 'ia' | 'documento';
}

/** Nombre visible de cada nivel del árbol. */
export const LEVEL_LABEL: Record<TreeLevel, string> = {
  suelo: 'Suelo · fuentes de sustento',
  raiz: 'Raíz · problemas y brechas',
  tronco: 'Tronco · tema central',
  global: 'Rama global · tendencia mundial',
  nacional: 'Rama nacional · impacto en Colombia',
  territorial: 'Rama territorial · impacto local',
  hoja: 'Hoja · oportunidad de innovación',
  fruto: 'Fruto · resultado posible',
};

/** Nombre visible de cada tipo de fruto. */
export const FRUIT_LABEL: Record<FruitType, string> = { proyecto: 'Proyecto', servicio: 'Servicio', prototipo: 'Prototipo' };

const LEVELS = new Set<TreeLevel>(['suelo', 'raiz', 'tronco', 'global', 'nacional', 'territorial', 'hoja', 'fruto']);
const PREFIX: Record<TreeLevel, string> = { suelo: 'SU', raiz: 'RZ', tronco: 'TR', global: 'TG', nacional: 'TN', territorial: 'TT', hoja: 'HO', fruto: 'FR' };
const MAX_BY_LEVEL: Record<TreeLevel, number> = { suelo: 8, raiz: 6, tronco: 1, global: 10, nacional: 5, territorial: 3, hoja: 9, fruto: 12 };

/** Padre por defecto de cada nivel, para reparar derivaciones perdidas. */
const PARENT_LEVEL: Partial<Record<TreeLevel, TreeLevel>> = {
  global: 'tronco',
  nacional: 'global',
  territorial: 'nacional',
  hoja: 'territorial',
  fruto: 'hoja',
  raiz: 'tronco',
  suelo: 'tronco',
};

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

function fruitType(v: unknown): FruitType {
  const t = text(v).toLowerCase();
  if (t.includes('servicio')) return 'servicio';
  if (t.includes('prototipo')) return 'prototipo';
  return 'proyecto';
}

function code(level: TreeLevel, index: number): string {
  return `${PREFIX[level]}-${String(index + 1).padStart(2, '0')}`;
}

/** Ajusta topes, garantiza un tronco, repara derivaciones y calcula `derivan`. */
function finalizeGraph(tema: string, input: TreeNode[], origen: TreeGraph['origen']): TreeGraph {
  const counts = new Map<TreeLevel, number>();
  const nodos = input.filter((n) => {
    const used = counts.get(n.nivel) ?? 0;
    if (used >= MAX_BY_LEVEL[n.nivel]) return false;
    counts.set(n.nivel, used + 1);
    return true;
  });

  if (!nodos.some((n) => n.nivel === 'tronco')) {
    nodos.unshift({ codigo: 'TR-01', nivel: 'tronco', nombre: tema, descripcion: '', evidencia: 'N2', deriva_de: [], derivan: [], fuentes: [], alertas: [] });
  }

  const byCode = new Map(nodos.map((n) => [n.codigo, n]));
  for (const node of nodos) {
    node.deriva_de = [...new Set(node.deriva_de)].filter((c) => c !== node.codigo && byCode.has(c));
    const parentLevel = PARENT_LEVEL[node.nivel];
    if (!node.deriva_de.length && parentLevel) {
      // Sin derivación declarada se conecta al primer nodo del nivel padre; si falta ese nivel, al tronco.
      const parent = nodos.find((n) => n.nivel === parentLevel) ?? nodos.find((n) => n.nivel === 'tronco');
      if (parent) node.deriva_de = [parent.codigo];
    }
    node.derivan = [];
  }
  for (const node of nodos) {
    for (const parent of node.deriva_de) byCode.get(parent)?.derivan.push(node.codigo);
  }
  return { tema, nodos, origen };
}

/** Valida la respuesta del modelo. Lanza si no alcanza a ser un árbol. */
export function parseTreeGraph(tema: string, raw: unknown): TreeGraph {
  const list = (raw as { nodos?: unknown })?.nodos;
  if (!Array.isArray(list)) throw new Error('La respuesta no trae la lista de nodos.');

  const seen = new Set<string>();
  const nodos: TreeNode[] = [];
  for (const item of list as Array<Record<string, unknown>>) {
    const nivel = text(item?.nivel).toLowerCase() as TreeLevel;
    const nombre = text(item?.nombre);
    const codigo = text(item?.codigo).toUpperCase();
    if (!LEVELS.has(nivel) || !nombre || !codigo || seen.has(codigo)) continue;
    seen.add(codigo);
    const evidencia = text(item.evidencia).toUpperCase();
    nodos.push({
      codigo,
      nivel,
      nombre,
      descripcion: text(item.descripcion),
      evidencia: evidencia === 'N1' || evidencia === 'N2' ? evidencia : 'N3',
      deriva_de: strings(item.deriva_de).map((c) => c.toUpperCase()),
      derivan: [],
      fuentes: strings(item.fuentes),
      alertas: strings(item.alertas),
      ...(nivel === 'fruto' ? { tipo_fruto: fruitType(item.tipo_fruto), solucion: text(item.solucion), impacto_esperado: text(item.impacto_esperado) } : {}),
    });
  }
  if (!nodos.some((n) => n.nivel === 'global') || !nodos.some((n) => n.nivel === 'fruto')) {
    throw new Error('El árbol no trae tendencias globales o frutos.');
  }
  return finalizeGraph(tema, nodos, 'ia');
}

// ─── Reconstrucción desde el documento ─────────────────────────────────────

const clean = (s: string): string => s.replace(/==/g, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();

const normalize = (s: string): string => clean(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Índice de la tendencia del nivel padre con el nombre más parecido; 0 si no hay parecido. */
function bestMatch(name: string, candidates: readonly TreeNode[]): TreeNode | undefined {
  const words = new Set(
    normalize(name)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
  let best: TreeNode | undefined;
  let score = 0;
  for (const c of candidates) {
    const hits = normalize(c.nombre)
      .split(/[^a-z0-9]+/)
      .filter((w) => words.has(w)).length;
    if (hits > score) {
      best = c;
      score = hits;
    }
  }
  return best ?? candidates[0];
}

interface SimpleTable {
  headers: string[];
  rows: string[][];
}

function tablesOf(markdown: string): SimpleTable[] {
  return marked
    .lexer(markdown)
    .filter((t): t is Tokens.Table => t.type === 'table')
    .map((t) => ({ headers: t.header.map((h) => normalize(h.text)), rows: t.rows.map((r) => r.map((c) => clean(c.text))) }));
}

function column(table: SimpleTable, ...names: string[]): number {
  return table.headers.findIndex((h) => names.some((n) => h.includes(n)));
}

/** Elementos de la lista que sigue a una etiqueta del árbol estructurado («RAÍZ:», «SUELO:»). */
function labelledItems(markdown: string, label: RegExp): string[] {
  const lines = markdown.split(/\r?\n/);
  const stop = /^\W*(suelo|ra[ií]z|ra[ií]ces|tronco|ramas?|hojas?|frutos?|oportunidades|fuentes consultadas|alertas|s[ií]ntesis|tabla\s*\d)\b/i;
  const start = lines.findIndex((l) => label.test(l.replace(/[#*_]/g, '').trim()));
  if (start < 0) return [];
  const items: string[] = [];
  const inline = lines[start].split(':').slice(1).join(':').trim();
  if (inline && !lines[start + 1]?.match(/^\s*[-*+\d]/)) items.push(clean(inline));
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (stop.test(line.replace(/[#*_]/g, ''))) break;
    const m = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (m) items.push(clean(m[1]));
  }
  return items;
}

/** Red de seguridad: arma el árbol con las Tablas 1–4 y las listas de Raíz y Suelo. */
export function buildTreeFromMarkdown(tema: string, markdown: string): TreeGraph {
  const tables = tablesOf(markdown);
  const find = (...names: string[]) => tables.find((t) => column(t, ...names) >= 0);

  const nodos: TreeNode[] = [
    { codigo: 'TR-01', nivel: 'tronco', nombre: tema, descripcion: '', evidencia: 'N2', deriva_de: [], derivan: [], fuentes: [], alertas: [] },
  ];
  const push = (nivel: TreeLevel, nombre: string, descripcion: string, parent: TreeNode | undefined, extra: Partial<TreeNode> = {}): TreeNode => {
    const node: TreeNode = {
      codigo: code(nivel, nodos.filter((n) => n.nivel === nivel).length),
      nivel,
      nombre,
      descripcion,
      evidencia: 'N3',
      deriva_de: parent ? [parent.codigo] : [],
      derivan: [],
      fuentes: [],
      alertas: [],
      ...extra,
    };
    nodos.push(node);
    return node;
  };
  const trunk = nodos[0];

  const addLevel = (table: SimpleTable | undefined, nameCol: string[], descCol: string[], nivel: TreeLevel, parents: () => TreeNode[]) => {
    if (!table) return;
    const n = column(table, ...nameCol);
    const d = column(table, ...descCol);
    for (const row of table.rows) {
      if (!row[n]) continue;
      push(nivel, row[n], d >= 0 ? (row[d] ?? '') : '', bestMatch(row[n], parents()));
    }
  };

  const level = (nivel: TreeLevel) => nodos.filter((x) => x.nivel === nivel);
  addLevel(find('tendencia global'), ['tendencia global'], ['descripcion'], 'global', () => [trunk]);
  addLevel(find('tendencia seleccionada', 'razon de pertinencia'), ['tendencia seleccionada', 'tendencia'], ['razon', 'pertinencia'], 'nacional', () =>
    level('global'),
  );
  addLevel(find('justificacion territorial', 'problema que atiende'), ['tendencia territorial', 'tendencia'], ['justificacion'], 'territorial', () =>
    level('nacional'),
  );

  const conversion = find('oportunidad de innovacion');
  if (conversion) {
    const tendency = column(conversion, 'tendencia');
    const chance = column(conversion, 'oportunidad');
    const solution = column(conversion, 'solucion');
    const kind = column(conversion, 'tipo');
    const impact = column(conversion, 'impacto');
    for (const row of conversion.rows) {
      if (!row[chance]) continue;
      const leaf = push('hoja', row[chance], '', bestMatch(row[tendency] ?? '', level('territorial')));
      if (row[solution]) {
        push('fruto', row[solution], '', leaf, {
          tipo_fruto: fruitType(row[kind]),
          solucion: row[solution],
          impacto_esperado: row[impact] ?? '',
        });
      }
    }
  }

  labelledItems(markdown, /^\W*ra[ií](z|ces)\b/i).forEach((item) => push('raiz', item, item, trunk));
  labelledItems(markdown, /^\W*suelo\b/i).forEach((item) => push('suelo', item, item, trunk));

  if (level('global').length === 0) {
    throw new Error('El documento no trae la tabla de tendencias globales.');
  }
  return finalizeGraph(tema, nodos, 'documento');
}

/** Cadena completa de un nodo: de qué deriva hasta el tronco y qué deriva de él hasta los frutos. */
export function routeOf(graph: TreeGraph, codigo: string): Set<string> {
  const byCode = new Map(graph.nodos.map((n) => [n.codigo, n]));
  const route = new Set([codigo]);
  const climb = (c: string, key: 'deriva_de' | 'derivan') => {
    for (const next of byCode.get(c)?.[key] ?? []) {
      if (!route.has(next)) {
        route.add(next);
        climb(next, key);
      }
    }
  };
  climb(codigo, 'deriva_de');
  climb(codigo, 'derivan');
  return route;
}
