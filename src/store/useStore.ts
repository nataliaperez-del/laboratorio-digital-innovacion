import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_ANTHROPIC_MODEL, resolveAnthropicModel } from '@/constants/aiProviders';
import { DEFAULT_OPENAI_MODEL } from '@/constants/openaiModels';
import type { DriveLoadDiagnostics, DriveTerritorySources } from '@/services/institutionalDrive';
import { assembleContenedor2Document, type Contenedor2SectionResult } from '@/prompts/contenedor2Sections';
import { assembleParts, type GenerationPartResult, type InputSource } from '@/prompts/themeAndInnovationPrompts';
import type { TreeGraph } from '@/lib/innovationTreeGraph';
import type { PrototypeBrief, PrototypePlan } from '@/services/prototyping';
import type { Procedencia } from '@/repositorio/procedencia';

/** Proveedores de IA del panel «IA»: la UNAD (por defecto) o uno comercial/local con clave propia. */
export type AIProvider = 'unadGemini' | 'gemini' | 'openai' | 'anthropic' | 'ollama';

/**
 * Qué escribió el equipo de zona en la casilla del nombre. Un proyecto suele nombrarse antes
 * de tener diagnóstico, y muchas zonas escriben ahí el tema que prevén trabajar en lugar
 * de un nombre: declararlo cambia cómo se usa ese texto (rótulo o hipótesis de enfoque).
 */
export type CipNameKind = 'nombre' | 'tema';

/** Ficha Base: proyecto o idea, zona UNAD y territorio. */
export interface Prompt0Data {
  labName: string;
  /** Fichas guardadas antes de existir este campo se leen como `nombre`. */
  labNameKind: CipNameKind;
  zonaUNAD: string;
  municipality: string;
  department: string;
  country: string;
  isCapital?: boolean;
  capitalSede?: string;
  specificLocation?: string;
}

/** Texto institucional leído de Drive, guardado solo en memoria. */
export interface InstitutionalDriveBundle {
  text: string;
  fileNames: string[];
  truncated: boolean;
  /** Caracteres del texto completo extraído de Drive antes del límite al modelo. */
  sourceCharCount?: number;
  /** Fuentes por subcarpeta de territorio (C_TERRITORIO_ESPECIFICO), separadas del texto general. */
  territories?: DriveTerritorySources[];
  /** Qué carpetas se recorrieron, qué archivos se leyeron y qué quedó fuera (verificación en Fase 2). */
  diagnostics?: DriveLoadDiagnostics;
}

/** Modo del selector «Fuentes primarias del territorio» (Cambio B). */
export interface SavedStudy {
  id: string;
  createdAt: string;
  territoryName: string;
  department: string;
  zonaUNAD: string;
  prompt0Data: Prompt0Data;
  containerData: string;
  sections: Contenedor2SectionResult[];
}

/** Una ideación guardada en el Banco Unificado. */
export interface SavedIdeation {
  id: string;
  createdAt: string;
  topicName: string;
  sourceLabel: string;
  markdown: string;
  sections: GenerationPartResult[];
  selectedThemeIndex: number | null;
}

/** Un Árbol de Innovación guardado en el Banco Unificado. */
export interface SavedTree {
  id: string;
  createdAt: string;
  theme: string;
  explanation: string;
  markdown: string;
  graph: TreeGraph;
}

/** De dónde salen las fuentes del Estudio: solo internet o también documentos propios. */
export type FuentesMode = 'sin_fuentes' | 'con_fuentes';

/** Un documento legible descubierto en la carpeta de fuentes propias del territorio. */
export interface FuenteDocumentoMeta {
  id: string;
  nombre: string;
  mimeType: string;
  /** Fecha ISO de última modificación en Drive (si Drive la informa). */
  modificado?: string;
}

/**
 * Carpeta de Google Drive con fuentes propias del territorio, ya verificada, y su
 * inventario. Vive solo en memoria (no se persiste) y alimenta la procedencia (Cambio C).
 */
export interface FuentesConexion {
  folderId: string;
  folderUrl: string;
  /** Marca ISO del momento en que se verificó y leyó la carpeta. */
  verificadoEn: string;
  documentos: FuenteDocumentoMeta[];
}

