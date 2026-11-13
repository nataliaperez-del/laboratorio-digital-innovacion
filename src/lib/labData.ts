/**
 * Formas de los datos que el Laboratorio concentra en el servidor y sus conversiones. Lógica pura:
 * el envío está en `src/services/labCollector.ts` y el servidor en `hostinger_deploy/includes/lab.php`.
 *
 * De cada resultado viajan dos cosas: el documento completo (para el Contenedor global) y un
 * resumen con lo justo para calcular las métricas, de modo que el tablero global no tenga que
 * descargar los documentos de todos.
 */
import type { MetricsInput } from '@/lib/contenedorMetrics';
import type { ReportModule } from '@/lib/labReports';
import type { PrototypePlan } from '@/services/prototyping';
import type { DownloadRecord, Prompt0Data, SavedIdeation, SavedStudy, SavedTree, SurveyResponse } from '@/store/useStore';

export type LabEventType = 'ingreso' | 'generacion' | 'encuesta' | 'descarga' | 'zoe' | 'insignia';

export interface LabEvent {
  id: string;
  tipo: LabEventType;
  modulo?: ReportModule;
  /** ISO 8601. */
  at: string;
  datos?: Record<string, unknown>;
}

/** Un resultado tal como se envía al servidor. */
export interface LabResultPayload {
  id: string;
  modulo: ReportModule;
  titulo: string;
  departamento: string;
  municipio: string;
  zona: string;
  creadoEn: string;
  resumen: Record<string, unknown>;
  documento: Record<string, unknown>;
}

export type SavedResult =
  | { modulo: 'estudio'; item: SavedStudy }
  | { modulo: 'ideacion'; item: SavedIdeation }
  | { modulo: 'arbol'; item: SavedTree }
  | { modulo: 'prototipado'; item: PrototypePlan };

/** Cambia cuando el resultado cambia: decide si hay que volver a enviarlo. */
export function resultSignature(result: SavedResult): string {
  const { modulo, item } = result;
  if (modulo === 'estudio') return `${item.createdAt}|${item.containerData.length}|${item.sections.map((s) => s.status[0]).join('')}`;
  if (modulo === 'ideacion') return `${item.createdAt}|${item.markdown.length}|${item.selectedThemeIndex}`;
  if (modulo === 'arbol') return `${item.createdAt}|${item.markdown.length}|${item.graph?.nodos?.length ?? 0}`;
  return `${item.createdAt}|${item.name}|${item.phases.length}|${item.offline ? 1 : 0}`;
}

/** Arma lo que se envía de un resultado: datos para listar, resumen para las métricas y documento completo. */
export function resultPayload(result: SavedResult, ficha: Prompt0Data): LabResultPayload {
  const place = { departamento: ficha.department || '', municipio: ficha.municipality || '', zona: ficha.zonaUNAD || '' };
  if (result.modulo === 'estudio') {
    const s = result.item;
    return {
      id: s.id,
      modulo: 'estudio',
      titulo: `Estudio Territorial de ${s.territoryName}`,
      departamento: s.department,
      municipio: s.territoryName,
      zona: s.zonaUNAD,
      creadoEn: s.createdAt,
      resumen: { sections: s.sections.map((p) => ({ status: p.status })) },
      documento: { ...s },
    };
  }
  if (result.modulo === 'ideacion') {
    const i = result.item;
    return {
      id: i.id,
      modulo: 'ideacion',
      titulo: i.topicName,
      ...place,
      creadoEn: i.createdAt,
      resumen: { selectedThemeIndex: i.selectedThemeIndex, sections: i.sections.map((p) => ({ status: p.status })) },
      documento: { ...i, prompt0Data: ficha },
    };
  }
  if (result.modulo === 'arbol') {
    const t = result.item;
    return {
      id: t.id,
      modulo: 'arbol',
      titulo: t.theme,
      ...place,
      creadoEn: t.createdAt,
      resumen: { nodos: (t.graph?.nodos ?? []).map((n) => ({ evidencia: n.evidencia, nivel: n.nivel, tipo_fruto: n.tipo_fruto })) },
      documento: { ...t, prompt0Data: ficha },
    };
  }
  const p = result.item;
  return {
    id: p.id,
    modulo: 'prototipado',
    titulo: p.name,
    ...place,
    creadoEn: p.createdAt,
    resumen: { originKind: p.origin?.kind, trlTarget: p.trlTarget, offline: Boolean(p.offline) },
    documento: { ...p, prompt0Data: ficha },
  };
}

