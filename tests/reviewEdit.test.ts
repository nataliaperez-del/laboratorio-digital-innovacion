import { beforeEach, describe, expect, it } from 'vitest';
import { nodePatchFromText, nodeToText, parseLabeled, planPatchFromText, planToCopyText, planToEditText } from '../src/lib/reviewEdit';
import { useStore } from '../src/store/useStore';
import type { TreeGraph, TreeNode } from '../src/lib/innovationTreeGraph';
import type { PrototypePlan } from '../src/services/prototyping';

const node = (codigo: string, extra: Partial<TreeNode> = {}): TreeNode => ({
  codigo,
  nivel: 'fruto',
  nombre: `Nodo ${codigo}`,
  descripcion: 'Descripción original',
  evidencia: 'media' as TreeNode['evidencia'],
  deriva_de: [],
  derivan: [],
  fuentes: ['Fuente 1'],
  alertas: [],
  ...extra,
});

const plan = (): PrototypePlan => ({
  id: 'p1',
  createdAt: '2026-11-14',
  origin: { kind: 'texto', label: 'Tema' } as unknown as PrototypePlan['origin'],
  name: 'Plan de abonos',
  tagline: 'De residuo a recurso',
  category: 'Servicio' as PrototypePlan['category'],
  trlTarget: 'TRL 4',
  scope: 'Piloto',
  targetAudience: 'Productores de Sogamoso',
  problemSolved: 'Residuos sin uso',
  hypothesis: 'Si compostamos, bajan los costos',
  solution: 'Planta comunitaria',
  architecture: { fisico: 'Planta', digital: 'App', metodologico: 'Talleres' },
  phases: [{ fase: 'Diseño', semanas: '1-4', actividades: 'Planear', entregables: ['Plano'] }],
  deliverables: ['Prototipo', 'Manual'],
  durationWeeks: 12,
  unadSchools: [],
  validationMetrics: ['Toneladas', 'Costo'],
  risks: [{ riesgo: 'Clima', mitigacion: 'Techo' }],
  supuestos: ['Hay agua'],
});

describe('corregir lo que sale de las herramientas', () => {
  it('lee «Etiqueta: valor» con valores de varios renglones', () => {
    const f = parseLabeled('Nombre: Uno\nDescripción: primera línea\nsegunda línea\nSolución: x', ['Nombre', 'Descripción', 'Solución']);
    expect(f).toEqual({ Nombre: 'Uno', Descripción: 'primera línea\nsegunda línea', Solución: 'x' });
  });

  it('el nodo corregido solo cambia lo que el texto trae y no acepta un nombre vacío', () => {
    const n = node('F1', { solucion: 'Vieja', impacto_esperado: 'Poco' });
    const text = nodeToText(n).replace('Nodo F1', 'Abono comunitario').replace('Vieja', 'Nueva');
    expect(nodePatchFromText(text)).toEqual({ nombre: 'Abono comunitario', descripcion: 'Descripción original', solucion: 'Nueva', impacto_esperado: 'Poco' });
    expect(nodePatchFromText('Nombre:\nDescripción: solo esto')).toEqual({ descripcion: 'solo esto' });
  });

  it('el plan se corrige y los renglones con guion vuelven a ser listas', () => {
    const p = plan();
    const text = planToEditText(p).replace('Si compostamos, bajan los costos', 'Si compostamos juntos, bajan los costos').replace('- Costo', '- Costo\n- Satisfacción');
    const patch = planPatchFromText(text);
    expect(patch.hypothesis).toBe('Si compostamos juntos, bajan los costos');
    expect(patch.validationMetrics).toEqual(['Toneladas', 'Costo', 'Satisfacción']);
    expect(patch.deliverables).toEqual(['Prototipo', 'Manual']);
    expect(patch.name).toBe('Plan de abonos');
  });

  it('copiar el plan trae fases, riesgos y arquitectura', () => {
    const text = planToCopyText(plan());
    expect(text).toContain('Diseño (1-4 semanas): Planear');
    expect(text).toContain('Clima → Techo');
    expect(text).toContain('Físico: Planta');
  });
});

describe('el almacén guarda lo corregido para la siguiente herramienta', () => {
  beforeEach(() => {
    const graph: TreeGraph = {
      tema: 'Abonos',
      origen: 'ia',
      nodos: [node('T1', { nivel: 'tronco', derivan: ['F1', 'F2'] }), node('F1', { deriva_de: ['T1'] }), node('F2', { deriva_de: ['T1'] })],
    };
    useStore.setState({
      treeGraph: graph,
      innovationTreeSections: [
        { number: 1, title: 'Tendencias', markdown: 'Texto uno', status: 'ok' },
        { number: 2, title: 'Frutos', markdown: 'Texto dos', status: 'ok' },
      ],
      innovationTreeMarkdown: 'Texto uno\n\nTexto dos',
      prototypes: [plan()],
    });
  });

  it('corrige un nodo', () => {
    useStore.getState().updateTreeNode('F1', { nombre: 'Compostaje' });
    expect(useStore.getState().treeGraph!.nodos.find((n) => n.codigo === 'F1')!.nombre).toBe('Compostaje');
  });

  it('borra un nodo y lo quita de las derivaciones de los demás', () => {
    useStore.getState().removeTreeNode('F1');
    const nodos = useStore.getState().treeGraph!.nodos;
    expect(nodos.map((n) => n.codigo)).toEqual(['T1', 'F2']);
    expect(nodos.find((n) => n.codigo === 'T1')!.derivan).toEqual(['F2']);
  });

  it('corrige o borra una parte del análisis y el documento se vuelve a armar', () => {
    useStore.getState().replaceTreeSection(0, { number: 1, title: 'Tendencias', markdown: 'Texto corregido', status: 'ok' });
    expect(useStore.getState().innovationTreeMarkdown).toContain('Texto corregido');
    useStore.getState().replaceTreeSection(1, { number: 2, title: 'Frutos', markdown: '', status: 'failed' });
    expect(useStore.getState().innovationTreeMarkdown).not.toContain('Texto dos');
  });

  it('corrige un plan de prototipo', () => {
    useStore.getState().updatePrototype('p1', { hypothesis: 'Nueva hipótesis' });
    expect(useStore.getState().prototypes[0].hypothesis).toBe('Nueva hipótesis');
    expect(useStore.getState().prototypes[0].name).toBe('Plan de abonos');
  });

  it('corregir un bloque del estudio actualiza el documento que pasa a la ideación', () => {
    const section = { number: 1, title: 'Caracterización', phase: 'Fase 1', kind: 'ai' as const, markdown: 'Original ' + 'x'.repeat(200), status: 'ok' as const };
    useStore.setState({ contenedor2Sections: [section], containerProcedencia: null });
    useStore.getState().replaceContenedor2Section(0, { ...section, markdown: 'Corregido por el grupo ' + 'y'.repeat(200) });
    expect(useStore.getState().containerData).toContain('Corregido por el grupo');
    expect(useStore.getState().containerData).not.toContain('Original');
  });
});
