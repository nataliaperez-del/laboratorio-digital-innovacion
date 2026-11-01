import { useStore } from '@/store/useStore';

/**
 * Campos del proyecto que determinan si hay trabajo guardado. Se declara aparte
 * del store para que los detectores sean funciones puras y las tres fases usen
 * exactamente los mismos criterios (antes cada una tenía su propia versión).
 */
export interface WorkflowSnapshot {
  labName: string;
  zonaUNAD: string;
  department: string;
  municipality: string;
  containerData: string;
  themeProposalMarkdown: string;
  innovationTreeMarkdown: string;
  documentData: string;
}

/** Lee del store los campos que interesan a los detectores de trabajo. */
export function readWorkflowSnapshot(): WorkflowSnapshot {
  const s = useStore.getState();
  return {
    labName: s.prompt0Data.labName,
    zonaUNAD: s.prompt0Data.zonaUNAD,
    department: s.prompt0Data.department,
    municipality: s.prompt0Data.municipality,
    containerData: s.containerData,
    themeProposalMarkdown: s.themeProposalMarkdown,
    innovationTreeMarkdown: s.innovationTreeMarkdown,
    documentData: s.documentData,
  };
}

const filled = (...values: string[]) => values.some((v) => Boolean(v?.trim()));

/** ¿Hay algo guardado en el proyecto? (ficha o cualquier resultado de las 3 fases) */
export function hasProjectWork(s: WorkflowSnapshot): boolean {
  return filled(
    s.labName,
    s.zonaUNAD,
    s.department,
    s.municipality,
    s.containerData,
    s.themeProposalMarkdown,
    s.innovationTreeMarkdown,
    s.documentData,
  );
}

/** Trabajo que quedaría inválido si cambia la Ficha Base (Contenedor 2 y Fase 3). */
export function hasWorkAfterFicha(s: WorkflowSnapshot): boolean {
  return filled(s.containerData, s.themeProposalMarkdown, s.innovationTreeMarkdown, s.documentData);
}

/** Trabajo que quedaría inválido si se regenera el Contenedor 2 (toda la Fase 3). */
export function hasWorkAfterContainer(s: WorkflowSnapshot): boolean {
  return filled(s.themeProposalMarkdown, s.innovationTreeMarkdown, s.documentData);
}

/** Trabajo que quedaría inválido si cambia el tema elegido (árbol y documento). */
export function hasWorkAfterTheme(s: WorkflowSnapshot): boolean {
  return filled(s.innovationTreeMarkdown, s.documentData);
}

/**
 * Fase que corresponde tras guardar la Ficha Base sin invalidar nada: con
 * Contenedor 2 en memoria se vuelve a la Fase 3 (antes se quedaba en la 2 y
 * dejaba el documento inaccesible); sin él, la Fase 2 queda desbloqueada.
 */
export function phaseAfterFichaSaved(containerData: string): number {
  return containerData.trim() ? 3 : 2;
}

/**
 * Confirmación única para acciones destructivas: une los avisos y añade siempre
 * la misma pregunta final, para que todas las fases hablen igual.
 */
export function confirmDestructive(...warnings: string[]): boolean {
  const message = [...warnings.filter(Boolean), '¿Deseas continuar?'].join('\n\n');
  return window.confirm(message);
}
