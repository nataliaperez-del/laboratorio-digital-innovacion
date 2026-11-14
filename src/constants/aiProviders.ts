/** Un modelo de un proveedor en el selector del panel «IA». */
export interface AIModelOption {
  id: string;
  label: string;
  hint?: string;
  recommended?: boolean;
}

/** Un proveedor de IA del panel: nombre, categoría, modelos y ayuda para la clave. */
export interface AIProviderConfig {
  id: string;
  name: string;
  short: string;
  category: 'institucional' | 'comercial' | 'local';
  defaultModel: string;
  models: AIModelOption[];
  keyPrefix?: string;
  placeholder?: string;
  docsUrl?: string;
}

/** Modelo Claude vigente por defecto (IDs 3.x y Sonnet 4 de 2025 ya están retirados). */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';

/**
 * IDs retirados por Anthropic → reemplazo actual.
 * Evita que una key válida falle porque localStorage o el selector aún apuntan a Claude 3.
 */
const RETIRED_ANTHROPIC_MODEL_REPLACEMENTS: Record<string, string> = {
  'claude-3-opus-20240229': 'claude-opus-5',
  'claude-3-7-sonnet-20250219': DEFAULT_ANTHROPIC_MODEL,
  'claude-3-5-sonnet-20241022': DEFAULT_ANTHROPIC_MODEL,
  'claude-3-5-sonnet-20240620': DEFAULT_ANTHROPIC_MODEL,
  'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
  'claude-3-haiku-20240307': 'claude-haiku-4-5-20251001',
  'claude-3-sonnet-20240229': DEFAULT_ANTHROPIC_MODEL,
  'claude-sonnet-4-20250514': DEFAULT_ANTHROPIC_MODEL,
  'claude-opus-4-20250514': 'claude-opus-5',
  'claude-opus-4-1-20250805': 'claude-opus-5',
};

/** Modelo de Anthropic a usar: el pedido o su reemplazo si fue retirado; vacío → el predeterminado. */
export function resolveAnthropicModel(modelId?: string | null): string {
  const id = modelId?.trim() ?? '';
  if (!id) return DEFAULT_ANTHROPIC_MODEL;
  return RETIRED_ANTHROPIC_MODEL_REPLACEMENTS[id] ?? id;
}

/** Proveedores que ofrece el panel «IA», empezando por el institucional UNAD. */
export const AI_PROVIDERS_CATALOG: Record<string, AIProviderConfig> = {
  unadGemini: {
    id: 'unadGemini',
    name: 'UNAD · Gemini (Proxy IA 360)',
    short: 'UNAD',
    category: 'institucional',
    defaultModel: 'gemini-3.5-flash',
    placeholder: 'x-api-key institucional...',
    models: [
      { id: 'gemini-3.5-flash', label: 'gemini-3.5-flash (Institucional UNAD)', recommended: true },
      { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Ligero / Rápido)' },
      { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
      { id: 'gemini-3.7-flash', label: 'gemini-3.7-flash' },
      { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
      { id: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (Mayor capacidad)' },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    short: 'Claude',
    category: 'comercial',
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (Recomendado · Uso general)', recommended: true },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Rápido / Económico)' },
      { id: 'claude-opus-5', label: 'Claude Opus 5 (Máxima capacidad)' },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google AI Studio (gratis, con tu cuenta)',
    short: 'AI Studio',
    category: 'comercial',
    defaultModel: 'gemini-2.5-flash',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Recomendado)', recommended: true },
      { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
      { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
      { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
      { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (GPT)',
    short: 'OpenAI',
    category: 'comercial',
    defaultModel: 'gpt-4o',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o (Recomendado · Alta fidelidad)', recommended: true },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini (Económico)' },
      { id: 'o3-mini', label: 'o3-mini (Razonamiento)' },
      { id: 'o1', label: 'o1 (Razonamiento profundo)' },
    ],
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    short: 'Ollama',
    category: 'local',
    defaultModel: 'llama3',
    placeholder: 'http://localhost:11434',
    models: [
      { id: 'llama3', label: 'Llama 3 (Local)', recommended: true },
      { id: 'mistral', label: 'Mistral (Local)' },
      { id: 'deepseek-r1', label: 'DeepSeek R1 (Local)' },
      { id: 'phi3', label: 'Phi-3 (Local)' },
    ],
  },
};
