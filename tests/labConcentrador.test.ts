import { describe, expect, it } from 'vitest';
import { computeMetrics } from '@/lib/contenedorMetrics';
import { dashboardToMetricsInput, resultPayload, resultSignature, type GlobalDashboard, type SavedResult } from '@/lib/labData';
import { buildInsumosPrompt, fallbackInsumos, insumoAsInput, MAX_INSUMOS, normalizeInsumos, resultText } from '@/lib/labInsumos';
import { changesToCollect } from '@/services/labCollector';
import type { AppState, Prompt0Data, SavedIdeation, SavedStudy, SavedTree } from '@/store/useStore';
import type { PrototypePlan } from '@/services/prototyping';

const FICHA = { labName: 'Taller', municipality: 'Duitama', department: 'Boyacá', zonaUNAD: 'ZCB', country: 'Colombia' } as Prompt0Data;

const study: SavedStudy = {
  id: 'study-1',
  createdAt: '2026-11-13T10:00:00.000Z',
  territoryName: 'Duitama',
  department: 'Boyacá',
  zonaUNAD: 'ZCB',
  prompt0Data: FICHA,
  containerData: '# Estudio\n\nTexto del estudio.',
  sections: [{ number: 1, title: 'A', status: 'ok' }, { number: 2, title: 'B', status: 'warning' }] as SavedStudy['sections'],
};
const ideation: SavedIdeation = {
  id: 'ideation-1',
  createdAt: '2026-11-13T11:00:00.000Z',
  topicName: 'Secado solar',
  sourceLabel: 'Estudio',
  markdown: '## Vocación\n\nTexto.\n\n## Opción de tema 1: Secado solar\n\nJustificación uno.\n\n## Opción de tema 2: Bioinsumos\n\nJustificación dos.\n\n## Opción de tema 3: Turismo\n\nJustificación tres.',
  sections: [{ number: 1, title: 'Vocación', status: 'ok' }] as SavedIdeation['sections'],
  selectedThemeIndex: 0,
};
const tree = {
  id: 'tree-1',
  createdAt: '2026-11-13T12:00:00.000Z',
  theme: 'Secado solar',
  explanation: '',
  markdown: '# Árbol',
  graph: {
    tema: 'Secado solar',
    origen: 'ia',
    nodos: [
      { codigo: 'FR-01', nivel: 'fruto', nombre: 'Secador comunitario', descripcion: 'Un secador', evidencia: 'N2', tipo_fruto: 'prototipo', solucion: 'Secador solar de bandejas', deriva_de: [], derivan: [], fuentes: [], alertas: [] },
      { codigo: 'HO-01', nivel: 'hoja', nombre: 'Fruta deshidratada', descripcion: 'Mercado de snacks', evidencia: 'N3', deriva_de: [], derivan: [], fuentes: [], alertas: [] },
    ],
  },
} as unknown as SavedTree;
const plan = {
  id: 'proto-1',
  createdAt: '2026-11-13T13:00:00.000Z',
  origin: { kind: 'arbol', label: 'Árbol', code: 'FR-01' },
  name: 'Secador solar modular',
  tagline: 'Fruta seca con sol',
  category: 'Prototipo Tecnológico',
  trlTarget: 'TRL 4 · Validación en laboratorio',
  scope: 'Local y comunitario',
  targetAudience: 'Productores',
  problemSolved: 'Pérdida de cosecha',
  hypothesis: 'El secado solar reduce la pérdida en 30 %. Se valida en tres fincas.',
  solution: 'Secador de bandejas',
  architecture: { fisico: '', digital: '', metodologico: '' },
  phases: [{ fase: 'Diseño', semanas: 'Semanas 1-2', actividades: '', entregables: [] }],
  deliverables: [],
  durationWeeks: 8,
  unadSchools: [],
  validationMetrics: ['Humedad final'],
  risks: [{ riesgo: 'Lluvia', mitigacion: 'Cubierta' }],
  supuestos: [],
} as PrototypePlan;

const RESULTS: SavedResult[] = [
  { modulo: 'estudio', item: study },
  { modulo: 'ideacion', item: ideation },
  { modulo: 'arbol', item: tree },
  { modulo: 'prototipado', item: plan },
];

