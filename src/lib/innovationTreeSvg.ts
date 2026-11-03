/**
 * Dibujo del árbol de innovación con la estética del módulo de Boletines (circuito sobre
 * holograma, `innovahub-boletin/src/Svg.php`): plataforma = suelo, media esfera = raíces,
 * haz de pistas = tronco, ramas de circuito a 45° y copa de hojas y frutos.
 *
 * Devuelve el SVG como texto porque lo usan la pantalla y los informes Word/PDF. Todo dato
 * pasa por `esc`: viene de la IA y no es confiable. La pantalla se engancha por los
 * atributos data-codigo / data-nivel / data-tipo y data-hijo / data-padre.
 */
import type { FigureSpec } from '@/lib/figures';
import { FRUIT_LABEL, type TreeGraph, type TreeLevel, type TreeNode } from '@/lib/innovationTreeGraph';

const W = 1200;
const H = 1120;
const CX = W / 2;
const TRUNK_TOP = 700;
const TRUNK_BOTTOM = 828;

const ROWS: Record<TreeLevel, [number, number]> = {
  fruto: [130, 900],
  hoja: [272, 760],
  territorial: [392, 520],
  nacional: [510, 680],
  global: [632, 900],
  tronco: [772, 0],
  raiz: [900, 300],
  suelo: [1040, 760],
};
const RADIUS: Partial<Record<TreeLevel, number>> = { global: 15, nacional: 18, territorial: 22, hoja: 13, fruto: 17, raiz: 11, suelo: 11 };
const COLORS: Partial<Record<TreeLevel, string>> = {
  global: '#5EC2DD',
  nacional: '#2E9CBA',
  territorial: '#9FD4E4',
  hoja: '#A8C63C',
  raiz: '#F29F05',
  suelo: '#A8C63C',
};
const ZONES: Array<[TreeLevel, string]> = [
  ['fruto', 'FRUTOS · RESULTADOS'],
  ['hoja', 'HOJAS · OPORTUNIDADES'],
  ['territorial', 'TERRITORIAL'],
  ['nacional', 'NACIONAL'],
  ['global', 'GLOBAL'],
  ['tronco', 'TRONCO · TEMA CENTRAL'],
  ['raiz', 'RAÍZ · BRECHAS'],
  ['suelo', 'SUELO · FUENTES'],
];

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Parte un nombre en líneas cortas, con puntos suspensivos si no cabe. */
function wrap(value: string, max: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > max) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  const out = lines.slice(0, maxLines);
  if (out.join(' ').length < value.trim().length) {
    const last = out.pop() ?? '';
    out.push(`${last.slice(0, Math.max(1, max - 1)).trimEnd()}…`);
  }
  return out;
}

