/**
 * Puente de solo lectura con el Observatorio InnovaHub360. El Laboratorio es un módulo del
 * Observatorio y se alimenta de él: hoy, de las señales de su Radar (`/api/observatorio/radar`,
 * servido por includes/observatorio.php en producción y por Vite en desarrollo).
 */
import { keywordsFromText } from '@/lib/fichaIdentity';

export const OBSERVATORIO_URL = 'https://observatorio.innovahub360.net/';

export interface RadarSignal {
  id: number;
  nombre: string;
  descripcion: string;
  area: string;
  color: string;
  /** 0–100. */
  impacto: number;
  /** 0–100. */
  adopcion: number;
  horizonte: string;
  accion: string;
  madurez: string;
  prioridad: string;
  evidencia: string;
  responsable: string;
  actores: string;
  casos: string[];
  oportunidades: string[];
  riesgos: string[];
  recomendacion: string;
  fuenteUrl: string;
  relacionadas: number[];
  territorios: string[];
}

export interface RadarFeed {
  consultadoEn: string;
  fuente: string;
  senales: RadarSignal[];
}

const lista = (value: unknown): string[] =>
  String(value ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

const porcentaje = (value: unknown): number => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);

/** Traduce el registro del Radar a la forma que usa el Laboratorio. */
export function normalizeRadarSignal(raw: Record<string, unknown>): RadarSignal {
  return {
    id: Number(raw.id),
    nombre: String(raw.nombre ?? '').trim(),
    descripcion: String(raw.descripcion_corta ?? '').trim(),
    area: String(raw.area_nombre ?? 'Sin área'),
    color: /^#[0-9a-f]{6}$/i.test(String(raw.color_hex)) ? String(raw.color_hex) : '#5EC2DD',
    impacto: porcentaje(raw.impacto_territorial),
    adopcion: porcentaje(raw.velocidad_adopcion),
    horizonte: String(raw.horizonte ?? ''),
    accion: String(raw.horizonte_accion ?? ''),
    madurez: String(raw.madurez ?? ''),
    prioridad: String(raw.prioridad ?? ''),
    evidencia: String(raw.evidencia ?? ''),
    responsable: String(raw.responsable ?? ''),
    actores: String(raw.actores_texto ?? ''),
    casos: lista(raw.casos_texto),
    oportunidades: lista(raw.oportunidades_texto),
    riesgos: lista(raw.riesgos_texto),
    recomendacion: String(raw.recomendacion_texto ?? '').trim(),
    fuenteUrl: String(raw.fuente_url ?? '').trim(),
    relacionadas: Array.isArray(raw.relacionadas) ? raw.relacionadas.map(Number) : [],
    territorios: Array.isArray(raw.territorios) ? raw.territorios.map(String) : [],
  };
}

let feedPromise: Promise<RadarFeed> | null = null;

export function loadRadarFeed(): Promise<RadarFeed> {
  if (feedPromise) return feedPromise;
  feedPromise = (async () => {
    let res: Response;
    try {
      res = await fetch('/api/observatorio/radar');
    } catch {
      // «Failed to fetch»: el navegador no llegó al servidor (apagado, reiniciándose o sin red).
      throw new Error(
        'No hay conexión con el servidor del Laboratorio para leer el Radar del Observatorio. Revisa tu internet o que el servidor esté encendido.',
      );
    }
    // Un cuerpo que no es JSON (p. ej. una página de error del hosting) se trata como respuesta vacía.
    const body = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(body?.senales)) {
      throw new Error(body?.error || `No se pudo leer el Radar del Observatorio (HTTP ${res.status}).`);
    }
    return { consultadoEn: body.consultadoEn, fuente: body.fuente, senales: body.senales.map(normalizeRadarSignal) };
  })();
  feedPromise.catch(() => {
    feedPromise = null;
  });
  return feedPromise;
}

/** Texto de una señal como insumo de otra herramienta. */
export function signalAsInput(signal: RadarSignal): string {
  return [
    `Señal del Radar del Observatorio InnovaHub360: ${signal.nombre}`,
    signal.descripcion,
    `Área: ${signal.area}. Prioridad: ${signal.prioridad}. Horizonte: ${signal.horizonte} (${signal.accion}). Madurez: ${signal.madurez}. Evidencia: ${signal.evidencia}.`,
    signal.casos.length ? `Casos: ${signal.casos.join('; ')}.` : '',
    signal.oportunidades.length ? `Oportunidades: ${signal.oportunidades.join('; ')}.` : '',
    signal.riesgos.length ? `Riesgos: ${signal.riesgos.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Señales cuyo texto comparte palabras con el tema, las más afines primero. */
export function relatedSignals(signals: readonly RadarSignal[], theme: string, limit = 6): RadarSignal[] {
  const keywords = keywordsFromText(theme);
  if (!keywords.length) return [];
  return signals
    .map((signal) => {
      const haystack = keywordsFromText(`${signal.nombre} ${signal.descripcion} ${signal.area}`);
      return { signal, hits: keywords.filter((k) => haystack.some((w) => w.startsWith(k.slice(0, 5)))).length };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((x) => x.signal);
}
