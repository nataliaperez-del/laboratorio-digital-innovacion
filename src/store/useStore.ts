import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_ANTHROPIC_MODEL, resolveAnthropicModel } from '@/constants/aiProviders';
import { DEFAULT_OPENAI_MODEL } from '@/constants/openaiModels';
import type { DriveLoadDiagnostics, DriveTerritorySources } from '@/services/institutionalDrive';
import {
  assembleFundanteDocument,
  type FundanteSectionResult,
} from '@/prompts/fundantePhase3Sections';
import {
  assembleContenedor2Document,
  type Contenedor2SectionResult,
} from '@/prompts/contenedor2Sections';
import {
  assembleInnovationTreeDocument,
  assembleVocationDocument,
  type InnovationTreePartResult,
  type VocationPartResult,
} from '@/prompts/themeAndInnovationPrompts';
import type { Procedencia } from '@/repositorio/procedencia';

export type AIProvider = 'unadGemini' | 'gemini' | 'openai' | 'anthropic' | 'ollama';

/** Sesión institucional activa (Google). El token OAuth vive solo en memoria; aquí queda la identidad. */
export interface InstitutionalSession {
  email: string;
  name: string;
  picture?: string;
  loggedInAt: number;
}

/**
 * Qué escribió el equipo de zona en la casilla del nombre. Un Centro de Innovación suele nombrarse antes
 * de tener diagnóstico, y muchas zonas escriben ahí el tema que prevén trabajar en lugar
 * de un nombre: declararlo cambia cómo se usa ese texto (rótulo o hipótesis de enfoque).
 */
export type CipNameKind = 'nombre' | 'tema';

export interface Prompt0Data {
  labName: string;
  /** Fichas guardadas antes de existir este campo se leen como `nombre`. */
  labNameKind: CipNameKind;
  zonaUNAD: string;
  municipality: string;
  department: string;
  country: string;
}

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

/** Conteos del registro SIGIIP para las figuras de datos del documento. */
export interface SigiipSnapshot {
  total: number;
  zoneTotal: number;
  selectedCount: number;
  byZone: Array<{ label: string; value: number }>;
  byType: Array<{ label: string; value: number }>;
  byEscuela: Array<{ label: string; value: number }>;
}