/** Estado global de la aplicación (zustand). Lo que se guarda en el navegador lo decide `partialize`; las claves de IA viven solo en la pestaña. */
export interface AppState {
  institutionalDriveBundle: InstitutionalDriveBundle | null;
  setInstitutionalDriveBundle: (bundle: InstitutionalDriveBundle | null) => void;
  /** Selector de fuentes primarias del territorio. No se persiste: arranca en 'sin_fuentes'. */
  fuentesMode: FuentesMode;
  setFuentesMode: (mode: FuentesMode) => void;
  /** Carpeta o archivos de fuentes propias ya verificados. No se persiste. */
  fuentesConexion: FuentesConexion | null;
  setFuentesConexion: (conexion: FuentesConexion | null) => void;

  // ── Estudio Territorial ──
  prompt0Data: Prompt0Data;
  setPrompt0Data: (data: Partial<Prompt0Data>) => void;
  containerData: string;
  setContainerData: (data: string) => void;
  contenedor2Sections: Contenedor2SectionResult[];
  setContenedor2Sections: (sections: Contenedor2SectionResult[]) => void;
  /** Reemplaza un bloque y vuelve a ensamblar el estudio completo. */
  replaceContenedor2Section: (index: number, section: Contenedor2SectionResult) => void;
  /** Procedencia con la que se generó el estudio vigente: viaja junto a él. */
  containerProcedencia: Procedencia | null;
  setContainerProcedencia: (procedencia: Procedencia | null) => void;

  // ── Ideación ──
  ideationSource: InputSource | null;
  themeProposalMarkdown: string;
  vocationSections: GenerationPartResult[];
  setIdeationResult: (source: InputSource, markdown: string, sections: GenerationPartResult[]) => void;
  replaceVocationSection: (index: number, section: GenerationPartResult) => void;
  /** Opción elegida (0, 1 o 2); null = aún no decidida. */
  selectedLabThemeIndex: number | null;
  setSelectedLabThemeIndex: (n: number | null) => void;

  // ── Árbol de Innovación ──
  /** Tema que una herramienta le pasa al árbol; el árbol también acepta uno escrito a mano. */
  treeSeed: { theme: string; explanation: string } | null;
  setTreeSeed: (seed: { theme: string; explanation: string } | null) => void;
  treeRequest: { themeName: string; themeExplanation: string; useTerritorialStudy: boolean } | null;
  innovationTreeMarkdown: string;
  innovationTreeSections: GenerationPartResult[];
  treeGraph: TreeGraph | null;
  setTreeResult: (
    request: { themeName: string; themeExplanation: string; useTerritorialStudy: boolean },
    markdown: string,
    sections: GenerationPartResult[],
    graph: TreeGraph,
  ) => void;

  // ── Prototipado ──
  /** Insumo que otra herramienta le pasa al prototipado, a la espera de que el usuario lo confirme. */
  prototypeSeed: Pick<PrototypeBrief, 'origin' | 'topic' | 'context'> | null;
  setPrototypeSeed: (seed: Pick<PrototypeBrief, 'origin' | 'topic' | 'context'> | null) => void;
  prototypes: PrototypePlan[];
  addPrototype: (plan: PrototypePlan) => void;
  removePrototype: (id: string) => void;
  /** Plan que se está viendo en Prototipado; null = el módulo está limpio. Los planes viven en el Banco. */
  activePrototypeId: string | null;
  setActivePrototypeId: (id: string | null) => void;

  // ── Banco Unificado de Innovación (Transversal) ──
  savedStudies: SavedStudy[];
  addSavedStudy: (study: SavedStudy) => void;
  removeSavedStudy: (id: string) => void;
  savedIdeations: SavedIdeation[];
  addSavedIdeation: (ideation: SavedIdeation) => void;
  removeSavedIdeation: (id: string) => void;
  savedTrees: SavedTree[];
  addSavedTree: (tree: SavedTree) => void;
  removeSavedTree: (id: string) => void;
  /** Entrada del Banco que corresponde al ejercicio abierto en cada módulo (se actualiza, no se duplica). */
  bankIds: { estudio: string | null; ideacion: string | null; arbol: string | null };

  // ── Limpiar: el trabajo ya está en el Banco; el módulo queda listo para empezar de nuevo ──
  clearEstudio: () => void;
  clearIdeacion: () => void;
  clearArbol: () => void;
  clearPrototipado: () => void;

  // ── Gamificación e Insignias de Innovación ──
  zoeInteractions: number;
  recordZoeInteraction: () => void;
  acknowledgedBadges: string[];
  acknowledgeBadge: (badgeId: string) => void;

