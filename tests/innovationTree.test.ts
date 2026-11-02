import { describe, expect, it } from 'vitest';
import { buildTreeFromMarkdown, parseTreeGraph, routeOf } from '@/lib/innovationTreeGraph';
import { renderTreeSvg, treeFigure } from '@/lib/innovationTreeSvg';

const RAW = {
  nodos: [
    { codigo: 'TR-01', nivel: 'tronco', nombre: 'Café circular', evidencia: 'N2' },
    { codigo: 'TG-01', nivel: 'global', nombre: 'Bioeconomía', evidencia: 'N2', deriva_de: ['TR-01'] },
    { codigo: 'TG-02', nivel: 'global', nombre: 'Trazabilidad', evidencia: 'N3', deriva_de: ['TR-01'] },
    { codigo: 'TN-01', nivel: 'nacional', nombre: 'Política bioeconomía', evidencia: 'N1', deriva_de: ['TG-01'] },
    { codigo: 'TT-01', nivel: 'territorial', nombre: 'Asociaciones cafeteras', evidencia: 'N2', deriva_de: ['TN-01'] },
    { codigo: 'HO-01', nivel: 'hoja', nombre: 'Valorizar pulpa', evidencia: 'N2', deriva_de: ['TT-01'] },
    { codigo: 'FR-01', nivel: 'fruto', nombre: 'Bioinsumo <script>alert(1)</script>', evidencia: 'N3', deriva_de: ['HO-01'], tipo_fruto: 'Prototipo', solucion: 'Compost' },
    { codigo: 'RZ-01', nivel: 'raiz', nombre: 'Residuos sin uso', evidencia: 'N2', deriva_de: ['XX-99'] },
    { codigo: 'SU-01', nivel: 'suelo', nombre: 'FAO 2023', evidencia: 'N2' },
    { codigo: 'TG-01', nivel: 'global', nombre: 'Duplicado', evidencia: 'N2' },
    { nivel: 'global', nombre: 'Sin código' },
  ],
};

describe('parseTreeGraph', () => {
  const graph = parseTreeGraph('Café circular', RAW);

  it('descarta duplicados y nodos sin código', () => {
    expect(graph.nodos.filter((n) => n.nivel === 'global').map((n) => n.codigo)).toEqual(['TG-01', 'TG-02']);
  });

  it('repara derivaciones rotas y calcula las inversas', () => {
    expect(graph.nodos.find((n) => n.codigo === 'RZ-01')?.deriva_de).toEqual(['TR-01']);
    expect(graph.nodos.find((n) => n.codigo === 'SU-01')?.deriva_de).toEqual(['TR-01']);
    expect(graph.nodos.find((n) => n.codigo === 'TG-01')?.derivan).toEqual(['TN-01']);
  });

  it('normaliza el tipo de fruto', () => {
    expect(graph.nodos.find((n) => n.codigo === 'FR-01')?.tipo_fruto).toBe('prototipo');
  });

  it('calcula la ruta completa de un nodo', () => {
    const route = routeOf(graph, 'TN-01');
    expect([...route]).toEqual(expect.arrayContaining(['TR-01', 'TG-01', 'TN-01', 'TT-01', 'HO-01', 'FR-01']));
    expect(route.has('TG-02')).toBe(false);
  });

  it('rechaza una respuesta que no alcanza a ser árbol', () => {
    expect(() => parseTreeGraph('x', { nodos: [{ codigo: 'TR-01', nivel: 'tronco', nombre: 'x' }] })).toThrow();
    expect(() => parseTreeGraph('x', {})).toThrow();
  });
});

describe('renderTreeSvg', () => {
  const graph = parseTreeGraph('Café circular', RAW);
  const svg = renderTreeSvg(graph, { titles: true });

  it('escapa los datos del modelo', () => {
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('expone los ganchos de la interacción', () => {
    expect(svg).toContain('data-codigo="FR-01"');
    expect(svg).toContain('data-tipo="prototipo"');
    expect(svg).toContain('data-hijo="TN-01" data-padre="TG-01"');
  });

  it('declara tamaño: la exportación a PNG lo necesita', () => {
    const figure = treeFigure(graph);
    expect(figure.svg).toMatch(/^<svg[^>]+width="1200"[^>]+height="1120"/);
  });
});

describe('buildTreeFromMarkdown', () => {
  const md = `
Tabla 1: 10 tendencias globales.

| Número | Tendencia global | Descripción |
|---|---|---|
| 1 | Economía circular del café | Aprovechar subproductos |
| 2 | Agricultura digital | Sensores |

| Número | Tendencia seleccionada | Razón de pertinencia para Colombia |
|---|---|---|
| 1 | Economía circular del café | País cafetero |

| Número | Tendencia territorial | Justificación territorial | Problema que atiende |
|---|---|---|---|
| 1 | Economía circular del café | Zona cafetera | Residuos |

| Tendencia territorial | Oportunidad de innovación | Posible solución | Tipo de resultado | Impacto esperado |
|---|---|---|---|---|
| Economía circular del café | Valorizar pulpa | Planta de bioinsumos | Servicio | Menos residuos |

## Árbol de innovación estructurado

SUELO:
- FAO (2023)

RAÍZ:
- Residuos sin aprovechar
- Bajos ingresos

TRONCO: Café
`;

  it('arma el árbol solo con lo que dice el documento', () => {
    const graph = buildTreeFromMarkdown('Café', md);
    const names = (level: string) => graph.nodos.filter((n) => n.nivel === level).map((n) => n.nombre);
    expect(graph.origen).toBe('documento');
    expect(names('global')).toHaveLength(2);
    expect(names('raiz')).toEqual(['Residuos sin aprovechar', 'Bajos ingresos']);
    expect(names('suelo')).toEqual(['FAO (2023)']);
    const fruit = graph.nodos.find((n) => n.nivel === 'fruto');
    expect(fruit?.nombre).toBe('Planta de bioinsumos');
    expect(fruit?.tipo_fruto).toBe('servicio');
    // Las relaciones salen del parecido de nombres entre tablas.
    expect(graph.nodos.find((n) => n.nivel === 'nacional')?.deriva_de).toEqual(['TG-01']);
  });

  it('falla si no hay tabla de tendencias, en lugar de inventar', () => {
    expect(() => buildTreeFromMarkdown('Café', 'Texto sin tablas')).toThrow();
  });
});