interface AppState {
  /** Sesión institucional (null = sin ingresar; la app queda bloqueada tras la pantalla de ingreso). */
  session: InstitutionalSession | null;
  setSession: (session: InstitutionalSession | null) => void;
  /** Marca de última actividad del usuario; el vigilante de inactividad la compara contra el límite. */
  lastActivityAt: number;
  touchActivity: () => void;
  /** Mensaje mostrado en la pantalla de ingreso (p. ej. «sesión cerrada por inactividad»). No se persiste. */
  sessionNotice: string | null;
  setSessionNotice: (msg: string | null) => void;
  /**
   * Modo demostración: cuando está activo, los servicios de IA y Google Drive
   * devuelven datos de ejemplo con progreso simulado (sin claves ni conexión real).
   * Sirve como manual visual guiado. No se persiste: siempre arranca apagado.
   */
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  /** Tema visual de la interfaz. Se persiste para respetar la preferencia del usuario. */
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  currentPhase: number;
  setPhase: (phase: number) => void;
  institutionalDriveBundle: InstitutionalDriveBundle | null;
  setInstitutionalDriveBundle: (bundle: InstitutionalDriveBundle | null) => void;
  /**
   * Selector de fuentes primarias del territorio (Cambio B). No se persiste: siempre
   * arranca en 'sin_fuentes' para que el núcleo del repositorio baste por defecto.
   */
  fuentesMode: FuentesMode;
  setFuentesMode: (mode: FuentesMode) => void;
  /** Carpeta de Drive de fuentes propias verificada (o null). No se persiste. */
  fuentesConexion: FuentesConexion | null;
  setFuentesConexion: (conexion: FuentesConexion | null) => void;
  prompt0Data: Prompt0Data;
  setPrompt0Data: (data: Partial<Prompt0Data>) => void;
  containerData: string;
  setContainerData: (data: string) => void;
  /**
   * Estado de cada uno de los 12 puntos de entrega del Contenedor 2 tras la
   * autoevaluación. Permite regenerar un bloque suelto sin rehacer todo el contenedor.
   */
  contenedor2Sections: Contenedor2SectionResult[];
  setContenedor2Sections: (sections: Contenedor2SectionResult[]) => void;
  /** Reemplaza un bloque y vuelve a ensamblar el Contenedor 2 completo. */
  replaceContenedor2Section: (index: number, section: Contenedor2SectionResult) => void;
  /**
   * Procedencia con la que se generó el Contenedor 2 vigente (núcleo + fuentes propias).
   * Se persiste junto al contenedor: es la misma entidad, no un registro aparte (§5).
   */
  containerProcedencia: Procedencia | null;
  setContainerProcedencia: (procedencia: Procedencia | null) => void;
  /**
   * Veces que se ha generado el Contenedor 2 para la ficha actual (0 = nunca,
   * 1 = generado, 2 = regenerado). Tras la regeneración el botón desaparece.
   */
  containerBuildCount: number;
  /** Suma uno al contador sobre el valor vigente (evita perder cuentas si hay dos disparos). */
  incrementContainerBuildCount: () => void;
  documentData: string;
  setDocumentData: (data: string) => void;
  /**
   * Estado de cada uno de los 13 apartados del proyecto de innovación tras la
   * autoevaluación. Permite regenerar un apartado suelto sin rehacer el documento.
   */
  fundanteSections: FundanteSectionResult[];
  setFundanteSections: (sections: FundanteSectionResult[]) => void;
  /** Reemplaza un apartado y vuelve a ensamblar el documento completo. */
  replaceFundanteSection: (index: number, section: FundanteSectionResult) => void;
  /**
   * Conteos reales del registro de proyectos usados en el documento. Se guardan al
   * generar para que las figuras de las descargas se dibujen con datos verificables
   * en lugar de estimarse a partir del texto redactado.
   */
  sigiipSnapshot: SigiipSnapshot | null;
  setSigiipSnapshot: (snapshot: SigiipSnapshot | null) => void;
  themeProposalMarkdown: string;
  setThemeProposalMarkdown: (s: string) => void;
  /** Estado de cada una de las 2 partes de la propuesta de vocación tras autoevaluación. */
  vocationSections: VocationPartResult[];
  setVocationSections: (sections: VocationPartResult[]) => void;
  /** Reemplaza una parte de la propuesta y vuelve a ensamblar el Markdown. */
  replaceVocationSection: (index: number, section: VocationPartResult) => void;
  /** 0, 1 o 2 = opción elegida; null = aún no confirmada */
  selectedLabThemeIndex: number | null;
  setSelectedLabThemeIndex: (n: number | null) => void;
  /** Tema estratégico seleccionado en Ideación Estratégica (alimenta Árbol de Innovación y Prototipado). */
  selectedStrategicTheme: string;
  setSelectedStrategicTheme: (theme: string) => void;
  /** Frutos seleccionados del Árbol de Innovación para alimentar el módulo de Prototipado. */
  selectedTreeFruits: Array<{
    id: string;
    code: string;
    name: string;
    type: 'proyecto' | 'servicio' | 'prototipo';
    solution: string;
    impact: string;
    evidence?: string;
  }>;
  setSelectedTreeFruits: (fruits: Array<{
    id: string;
    code: string;
    name: string;
    type: 'proyecto' | 'servicio' | 'prototipo';
    solution: string;
    impact: string;
    evidence?: string;
  }>) => void;
  addTreeFruitToPrototypes: (fruit: {
    id: string;
    code: string;
    name: string;
    type: 'proyecto' | 'servicio' | 'prototipo';
    solution: string;
    impact: string;
    evidence?: string;
  }) => void;
  innovationTreeMarkdown: string;
  setInnovationTreeMarkdown: (s: string) => void;
  /** Estado de cada una de las 5 partes del árbol de innovación tras autoevaluación. */
  innovationTreeSections: InnovationTreePartResult[];
  setInnovationTreeSections: (sections: InnovationTreePartResult[]) => void;
  /** Reemplaza una parte del árbol y vuelve a ensamblar el Markdown. */
  replaceInnovationTreeSection: (index: number, section: InnovationTreePartResult) => void;
  resetPreFundanteWorkflow: () => void;
  /** Borra todo el trabajo del proyecto (ficha y resultados de las 3 fases); conserva configuración de IA y conexión Drive. */
  resetAll: () => void;
  aiProvider: AIProvider;
  setAiProvider: (provider: AIProvider) => void;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  /** Modelo OpenAI (chat/completions), p. ej. gpt-4o */
  openaiModel: string;
  setOpenaiModel: (model: string) => void;
  /** Modelo Anthropic Claude (messages API), p. ej. claude-sonnet-5 */
  anthropicModel: string;
  setAnthropicModel: (model: string) => void;
  /** Modelo activo por proveedor (catálogo dinámico) */
  providerModels: Record<string, string>;
  setProviderModel: (provider: string, model: string) => void;
  /** Bearer token del proxy UNAD Gemini (Authorization); alternativa a VITE_UNAD_GEMINI_BEARER. */
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
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session, lastActivityAt: Date.now() }),
      lastActivityAt: Date.now(),
      touchActivity: () => set({ lastActivityAt: Date.now() }),
      sessionNotice: null,
      setSessionNotice: (msg) => set({ sessionNotice: msg }),
      demoMode: false,
      setDemoMode: (on) => set({ demoMode: on }),
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      currentPhase: 1,
      setPhase: (phase) => set({ currentPhase: phase }),
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
        // Al borrar el contenedor (p. ej. por cambio de Ficha Base) se reinicia el ciclo generar→regenerar
        // y se olvida su procedencia (la trazabilidad pertenece al contenedor concreto).
        set((state) => ({
          containerData: data,
          contenedor2Sections: data.trim() ? state.contenedor2Sections : [],
          containerBuildCount: data.trim() ? state.containerBuildCount : 0,
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
      containerBuildCount: 0,
      incrementContainerBuildCount: () =>
        set((state) => ({ containerBuildCount: state.containerBuildCount + 1 })),
      documentData: '',
      setDocumentData: (data) => set({ documentData: data }),
      fundanteSections: [],
      setFundanteSections: (sections) => set({ fundanteSections: sections }),
      replaceFundanteSection: (index, section) =>
        set((state) => {
          const sections = state.fundanteSections.map((s, i) => (i === index ? section : s));
          return { fundanteSections: sections, documentData: assembleFundanteDocument(sections) };
        }),
      sigiipSnapshot: null,
      setSigiipSnapshot: (snapshot) => set({ sigiipSnapshot: snapshot }),
      themeProposalMarkdown: '',
      setThemeProposalMarkdown: (s) =>
        set((state) => ({
          themeProposalMarkdown: s,
          vocationSections: s.trim() ? state.vocationSections : [],
        })),
      vocationSections: [],
      setVocationSections: (sections) => set({ vocationSections: sections }),
      replaceVocationSection: (index, section) =>
        set((state) => {
          const sections = state.vocationSections.map((s, i) => (i === index ? section : s));
          return {
            vocationSections: sections,
            themeProposalMarkdown: assembleVocationDocument(sections),
          };
        }),
      selectedLabThemeIndex: null,
      setSelectedLabThemeIndex: (n) => set({ selectedLabThemeIndex: n }),
      selectedStrategicTheme: 'Biotecnología Aplicada y Valorización de Biomasa Agropecuaria',
      setSelectedStrategicTheme: (theme) => set({ selectedStrategicTheme: theme }),
      selectedTreeFruits: [],
      setSelectedTreeFruits: (fruits) => set({ selectedTreeFruits: fruits }),
      addTreeFruitToPrototypes: (fruit) =>
        set((state) => ({
          selectedTreeFruits: state.selectedTreeFruits.some((f) => f.id === fruit.id || f.code === fruit.code)
            ? state.selectedTreeFruits
            : [...state.selectedTreeFruits, fruit],
        })),
      innovationTreeMarkdown: '',
      setInnovationTreeMarkdown: (s) =>
        set((state) => ({
          innovationTreeMarkdown: s,
          innovationTreeSections: s.trim() ? state.innovationTreeSections : [],
        })),
      innovationTreeSections: [],
      setInnovationTreeSections: (sections) => set({ innovationTreeSections: sections }),
      replaceInnovationTreeSection: (index, section) =>
        set((state) => {
          const sections = state.innovationTreeSections.map((s, i) => (i === index ? section : s));
          return {
            innovationTreeSections: sections,
            innovationTreeMarkdown: assembleInnovationTreeDocument(sections),
          };
        }),
      resetPreFundanteWorkflow: () =>
        set({
          themeProposalMarkdown: '',
          vocationSections: [],
          selectedLabThemeIndex: null,
          innovationTreeMarkdown: '',
          innovationTreeSections: [],
          documentData: '',
          fundanteSections: [],
          sigiipSnapshot: null,
        }),
      resetAll: () =>
        set({
          currentPhase: 1,
          prompt0Data: { ...INITIAL_PROMPT0 },
          containerData: '',
          contenedor2Sections: [],
          containerBuildCount: 0,
          containerProcedencia: null,
          themeProposalMarkdown: '',
          vocationSections: [],
          selectedLabThemeIndex: null,
          innovationTreeMarkdown: '',
          innovationTreeSections: [],
          documentData: '',
          fundanteSections: [],
          sigiipSnapshot: null,
        }),
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
        unadGemini: 'gemini-2.5-flash',
        anthropic: DEFAULT_ANTHROPIC_MODEL,
        gemini: 'gemini-2.5-flash',
        openai: 'gpt-4o',
        ollama: 'llama3',
      },
      setProviderModel: (provider, model) =>
        set((state) => ({ providerModels: { ...state.providerModels, [provider]: model } })),
      unadGeminiBearer: '',
      setUnadGeminiBearer: (token) => set({ unadGeminiBearer: token }),
    }),
    {
      name: 'lab-app-state',
      version: 2,
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
        return next;
      },
      storage: createJSONStorage(() => localStorage),
      /**
       * No se persisten credenciales (claves API, bearer) ni el bundle de Drive:
       * las primeras por seguridad; el segundo porque puede superar la cuota de
       * localStorage (hasta ~900k caracteres) y se recarga fácil desde la Fase 2.
       */
      partialize: (state) => ({
        session: state.session,
        lastActivityAt: state.lastActivityAt,
        theme: state.theme,
        currentPhase: state.currentPhase,
        prompt0Data: state.prompt0Data,
        containerData: state.containerData,
        contenedor2Sections: state.contenedor2Sections,
        containerBuildCount: state.containerBuildCount,
        containerProcedencia: state.containerProcedencia,
        documentData: state.documentData,
        fundanteSections: state.fundanteSections,
        // Conteos agregados (pocos KB): sin ellos, tras recargar la página las figuras
        // de las descargas perderían los datos reales del registro de proyectos.
        sigiipSnapshot: state.sigiipSnapshot,
        themeProposalMarkdown: state.themeProposalMarkdown,
        vocationSections: state.vocationSections,
        selectedLabThemeIndex: state.selectedLabThemeIndex,
        innovationTreeMarkdown: state.innovationTreeMarkdown,
        innovationTreeSections: state.innovationTreeSections,
        aiProvider: state.aiProvider,
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
 * generación fallaba con 401 «faltan credenciales».
 */
const SESSION_CREDENTIALS_KEY = 'lab-session-credentials';

try {
  const saved = sessionStorage.getItem(SESSION_CREDENTIALS_KEY);
  if (saved) {
    const parsed = JSON.parse(saved) as { apiKeys?: Record<string, string>; unadGeminiBearer?: string };
    useStore.setState((state) => ({
      apiKeys: { ...state.apiKeys, ...(parsed.apiKeys ?? {}) },
      unadGeminiBearer: parsed.unadGeminiBearer || state.unadGeminiBearer,
    }));
  }
} catch {
  // sessionStorage no disponible o JSON corrupto: se sigue sin credenciales guardadas.
}

useStore.subscribe((state) => {
  try {
    sessionStorage.setItem(
      SESSION_CREDENTIALS_KEY,
      JSON.stringify({ apiKeys: state.apiKeys, unadGeminiBearer: state.unadGeminiBearer }),
    );
  } catch {
    // Cuota llena o storage bloqueado: no es crítico.
  }
});
