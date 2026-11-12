import { describe, expect, it, vi } from 'vitest';
import { findOutOfScopeTerms } from '@/prompts/labGuardrails';
import { parseThemeProposal } from '@/lib/themeProposal';
import { buildThemeVocationPartPrompt, reviewVocationPart } from '@/prompts/themeAndInnovationPrompts';
import { parseAlerts, parseFoda, parseInsightCards, parsePillars } from '@/lib/territorialInsights';
import { normalizeRadarSignal, radarPromptBlock, radarTrends, relatedSignals, signalsPromptBlock } from '@/services/observatorio';
import { normalizePrototypePlan, type PrototypeBrief } from '@/services/prototyping';
import { buildDocumentPlan } from '@/lib/documentPlan';
import { prototypeMarkdown } from '@/lib/labReports';
import { buildPrintHtml } from '@/lib/printExport';

describe('alcance del Laboratorio', () => {
  it('detecta menciones a la creación de un CIP', () => {
    expect(findOutOfScopeTerms('Base para el CIP de Pasto')).toContain('CIP');
    expect(findOutOfScopeTerms('según el Contenedor 2')).toContain('Contenedor 1/2');
    expect(findOutOfScopeTerms('el documento fundante')).toContain('documento fundante');
    expect(findOutOfScopeTerms('alertas de este contenedor')).toContain('Contenedor 1/2');
    expect(findOutOfScopeTerms('la creación del Centro de Innovación')).toHaveLength(1);
  });

  it('no confunde palabras comunes ni instituciones reales', () => {
    expect(findOutOfScopeTerms('participación cip cipreses')).toEqual([]);
    expect(findOutOfScopeTerms('Vocación de servicio del territorio, según DANE (2023).')).toEqual([]);
  });
});

const PROPOSAL = `## Vocación

El territorio presenta una vocación orientada a la bioeconomía.

## Opción de tema 1: Biofábricas

- **Brechas que atiende:** baja transformación
- **Oportunidades que aprovecha:** demanda de bioinsumos

Texto.

## Opción de tema 2: Agro digital

- **Brechas que atiende:** conectividad
- **Oportunidades que aprovecha:** sensores baratos

## Opción de tema 3: Energía rural

- **Brechas que atiende:** red débil
- **Oportunidades que aprovecha:** subsidios

## Verificación de alineación institucional

Alineada.`;

describe('ideación', () => {
  it('separa vocación y las tres opciones, sin arrastrar el cierre', () => {
    const parsed = parseThemeProposal(PROPOSAL);
    expect(parsed?.themes.map((t) => t.title)).toEqual(['Biofábricas', 'Agro digital', 'Energía rural']);
    expect(parsed?.themes[2].body).not.toContain('Alineada');
    expect(parsed?.vocationMarkdown).toContain('bioeconomía');
  });

  it('la autoevaluación acepta la parte 2 sola y rechaza si faltan temas', () => {
    expect(reviewVocationPart(1, PROPOSAL.slice(PROPOSAL.indexOf('## Opción')) + ' '.repeat(10)).status).toBe('ok');
    expect(reviewVocationPart(1, `## Opción de tema 1: Solo una\n\n${'texto '.repeat(40)}`).status).toBe('warning');
  });

  it('la autoevaluación marca salidas fuera de alcance', () => {
    expect(reviewVocationPart(0, `## Vocación\n\n${'vocación del CIP '.repeat(20)}`).status).toBe('warning');
  });
});

