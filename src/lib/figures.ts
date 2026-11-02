/**
 * Figuras de los informes: se generan de forma determinista a partir de datos reales del
 * resultado, sin imágenes por IA, de modo que no pueden «alucinar» cifras.
 */

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

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shorten(label: string, max: number): string {
  const clean = label.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Cronograma de un plan de prototipado: una fila por fase, en orden. */
export function buildTimelineFigure(title: string, phases: Array<{ fase: string; semanas: string }>): FigureSpec {
  const rowH = 46;
  const width = 900;
  const height = 40 + phases.length * rowH;
  const palette = ['#035E73', '#2E9CBA', '#7A9706', '#F29F05', '#6B4FA0', '#005883'];
  const rows = phases.map((p, i) => {
    const y = 20 + i * rowH;
    const x = 20 + (i / phases.length) * 560;
    const w = Math.max(560 / phases.length, 80);
    return [
      `<text x="20" y="${y + 12}" font-size="13" font-weight="bold" fill="#1f2937">${escapeXml(shorten(p.fase, 90))}</text>`,
      `<rect x="${x.toFixed(1)}" y="${y + 18}" width="${w.toFixed(1)}" height="14" rx="4" fill="${palette[i % palette.length]}"/>`,
      `<text x="${(x + w + 10).toFixed(1)}" y="${y + 30}" font-size="12" fill="#475569">${escapeXml(shorten(p.semanas, 24))}</text>`,
    ].join('');
  });
  return {
    id: 'cronograma',
    title,
    note: 'Nota. Elaboración propia a partir del plan de prototipado generado en el Laboratorio de Innovación en Línea. Los plazos son indicativos.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Calibri, 'Segoe UI', Arial, sans-serif"><rect width="${width}" height="${height}" fill="#ffffff"/>${rows.join('')}</svg>`,
    width,
    height,
  };
}

/**
 * Convierte un SVG a PNG en el navegador (Word no incrusta SVG de forma fiable en
 * todas las versiones).
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
