/**
 * Figuras del Ecosistema de Innovación generadas de forma determinista a partir de los
 * datos reales del proceso (conteos del registro de proyectos) y de las
 * constantes institucionales del Centro de Innovación. No hay generación de imágenes por IA:
 * cada valor corresponde a un dato trazable, de modo que las figuras no pueden
 * «alucinar» cifras.
 *
 * Figuras estáticas (siempre presentes):
 *   · maduracion-lab   — línea de tiempo de maduración del Centro de Innovación (4 fases)
 *   · lab-pilares      — cuadrícula de los 6 pilares estratégicos
 *
 * Figuras de datos (solo si el snapshot SIGIIP tiene registros):
 *   · sigiip-zonas     — barras horizontales por zona UNAD
 *   · sigiip-tipos     — torta/donut por tipo de proyecto
 *   · sigiip-escuelas  — barras horizontales por escuela
 */

import type { SigiipSnapshot } from '@/store/useStore';

export interface FigureSpec {
  /** Identificador estable para depuración y pruebas. */
  id: string;
  /** Título de la figura, sin el prefijo «Figura N» (lo pone el renderizador). */
  title: string;
  /** Nota al pie de la figura, en formato APA (empieza por «Nota.»). */
  note: string;
  svg: string;
  width: number;
  height: number;
}

// ─── Paletas y constantes ──────────────────────────────────────────────────

const BAR_COLOR = '#005883';
const BAR_COLOR_ALT = '#3f8fb0';
const TEXT_COLOR = '#1f2937';
const GRID_COLOR = '#cbd5e1';

/** Paleta secuencial para gráficos con múltiples series. */
const CHART_PALETTE = [
  '#003f6b', '#005883', '#0a7ec2', '#3f8fb0',
  '#5BA4CF', '#1F5F8B', '#2E86AB', '#93C6DF',
];