describe('lo que se envía de cada resultado', () => {
  it('lleva datos para listar, un resumen para las métricas y el documento completo', () => {
    const sent = resultPayload(RESULTS[0], FICHA);
    expect(sent).toMatchObject({ id: 'study-1', modulo: 'estudio', municipio: 'Duitama', departamento: 'Boyacá', zona: 'ZCB' });
    expect(sent.resumen).toEqual({ sections: [{ status: 'ok' }, { status: 'warning' }] });
    expect(sent.documento.containerData).toContain('Texto del estudio');
    // El resumen no arrastra el documento: es lo que descarga el tablero global.
    expect(JSON.stringify(sent.resumen).length).toBeLessThan(200);
  });

  it('las líneas sin territorio propio toman el de la ficha y guardan la ficha para el informe', () => {
    const sent = resultPayload(RESULTS[2], FICHA);
    expect(sent.municipio).toBe('Duitama');
    expect(sent.documento.prompt0Data).toBe(FICHA);
    expect(sent.resumen).toEqual({ nodos: [{ evidencia: 'N2', nivel: 'fruto', tipo_fruto: 'prototipo' }, { evidencia: 'N3', nivel: 'hoja', tipo_fruto: undefined }] });
  });

  it('la firma cambia cuando el resultado cambia, y solo entonces', () => {
    expect(resultSignature(RESULTS[1])).toBe(resultSignature({ modulo: 'ideacion', item: { ...ideation } }));
    expect(resultSignature(RESULTS[1])).not.toBe(resultSignature({ modulo: 'ideacion', item: { ...ideation, selectedThemeIndex: 2 } }));
  });
});

describe('tablero global', () => {
  it('con los resúmenes del servidor da las mismas métricas que con los resultados completos', () => {
    const local = computeMetrics({ savedStudies: [study], savedIdeations: [ideation], savedTrees: [tree], prototypes: [plan], surveyResponses: [], downloads: [] }, { period: 'todo', module: null }, Date.parse('2026-11-14T00:00:00Z'));
    const row = (r: SavedResult) => {
      const p = resultPayload(r, FICHA);
      return { id: p.id, creadoEn: p.creadoEn, departamento: p.departamento, municipio: p.municipio, zona: p.zona, resumen: JSON.parse(JSON.stringify(p.resumen)) };
    };
    const server = {
      resultados: { estudio: [row(RESULTS[0])], ideacion: [row(RESULTS[1])], arbol: [row(RESULTS[2])], prototipado: [row(RESULTS[3])] },
      encuestas: [{ modulo: 'estudio', at: '2026-11-13T10:06:00Z', datos: { utilidad: 5, facilidad: 4, recomendacion: 9, format: 'pdf' } }],
      descargas: [{ modulo: 'estudio', at: '2026-11-13T10:07:00Z', datos: { format: 'word' } }],
    } as unknown as GlobalDashboard;
    const global = computeMetrics(dashboardToMetricsInput(server), { period: 'todo', module: null }, Date.parse('2026-11-14T00:00:00Z'));
    for (const key of ['totals', 'territory', 'decisions', 'quality', 'evidence', 'fruits', 'trl'] as const) expect(global[key]).toEqual(local[key]);
    expect(global.satisfaction).toMatchObject({ n: 1, utilidad: 5, nps: 100 });
    expect(global.downloads).toEqual({ total: 1, word: 1, pdf: 0 });
  });

  it('no se rompe con una respuesta incompleta del servidor', () => {
    const input = dashboardToMetricsInput({} as GlobalDashboard);
    expect(computeMetrics(input, { period: 'todo', module: null }).empty).toBe(true);
  });
});