describe('lectura del Estudio Territorial', () => {
  it('lee los pilares y su evidencia', () => {
    const pillars = parsePillars(`## 3. Lectura por pilar

### 1. Gobierno e instituciones
Texto. Nivel de evidencia: alto.

### 2. Desarrollo económico
Texto. **Nivel de evidencia:** sin evidencia.

### 3. Infraestructura
Sin declarar.`);
    expect(pillars.map((p) => p.evidence)).toEqual(['alto', 'sin evidencia', null]);
    expect(pillars[0].shortTitle).toBe('Gobierno e instituciones');
  });

  it('lee la matriz FODA en tabla por columnas y por subtítulos', () => {
    const table = parseFoda(`| Fortalezas | Debilidades | Oportunidades | Amenazas |
|---|---|---|---|
| Café | Vías | Exportar | Clima |`);
    expect(table?.amenazas).toEqual(['Clima']);
    const lists = parseFoda(`### Fortalezas\n- A\n- B\n\n### Amenazas\n- C`);
    expect(lists?.fortalezas).toEqual(['A', 'B']);
    expect(parseFoda('Sin matriz')).toBeNull();
  });

  it('lee el nivel declarado y los elementos separados por <br>, como responde el modelo real', () => {
    const pillars = parsePillars('### Pilar 1: Capital humano\nTexto.\n**Nivel de evidencia declarada:** Medio');
    expect(pillars[0]).toMatchObject({ evidence: 'medio', shortTitle: 'Capital humano' });
    const variants = parsePillars(
      '### A\nTexto. Nivel de evidencia de este pilar: Alto.\n\n### B\nTexto.\n\n**Nivel de evidencia: bajo**\n\n### C\nLa zona evidencia vacíos altos.',
    );
    expect(variants.map((p) => p.evidence)).toEqual(['alto', 'bajo', null]);
    const foda = parseFoda(`| Categoría FODA | Componentes | Evidencia | Fuente |
|---|---|---|---|
| **Fortalezas (F)** | **F1.** Café<br>**F2.** Comercio | • 19 mil t<br>• 6.400 matrículas | DANE |
| **Amenazas (A)** | **A1.** Clima | Sequías | IDEAM |`);
    expect(foda?.fortalezas).toEqual(['F1. Café — 19 mil t', 'F2. Comercio — 6.400 matrículas']);
    expect(foda?.amenazas).toEqual(['A1. Clima — Sequías']);
  });

  it('convierte listas en tarjetas', () => {
    const cards = parseInsightCards('- **Brecha digital:** poca fibra\n- **Vías:** terciarias malas');
    expect(cards[0]).toEqual({ title: 'Brecha digital', body: 'poca fibra' });
  });

  it('cuenta las alertas reales y las etiqueta', () => {
    const alerts = parseAlerts(
      'a ==⚠️ ALERTA DE VERIFICACIÓN HUMANA: sin PIB (VACÍO-VERIFICAR)== b ==⚠️ ALERTA DE VERIFICACIÓN HUMANA: dato viejo (REQUIERE CONTRASTE)==',
    );
    expect(alerts).toEqual([
      { label: 'VACÍO-VERIFICAR', detail: 'sin PIB' },
      { label: 'REQUIERE CONTRASTE', detail: 'dato viejo' },
    ]);
  });
});

describe('Observatorio', () => {
  const signal = normalizeRadarSignal({
    id: 1,
    nombre: 'Analítica de aprendizaje',
    descripcion_corta: 'Uso de datos académicos',
    impacto_territorial: 0.86,
    velocidad_adopcion: 0.82,
    casos_texto: 'A|B',
    color_hex: 'javascript:alert(1)',
    area_nombre: 'Innovación educativa',
  });

  it('normaliza el registro del Radar', () => {
    expect(signal.impacto).toBe(86);
    expect(signal.casos).toEqual(['A', 'B']);
    expect(signal.color).toBe('#5EC2DD');
  });

  it('relaciona señales por palabras del tema', () => {
    expect(relatedSignals([signal], 'analítica para aprendizaje en línea')).toHaveLength(1);
    expect(relatedSignals([signal], 'bioinsumos cafeteros')).toHaveLength(0);
  });

  it('da tendencias a toda herramienta: primero las afines y luego las de mayor impacto', () => {
    const otras = [
      normalizeRadarSignal({ id: 2, nombre: 'Bioeconomía rural', descripcion_corta: 'Cadenas de valor', impacto_territorial: 0.95, area_nombre: 'Innovación territorial' }),
      normalizeRadarSignal({ id: 3, nombre: 'Gemelos digitales', descripcion_corta: 'Simulación', impacto_territorial: 0.4, area_nombre: 'Tecnologías emergentes' }),
    ];
    const trends = radarTrends([otras[1], signal, otras[0]], 'analítica de aprendizaje', 2);
    expect(trends.map((t) => [t.signal.id, t.related])).toEqual([
      [1, true],
      [2, false],
    ]);
    // Sin coincidencias no queda vacío: muestra lo que más impacta.
    expect(radarTrends([otras[1], otras[0]], 'café', 1)[0].signal.id).toBe(2);
    expect(radarTrends([], 'café')).toEqual([]);
  });

  it('escribe las señales para el prompt, una por línea', () => {
    expect(signalsPromptBlock([signal])).toMatch(/^- Analítica de aprendizaje \(Innovación educativa; /);
    expect(signalsPromptBlock([])).toBe('');
  });

  it('si el Radar no responde, la herramienta sigue sin sus señales', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('sin red')));
    await expect(radarPromptBlock('cualquier tema', { fill: true })).resolves.toBe('');
    vi.unstubAllGlobals();
  });

  it('la Ideación recibe las tendencias del Radar sin que nadie las elija', () => {
    const base = {
      source: { kind: 'texto' as const, label: 'Café', text: 'Residuos de café' },
      fodaMatrix: '',
      contenedor1: 'Marco',
      fichaBlock: '',
      focusHypothesis: '',
      institutionalVocacionPromptText: 'Plantilla',
    };
    expect(buildThemeVocationPartPrompt({ ...base, observatoryBlock: '- Bioeconomía rural' }, 0, '')).toContain('Tendencias del Radar del Observatorio InnovaHub360');
    expect(buildThemeVocationPartPrompt(base, 0, '')).not.toContain('Tendencias del Radar');
  });
});

