/**
 * Depósito automático en el Banco Unificado de Innovación.
 *
 * Cada vez que un módulo termina o corrige un resultado (estudio, ideación, árbol), queda guardado
 * en el Banco sin que nadie tenga que pedirlo. Cada ejercicio conserva su propia entrada: si se
 * rehace un bloque, se actualiza; si el módulo se limpia o cambia de territorio, tema o insumo,
 * nace una entrada nueva. Prototipado no pasa por aquí: sus planes ya se guardan en el Banco.
 */
import { parseThemeProposal } from '@/lib/themeProposal';
import { useStore, type AppState } from './useStore';

const newId = (prefix: string) => `${prefix}-${Date.now()}`;

/** Lo que hay que depositar tras un cambio de estado; puro, para poder probarlo. */
export function depositsFor(state: AppState, prev: AppState, now = () => new Date().toISOString()) {
  const out: Array<() => void> = [];
  const ids = { ...state.bankIds };

  // Estudio Territorial
  if ((state.contenedor2Sections !== prev.contenedor2Sections || state.containerData !== prev.containerData) && state.contenedor2Sections.length && state.containerData.trim()) {
    const territory = state.prompt0Data.municipality || 'Territorio';
    // Si ya hay una entrada idéntica (por ejemplo, depositada a mano antes), se reconoce en vez de duplicarla.
    const current =
      state.savedStudies.find((s) => s.id === ids.estudio) ??
      (ids.estudio ? undefined : state.savedStudies.find((s) => s.territoryName === territory && s.containerData === state.containerData));
    const id = current && current.territoryName === territory ? current.id : newId('study');
    ids.estudio = id;
    out.push(() =>
      state.addSavedStudy({
        id,
        createdAt: current?.id === id ? current.createdAt : now(),
        territoryName: territory,
        department: state.prompt0Data.department || '',
        zonaUNAD: state.prompt0Data.zonaUNAD || '',
        prompt0Data: { ...state.prompt0Data },
        containerData: state.containerData,
        sections: [...state.contenedor2Sections],
      }),
    );
  }

  // Ideación
  const ideationChanged =
    state.themeProposalMarkdown !== prev.themeProposalMarkdown || state.vocationSections !== prev.vocationSections || state.selectedLabThemeIndex !== prev.selectedLabThemeIndex;
  if (ideationChanged && state.themeProposalMarkdown.trim()) {
    const sourceLabel = state.ideationSource?.label || 'General';
    const current =
      state.savedIdeations.find((s) => s.id === ids.ideacion) ??
      (ids.ideacion ? undefined : state.savedIdeations.find((s) => s.markdown === state.themeProposalMarkdown));
    const id = current && current.sourceLabel === sourceLabel ? current.id : newId('ideation');
    const chosen = state.selectedLabThemeIndex !== null ? parseThemeProposal(state.themeProposalMarkdown)?.themes[state.selectedLabThemeIndex]?.title : undefined;
    ids.ideacion = id;
    out.push(() =>
      state.addSavedIdeation({
        id,
        createdAt: current?.id === id ? current.createdAt : now(),
        topicName: chosen || sourceLabel || 'Ideación Estratégica',
        sourceLabel,
        markdown: state.themeProposalMarkdown,
        sections: [...state.vocationSections],
        selectedThemeIndex: state.selectedLabThemeIndex,
      }),
    );
  }

  // Árbol de Innovación
  if (state.treeGraph !== prev.treeGraph && state.treeGraph) {
    const graph = state.treeGraph;
    const current =
      state.savedTrees.find((s) => s.id === ids.arbol) ??
      (ids.arbol ? undefined : state.savedTrees.find((s) => s.theme === graph.tema && s.markdown === state.innovationTreeMarkdown));
    const id = current && current.theme === graph.tema ? current.id : newId('tree');
    ids.arbol = id;
    out.push(() =>
      state.addSavedTree({
        id,
        createdAt: current?.id === id ? current.createdAt : now(),
        theme: graph.tema,
        explanation: state.treeRequest?.themeExplanation || '',
        markdown: state.innovationTreeMarkdown,
        graph,
      }),
    );
  }

  const idsChanged = ids.estudio !== state.bankIds.estudio || ids.ideacion !== state.bankIds.ideacion || ids.arbol !== state.bankIds.arbol;
  return { writes: out, bankIds: idsChanged ? ids : null };
}

/**
 * Activa el depósito automático. Empieza cuando termina de cargarse lo guardado en el navegador,
 * para no confundir esa carga con un resultado nuevo.
 */
export function startAutoDeposit(): () => void {
  let unsubscribe = () => undefined as void;
  const apply = (state: AppState, prev: AppState) => {
    const { writes, bankIds } = depositsFor(state, prev);
    writes.forEach((write) => write());
    if (bankIds) useStore.setState({ bankIds });
  };
  const start = () => {
    // Lo que ya estaba en los módulos al abrir (por ejemplo, de antes de este cambio) también queda
    // en el Banco: así «Limpiar» nunca borra un trabajo que no se haya guardado.
    const now = useStore.getState();
    apply(now, { ...now, containerData: '', contenedor2Sections: [], themeProposalMarkdown: '', vocationSections: [], selectedLabThemeIndex: null, treeGraph: null });
    unsubscribe = useStore.subscribe(apply);
  };
  if (useStore.persist.hasHydrated()) {
    start();
    return () => unsubscribe();
  }
  const stop = useStore.persist.onFinishHydration(() => {
    stop();
    start();
  });
  return () => {
    stop();
    unsubscribe();
  };
}
