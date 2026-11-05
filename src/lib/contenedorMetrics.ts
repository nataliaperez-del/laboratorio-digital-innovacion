/**
 * Métricas del Contenedor de resultados de innovación en línea y sus conclusiones.
 *
 * Todo sale de lo que ya está guardado en el navegador (estudios, ideaciones, árboles, planes,
 * encuestas de satisfacción y descargas): se calcula al instante, sin IA y sin conexión. Las
 * conclusiones son reglas explícitas sobre esas cifras, no texto generado: dicen lo que los
 * datos muestran y sugieren el siguiente paso.
 *
 * Funciones puras (probadas en tests/contenedorMetrics.test.ts).
 */
import { netPromoterScore, npsReading } from '@/lib/satisfaction';
import type { ReportModule } from '@/lib/labReports';
import type { PrototypePlan } from '@/services/prototyping';
import { TRL_OPTIONS } from '@/services/prototyping';
import type { DownloadRecord, SavedIdeation, SavedStudy, SavedTree, SurveyResponse } from '@/store/useStore';

export type MetricsPeriod = 'todo' | '30' | '90' | '365';

export interface MetricsFilters {
  period: MetricsPeriod;
  /** Una línea del método, o null para todas. */
  module: ReportModule | null;
}

export interface MetricsInput {
  savedStudies: readonly SavedStudy[];
  savedIdeations: readonly SavedIdeation[];
  savedTrees: readonly SavedTree[];
  prototypes: readonly PrototypePlan[];
  surveyResponses: readonly SurveyResponse[];
  downloads: readonly DownloadRecord[];
}

/** Las cuatro líneas, en el orden del método. */
export const MODULE_ORDER: readonly ReportModule[] = ['estudio', 'ideacion', 'arbol', 'prototipado'];

export const MODULE_METRIC_LABEL: Record<ReportModule, string> = {
  estudio: 'Estudio Territorial',
  ideacion: 'Ideación',
  arbol: 'Árbol de Innovación',
  prototipado: 'Prototipado',
};

export interface Bar {
  label: string;
  value: number;
}

export interface PartsQuality {
  ok: number;
  warning: number;
  failed: number;
}

export interface ContenedorMetrics {
  filters: MetricsFilters;
  /** No hay ningún resultado ni respuesta en el período y la línea elegidos. */
  empty: boolean;
  totals: Record<ReportModule, number> & { total: number };
  territory: { municipalities: number; departments: number; zones: number; byDepartment: Bar[] };
  /** Resultados por línea del método (ignora el filtro de línea: la línea elegida se resalta). */
  funnel: Array<Bar & { module: ReportModule }>;
  decisions: { ideations: number; withTheme: number; prototypes: number; fromTree: number };
  quality: { estudio: PartsQuality; ideacion: PartsQuality };
  evidence: { N1: number; N2: number; N3: number };
  fruits: Bar[];
  trl: Bar[];
  offlinePlans: number;
  activity: { unit: 'semana' | 'mes'; buckets: Bar[] };
  satisfaction: {
    n: number;
    utilidad: number | null;
    facilidad: number | null;
    nps: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    byModule: Array<{ module: ReportModule; label: string; n: number; utilidad: number | null }>;
  };
  downloads: { total: number; word: number; pdf: number };
}

const DAY = 86_400_000;
const PERIOD_DAYS: Record<MetricsPeriod, number | null> = { todo: null, '30': 30, '90': 90, '365': 365 };

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