  // ── Proveedor de IA (igual que Fase 1) ──
  /** Cada visita empieza con la IA institucional UNAD; otro proveedor dura solo lo que la pestaña. */
  aiProvider: AIProvider;
  setAiProvider: (provider: AIProvider) => void;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  openaiModel: string;
  setOpenaiModel: (model: string) => void;
  anthropicModel: string;
  setAnthropicModel: (model: string) => void;
  /** Modelo activo por proveedor. */
  providerModels: Record<string, string>;
  setProviderModel: (provider: string, model: string) => void;
  /** Bearer del proxy UNAD escrito en el panel; normalmente lo pone el servidor. */
  unadGeminiBearer: string;
  setUnadGeminiBearer: (token: string) => void;
}

const INITIAL_PROMPT0: Prompt0Data = {
  labName: '',
  labNameKind: 'nombre',
  zonaUNAD: '',
  municipality: '',
  department: '',
  country: 'Colombia',
  isCapital: false,
  capitalSede: '',
  specificLocation: '',
};

/** Almacén global persistido en localStorage («lab-app-state», versión 4 con migraciones). */
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      institutionalDriveBundle: null,
      setInstitutionalDriveBundle: (bundle) => set({ institutionalDriveBundle: bundle }),
      fuentesMode: 'sin_fuentes',
      setFuentesMode: (mode) => set({ fuentesMode: mode }),
      fuentesConexion: null,
      setFuentesConexion: (conexion) => set({ fuentesConexion: conexion }),
      prompt0Data: { ...INITIAL_PROMPT0 },
      setPrompt0Data: (data) => set((state) => ({ prompt0Data: { ...state.prompt0Data, ...data } })),
      containerData: '',
      setContainerData: (data) =>
        set((state) => ({
          containerData: data,
          contenedor2Sections: data.trim() ? state.contenedor2Sections : [],
          containerProcedencia: data.trim() ? state.containerProcedencia : null,
        })),
      contenedor2Sections: [],
      setContenedor2Sections: (sections) => set({ contenedor2Sections: sections }),
      replaceContenedor2Section: (index, section) =>
        set((state) => {
          const sections = state.contenedor2Sections.map((s, i) => (i === index ? section : s));
          return {
            contenedor2Sections: sections,
            containerData: assembleContenedor2Document(sections, state.containerProcedencia),
          };
        }),
      containerProcedencia: null,
      setContainerProcedencia: (procedencia) => set({ containerProcedencia: procedencia }),
      ideationSource: null,
      themeProposalMarkdown: '',
      vocationSections: [],
      setIdeationResult: (source, markdown, sections) =>
        set({ ideationSource: source, themeProposalMarkdown: markdown, vocationSections: sections, selectedLabThemeIndex: null }),
      replaceVocationSection: (index, section) =>
        set((state) => {
          const sections = state.vocationSections.map((s, i) => (i === index ? section : s));
          return { vocationSections: sections, themeProposalMarkdown: assembleParts(sections), selectedLabThemeIndex: null };
        }),
      selectedLabThemeIndex: null,
      setSelectedLabThemeIndex: (n) => set({ selectedLabThemeIndex: n }),
      treeSeed: null,
      setTreeSeed: (seed) => set({ treeSeed: seed }),
      treeRequest: null,
      innovationTreeMarkdown: '',
      innovationTreeSections: [],
      treeGraph: null,
      setTreeResult: (request, markdown, sections, graph) =>
        set({ treeRequest: request, innovationTreeMarkdown: markdown, innovationTreeSections: sections, treeGraph: graph }),
      prototypeSeed: null,
      setPrototypeSeed: (seed) => set({ prototypeSeed: seed }),
      prototypes: [],
      addPrototype: (plan) => set((state) => ({ prototypes: [plan, ...state.prototypes], activePrototypeId: plan.id })),
      removePrototype: (id) =>
        set((state) => ({
          prototypes: state.prototypes.filter((p) => p.id !== id),
          activePrototypeId: state.activePrototypeId === id ? null : state.activePrototypeId,
        })),
      activePrototypeId: null,
      setActivePrototypeId: (id) => set({ activePrototypeId: id }),
      savedStudies: [],
      addSavedStudy: (study) => set((state) => ({ savedStudies: [study, ...state.savedStudies.filter((s) => s.id !== study.id)] })),
      removeSavedStudy: (id) => set((state) => ({ savedStudies: state.savedStudies.filter((s) => s.id !== id) })),
      savedIdeations: [],
      addSavedIdeation: (ideation) => set((state) => ({ savedIdeations: [ideation, ...state.savedIdeations.filter((i) => i.id !== ideation.id)] })),
      removeSavedIdeation: (id) => set((state) => ({ savedIdeations: state.savedIdeations.filter((i) => i.id !== id) })),
      savedTrees: [],
      addSavedTree: (tree) => set((state) => ({ savedTrees: [tree, ...state.savedTrees.filter((t) => t.id !== tree.id)] })),
      removeSavedTree: (id) => set((state) => ({ savedTrees: state.savedTrees.filter((t) => t.id !== id) })),
      bankIds: { estudio: null, ideacion: null, arbol: null },
      clearEstudio: () =>
        set((state) => ({
          prompt0Data: { ...INITIAL_PROMPT0 },
          containerData: '',
          contenedor2Sections: [],
          containerProcedencia: null,
          bankIds: { ...state.bankIds, estudio: null },
        })),
      clearIdeacion: () =>
        set((state) => ({
          ideationSource: null,
          themeProposalMarkdown: '',
          vocationSections: [],
          selectedLabThemeIndex: null,
          bankIds: { ...state.bankIds, ideacion: null },
        })),
      clearArbol: () =>
        set((state) => ({
          treeSeed: null,
          treeRequest: null,
          innovationTreeMarkdown: '',
          innovationTreeSections: [],
          treeGraph: null,
          bankIds: { ...state.bankIds, arbol: null },
        })),
      clearPrototipado: () => set({ prototypeSeed: null, activePrototypeId: null }),
      zoeInteractions: 0,
      recordZoeInteraction: () => set((state) => ({ zoeInteractions: (state.zoeInteractions || 0) + 1 })),
      acknowledgedBadges: [],
      acknowledgeBadge: (badgeId) =>
        set((state) => ({
          acknowledgedBadges: (state.acknowledgedBadges || []).includes(badgeId) ? state.acknowledgedBadges : [...(state.acknowledgedBadges || []), badgeId],
        })),
      aiProvider: 'unadGemini',
      setAiProvider: (provider) => set({ aiProvider: provider }),
      apiKeys: {
        unadGemini: '',
        gemini: '',
        openai: '',
        anthropic: '',
        ollama: '',
      },
      setApiKey: (provider, key) => set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
      ollamaUrl: 'http://localhost:11434',
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      ollamaModel: 'llama3',
      setOllamaModel: (model) => set({ ollamaModel: model }),
      openaiModel: DEFAULT_OPENAI_MODEL,
      setOpenaiModel: (model) => set({ openaiModel: model }),
      anthropicModel: DEFAULT_ANTHROPIC_MODEL,
      setAnthropicModel: (model) => set({ anthropicModel: model }),
      providerModels: {
        unadGemini: 'gemini-3.5-flash',
        anthropic: DEFAULT_ANTHROPIC_MODEL,
        gemini: 'gemini-2.5-flash',
        openai: 'gpt-4o',
        ollama: 'llama3',
      },
      setProviderModel: (provider, model) => set((state) => ({ providerModels: { ...state.providerModels, [provider]: model } })),
      unadGeminiBearer: '',
      setUnadGeminiBearer: (token) => set({ unadGeminiBearer: token }),
    }),
    {
      name: 'lab-app-state',
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as {
          aiProvider?: string;
          anthropicModel?: string;
          providerModels?: Record<string, string>;
        };
        let next = { ...state, providerModels: { ...(state.providerModels ?? {}) } };
        if (version < 1) {
          next.anthropicModel = resolveAnthropicModel(next.anthropicModel);
          next.providerModels.anthropic = resolveAnthropicModel(next.providerModels.anthropic);
        }
        if (version < 2) {
          delete next.providerModels.groq;
          delete next.providerModels.perplexity;
          if (next.aiProvider === 'groq' || next.aiProvider === 'perplexity') {
            next.aiProvider = 'unadGemini';
          }
        }
        // v3: el Laboratorio deja atrás el flujo de fases; lo que quedó de ese flujo no se conserva.
        if (version < 3) {
          // La pasarela IA 360 retiró los modelos 2.5.
          if (/^gemini-(1|2)/.test(next.providerModels.unadGemini ?? '')) next.providerModels.unadGemini = 'gemini-3.5-flash';
          for (const k of [
            'session',
            'lastActivityAt',
            'theme',
            'currentPhase',
            'containerBuildCount',
            'documentData',
            'fundanteSections',
            'sigiipSnapshot',
            'selectedStrategicTheme',
            'selectedTreeFruits',
          ]) {
            delete (next as Record<string, unknown>)[k];
          }
        }
        // v4: el proveedor ya no se recuerda entre visitas. Quien eligió otro una vez se quedaba
        // con él para siempre (y sin su clave, que no se guarda), en vez de la IA de la UNAD.
        if (version < 4) delete next.aiProvider;
        return next;
      },
      storage: createJSONStorage(() => localStorage),
      /**
       * No se persisten credenciales (claves API, bearer) ni el bundle de Drive:
       * las primeras por seguridad; el segundo porque puede superar la cuota de
       * localStorage (hasta ~900k caracteres) y se recarga fácil.
       */
      partialize: (state) => ({
        prompt0Data: state.prompt0Data,
        containerData: state.containerData,
        contenedor2Sections: state.contenedor2Sections,
        containerProcedencia: state.containerProcedencia,
        ideationSource: state.ideationSource,
        themeProposalMarkdown: state.themeProposalMarkdown,
        vocationSections: state.vocationSections,
        selectedLabThemeIndex: state.selectedLabThemeIndex,
        treeRequest: state.treeRequest,
        innovationTreeMarkdown: state.innovationTreeMarkdown,
        innovationTreeSections: state.innovationTreeSections,
        treeGraph: state.treeGraph,
        prototypes: state.prototypes,
        activePrototypeId: state.activePrototypeId,
        bankIds: state.bankIds,
        savedStudies: state.savedStudies,
        savedIdeations: state.savedIdeations,
        savedTrees: state.savedTrees,
        zoeInteractions: state.zoeInteractions,
        acknowledgedBadges: state.acknowledgedBadges,
        ollamaUrl: state.ollamaUrl,
        ollamaModel: state.ollamaModel,
        openaiModel: state.openaiModel,
        anthropicModel: state.anthropicModel,
        providerModels: state.providerModels,
      }),
    },
  ),
);