describe('banco de insumos', () => {
  it('el filtro le pide a la IA pocas piezas, reutilizables y sin datos personales', () => {
    const prompt = buildInsumosPrompt(RESULTS[0], 'Estudio Territorial de Duitama', 'Duitama, Boyacá');
    expect(prompt).toContain('Duitama, Boyacá');
    expect(prompt).toContain('Texto del estudio');
    expect(prompt).toMatch(/No incluyas nombres de personas/);
    expect(prompt).toContain('"insumos"');
  });

  it('un resultado muy largo se recorta conservando el inicio y el cierre', () => {
    const long = { modulo: 'estudio', item: { ...study, containerData: `INICIO ${'x'.repeat(40_000)} FINAL` } } as SavedResult;
    const text = resultText(long);
    expect(text.length).toBeLessThan(14_100);
    expect(text.startsWith('INICIO')).toBe(true);
    expect(text.endsWith('FINAL')).toBe(true);
  });

  it('valida lo que devuelve la IA: descarta lo inválido, limita y ordena por relevancia', () => {
    const selection = normalizeInsumos({
      sintesis: 'Resumen **breve**.',
      insumos: [
        { tipo: 'Hipótesis', titulo: 'Menos pérdida', descripcion: 'El secado reduce la pérdida.', relevancia: 2, palabrasClave: ['Secado', 'fruta'] },
        { tipo: 'oportunidad', titulo: 'Snacks', descripcion: 'Mercado en crecimiento.', relevancia: 9 },
        { tipo: 'inventado', titulo: 'X', descripcion: 'Y' },
        { tipo: 'brecha', titulo: '', descripcion: 'Sin título' },
        ...Array.from({ length: 12 }, (_, i) => ({ tipo: 'tema', titulo: `Tema ${i}`, descripcion: 'Texto', relevancia: 3 })),
      ],
    });
    expect(selection?.origen).toBe('ia');
    expect(selection?.sintesis).toBe('Resumen breve .');
    expect(selection?.insumos).toHaveLength(MAX_INSUMOS);
    expect(selection?.insumos[0]).toMatchObject({ tipo: 'oportunidad', relevancia: 5 });
    expect(selection?.insumos.some((i) => i.tipo === 'hipotesis')).toBe(false); // relevancia 2: quedó fuera del límite
    expect(normalizeInsumos({ insumos: [] })).toBeNull();
    expect(normalizeInsumos('texto suelto')).toBeNull();
  });

  it('sin IA saca los insumos de lo que el resultado ya trae estructurado', () => {
    const fromIdeation = fallbackInsumos(RESULTS[1]);
    expect(fromIdeation.origen).toBe('reglas');
    expect(fromIdeation.insumos.map((i) => i.titulo)).toEqual(['Secado solar', 'Bioinsumos', 'Turismo']);
    expect(fromIdeation.insumos[0].relevancia).toBe(5); // el tema que el equipo eligió

    const fromTree = fallbackInsumos(RESULTS[2]);
    expect(fromTree.insumos.map((i) => i.tipo)).toEqual(['solucion', 'oportunidad']);
    expect(fromTree.insumos[0].descripcion).toBe('Secador solar de bandejas');

    const fromPlan = fallbackInsumos(RESULTS[3]);
    expect(fromPlan.insumos.map((i) => i.tipo)).toEqual(['solucion', 'hipotesis']);
    expect(fromPlan.insumos[1].titulo).toBe('El secado solar reduce la pérdida en 30 %.');
  });

  it('un insumo sirve como texto de partida', () => {
    expect(insumoAsInput({ tipo: 'oportunidad', titulo: 'Snacks', descripcion: 'Mercado en crecimiento.' }, 'Duitama')).toBe(
      'Insumo del banco del Laboratorio (Oportunidad): Snacks\nMercado en crecimiento.\nTerritorio de origen: Duitama.',
    );
  });
});

describe('qué se concentra cuando cambia el estado', () => {
  const base = {
    savedStudies: [study],
    savedIdeations: [],
    savedTrees: [],
    prototypes: [],
    surveyResponses: [],
    downloads: [],
    zoeInteractions: 3,
    acknowledgedBadges: ['a'],
  } as unknown as AppState;

  it('nada, si no cambió nada de lo que se concentra', () => {
    const changes = changesToCollect({ ...base }, base);
    expect(changes).toEqual({ results: [], surveys: [], downloads: [], zoe: 0, badges: [] });
  });

  it('el resultado nuevo o modificado, la encuesta, la descarga, las charlas con ZOE y la insignia', () => {
    const survey = { id: 's1', at: '', module: 'estudio', document: '', docKey: '', format: 'pdf', utilidad: 5, facilidad: 5, recomendacion: 10 };
    const download = { at: '', module: 'estudio', format: 'pdf', document: '' };
    const next = {
      ...base,
      savedStudies: [{ ...study, containerData: `${study.containerData} Más.` }],
      savedIdeations: [ideation],
      surveyResponses: [survey],
      downloads: [download],
      zoeInteractions: 5,
      acknowledgedBadges: ['a', 'b'],
    } as unknown as AppState;
    const changes = changesToCollect(next, base);
    expect(changes.results.map((r) => r.item.id)).toEqual(['study-1', 'ideation-1']);
    expect(changes.surveys).toEqual([survey]);
    expect(changes.downloads).toEqual([download]);
    expect(changes.zoe).toBe(2);
    expect(changes.badges).toEqual(['b']);
  });
});