const average = (values: readonly number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

function countParts(parts: ReadonlyArray<{ status: string }>, into: PartsQuality) {
  for (const p of parts) {
    if (p.status === 'ok') into.ok++;
    else if (p.status === 'warning') into.warning++;
    else into.failed++;
  }
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Agrupa fechas por semana (períodos cortos) o por mes, de la más antigua a hoy. */
function activityBuckets(dates: readonly number[], period: MetricsPeriod, now: number): ContenedorMetrics['activity'] {
  const days = PERIOD_DAYS[period];
  if (days !== null && days <= 90) {
    const weeks = Math.ceil(days / 7);
    const end = now;
    const buckets: Bar[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const to = end - i * 7 * DAY;
      const from = to - 7 * DAY;
      const start = new Date(from + DAY);
      buckets.push({ label: `${start.getDate()} ${MONTHS[start.getMonth()]}`, value: dates.filter((d) => d > from && d <= to).length });
    }
    return { unit: 'semana', buckets };
  }
  const nowDate = new Date(now);
  const earliest = days !== null ? now - days * DAY : Math.min(now, ...dates);
  const first = new Date(earliest);
  let months = (nowDate.getFullYear() - first.getFullYear()) * 12 + (nowDate.getMonth() - first.getMonth()) + 1;
  months = Math.min(Math.max(months, 6), 24);
  const buckets: Bar[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const y = nowDate.getFullYear();
    const m = nowDate.getMonth() - i;
    const from = new Date(y, m, 1).getTime();
    const to = new Date(y, m + 1, 1).getTime();
    const label = new Date(from);
    buckets.push({ label: `${MONTHS[label.getMonth()]} ${String(label.getFullYear()).slice(2)}`, value: dates.filter((d) => d >= from && d < to).length });
  }
  return { unit: 'mes', buckets };
}

/** Calcula las métricas del período y la línea elegidos. */
export function computeMetrics(input: MetricsInput, filters: MetricsFilters, now: number = Date.now()): ContenedorMetrics {
  const days = PERIOD_DAYS[filters.period];
  const since = days === null ? -Infinity : now - days * DAY;
  const inPeriod = (iso: string) => time(iso) >= since;
  const wants = (m: ReportModule) => filters.module === null || filters.module === m;

  const studies = input.savedStudies.filter((s) => inPeriod(s.createdAt));
  const ideations = input.savedIdeations.filter((s) => inPeriod(s.createdAt));
  const trees = input.savedTrees.filter((s) => inPeriod(s.createdAt));
  const plans = input.prototypes.filter((s) => inPeriod(s.createdAt));
  const responses = (input.surveyResponses ?? []).filter((r) => inPeriod(r.at) && wants(r.module));
  const downloads = (input.downloads ?? []).filter((d) => inPeriod(d.at) && wants(d.module));

  const all = { estudio: studies.length, ideacion: ideations.length, arbol: trees.length, prototipado: plans.length };
  const totals = {
    estudio: wants('estudio') ? all.estudio : 0,
    ideacion: wants('ideacion') ? all.ideacion : 0,
    arbol: wants('arbol') ? all.arbol : 0,
    prototipado: wants('prototipado') ? all.prototipado : 0,
    total: 0,
  };
  totals.total = totals.estudio + totals.ideacion + totals.arbol + totals.prototipado;

  // Territorio (solo el Estudio Territorial registra el lugar).
  const territoryStudies = wants('estudio') ? studies : [];
  const byDept = new Map<string, number>();
  for (const s of territoryStudies) {
    const dept = s.department?.trim() || 'Sin departamento';
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
  }
  const deptBars = [...byDept.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const byDepartment = deptBars.length > 8 ? [...deptBars.slice(0, 7), { label: 'Otros', value: deptBars.slice(7).reduce((a, b) => a + b.value, 0) }] : deptBars;
  const distinct = (values: Array<string | undefined>) => new Set(values.map((v) => v?.trim().toLowerCase()).filter(Boolean)).size;
  const territory = {
    municipalities: distinct(territoryStudies.map((s) => `${s.territoryName}|${s.department}`)),
    departments: distinct(territoryStudies.map((s) => s.department)),
    zones: distinct(territoryStudies.map((s) => s.zonaUNAD)),
    byDepartment,
  };

  const funnel = MODULE_ORDER.map((m) => ({ module: m, label: MODULE_METRIC_LABEL[m], value: all[m] }));

  const scopedIdeations = wants('ideacion') ? ideations : [];
  const scopedPlans = wants('prototipado') ? plans : [];
  const scopedTrees = wants('arbol') ? trees : [];
  const decisions = {
    ideations: scopedIdeations.length,
    withTheme: scopedIdeations.filter((i) => i.selectedThemeIndex !== null && i.selectedThemeIndex !== undefined).length,
    prototypes: scopedPlans.length,
    fromTree: scopedPlans.filter((p) => p.origin?.kind === 'arbol').length,
  };

  const quality = { estudio: { ok: 0, warning: 0, failed: 0 }, ideacion: { ok: 0, warning: 0, failed: 0 } };
  for (const s of territoryStudies) countParts(s.sections ?? [], quality.estudio);
  for (const i of scopedIdeations) countParts(i.sections ?? [], quality.ideacion);

  const evidence = { N1: 0, N2: 0, N3: 0 };
  const fruitCount = { proyecto: 0, servicio: 0, prototipo: 0 };
  for (const t of scopedTrees) {
    for (const n of t.graph?.nodos ?? []) {
      if (n.evidencia in evidence) evidence[n.evidencia]++;
      if (n.nivel === 'fruto' && n.tipo_fruto && n.tipo_fruto in fruitCount) fruitCount[n.tipo_fruto]++;
    }
  }
  const fruits: Bar[] = [
    { label: 'Proyectos', value: fruitCount.proyecto },
    { label: 'Servicios', value: fruitCount.servicio },
    { label: 'Prototipos', value: fruitCount.prototipo },
  ];
  const trl: Bar[] = TRL_OPTIONS.map((option) => ({
    label: option.split('·')[0].trim(),
    value: scopedPlans.filter((p) => p.trlTarget === option || p.trlTarget?.startsWith(option.split('·')[0].trim())).length,
  }));

  const dates = [
    ...(wants('estudio') ? studies : []),
    ...scopedIdeations,
    ...scopedTrees,
    ...scopedPlans,
  ].map((r) => time(r.createdAt));

  const scores = responses.map((r) => r.recomendacion);
  const satisfaction = {
    n: responses.length,
    utilidad: average(responses.map((r) => r.utilidad)),
    facilidad: average(responses.map((r) => r.facilidad)),
    nps: netPromoterScore(scores),
    promoters: scores.filter((s) => s >= 9).length,
    passives: scores.filter((s) => s >= 7 && s <= 8).length,
    detractors: scores.filter((s) => s <= 6).length,
    byModule: MODULE_ORDER.filter(wants).map((m) => {
      const rows = responses.filter((r) => r.module === m);
      return { module: m, label: MODULE_METRIC_LABEL[m], n: rows.length, utilidad: average(rows.map((r) => r.utilidad)) };
    }),
  };

  return {
    filters,
    empty: totals.total === 0 && responses.length === 0 && downloads.length === 0,
    totals,
    territory,
    funnel,
    decisions,
    quality,
    evidence,
    fruits,
    trl,
    offlinePlans: scopedPlans.filter((p) => p.offline).length,
    activity: activityBuckets(dates, filters.period, now),
    satisfaction,
    downloads: { total: downloads.length, word: downloads.filter((d) => d.format === 'word').length, pdf: downloads.filter((d) => d.format === 'pdf').length },
  };
}

// ── Conclusiones ──

export type ConclusionTone = 'good' | 'warning' | 'info';

export interface Conclusion {
  tone: ConclusionTone;
  text: string;
}

const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

const STAGE_NOUN: Record<ReportModule, [string, string]> = {
  estudio: ['estudio territorial', 'estudios territoriales'],
  ideacion: ['ideación', 'ideaciones'],
  arbol: ['árbol de innovación', 'árboles de innovación'],
  prototipado: ['plan de prototipado', 'planes de prototipado'],
};
const NEXT_STEP: Record<ReportModule, string> = {
  estudio: 'identificar oportunidades en el Estudio Territorial',
  ideacion: 'crear conceptos en Ideación',
  arbol: 'validarlos en el Árbol de Innovación',
  prototipado: 'desarrollar soluciones en Prototipado',
};

/** Lo que dicen las cifras, en frases cortas y con el siguiente paso. */
export function buildConclusions(m: ContenedorMetrics): Conclusion[] {
  const out: Conclusion[] = [];
  const line = m.filters.module;

  if (m.empty) {
    return [
      {
        tone: 'info',
        text: 'Aún no hay resultados en el Contenedor para este período. Cuando completes un Estudio, una Ideación, un Árbol o un Plan de Prototipado, sus métricas y conclusiones aparecerán aquí.',
      },
    ];
  }

  // Volumen y cobertura.
  if (m.totals.total) {
    const where =
      m.territory.municipalities > 0
        ? `, con estudios de ${plural(m.territory.municipalities, 'territorio', 'territorios')} en ${plural(m.territory.departments, 'departamento', 'departamentos')}`
        : '';
    out.push({
      tone: 'info',
      text: `${line ? `La línea ${MODULE_METRIC_LABEL[line]}` : 'El Contenedor'} reúne ${plural(m.totals.total, 'resultado', 'resultados')}${where}.`,
    });
  }

  // Avance por el método: ¿dónde se detiene el trabajo?
  if (!line) {
    const stages = m.funnel;
    let stall: { from: (typeof stages)[number]; to: (typeof stages)[number]; ratio: number } | null = null;
    for (let i = 1; i < stages.length; i++) {
      const from = stages[i - 1];
      const to = stages[i];
      if (!from.value) continue;
      const ratio = to.value / from.value;
      if (!stall || ratio < stall.ratio) stall = { from, to, ratio };
    }
    if (stall && stall.to.value === 0) {
      out.push({
        tone: 'warning',
        text: `Hay ${plural(stall.from.value, ...STAGE_NOUN[stall.from.module])} y ningún ${STAGE_NOUN[stall.to.module][0]}: el siguiente paso es ${NEXT_STEP[stall.to.module]}.`,
      });
    } else if (stall && stall.ratio < 0.5) {
      out.push({
        tone: 'warning',
        text: `El paso de ${MODULE_METRIC_LABEL[stall.from.module]} a ${MODULE_METRIC_LABEL[stall.to.module]} es el cuello de botella: ${plural(stall.from.value, ...STAGE_NOUN[stall.from.module])} y solo ${plural(stall.to.value, ...STAGE_NOUN[stall.to.module])}.`,
      });
    } else if (stages.every((s) => s.value > 0)) {
      out.push({ tone: 'good', text: 'El trabajo avanza de forma pareja por las cuatro líneas del método, de identificar oportunidades a desarrollar soluciones.' });
    }
  }

  // Decisiones: elegir tema y partir del árbol.
  if (m.decisions.ideations) {
    const p = pct(m.decisions.withTheme, m.decisions.ideations);
    out.push(
      p >= 70
        ? { tone: 'good', text: `El ${p} % de las ideaciones ya tiene un tema elegido para seguir al Árbol de Innovación.` }
        : {
            tone: p < 50 ? 'warning' : 'info',
            text: `${p > 0 ? `Solo el ${p} % de las ideaciones tiene` : m.decisions.ideations === 1 ? 'La ideación guardada aún no tiene' : `Ninguna de las ${num(m.decisions.ideations)} ideaciones tiene`} un tema elegido: elegir uno de los tres permite continuar con el Árbol de Innovación.`,
          },
    );
  }
  if (m.decisions.prototypes) {
    const p = pct(m.decisions.fromTree, m.decisions.prototypes);
    out.push(
      p >= 50
        ? { tone: 'good', text: `El ${p} % de los planes de prototipado nace de un fruto del Árbol: hay trazabilidad del territorio a la solución.` }
        : { tone: 'info', text: `El ${p} % de los planes nace de un fruto del Árbol. Partir de un fruto conecta el plan con la evidencia de tendencias.` },
    );
  }

  // Calidad de lo generado.
  const q = m.quality.estudio;
  const parts = q.ok + q.warning + q.failed;
  if (parts) {
    const pending = q.warning + q.failed;
    out.push(
      pending
        ? {
            tone: 'warning',
            text: `${plural(pending, 'bloque del estudio quedó', 'bloques del estudio quedaron')} por revisar (${pct(q.ok, parts)} % completos): ${pending === 1 ? 'rehazlo' : 'rehazlos'} antes de citar el documento.`,
          }
        : { tone: 'good', text: `Los ${num(parts)} bloques de los estudios territoriales quedaron completos.` },
    );
  }
  const nodes = m.evidence.N1 + m.evidence.N2 + m.evidence.N3;
  if (nodes) {
    const hyp = pct(m.evidence.N3, nodes);
    out.push(
      hyp >= 40
        ? { tone: 'warning', text: `El ${hyp} % de los elementos de los árboles son hipótesis (evidencia N3): conviene contrastarlos con fuentes antes de prototipar.` }
        : { tone: 'good', text: `El ${100 - hyp} % de los elementos de los árboles tiene evidencia del Observatorio o contrastada (N1 y N2).` },
    );
  }
  if (m.offlinePlans) {
    out.push({
      tone: 'info',
      text: `${plural(m.offlinePlans, 'plan base se armó', 'planes base se armaron')} sin IA con los datos del Contenedor: complétalos con IA cuando vuelva la conexión.`,
    });
  }

  // Satisfacción.
  const s = m.satisfaction;
  if (!s.n) {
    out.push({ tone: 'info', text: 'Aún no hay respuestas de satisfacción: se piden antes de entregar un documento en Word o PDF.' });
  } else if (s.utilidad !== null && s.facilidad !== null && s.nps !== null) {
    const tone: ConclusionTone = s.utilidad < 3.5 || s.nps < 0 ? 'warning' : s.utilidad >= 4 && s.nps >= 0 ? 'good' : 'info';
    out.push({
      tone,
      text: `Con ${plural(s.n, 'respuesta', 'respuestas')}, la utilidad promedio es ${num(s.utilidad)} de 5, la facilidad ${num(s.facilidad)} de 5 y el NPS ${s.nps > 0 ? '+' : ''}${s.nps} (${npsReading(s.nps)}).${
        s.n < 5 ? ' Aún son pocas respuestas para conclusiones firmes.' : ''
      }`,
    });
    const rated = s.byModule.filter((b) => b.utilidad !== null) as Array<{ module: ReportModule; label: string; n: number; utilidad: number }>;
    if (rated.length >= 2) {
      const sorted = [...rated].sort((a, b) => a.utilidad - b.utilidad);
      if (sorted[sorted.length - 1].utilidad - sorted[0].utilidad >= 0.5) {
        out.push({ tone: 'warning', text: `La línea con menor utilidad percibida es ${sorted[0].label} (${num(sorted[0].utilidad)} de 5): revisa qué les falta a sus documentos.` });
      }
    }
    if (s.utilidad - s.facilidad >= 1) {
      out.push({ tone: 'info', text: 'Los resultados se valoran más útiles que fáciles de obtener: hay espacio para simplificar el proceso en el Laboratorio.' });
    }
  }

  if (m.downloads.total) {
    out.push({
      tone: 'info',
      text: `Se ${m.downloads.total === 1 ? 'ha entregado 1 documento' : `han entregado ${num(m.downloads.total)} documentos`} (${num(m.downloads.word)} en Word y ${num(m.downloads.pdf)} en PDF).`,
    });
  }
  return out;
}
