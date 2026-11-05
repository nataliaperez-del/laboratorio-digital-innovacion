import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Cpu, Eye, EyeOff, Settings, ShieldCheck } from 'lucide-react';
import { useStore, type AIProvider } from '@/store/useStore';
import { AI_PROVIDERS_CATALOG } from '@/constants/aiProviders';
import { checkAiConnection } from '@/services/ai';
import { markAiUnknown, useAiStatus } from '@/store/aiStatus';

type ConnStatus = 'idle' | 'checking' | 'ok' | 'error';

const CONN_LABEL: Record<ConnStatus, string> = {
  idle: 'Sin verificar',
  checking: 'Verificando…',
  ok: 'IA conectada',
  error: 'Sin conexión',
};
// Los mismos verde y rojo del círculo de la cabecera.
const CONN_DOT: Record<ConnStatus, string> = { idle: 'bg-white/30', checking: 'bg-[#F29F05] animate-pulse', ok: 'bg-[#22C55E]', error: 'bg-[#EF4444]' };

/**
 * Selector de proveedor de IA, igual al de la app Fase 1: cada visita empieza con la IA
 * institucional UNAD, cuyas credenciales pone el servidor. Su conexión se prueba sola al abrir
 * el panel (no en cada carga de página, para no gastar una llamada por visita).
 */
export const AiSettings: React.FC = () => {
  const { aiProvider, setAiProvider, apiKeys, setApiKey, providerModels, setProviderModel, ollamaUrl, setOllamaUrl } = useStore();
  const [open, setOpen] = useState(false);
  // El mismo estado que el círculo de la cabecera: lo que se prueba aquí se ve allá, y al revés.
  const { status: connection, message: error, probing, checkedAt } = useAiStatus();
  const status: ConnStatus = probing ? 'checking' : connection;
  const [showKey, setShowKey] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const config = AI_PROVIDERS_CATALOG[aiProvider] ?? AI_PROVIDERS_CATALOG.unadGemini;
  const model = providerModels?.[aiProvider] || config.defaultModel;

  const test = useCallback(() => checkAiConnection(), []);

  // La IA de la UNAD se verifica sola al abrir el panel; las demás, con «Probar», cuando ya
  // tengan su clave completa (probar mientras se escribe solo mostraría errores).
  useEffect(() => {
    if (open && !probing && aiProvider === 'unadGemini' && Date.now() - checkedAt > 60_000) void test();
  }, [open, probing, checkedAt, aiProvider, test]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="g2 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-white"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={`${CONN_LABEL[status]} · ${config.name}`}
      >
        <span className={`w-2 h-2 rounded-full ${CONN_DOT[status]}`} aria-hidden="true" />
        <Settings className="w-3.5 h-3.5" aria-hidden="true" />
        <span>IA: {config.short}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="lab-popover" role="dialog" aria-label="Proveedor de IA">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              <Cpu className="w-4 h-4 text-[var(--brand-teal-text)]" aria-hidden="true" /> Proveedor de IA
            </span>
            <span className="flex items-center gap-2 text-[11px] text-brand-textSecondary">
              <span className={`w-2 h-2 rounded-full ${CONN_DOT[status]}`} aria-hidden="true" />
              {CONN_LABEL[status]}
              <button
                type="button"
                className="font-semibold text-[var(--brand-teal-text)] underline disabled:opacity-50"
                disabled={status === 'checking'}
                onClick={() => void test()}
              >
                Probar
              </button>
            </span>
          </div>

          {status === 'error' && error && <p className="lab-error mb-3 text-xs">{error}</p>}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-white">
              Proveedor
              <select
                className="lab-input mt-1"
                value={aiProvider}
                onChange={(e) => {
                  setAiProvider(e.target.value as AIProvider);
                  markAiUnknown();
                }}
              >
                {Object.values(AI_PROVIDERS_CATALOG).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.category === 'institucional' ? ' (Recomendado)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-white">
              Modelo
              <select
                className="lab-input mt-1"
                value={model}
                onChange={(e) => {
                  setProviderModel(aiProvider, e.target.value);
                  markAiUnknown();
                }}
              >
                {config.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {aiProvider === 'unadGemini' ? (
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-textSecondary">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--brand-teal-text)]" aria-hidden="true" />
                IA institucional UNAD. Las credenciales las pone el servidor: no necesitas ninguna clave personal.
              </p>
            ) : aiProvider === 'ollama' ? (
              <label className="block text-xs font-semibold text-white">
                URL del servidor local
                <input className="lab-input mt-1" placeholder="http://localhost:11434" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} />
              </label>
            ) : (
              <label className="block text-xs font-semibold text-white">
                <span className="flex items-center justify-between">
                  API Key de {config.name}
                  <button
                    type="button"
                    className="text-[11px] font-normal text-[var(--brand-teal-text)] flex items-center gap-1"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff className="w-3 h-3" aria-hidden="true" /> : <Eye className="w-3 h-3" aria-hidden="true" />}
                    {showKey ? 'Ocultar' : 'Ver'}
                  </button>
                </span>
                <input
                  className="lab-input mt-1 font-mono"
                  type={showKey ? 'text' : 'password'}
                  placeholder={config.placeholder}
                  value={apiKeys[aiProvider] || ''}
                  onChange={(e) => setApiKey(aiProvider, e.target.value)}
                  autoComplete="off"
                />
                <span className="block mt-1 font-normal text-[11px] text-brand-textMuted">Se guarda solo en esta pestaña y se borra al cerrarla.</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