// ─── Utilidades SVG ─────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Recorta etiquetas largas para que no desborden la columna de rótulos. */
function shortenLabel(label: string, max = 42): string {
  const clean = label.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// ─── Gráfica de barras horizontales ─────────────────────────────────────────

interface BarChartOptions {
  data: Array<{ label: string; value: number }>;
  /** Ancho de la columna de rótulos, en píxeles. */
  labelWidth?: number;
  valueSuffix?: string;
}

/**
 * Gráfica de barras horizontales en SVG. Se eligen barras horizontales porque las
 * etiquetas reales (zonas y escuelas de la UNAD) son nombres largos que no caben
 * bajo un eje vertical.
 */
function horizontalBarChart({ data, labelWidth = 250, valueSuffix = '' }: BarChartOptions): {
  svg: string;
  width: number;
  height: number;
} {
  const rowHeight = 26;
  const paddingTop = 14;
  const paddingBottom = 26;
  const paddingRight = 56;
  const width = 900;
  const plotWidth = width - labelWidth - paddingRight;
  const height = paddingTop + data.length * rowHeight + paddingBottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const gridSteps = 4;
  const grid: string[] = [];
  for (let i = 0; i <= gridSteps; i++) {
    const x = labelWidth + (plotWidth * i) / gridSteps;
    const value = Math.round((max * i) / gridSteps);
    grid.push(
      `<line x1="${x}" y1="${paddingTop - 6}" x2="${x}" y2="${height - paddingBottom + 4}" stroke="${GRID_COLOR}" stroke-width="1"/>`,
      `<text x="${x}" y="${height - paddingBottom + 18}" font-size="11" fill="#64748b" text-anchor="middle">${value}</text>`,
    );
  }

  const bars = data.map((d, i) => {
    const y = paddingTop + i * rowHeight;
    const barHeight = rowHeight - 9;
    const barWidth = Math.max((d.value / max) * plotWidth, 2);
    const color = i % 2 === 0 ? BAR_COLOR : BAR_COLOR_ALT;
    return [
      `<text x="${labelWidth - 10}" y="${y + barHeight - 1}" font-size="12" fill="${TEXT_COLOR}" text-anchor="end">${escapeXml(shortenLabel(d.label))}</text>`,
      `<rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`,
      `<text x="${labelWidth + barWidth + 8}" y="${y + barHeight - 2}" font-size="12" fill="${TEXT_COLOR}">${d.value}${escapeXml(valueSuffix)}</text>`,
    ].join('');
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Calibri, 'Segoe UI', Arial, sans-serif"><rect width="${width}" height="${height}" fill="#ffffff"/>${grid.join('')}${bars.join('')}</svg>`;
  return { svg, width, height };
}

// ─── Gráfica de torta/donut ───────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: parseFloat((cx + r * Math.cos(rad)).toFixed(3)),
    y: parseFloat((cy + r * Math.sin(rad)).toFixed(3)),
  };
}

function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  if (endDeg - startDeg >= 359.99) {
    // Círculo completo: dos medias lunas para evitar el caso degenerado
    return (
      `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR} ` +
      `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR} Z ` +
      `M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR} ` +
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`
    );
  }
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, outerR, startDeg);
  const p2 = polarToCartesian(cx, cy, outerR, endDeg);
  const p3 = polarToCartesian(cx, cy, innerR, endDeg);
  const p4 = polarToCartesian(cx, cy, innerR, startDeg);
  return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function donutChart(data: Array<{ label: string; value: number }>): {
  svg: string;
  width: number;
  height: number;
} {
  if (data.length === 0) return horizontalBarChart({ data });
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return horizontalBarChart({ data });

  const width = 780;
  const height = Math.max(320, 80 + data.length * 38);
  const cx = 160;
  const cy = height / 2;
  const outerR = 120;
  const innerR = 66;

  let angleCursor = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const slice = {
      path: donutSlicePath(cx, cy, outerR, innerR, angleCursor, angleCursor + sweep),
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      label: d.label,
      value: d.value,
      pct: Math.round((d.value / total) * 100),
    };
    angleCursor += sweep;
    return slice;
  });

  const paths = slices
    .map((s) => `<path d="${s.path}" fill="${s.color}" stroke="white" stroke-width="2"/>`)
    .join('');

  const center =
    `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="30" font-weight="bold" fill="#005883">${total}</text>` +
    `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="12" fill="#64748b">proyectos</text>`;

  const legendX = 310;
  const rowH = 38;
  const legend = slices
    .map((s, i) => {
      const y = (height - data.length * rowH) / 2 + i * rowH;
      return [
        `<rect x="${legendX}" y="${y}" width="16" height="16" rx="3" fill="${s.color}"/>`,
        `<text x="${legendX + 24}" y="${y + 13}" font-size="13" fill="#1f2937">${escapeXml(shortenLabel(s.label, 35))}</text>`,
        `<text x="${legendX + 24}" y="${y + 28}" font-size="11" fill="#64748b">${s.value} proyectos · ${s.pct}%</text>`,
      ].join('');
    })
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Calibri,'Segoe UI',Arial,sans-serif">` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>` +
    paths + center + legend +
    `</svg>`;
  return { svg, width, height };
}

// ─── Infografía: línea de tiempo de maduración ───────────────────────────

function maturityTimeline(): { svg: string; width: number; height: number } {
  const width = 900;
  const height = 240;
  const phases = [
    { num: 'I',   title: 'Diagnóstico y',    title2: 'Contextualización',  period: 'Meses 1–3',  color: '#003f6b' },
    { num: 'II',  title: 'Diseño y',          title2: 'Formulación',        period: 'Meses 4–6',  color: '#005883' },
    { num: 'III', title: 'Implementación',    title2: 'y Operación',         period: 'Meses 7–18', color: '#0a7ec2' },
    { num: 'IV',  title: 'Consolidación y',   title2: 'Escalamiento',        period: 'Mes 19+',    color: '#3f8fb0' },
  ];
  const lineY = 115;
  const xs = [100, 310, 548, 780];
  let el = '';

  // Fondo
  el += `<rect width="${width}" height="${height}" fill="#f8fafc" rx="10"/>`;
  // Título
  el += `<text x="${width / 2}" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#005883">Ruta de Maduración del Centro de Innovación</text>`;

  // Conectores con flecha
  for (let i = 0; i < xs.length - 1; i++) {
    const x1 = xs[i] + 34;
    const x2 = xs[i + 1] - 34;
    el += `<line x1="${x1}" y1="${lineY}" x2="${x2 - 10}" y2="${lineY}" stroke="#94A3B8" stroke-width="3"/>`;
    el += `<polygon points="${x2},${lineY} ${x2 - 11},${lineY - 5} ${x2 - 11},${lineY + 5}" fill="#94A3B8"/>`;
  }

  phases.forEach((p, i) => {
    const x = xs[i];
    const r = 32;

    // Etiqueta de período (chip superior)
    el += `<rect x="${x - 38}" y="${lineY - 76}" width="76" height="22" rx="5" fill="${p.color}" opacity="0.15"/>`;
    el += `<text x="${x}" y="${lineY - 61}" text-anchor="middle" font-size="11" fill="${p.color}" font-weight="bold">${escapeXml(p.period)}</text>`;

    // Línea vertical del chip al círculo
    el += `<line x1="${x}" y1="${lineY - 54}" x2="${x}" y2="${lineY - r}" stroke="${p.color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.4"/>`;

    // Círculo de fase
    el += `<circle cx="${x}" cy="${lineY}" r="${r}" fill="${p.color}" stroke="white" stroke-width="3"/>`;
    el += `<text x="${x}" y="${lineY - 6}" text-anchor="middle" font-size="11" fill="white">Fase</text>`;
    el += `<text x="${x}" y="${lineY + 13}" text-anchor="middle" font-size="15" font-weight="bold" fill="white">${p.num}</text>`;

    // Títulos inferiores
    el += `<text x="${x}" y="${lineY + r + 22}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937">${escapeXml(p.title)}</text>`;
    el += `<text x="${x}" y="${lineY + r + 40}" text-anchor="middle" font-size="13" font-weight="bold" fill="#374151">${escapeXml(p.title2)}</text>`;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Calibri,'Segoe UI',Arial,sans-serif">${el}</svg>`;
  return { svg, width, height };
}

// ─── Infografía: cuadrícula de pilares estratégicos ──────────────────────

function cipPillarsGrid(): { svg: string; width: number; height: number } {
  const width = 900;
  const height = 368;
  const pillars = [
    { letter: 'I', title: 'Investigación',   subtitle: 'e Innovación',       desc1: 'Generación de conocimiento',    desc2: 'y soluciones tecnológicas',    color: '#003f6b' },
    { letter: 'P', title: 'Productividad',   subtitle: 'y Competitividad',   desc1: 'Mejora de procesos productivos', desc2: 'del territorio',               color: '#005883' },
    { letter: 'T', title: 'Transferencia de', subtitle: 'Conocimiento',      desc1: 'Articulación academia–',         desc2: 'empresa–Estado',               color: '#0a7ec2' },
    { letter: 'F', title: 'Formación y',     subtitle: 'Capacitación',       desc1: 'Programas de educación',         desc2: 'continua y especializada',     color: '#1F5F8B' },
    { letter: 'C', title: 'Conectividad',    subtitle: 'Territorial',        desc1: 'Redes de colaboración',          desc2: 'e infraestructura digital',    color: '#2E86AB' },
    { letter: 'E', title: 'Emprendimiento e', subtitle: 'Innovación Social', desc1: 'Incubación y aceleración',       desc2: 'de iniciativas locales',       color: '#3f8fb0' },
  ];

  const cols = 3;
  const boxW = 268;
  const boxH = 134;
  const padX = 18;
  const padY = 22;
  const startX = 14;
  const startY = 52;

  let el = '';
  el += `<rect width="${width}" height="${height}" fill="#f8fafc" rx="10"/>`;
  el += `<text x="${width / 2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#005883">Pilares Estratégicos del Centro de Innovación</text>`;

  pillars.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (boxW + padX);
    const y = startY + row * (boxH + padY);

    // Tarjeta
    el += `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="9" fill="white" stroke="${p.color}" stroke-width="1.5" stroke-opacity="0.45"/>`;
    // Acento izquierdo
    el += `<rect x="${x}" y="${y + 10}" width="5" height="${boxH - 20}" rx="3" fill="${p.color}"/>`;
    // Círculo con letra
    el += `<circle cx="${x + 34}" cy="${y + 44}" r="22" fill="${p.color}"/>`;
    el += `<text x="${x + 34}" y="${y + 51}" text-anchor="middle" font-size="19" font-weight="bold" fill="white">${p.letter}</text>`;
    // Título y subtítulo
    el += `<text x="${x + 65}" y="${y + 30}" font-size="13" font-weight="bold" fill="${p.color}">${escapeXml(p.title)}</text>`;
    el += `<text x="${x + 65}" y="${y + 47}" font-size="13" font-weight="bold" fill="${p.color}">${escapeXml(p.subtitle)}</text>`;
    // Descripción
    el += `<text x="${x + 65}" y="${y + 74}" font-size="11" fill="#374151">${escapeXml(p.desc1)}</text>`;
    el += `<text x="${x + 65}" y="${y + 89}" font-size="11" fill="#374151">${escapeXml(p.desc2)}</text>`;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Calibri,'Segoe UI',Arial,sans-serif">${el}</svg>`;
  return { svg, width, height };
}

// ─── Máximo de barras por figura ─────────────────────────────────────────

/** Máximo de barras por figura: más filas vuelven la figura ilegible en una página. */
const MAX_BARS = 9;

// ─── API pública ──────────────────────────────────────────────────────────

export function buildMaturityFigure(): FigureSpec {
  return {
    id: 'maduracion-lab',
    title: 'Ruta de maduración del Centro de Innovación',
    note: 'Nota. Elaboración propia basada en el modelo institucional de maduración de Centros de Innovación y Productividad de la Universidad Nacional Abierta y a Distancia. Las fases y períodos son indicativos y están sujetos a la planificación específica de cada Centro de Innovación.',
    ...maturityTimeline(),
  };
}

export function buildPillarsFigure(): FigureSpec {
  return {
    id: 'lab-pilares',
    title: 'Pilares estratégicos del Centro de Innovación',
    note: 'Nota. Elaboración propia a partir del marco institucional de Centros de Innovación y Productividad de la Universidad Nacional Abierta y a Distancia. Los pilares representan los ejes de gestión y acción del Centro de Innovación en el territorio y quedan sujetos a validación institucional.',
    ...cipPillarsGrid(),
  };
}

/**
 * Figuras estáticas (independientes de los datos SIGIIP) que se incluyen en
 * todos los documentos: línea de tiempo de maduración y cuadrícula de pilares.
 */
export function buildStaticFigures(): FigureSpec[] {
  return [buildMaturityFigure(), buildPillarsFigure()];
}

/**
 * Figuras derivadas del registro de proyectos SIGIIP. Devuelve una lista vacía si no
 * hay conteos (registro no disponible): el documento sale sin estas figuras antes que
 * con figuras vacías o inventadas.
 */
export function buildSigiipFigures(snapshot: SigiipSnapshot | null, zoneLabel: string): FigureSpec[] {
  if (!snapshot || snapshot.total <= 0) return [];
  const zone = zoneLabel.trim();
  const sourceNote = `Nota. Elaboración propia a partir del registro institucional de proyectos de investigación de la Universidad Nacional Abierta y a Distancia (${snapshot.total} proyectos registrados). Los conteos deben verificarse contra el reporte institucional vigente antes de la versión final.`;
  const figures: FigureSpec[] = [];

  if (snapshot.byZone.length > 1) {
    const chart = horizontalBarChart({ data: snapshot.byZone.slice(0, MAX_BARS), labelWidth: 260 });
    figures.push({
      id: 'sigiip-zonas',
      title: 'Proyectos de investigación registrados por zona de la Universidad Nacional Abierta y a Distancia',
      note: sourceNote,
      ...chart,
    });
  }

  if (snapshot.byType.length > 1) {
    // Gráfica de torta: más intuitiva que barras para distribuciones porcentuales
    const chart = donutChart(snapshot.byType.slice(0, MAX_BARS));
    figures.push({
      id: 'sigiip-tipos',
      title: 'Distribución porcentual de proyectos por tipo',
      note: sourceNote,
      ...chart,
    });
  }

  if (snapshot.byEscuela.length > 0) {
    const chart = horizontalBarChart({ data: snapshot.byEscuela.slice(0, MAX_BARS), labelWidth: 330 });
    figures.push({
      id: 'sigiip-escuelas',
      title: `Proyectos registrados por escuela${zone ? ` con incidencia en ${zone}` : ''}`,
      note: sourceNote,
      ...chart,
    });
  }

  return figures;
}

/**
 * Convierte un SVG a PNG en el navegador (Word no incrusta SVG de forma fiable en
 * todas las versiones, y la impresión a PDF necesita un mapa de bits estable).
 */
export async function svgToPngBytes(spec: FigureSpec, scale = 2): Promise<Uint8Array> {
  const blob = new Blob([spec.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo rasterizar la figura ${spec.id}`));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(spec.width * scale);
    canvas.height = Math.round(spec.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no expone un contexto 2D para rasterizar figuras');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error(`No se pudo convertir a PNG la figura ${spec.id}`);
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
