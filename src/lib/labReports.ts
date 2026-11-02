/**
 * Definición de los informes formales de cada herramienta. La pantalla es interactiva y
 * explicativa; el documento académico sale de aquí, en Word editable o PDF.
 */
import type { PlannedFigure, DocumentMeta } from '@/lib/documentPlan';
import { buildTimelineFigure } from '@/lib/figures';
import { treeFigure } from '@/lib/innovationTreeSvg';
import type { TreeGraph } from '@/lib/innovationTreeGraph';
import { FRUIT_LABEL } from '@/lib/innovationTreeGraph';
import type { Prompt0Data } from '@/store/useStore';
import type { PrototypePlan } from '@/services/prototyping';

export interface LabReport {
  fileName: string;
  markdown: string;
  figures: PlannedFigure[];
  meta: DocumentMeta;
}

const DISCLAIMER =
  'Documento generado con mediación de inteligencia artificial. Las cifras, fuentes y alertas de verificación deben validarse antes de citarse en documentos oficiales.';

function territoryMeta(ficha: Prompt0Data): Pick<DocumentMeta, 'zonaUNAD' | 'municipality' | 'department' | 'country'> {
  return {
    zonaUNAD: ficha.zonaUNAD,
    municipality: ficha.municipality,
    department: ficha.department,
    country: ficha.municipality || ficha.department ? ficha.country || 'Colombia' : '',
  };
}

export function safeFileName(prefix: string, label: string): string {
  const clean = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
  return clean ? `${prefix}_${clean}` : prefix;
}

export function estudioReport(ficha: Prompt0Data, markdown: string): LabReport {
  const place = [ficha.municipality, ficha.department].filter(Boolean).join(', ') || 'Territorio';
  return {
    fileName: safeFileName('Estudio_Territorial', ficha.municipality || ficha.department),
    markdown,
    figures: [],
    meta: {
      reportType: 'Estudio Territorial',
      title: ficha.labName?.trim() || place,
      subtitle: 'Diagnóstico según la Metodología de Diagnóstico y Vocación Territorial (MDVT)',
      disclaimer: DISCLAIMER,
      generatedAt: new Date(),
      ...territoryMeta(ficha),
    },
  };
}

export function ideacionReport(ficha: Prompt0Data, markdown: string, sourceLabel: string): LabReport {
  return {
    fileName: safeFileName('Ideacion_Vocacion_y_Temas', sourceLabel),
    markdown,
    figures: [],
    meta: {
      reportType: 'Ideación: vocación y temas estratégicos',
      title: sourceLabel,
      subtitle: 'Declaración de vocación y tres alternativas de tema',
      disclaimer: DISCLAIMER,
      generatedAt: new Date(),
      ...territoryMeta(ficha),
    },
  };
}

export function arbolReport(ficha: Prompt0Data, markdown: string, graph: TreeGraph): LabReport {
  return {
    fileName: safeFileName('Arbol_de_Innovacion', graph.tema),
    markdown,
    figures: [{ spec: treeFigure(graph), afterHeading: /[aá]rbol de innovaci[oó]n/i }],
    meta: {
      reportType: 'Árbol de Innovación',
      title: graph.tema,
      subtitle: 'Análisis de tendencias 10 globales · 5 Colombia · 3 territorio',
      disclaimer: DISCLAIMER,
      generatedAt: new Date(),
      ...territoryMeta(ficha),
    },
  };
}

const bullets = (items: readonly string[]) => items.map((i) => `- ${i}`).join('\n');

/** Plan en Markdown: es la fuente del informe, nunca lo que se muestra en pantalla. */
export function prototypeMarkdown(plan: PrototypePlan): string {
  return [
    `# ${plan.name}`,
    plan.tagline,
    '## Identificación del plan',
    '| Campo | Detalle |\n|---|---|\n' +
      [
        ['Categoría', plan.category],
        ['Madurez objetivo', plan.trlTarget],
        ['Alcance de validación', plan.scope],
        ['Duración', plan.durationWeeks ? `${plan.durationWeeks} semanas` : 'Por definir'],
        ['Escuelas UNAD', plan.unadSchools.join('; ') || 'Por definir'],
        ['Origen', plan.origin.code ? `${plan.origin.label} (${plan.origin.code})` : plan.origin.label],
      ]
        .map(([k, v]) => `| ${k} | ${v.replace(/\|/g, '/')} |`)
        .join('\n'),
    '## Problema que resuelve',
    plan.problemSolved,
    '## Población y actores beneficiarios',
    plan.targetAudience,
    '## Hipótesis a validar',
    plan.hypothesis,
    '## Descripción de la solución',
    plan.solution,
    '## Arquitectura de la solución',
    `- **Componente físico:** ${plan.architecture.fisico || 'No aplica'}\n- **Componente digital:** ${plan.architecture.digital || 'No aplica'}\n- **Componente metodológico:** ${plan.architecture.metodologico || 'No aplica'}`,
    '## Cronograma por fases',
    plan.phases.map((p) => `### ${p.fase}\n\n**${p.semanas}.** ${p.actividades}\n\n${bullets(p.entregables)}`).join('\n\n'),
    '## Entregables finales',
    bullets(plan.deliverables),
    '## Métricas de validación',
    bullets(plan.validationMetrics),
    '## Riesgos y mitigación',
    '| Riesgo | Mitigación |\n|---|---|\n' + plan.risks.map((r) => `| ${r.riesgo} | ${r.mitigacion} |`).join('\n'),
    ...(plan.supuestos.length ? ['## Supuestos por verificar', bullets(plan.supuestos)] : []),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function prototipadoReport(ficha: Prompt0Data, plan: PrototypePlan): LabReport {
  return {
    fileName: safeFileName('Plan_de_Prototipado', plan.name),
    markdown: prototypeMarkdown(plan),
    figures: [{ spec: buildTimelineFigure(`Cronograma del plan: ${plan.name}`, plan.phases), afterHeading: /cronograma/i }],
    meta: {
      reportType: 'Plan de Prototipado',
      title: plan.name,
      subtitle: `${plan.category} · ${plan.trlTarget}`,
      disclaimer: DISCLAIMER,
      generatedAt: new Date(),
      ...territoryMeta(ficha),
    },
  };
}

export { FRUIT_LABEL };
