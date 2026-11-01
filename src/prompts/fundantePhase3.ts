import type { Prompt0Data } from '@/store/useStore';
import { cipDisplayName } from '@/lib/cipIdentity';
import { DRIVE_REFERENCE_INSTRUCCION_FUNDANTE } from '@/constants/cipDocumentReferences';

export type FundanteWorkflowExtras = {
  themeProposalMarkdown: string;
  selectedCipThemeIndex: number;
  innovationTreeMarkdown: string;
};

function formatFicha(p: Prompt0Data): string {
  return `
- Nombre tentativo del CIP: ${cipDisplayName(p) || 'pendiente de confirmación'}
- Zona UNAD: ${p.zonaUNAD || '—'}
- Municipio / Departamento / País: ${p.municipality || '—'}, ${p.department || '—'}, ${p.country || '—'}
`.trim();
}

/** Bloque normativo reutilizado en cada llamada por apartado (Fase 3). */
export function buildFundanteNormativaBlock(): string {
  return `
Eres redactor oficial de documentos de política institucional UNAD. Tu salida será convertida a Word/PDF tal cual.

══════════════════════════════════════════════════
NORMATIVA DE REDACCIÓN (OBLIGATORIA)
══════════════════════════════════════════════════

1) Aplica con **prioridad absoluta** el texto del bloque **INSTRUCCIÓN INSTITUCIONAL DEL DOCUMENTO FUNDANTE** que sigue a esta normativa (archivo **${DRIVE_REFERENCE_INSTRUCCION_FUNDANTE}** en Google Drive): criterios, apartados, subapartados (p. ej. 2.1–2.4), APA, árbol de innovación y alertas. Las "FUENTES ADICIONALES" pueden contener fragmentos de la misma instrucción o de Drive: prioriza el bloque dedicado si hay diferencias de redacción.
2) **No inventes** datos, cifras, normas, autores ni proyectos que no estén en las fuentes. Si falta información, usa exactamente:
   **ALERTA DE VERIFICACIÓN HUMANA: información pendiente de validación o ajuste manual.**
3) Bases del documento (en coherencia con la instrucción): Contenedor 1 / marco institucional en fuentes Drive; **Contenedor 2 validado** abajo; **tema CIP e insumo de árbol de innovación** (flujo intermedio) cuando estén en el bloque correspondiente; listado SIGIIP u otras fuentes si están en el texto; **otros documentos** de la carpeta institucional en Drive.
4) Metalenguaje UNAD donde aplique (metasistema, intersistémico, MHUS 5.0, transformación territorial, competitividad asociativa y solidaria, etc.) sin contradecir las fuentes.
5) **CITACIÓN EN NORMAS APA (séptima edición) — REGLA CRÍTICA.** Los insumos de este proceso (**Contenedor 1**, **Contenedor 2**, la propuesta de temas y el árbol de innovación) son **documentos internos de trabajo, NO fuentes citables**:
   - **PROHIBIDO** escribir citas del tipo "(Contenedor 2)", "según el Contenedor 1", "fuente: Contenedor 2", "el contenedor territorial indica…" o listarlos en las referencias. Son insumos que **recopilan** información de otros documentos; la fuente es siempre el documento original.
   - Cuando uses un dato tomado de un contenedor o de la carpeta institucional, **rastrea y cita el documento original** del que proviene, con cita en el texto **(Autor o entidad responsable, año)** y su entrada completa en el apartado 12 (autor o entidad, año, título en cursiva, editorial o entidad editora y enlace si consta).
   - Ejemplos de citación correcta: **(Departamento Administrativo Nacional de Estadística, 2024)**, **(Alcaldía de Medellín, 2024)**, **(Universidad Nacional Abierta y a Distancia, 2023)**. La primera vez escribe el nombre de la entidad completo, sin siglas.
   - Si el dato aparece en un insumo pero **no se puede identificar el documento original** (no consta autor, entidad o año), **no inventes la referencia**: escribe el dato y añade **ALERTA DE VERIFICACIÓN HUMANA: fuente original pendiente de identificar para la cita APA.**
`.trim();
}

/**
 * Ficha, avisos de truncado, Contenedor 2, fuentes adicionales e insumos del flujo intermedio.
 * Reutilizado en generación monolítica (legacy) y por apartados.
 */
export function buildFundanteInputsBlock(
  containerTrimmed: string,
  docBudgetNotice: string,
  prompt0: Prompt0Data,
  supplementaryTerritorialRaw?: string,
  workflowExtras?: FundanteWorkflowExtras | null,
  sigiipBlock?: string,
): string {
  const ficha = formatFicha(prompt0);

  const supplementaryBlock = supplementaryTerritorialRaw?.trim()
    ? `
FUENTES ADICIONALES (texto bruto de Google Drive — cifras, actores, citas, normativa, instrucciones; no omitas si contienen la instrucción oficial del documento fundante):

${supplementaryTerritorialRaw.trim()}
`
    : '';

  const workflowBlock =
    workflowExtras &&
    workflowExtras.themeProposalMarkdown.trim() &&
    workflowExtras.innovationTreeMarkdown.trim() &&
    workflowExtras.selectedCipThemeIndex >= 0 &&
    workflowExtras.selectedCipThemeIndex <= 2
      ? `
══════════════════════════════════════════════════
INSUMOS DEL FLUJO INTERMEDIO (obligatorio: alinear el documento con la decisión del equipo y el árbol de innovación)
══════════════════════════════════════════════════

**Tema CIP elegido (validación humana):** Opción **${workflowExtras.selectedCipThemeIndex + 1}** de 3.

**Propuesta de vocación y temas** (la opción elegida debe ser el eje del CIP en introducción, plataforma estratégica y portafolio):
${workflowExtras.themeProposalMarkdown.length > 60_000 ? `${workflowExtras.themeProposalMarkdown.slice(0, 60_000)}\n\n[… propuesta truncada …]` : workflowExtras.themeProposalMarkdown}

**Árbol de innovación** (top 10 mundial → 5 Colombia → 3 territorio — el apartado "Árbol de innovación" debe ser **coherente** con este insumo y con el tema elegido):
${workflowExtras.innovationTreeMarkdown.length > 60_000 ? `${workflowExtras.innovationTreeMarkdown.slice(0, 60_000)}\n\n[… árbol truncado …]` : workflowExtras.innovationTreeMarkdown}
`
      : '';

  return `
FICHA PROMPT 0 (portada y coherencia; no inventes personas ni cargos):

${ficha}

${docBudgetNotice}

CONTENEDOR 2 VALIDADO (síntesis territorial y argumental — núcleo del CIP concreto):

${containerTrimmed}
${supplementaryBlock}
${workflowBlock}
${sigiipBlock?.trim() ? `\n${sigiipBlock.trim()}\n` : ''}`.trim();
}