// ── Lo que devuelve el servidor para el tablero global ──

interface GlobalRow {
  id: string;
  creadoEn: string;
  departamento: string;
  municipio: string;
  zona: string;
  resumen: Record<string, unknown>;
}

interface GlobalEventRow {
  modulo: ReportModule | null;
  at: string;
  datos: Record<string, unknown>;
}

export interface GlobalDashboard {
  generadoEn: string;
  usuarios: { total: number; activos7dias: number; ingresos: number; conConsentimiento: number };
  totales: Record<ReportModule, number>;
  resultados: Record<ReportModule, GlobalRow[]>;
  encuestas: GlobalEventRow[];
  descargas: GlobalEventRow[];
  uso: Array<{ modulo: ReportModule; ok: number; fallidas: number; segundosPromedio: number | null }>;
  zoe: number;
  insignias: number;
  /** Hay más filas en el servidor de las que caben en el tablero: las cifras salen de las más recientes. */
  recortado: boolean;
  maximoFilas: number;
}

export interface GlobalResultRow {
  id: number;
  modulo: ReportModule;
  titulo: string;
  departamento: string;
  municipio: string;
  zona: string;
  creadoEn: string;
  actualizadoEn: string;
  autor: string;
  correo: string;
}

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const number = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/**
 * Convierte la respuesta del servidor en lo mismo que usa el tablero de cada navegador, para
 * calcular las métricas globales con las mismas reglas (`computeMetrics`). Solo llena los campos
 * que esas reglas leen.
 */
export function dashboardToMetricsInput(data: GlobalDashboard): MetricsInput {
  const rows = (m: ReportModule) => list<GlobalRow>(data.resultados?.[m]);
  return {
    savedStudies: rows('estudio').map((r) => ({
      id: r.id,
      createdAt: r.creadoEn,
      territoryName: r.municipio,
      department: r.departamento,
      zonaUNAD: r.zona,
      sections: list<{ status: string }>(r.resumen?.sections),
    })) as unknown as SavedStudy[],
    savedIdeations: rows('ideacion').map((r) => ({
      id: r.id,
      createdAt: r.creadoEn,
      selectedThemeIndex: typeof r.resumen?.selectedThemeIndex === 'number' ? r.resumen.selectedThemeIndex : null,
      sections: list<{ status: string }>(r.resumen?.sections),
    })) as unknown as SavedIdeation[],
    savedTrees: rows('arbol').map((r) => ({ id: r.id, createdAt: r.creadoEn, graph: { nodos: list(r.resumen?.nodos) } })) as unknown as SavedTree[],
    prototypes: rows('prototipado').map((r) => ({
      id: r.id,
      createdAt: r.creadoEn,
      origin: { kind: r.resumen?.originKind, label: '' },
      trlTarget: typeof r.resumen?.trlTarget === 'string' ? r.resumen.trlTarget : '',
      offline: r.resumen?.offline === true,
    })) as unknown as PrototypePlan[],
    surveyResponses: list<GlobalEventRow>(data.encuestas)
      .filter((e) => e.modulo)
      .map((e, i) => ({
        id: `global-${i}`,
        at: e.at,
        module: e.modulo as ReportModule,
        document: '',
        docKey: '',
        format: e.datos?.format === 'word' ? 'word' : 'pdf',
        utilidad: number(e.datos?.utilidad),
        facilidad: number(e.datos?.facilidad),
        recomendacion: number(e.datos?.recomendacion),
      })) as SurveyResponse[],
    downloads: list<GlobalEventRow>(data.descargas)
      .filter((e) => e.modulo)
      .map((e) => ({ at: e.at, module: e.modulo as ReportModule, format: e.datos?.format === 'word' ? 'word' : 'pdf', document: '' })) as DownloadRecord[],
  };
}
