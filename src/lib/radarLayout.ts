/**
 * Ubica las señales del Observatorio en la pantalla del radar. Es una función pura y cada
 * posición sale de los datos reales: el sector es el área y la cercanía al centro, el impacto.
 */
export interface RadarInput {
  id: number;
  area: string;
  color: string;
  impacto: number;
}

export interface RadarSector {
  area: string;
  color: string;
  /** Grados en sentido horario desde el norte. */
  start: number;
  end: number;
}

export interface RadarPlot {
  id: number;
  bearing: number;
  /** 0 en el centro, 1 en el borde. */
  range: number;
  x: number;
  y: number;
}

const MIN_RANGE = 0.14;
const MAX_RANGE = 0.93;

/** Cuanto más impacto territorial, más cerca del centro: es lo primero que hay que atender. */
export const rangeOfImpact = (impacto: number) => MIN_RANGE + (MAX_RANGE - MIN_RANGE) * (1 - Math.max(0, Math.min(100, impacto)) / 100);

/** Punto de la pantalla (unidad: radio) para un rumbo y un alcance. */
export function polar(bearing: number, range: number) {
  const a = (bearing * Math.PI) / 180;
  return { x: Math.sin(a) * range, y: -Math.cos(a) * range };
}

export function layoutRadar(signals: RadarInput[]): { sectors: RadarSector[]; plots: RadarPlot[] } {
  const byArea = new Map<string, RadarInput[]>();
  for (const s of signals) byArea.set(s.area, [...(byArea.get(s.area) ?? []), s]);
  const areas = [...byArea.keys()].sort();
  // Cada área ocupa según cuántas señales tiene; el +1 evita sectores demasiado estrechos.
  const slots = areas.reduce((sum, area) => sum + byArea.get(area)!.length + 1, 0);
  const sectors: RadarSector[] = [];
  const plots: RadarPlot[] = [];
  let cursor = 0;
  for (const area of areas) {
    const members = [...byArea.get(area)!].sort((a, b) => a.id - b.id);
    const width = (360 * (members.length + 1)) / (slots || 1);
    sectors.push({ area, color: members[0].color, start: cursor, end: cursor + width });
    members.forEach((s, i) => {
      const bearing = cursor + (width * (i + 1)) / (members.length + 1);
      const range = rangeOfImpact(s.impacto);
      plots.push({ id: s.id, bearing, range, ...polar(bearing, range) });
    });
    cursor += width;
  }
  return { sectors, plots };
}