const BRIEF: PrototypeBrief = {
  origin: { kind: 'arbol', code: 'FR-01', label: 'Árbol' },
  topic: 'Bioinsumo',
  context: '',
  category: 'Prototipo Tecnológico',
  trl: 'TRL 4',
  scope: 'Municipal',
};

describe('prototipado', () => {
  it('rechaza un plan incompleto en vez de rellenarlo', () => {
    expect(() => normalizePrototypePlan({ name: 'x' }, BRIEF)).toThrow(/hipótesis, fases/);
  });

  it('conserva el origen y genera un informe con cronograma', () => {
    const plan = normalizePrototypePlan(
      {
        name: 'Plan',
        hypothesis: 'H',
        phases: [{ fase: 'Fase 1', semanas: 'Semanas 1-2', actividades: 'A', entregables: ['E'] }],
        risks: [{ riesgo: 'R', mitigacion: 'M' }],
      },
      BRIEF,
    );
    expect(plan.origin.code).toBe('FR-01');
    const blocks = buildDocumentPlan(prototypeMarkdown(plan)).blocks;
    expect(blocks.some((b) => b.kind === 'heading' && /cronograma/i.test(b.plainText))).toBe(true);
  });
});

describe('informe formal', () => {
  it('lleva la portada de la herramienta, índice y ninguna figura ajena', () => {
    const plan = buildDocumentPlan('## Uno\n\nTexto\n\n| A |\n|---|\n| 1 |');
    expect(plan.figures).toHaveLength(0);
    expect(plan.tables).toHaveLength(1);
    const html = buildPrintHtml(plan, { reportType: 'Árbol de Innovación', title: 'Tema <x>', disclaimer: 'D', generatedAt: new Date('2026-11-01T12:00:00Z') });
    expect(html).toContain('Tabla de contenido');
    expect(html).toContain('Tema &lt;x&gt;');
    expect(findOutOfScopeTerms(html)).toEqual([]);
    expect(html).not.toMatch(/Ecosistema de Innovación|Centro de Innovación/);
  });

  it('coloca la figura tras su encabezado', () => {
    const spec = { id: 'f', title: 'F', note: 'N', svg: '<svg/>', width: 1, height: 1 };
    const plan = buildDocumentPlan('## Uno\n\n## Dos\n\nTexto', [{ spec, afterHeading: /dos/i }]);
    const index = plan.blocks.findIndex((b) => b.kind === 'figure');
    expect(plan.blocks[index - 1]).toMatchObject({ kind: 'heading', plainText: 'Dos' });
    expect(plan.figures[0].number).toBe(1);
  });
});
