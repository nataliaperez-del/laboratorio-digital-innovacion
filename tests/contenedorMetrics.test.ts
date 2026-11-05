import { describe, expect, it } from 'vitest';
import { buildConclusions, computeMetrics, type MetricsInput } from '@/lib/contenedorMetrics';
import { documentKey, isComplete, needsSurvey, netPromoterScore } from '@/lib/satisfaction';
import { buildOfflinePlan, OFFLINE_TAGLINE } from '@/lib/offlinePlan';
import type { TreeGraph, TreeNode } from '@/lib/innovationTreeGraph';
import type { PrototypePlan } from '@/services/prototyping';
import type { SavedIdeation, SavedStudy, SavedTree, SurveyResponse } from '@/store/useStore';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const node = (codigo: string, nivel: TreeNode['nivel'], extra: Partial<TreeNode> = {}): TreeNode => ({
  codigo,
  nivel,
  nombre: `Nodo ${codigo}`,
  descripcion: '',
  evidencia: 'N1',
  deriva_de: [],
  derivan: [],
  fuentes: [],
  alertas: [],
  ...extra,
});

const graph: TreeGraph = {
  tema: 'Café especial',
  origen: 'ia',
  nodos: [
    node('TR-01', 'tronco', { derivan: ['TG-01'] }),
    node('RZ-01', 'raiz', { nombre: 'Baja trazabilidad', descripcion: 'los lotes no se registran', deriva_de: ['TR-01'] }),
    node('TG-01', 'global', { deriva_de: ['TR-01'], derivan: ['HJ-01'], evidencia: 'N2' }),
    node('HJ-01', 'hoja', { deriva_de: ['TG-01'], derivan: ['FR-01'], evidencia: 'N3' }),
    node('FR-01', 'fruto', {
      nombre: 'Trazabilidad con QR',
      deriva_de: ['HJ-01'],
      tipo_fruto: 'prototipo',
      solucion: 'Etiquetas QR por lote',
      impacto_esperado: 'Mejor precio por calidad comprobada',
      evidencia: 'N3',
      alertas: ['Precio por verificar'],
    }),
  ],
};

const study = (id: string, at: string, dept: string, statuses: Array<'ok' | 'warning' | 'failed'>): SavedStudy =>
  ({
    id,
    createdAt: at,
    territoryName: `Municipio ${id}`,
    department: dept,
    zonaUNAD: 'ZSUR',
    prompt0Data: {} as SavedStudy['prompt0Data'],
    containerData: 'x',
    sections: statuses.map((status, i) => ({ number: i + 1, title: `B${i}`, markdown: '', status })),
  }) as unknown as SavedStudy;

const ideation = (id: string, at: string, chosen: number | null): SavedIdeation => ({
  id,
  createdAt: at,
  topicName: id,
  sourceLabel: 'General',
  markdown: '',
  sections: [{ number: 1, title: 'P', markdown: '', status: 'ok' }],
  selectedThemeIndex: chosen,
});

const tree: SavedTree = { id: 't1', createdAt: daysAgo(3), theme: 'Café especial', explanation: '', markdown: '', graph };

const plan = (id: string, at: string, kind: 'arbol' | 'idea', trl: string, offline = false): PrototypePlan =>
  ({ id, createdAt: at, origin: { kind, label: kind }, trlTarget: trl, offline }) as unknown as PrototypePlan;

const response = (module: SurveyResponse['module'], utilidad: number, facilidad: number, recomendacion: number, at = daysAgo(1)): SurveyResponse => ({
  id: `${module}-${utilidad}-${recomendacion}`,
  at,
  module,
  document: 'Doc',
  docKey: `${module}:${utilidad}`,
  format: 'word',
  utilidad,
  facilidad,
  recomendacion,
});

const input: MetricsInput = {
  savedStudies: [study('s1', daysAgo(2), 'Huila', ['ok', 'ok', 'warning']), study('s2', daysAgo(200), 'Nariño', ['ok', 'ok', 'ok'])],
  savedIdeations: [ideation('i1', daysAgo(2), 1), ideation('i2', daysAgo(5), null)],
  savedTrees: [tree],
  prototypes: [plan('p1', daysAgo(1), 'arbol', 'TRL 4 · Validación en laboratorio', true)],
  surveyResponses: [response('arbol', 5, 4, 10), response('prototipado', 3, 2, 6), response('estudio', 4, 4, 8)],
  downloads: [
    { at: daysAgo(1), module: 'arbol', format: 'word', document: 'Árbol' },
    { at: daysAgo(1), module: 'arbol', format: 'pdf', document: 'Árbol' },
  ],
};