/** Hash estable para el polvo de luz: el dibujo no cambia entre pantalla y descarga. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Placed {
  x: number;
  y: number;
  node: TreeNode;
}

function layout(graph: TreeGraph): Map<string, Placed> {
  const byLevel = new Map<TreeLevel, TreeNode[]>();
  for (const node of graph.nodos) byLevel.set(node.nivel, [...(byLevel.get(node.nivel) ?? []), node]);

  const placed = new Map<string, Placed>();
  const order: TreeLevel[] = ['tronco', 'global', 'nacional', 'territorial', 'hoja', 'fruto', 'raiz', 'suelo'];
  for (const level of order) {
    let row = byLevel.get(level) ?? [];
    if (['nacional', 'territorial', 'hoja', 'fruto'].includes(level)) {
      // Bajo su padre: menos cruces.
      const meanX = (n: TreeNode) => {
        const xs = n.deriva_de.map((c) => placed.get(c)?.x).filter((v): v is number => v != null);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : CX;
      };
      row = [...row].sort((a, b) => meanX(a) - meanX(b) || a.codigo.localeCompare(b.codigo));
    }
    const [y, width] = ROWS[level];
    const count = row.length;
    row.forEach((node, i) => {
      const gap = count > 1 ? Math.min(width / (count - 1), level === 'fruto' || level === 'hoja' ? 120 : 150) : 0;
      let px = CX + (i - (count - 1) / 2) * gap;
      let py = y;
      if (level === 'fruto') py = y + 30 * (Math.abs(i - (count - 1) / 2) / Math.max(1, (count - 1) / 2)) ** 2; // copa redondeada
      if (level === 'raiz') {
        const a = Math.PI * (0.15 + 0.7 * (count > 1 ? i / (count - 1) : 0.5));
        px = CX - Math.cos(a) * 112;
        py = 820 + Math.sin(a) * 72;
      }
      if (level === 'suelo') {
        const a = Math.PI * (count > 1 ? 0.12 + (0.76 * i) / (count - 1) : 0.5);
        px = CX - Math.cos(a) * 330;
        py = 1040 + Math.sin(a) * 42;
      }
      placed.set(node.codigo, { x: px, y: py, node });
    });
  }
  return placed;
}

/** De (x1,y1) arriba a (x2,y2) abajo: vertical · 45° · vertical. */
function circuit(x1: number, y1: number, x2: number, y2: number): string {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const diag = Math.min(Math.abs(dx), Math.max(0, dy - 18));
  const ya = y1 + (dy - diag) / 2;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} V${ya.toFixed(1)} H${(x2 - Math.sign(dx) * diag).toFixed(1)} L${x2.toFixed(1)} ${(ya + diag).toFixed(1)} V${y2.toFixed(1)}`;
}

function lines(x: number, y: number, rows: string[], cls: string, step = 13): string {
  return rows.map((row, i) => `<text class="${cls}" x="${x.toFixed(1)}" y="${(y + i * step).toFixed(1)}" text-anchor="middle">${esc(row)}</text>`).join('');
}

const STYLE = `.arbol-futuro text{font-family:Inter,system-ui,sans-serif}.et{font-size:10.5px;fill:#CFE6EE}.et.fr{fill:#EAF4F7}.cd{font-size:10px;font-weight:700;fill:#03141B}.cdc{font-size:11px;font-weight:700;fill:#EAF4F7}
.zona{font:400 10px "IBM Plex Mono",monospace;letter-spacing:.16em;fill:#6E8F9C}.guia{stroke:#5EC2DD;stroke-opacity:.08;stroke-dasharray:2 6}
.nodo{cursor:pointer}.nodo:focus{outline:none}.nodo .forma{transition:transform .2s;transform-box:fill-box;transform-origin:center}
.nodo:hover .forma,.nodo:focus .forma,.nodo.sel .forma{transform:scale(1.25)}.nodo:focus .anillo,.nodo.sel .anillo,.nodo:hover .anillo{opacity:1}.anillo{opacity:0;transition:opacity .2s}
.oculto{opacity:.07;pointer-events:none}.arista{fill:none;stroke:#2E9CBA;stroke-opacity:.55;stroke-width:1.6;stroke-linejoin:round;transition:stroke .2s,stroke-opacity .2s}
.arista.hab{stroke:#A8C63C;stroke-opacity:.35;stroke-dasharray:3 5}.arista.rie{stroke:#F29F05;stroke-opacity:.3;stroke-dasharray:2 5}
.arbol-futuro.enfoque .arista{stroke-opacity:.12}.arbol-futuro.enfoque .arista.activa{stroke:#F29F05;stroke-opacity:1;stroke-width:2.4}
.arbol-futuro.enfoque .nodo:not(.ruta):not(.sel){opacity:.35}
.pulso{fill:none;stroke:#BFF0FF;stroke-width:2;stroke-linecap:round;stroke-dasharray:6 180;animation:af-pulso 5.5s linear infinite}
@keyframes af-pulso{from{stroke-dashoffset:186}to{stroke-dashoffset:0}}
.parp{animation:af-parp 3.6s ease-in-out infinite}@keyframes af-parp{0%,100%{opacity:.25}50%{opacity:.9}}
.giro{transform-box:fill-box;transform-origin:center;animation:af-giro 60s linear infinite}@keyframes af-giro{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.pulso,.parp,.giro{animation:none}}`;

/** SVG completo del árbol. `titles` añade los rótulos de cada nivel (pantalla e informes). */
export function renderTreeSvg(graph: TreeGraph, options: { titles?: boolean } = {}): string {
  const placed = layout(graph);
  const all = [...placed.values()];
  const radius = (p: Placed) => (p.node.nivel === 'tronco' ? 18 : (RADIUS[p.node.nivel] ?? 14));

  // Pista del tronco reservada a cada tendencia global.
  const globals = all.filter((p) => p.node.nivel === 'global').sort((a, b) => a.x - b.x);
  const lanes = new Map(globals.map((g, i) => [g.node.codigo, CX + (i - (globals.length - 1) / 2) * 9]));

  let s = `<svg class="arbol-svg arbol-futuro" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="Árbol de innovación: ${esc(graph.tema)}">`;
  s += `<defs>
<radialGradient id="af-fondo" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#073A4A"/><stop offset=".55" stop-color="#04222B"/><stop offset="1" stop-color="#021219"/></radialGradient>
<linearGradient id="af-haz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5EC2DD" stop-opacity=".55"/><stop offset="1" stop-color="#5EC2DD" stop-opacity="0"/></linearGradient>
<radialGradient id="af-disco" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5EC2DD" stop-opacity=".45"/><stop offset=".45" stop-color="#2E9CBA" stop-opacity=".16"/><stop offset="1" stop-color="#2E9CBA" stop-opacity="0"/></radialGradient>
<radialGradient id="af-copa" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2E9CBA" stop-opacity=".22"/><stop offset="1" stop-color="#2E9CBA" stop-opacity="0"/></radialGradient>
<filter id="af-brillo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="af-esfera"><path d="M${CX - 128} 820 A128 128 0 0 0 ${CX + 128} 820 Z"/></clipPath>
</defs><style>${STYLE}</style>`;

  // Fondo, polvo de luz y copa.
  s += `<rect width="${W}" height="${H}" fill="url(#af-fondo)"/><ellipse cx="${CX}" cy="330" rx="580" ry="330" fill="url(#af-copa)"/>`;
  for (let i = 0; i < 70; i++) {
    const h = hash(`p${i}`);
    s += `<circle class="parp" cx="${h % W}" cy="${(h >>> 8) % 720}" r="${(0.6 + (h % 7) / 5).toFixed(1)}" fill="#9FD4E4" style="animation-delay:${((h % 36) / 10).toFixed(1)}s"/>`;
  }
  if (options.titles) {
    for (const [level, label] of ZONES) {
      const y = level === 'fruto' ? 36 : ROWS[level][0];
      s += `<line class="guia" x1="18" x2="${W - 18}" y1="${y}" y2="${y}"/><text class="zona" x="18" y="${y + 4}">${label}</text>`;
    }
  }

  // Plataforma holográfica (suelo).
  s += `<ellipse cx="${CX}" cy="1040" rx="430" ry="70" fill="url(#af-disco)"/>`;
  for (const [rx, ry, dash, op] of [
    [380, 62, '1 0', 0.5],
    [330, 54, '10 6', 0.7],
    [262, 44, '2 7', 0.6],
    [190, 32, '28 10', 0.8],
    [120, 21, '4 4', 0.9],
    [60, 11, '', 1],
  ] as const) {
    s += `<ellipse cx="${CX}" cy="1040" rx="${rx}" ry="${ry}" fill="none" stroke="#5EC2DD" stroke-opacity="${op * 0.5}" stroke-width="1.4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  }
  s += `<g class="giro"><ellipse cx="${CX}" cy="1040" rx="300" ry="50" fill="none" stroke="#9FD4E4" stroke-opacity=".5" stroke-width="3" stroke-dasharray="60 240"/></g>`;
  s += `<path d="M${CX - 34} 1040 L${CX - 96} 870 L${CX + 96} 870 L${CX + 34} 1040 Z" fill="url(#af-haz)" transform="rotate(180 ${CX} 955)" opacity=".7"/>`;

  // Media esfera de malla (raíces).
  s += `<g clip-path="url(#af-esfera)" stroke="#5EC2DD" stroke-opacity=".38" fill="none" stroke-width="1"><path d="M${CX - 128} 820 A128 128 0 0 0 ${CX + 128} 820 Z" fill="#5EC2DD" fill-opacity=".06"/>`;
  for (let k = 1; k <= 6; k++)
    s += `<ellipse cx="${CX}" cy="820" rx="${(128 * Math.cos(Math.asin(k / 7))).toFixed(1)}" ry="10" transform="translate(0 ${((k / 7) * 128).toFixed(1)})"/>`;
  for (let k = -5; k <= 5; k++) s += `<ellipse cx="${CX}" cy="820" rx="${Math.abs(k) * 24}" ry="128"/>`;
  s += `</g><line x1="${CX - 140}" x2="${CX + 140}" y1="820" y2="820" stroke="#9FD4E4" stroke-opacity=".6"/>`;

  // Tronco: una pista por tendencia global.
  for (const x of lanes.values()) {
    s += `<path d="M${x.toFixed(1)} ${TRUNK_TOP} V${TRUNK_BOTTOM}" stroke="#5EC2DD" stroke-width="2.2" stroke-opacity=".9" filter="url(#af-brillo)"/><rect x="${(x - 2.5).toFixed(1)}" y="${TRUNK_BOTTOM - 2}" width="5" height="9" fill="#9FD4E4" opacity=".85"/>`;
  }
  s += `<path class="pulso" d="M${CX} ${TRUNK_BOTTOM} V${TRUNK_TOP}"/>`;

  // Aristas: cada nodo hacia aquello de lo que deriva.
  for (const child of all) {
    for (const parentCode of child.node.deriva_de) {
      const parent = placed.get(parentCode);
      if (!parent) continue;
      const level = child.node.nivel;
      let d: string;
      let cls = '';
      if (level === 'suelo') {
        cls = ' hab';
        d = `M${child.x.toFixed(1)} ${(child.y - radius(child)).toFixed(1)} Q${(CX + (child.x - CX) * 0.35).toFixed(1)} 990 ${CX} 950`;
      } else if (level === 'raiz') {
        cls = ' rie';
        d = `M${child.x.toFixed(1)} ${(child.y - radius(child)).toFixed(1)} Q${(child.x + (parent.x - child.x) * 0.2).toFixed(1)} ${parent.y + 40} ${parent.x.toFixed(1)} ${(parent.y + 21).toFixed(1)}`;
      } else if (parent.node.nivel === 'tronco') {
        d = circuit(child.x, child.y + radius(child), lanes.get(child.node.codigo) ?? CX, TRUNK_TOP);
      } else {
        d = circuit(child.x, child.y + radius(child), parent.x, parent.y - radius(parent));
      }
      s += `<path class="arista${cls}" data-hijo="${esc(child.node.codigo)}" data-padre="${esc(parentCode)}" d="${d}"/>`;
      if (level === 'territorial' || level === 'nacional') {
        s += `<path class="pulso" style="animation-delay:${((hash(child.node.codigo) % 50) / 10).toFixed(1)}s" d="${d}"/>`;
      }
    }
  }

  // Nodos.
  for (const p of all) {
    const { node } = p;
    const x = +p.x.toFixed(1);
    const y = +p.y.toFixed(1);
    const level = node.nivel;
    const r = RADIUS[level] ?? 14;
    const tipo = node.tipo_fruto ?? '';
    const aria = `${node.codigo} · ${node.nombre} · evidencia ${node.evidencia}${tipo ? ` · ${FRUIT_LABEL[tipo as keyof typeof FRUIT_LABEL]}` : ''}`;
    s += `<g class="nodo" data-codigo="${esc(node.codigo)}" data-nivel="${level}" data-tipo="${tipo}" tabindex="0" role="button" aria-label="${esc(aria)}"><title>${esc(aria)}</title>`;

    if (level === 'tronco') {
      s += `<g class="forma"><rect x="${x - 170}" y="${y - 24}" width="340" height="48" rx="24" fill="#04222B" stroke="#5EC2DD" stroke-width="1.6" filter="url(#af-brillo)"/><rect x="${x - 170}" y="${y - 24}" width="340" height="48" rx="24" fill="#5EC2DD" fill-opacity=".12"/></g>`;
      s += `<text class="zona" x="${x}" y="${y - 6}" text-anchor="middle" style="fill:#9FD4E4">TEMA CENTRAL</text>${lines(x, y + 12, wrap(node.nombre, 50, 1), 'cdc')}</g>`;
      continue;
    }

    let color = COLORS[level] ?? '#5EC2DD';
    s += `<circle class="anillo" cx="${x}" cy="${y}" r="${r + 9}" fill="none" stroke="#F29F05" stroke-width="1.6" stroke-dasharray="4 4"/><g class="forma" filter="url(#af-brillo)">`;
    if (level === 'fruto' && tipo === 'servicio') {
      color = '#F29F05';
      s += `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="4" fill="${color}"/>`;
    } else if (level === 'fruto' && tipo === 'prototipo') {
      color = '#A8C63C';
      const d = r * 1.3;
      s += `<polygon points="${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}" fill="${color}"/>`;
    } else if (level === 'suelo') {
      s += `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="2" fill="${color}"/>`;
    } else if (level === 'hoja') {
      s += `<path d="M${x - r} ${y} Q${x - r * 0.2} ${y - r * 1.3} ${x + r} ${y - r * 0.4} Q${x + r * 0.2} ${y + r * 1.3} ${x - r} ${y} Z" fill="${color}"/>`;
    } else {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${level === 'fruto' ? '#5EC2DD' : color}"/>`;
    }
    s += '</g>';

    if (level !== 'suelo' && level !== 'raiz' && level !== 'hoja') {
      s += `<text class="cd" x="${x}" y="${y + 3.5}" text-anchor="middle">${esc(node.codigo.slice(3))}</text>`;
    }
    if (node.evidencia !== 'N1') {
      const bx = x + r * 0.85;
      const by = y - r * 0.85;
      s += `<g><circle cx="${bx}" cy="${by}" r="7.5" fill="${node.evidencia === 'N2' ? '#A8C63C' : '#E2665A'}" stroke="#04222B" stroke-width="1.5"/><text class="cd" style="font-size:7px" x="${bx}" y="${by + 2.5}" text-anchor="middle">${node.evidencia}</text></g>`;
    }
    if (level === 'fruto') {
      const label = wrap(node.nombre, 16, 2);
      const y0 = y - r - 8 - (label.length - 1) * 12;
      s += `<text class="zona" x="${x}" y="${y0 - 14}" text-anchor="middle" style="fill:${color}">${tipo ? FRUIT_LABEL[tipo as keyof typeof FRUIT_LABEL].toUpperCase() : ''}</text>${lines(x, y0, label, 'et fr', 12)}`;
    } else if (level === 'suelo') {
      s += lines(x, y + r + 14, wrap(node.nombre, 20, 2), 'et');
    } else if (level === 'hoja') {
      s += lines(x, y + r + 12, wrap(node.nombre, 16, 2), 'et', 12);
    } else if (level !== 'raiz') {
      // A la derecha: las ramas entran y salen en vertical.
      wrap(node.nombre, level === 'global' ? 11 : 13, 2).forEach((row, i) => {
        s += `<text class="et" x="${x + r + 5}" y="${y - 2 + i * 12}">${esc(row)}</text>`;
      });
    }
    s += '</g>';
  }
  return `${s}</svg>`;
}

/** Figura del árbol para los informes formales. */
export function treeFigure(graph: TreeGraph): FigureSpec {
  return {
    id: 'arbol-innovacion',
    title: `Árbol de innovación: ${graph.tema}`,
    note: 'Nota. Elaboración propia a partir del análisis 10–5–3 generado con mediación de inteligencia artificial en el Laboratorio de Innovación en Línea. N2: con fuente citada; N3: hipótesis por verificar. Requiere validación humana.',
    svg: renderTreeSvg(graph, { titles: true }),
    width: W,
    height: H,
  };
}
