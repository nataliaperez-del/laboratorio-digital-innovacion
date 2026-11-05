/**
 * Cómo se llama cada módulo en pantalla: un título grande con la acción que la persona hace
 * (identificar, crear, validar, desarrollar) y, debajo, el subtítulo con el método o el producto
 * que entrega (Estudio Territorial, Ideación, Árbol de Innovación, Prototipado).
 *
 * Es la única fuente de los nombres: la cabecera, el Inicio, el encabezado de cada módulo, la
 * presentación de ZOE y lo que ZOE dice al llevar a una pantalla salen de aquí. Para renombrar un
 * módulo basta con cambiarlo en este archivo (y en el documento maestro de ZOE, que lo explica).
 * El identificador (`estudio`, `ideacion`…) no cambia: lo usan las rutas y lo guardado.
 */
import type { ToolId } from '@/components/layout/Header';

/** Nombre visible de un módulo. */
export interface ModuleLabel {
  /** Título grande del módulo. */
  title: string;
  /** Subtítulo: el método o el producto del módulo; también da nombre a sus resultados. */
  subtitle?: string;
  /** Versión corta para la barra de navegación, si el título es largo. */
  short?: string;
}

export const MODULE_LABELS: Record<ToolId, ModuleLabel> = {
  portal: { title: 'Inicio' },
  radar: { title: 'Radar del Observatorio' },
  estudio: { title: 'Identificar Oportunidades', subtitle: 'Estudio Territorial' },
  ideacion: { title: 'Crear Conceptos', subtitle: 'Ideación' },
  arbol: { title: 'Validar Conceptos', subtitle: 'Árbol de Innovación' },
  prototipado: { title: 'Desarrollar Soluciones', subtitle: 'Prototipado' },
  banco: { title: 'Contenedor de resultados de innovación en línea', short: 'Contenedor de resultados' },
};

/** «Identificar Oportunidades · Estudio Territorial»: para descripciones y avisos que necesitan ambos. */
export function moduleFullName(tool: ToolId): string {
  const { title, subtitle } = MODULE_LABELS[tool];
  return subtitle ? `${title} · ${subtitle}` : title;
}