describe('métricas del Contenedor', () => {
  it('cuenta resultados, territorio, calidad, evidencia y satisfacción', () => {
    const m = computeMetrics(input, { period: 'todo', module: null }, NOW);
    expect(m.totals).toEqual({ estudio: 2, ideacion: 2, arbol: 1, prototipado: 1, total: 6 });
    expect(m.territory.municipalities).toBe(2);
    expect(m.territory.departments).toBe(2);
    expect(m.quality.estudio).toEqual({ ok: 5, warning: 1, failed: 0 });
    expect(m.decisions).toEqual({ ideations: 2, withTheme: 1, prototypes: 1, fromTree: 1 });
    expect(m.evidence).toEqual({ N1: 2, N2: 1, N3: 2 });
    expect(m.fruits.find((f) => f.label === 'Prototipos')?.value).toBe(1);
    expect(m.trl.find((t) => t.label === 'TRL 4')?.value).toBe(1);
    expect(m.offlinePlans).toBe(1);
    expect(m.satisfaction.n).toBe(3);
    expect(m.satisfaction.utilidad).toBe(4);
    expect(m.satisfaction.nps).toBe(0); // 1 promotor, 1 pasivo, 1 detractor
    expect(m.downloads).toEqual({ total: 2, word: 1, pdf: 1 });
  });

  it('el período deja fuera lo antiguo y la línea filtra todo lo demás', () => {
    const last30 = computeMetrics(input, { period: '30', module: null }, NOW);
    expect(last30.totals.estudio).toBe(1);
    expect(last30.activity.unit).toBe('semana');
    expect(last30.activity.buckets.reduce((a, b) => a + b.value, 0)).toBe(5);

    const onlyTree = computeMetrics(input, { period: 'todo', module: 'arbol' }, NOW);
    expect(onlyTree.totals.total).toBe(1);
    expect(onlyTree.satisfaction.n).toBe(1);
    expect(onlyTree.territory.municipalities).toBe(0);
    // El embudo siempre muestra las cuatro líneas: la elegida se resalta en el tablero.
    expect(onlyTree.funnel.map((f) => f.value)).toEqual([2, 2, 1, 1]);
  });

  it('saca conclusiones de las cifras, sin inventar', () => {
    const text = buildConclusions(computeMetrics(input, { period: 'todo', module: null }, NOW)).map((c) => c.text);
    expect(text[0]).toContain('reúne 6 resultados');
    expect(text.some((t) => t.includes('50 % de las ideaciones'))).toBe(true);
    expect(text.some((t) => t.includes('100 % de los planes de prototipado nace de un fruto'))).toBe(true);
    expect(text.some((t) => t.includes('1 bloque del estudio quedó por revisar'))).toBe(true);
    expect(text.some((t) => t.includes('NPS 0 (positivo)') && t.includes('pocas respuestas'))).toBe(true);
    expect(text.some((t) => t.includes('menor utilidad percibida es Prototipado'))).toBe(true);
    expect(text.some((t) => t.includes('1 plan base se armó sin IA'))).toBe(true);
  });

  it('con el Contenedor vacío lo dice y no inventa cifras', () => {
    const empty = { savedStudies: [], savedIdeations: [], savedTrees: [], prototypes: [], surveyResponses: [], downloads: [] };
    const c = buildConclusions(computeMetrics(empty, { period: 'todo', module: null }, NOW));
    expect(c).toHaveLength(1);
    expect(c[0].text).toContain('Aún no hay resultados');
  });

  it('señala dónde se detiene el trabajo en el método', () => {
    const stuck = { ...input, savedTrees: [], prototypes: [] };
    const text = buildConclusions(computeMetrics(stuck, { period: 'todo', module: null }, NOW)).map((c) => c.text);
    expect(text.some((t) => t.includes('2 ideaciones y ningún árbol de innovación'))).toBe(true);
  });
});

describe('encuesta de satisfacción', () => {
  it('exige las tres respuestas dentro de su escala', () => {
    expect(isComplete({ utilidad: 4, facilidad: 5, recomendacion: 9 })).toBe(true);
    expect(isComplete({ utilidad: 4, facilidad: null, recomendacion: 9 })).toBe(false);
    expect(isComplete({ utilidad: 6, facilidad: 5, recomendacion: 9 })).toBe(false);
    expect(isComplete({ utilidad: 4, facilidad: 5, recomendacion: 11 })).toBe(false);
  });

  it('pregunta una vez por documento: el mismo en Word y PDF no repite, uno rehecho sí', () => {
    const report = { module: 'arbol' as const, fileName: 'Arbol_Cafe', markdown: '# Árbol' };
    const key = documentKey(report);
    expect(needsSurvey([], key)).toBe(true);
    expect(needsSurvey([{ docKey: key }], key)).toBe(false);
    expect(needsSurvey([{ docKey: key }], documentKey({ ...report, markdown: '# Árbol rehecho' }))).toBe(true);
  });

  it('calcula el NPS', () => {
    expect(netPromoterScore([])).toBeNull();
    expect(netPromoterScore([10, 9, 8, 3])).toBe(25);
    expect(netPromoterScore([0, 5, 6])).toBe(-100);
  });
});

describe('plan base sin IA', () => {
  const brief = {
    origin: { kind: 'arbol' as const, code: 'FR-01', label: 'Árbol de Innovación: Café especial' },
    topic: 'Trazabilidad con QR',
    context: '',
    category: 'Prototipo Tecnológico' as const,
    trl: 'TRL 4 · Validación en laboratorio',
    scope: 'Municipal y zonal',
  };

  it('usa los datos reales del fruto y su árbol', () => {
    const p = buildOfflinePlan(brief, { graph, node: graph.nodos[4] }, new Date(NOW));
    expect(p.offline).toBe(true);
    expect(p.tagline).toBe(OFFLINE_TAGLINE);
    expect(p.problemSolved).toContain('Baja trazabilidad');
    expect(p.solution).toBe('Etiquetas QR por lote.');
    expect(p.hypothesis).toContain('mejor precio por calidad comprobada');
    expect(p.phases).toHaveLength(4);
    expect(p.phases[2].actividades).toContain('validación en laboratorio');
    expect(p.supuestos.some((s) => s.includes('Nodo HJ-01') && s.includes('N3'))).toBe(true);
    expect(p.supuestos).toContain('Precio por verificar.');
  });

  it('sin árbol, no inventa: lo que falta queda por precisar', () => {
    const p = buildOfflinePlan({ ...brief, origin: { kind: 'idea', label: 'Idea libre' } }, undefined, new Date(NOW));
    expect(p.problemSolved).toMatch(/^Por precisar/);
    expect(p.solution).toMatch(/^Por precisar/);
    expect(p.targetAudience).toMatch(/^Por precisar/);
  });
});