/**
 * Las credenciales no se guardan en localStorage (permanente) por seguridad, pero sí en
 * sessionStorage: sobreviven a recargas de la página dentro de la misma pestaña y se
 * borran al cerrarla. Sin esto, cada recarga dejaba las claves vacías y la siguiente
 * generación fallaba con 401 «faltan credenciales». El proveedor elegido va con ellas:
 * un proveedor comercial no sirve sin su clave, así que al cerrar la pestaña se vuelve a la UNAD.
 */
const SESSION_CREDENTIALS_KEY = 'lab-session-credentials';
const PROVIDERS: readonly AIProvider[] = ['unadGemini', 'gemini', 'openai', 'anthropic', 'ollama'];

try {
  const saved = sessionStorage.getItem(SESSION_CREDENTIALS_KEY);
  if (saved) {
    const parsed = JSON.parse(saved) as { apiKeys?: Record<string, string>; unadGeminiBearer?: string; aiProvider?: AIProvider };
    useStore.setState((state) => ({
      apiKeys: { ...state.apiKeys, ...(parsed.apiKeys ?? {}) },
      unadGeminiBearer: parsed.unadGeminiBearer || state.unadGeminiBearer,
      aiProvider: parsed.aiProvider && PROVIDERS.includes(parsed.aiProvider) ? parsed.aiProvider : state.aiProvider,
    }));
  }
} catch {
  // sessionStorage no disponible o JSON corrupto: se sigue sin credenciales guardadas.
}

useStore.subscribe((state) => {
  try {
    sessionStorage.setItem(
      SESSION_CREDENTIALS_KEY,
      JSON.stringify({ apiKeys: state.apiKeys, unadGeminiBearer: state.unadGeminiBearer, aiProvider: state.aiProvider }),
    );
  } catch {
    // Cuota llena o storage bloqueado: no es crítico.
  }
});

/** Con el Laboratorio abierto en varias pestañas, cada una toma lo que guardan las demás. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'lab-app-state') void useStore.persist.rehydrate();
  });
}
