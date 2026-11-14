import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Cpu, ExternalLink, Eye, EyeOff, Settings, ShieldCheck } from 'lucide-react';
import { useStore, type AIProvider } from '@/store/useStore';
import { AI_PROVIDERS_CATALOG } from '@/constants/aiProviders';
import { checkAiConnection } from '@/services/ai';
import { markAiUnknown, useAiStatus } from '@/store/aiStatus';
import { validateStudioKey } from '@/services/studio';
import { STUDIO_KEY_URL, studioKeyShape } from '@/lib/studioKey';

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
 * Clave personal de Google AI Studio. Cada persona crea la suya, gratis, con su correo institucional, y la
 * pega aquí: vive solo en esta pestaña. Sirve de IA principal o, con la IA de la UNAD elegida, de respaldo
 * automático si esa falla.
 */
const StudioKeyField: React.FC<{ backup: boolean }> = ({ backup }) => {
  const { apiKeys, setApiKey, setProviderModel } = useStore();
  const { fallback } = useAiStatus();
  const key = apiKeys.gemini || '';
  const [showKey, setShowKey] = useState(false);
  const [guide, setGuide] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' | 'checking' | 'ok' | 'error'; text: string }>({ kind: 'idle', text: '' });
  const shape = studioKeyShape(key);

  const check = async () => {
    setState({ kind: 'checking', text: 'Comprobando la clave con Google…' });
    const result = await validateStudioKey(key);
    if (result.ok === false) return setState({ kind: 'error', text: result.message });
    setProviderModel('gemini', result.recommended);
    markAiUnknown();
    setState({
      kind: 'ok',
      text: backup
        ? `Clave válida. Si la IA de la UNAD falla, las herramientas pasan solas a tu clave (modelo ${result.recommended}).`
        : `Clave válida. Modelo elegido: ${result.recommended}.`,
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-white">
        <span className="flex items-center justify-between">
          {backup ? 'Mi clave personal de AI Studio (respaldo)' : 'Mi clave de AI Studio'}
          <button type="button" className="text-[11px] font-normal text-[var(--brand-teal-text)] flex items-center gap-1" onClick={() => setShowKey((v) => !v)}>
            {showKey ? <EyeOff className="w-3 h-3" aria-hidden="true" /> : <Eye className="w-3 h-3" aria-hidden="true" />}
            {showKey ? 'Ocultar' : 'Ver'}
          </button>
        </span>
        <input
          className="lab-input mt-1 font-mono"
          type={showKey ? 'text' : 'password'}
          placeholder="AIzaSy..."
          value={key}
          onChange={(e) => {
            setApiKey('gemini', e.target.value.trim());
            setState({ kind: 'idle', text: '' });
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="block mt-1 font-normal text-[11px] text-brand-textMuted">Es tuya: se guarda solo en esta pestaña y se borra al cerrarla. Nadie más la ve.</span>
      </label>

      {shape === 'extrana' && <p className="text-[11px] text-[#F3C26B]">Las claves de Google empiezan por «AIza» y miden 39 caracteres. Revisa que la copiaste completa.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="lab-btn lab-btn-sm" disabled={shape === 'vacia' || state.kind === 'checking'} onClick={() => void check()}>
          {state.kind === 'checking' ? 'Comprobando…' : 'Validar mi clave'}
        </button>
        <button type="button" className="text-[11px] font-semibold text-[var(--brand-teal-text)] underline" aria-expanded={guide} onClick={() => setGuide((v) => !v)}>
          {guide ? 'Ocultar los pasos' : '¿Cómo creo mi clave?'}
        </button>
      </div>

      {state.kind !== 'idle' && (
        <p className={`flex items-start gap-1.5 text-[11px] leading-snug ${state.kind === 'error' ? 'text-[#F3C26B]' : 'text-brand-textSecondary'}`} role={state.kind === 'error' ? 'alert' : 'status'}>
          {state.kind === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#22C55E]" aria-hidden="true" />}
          {state.text}
        </p>
      )}
      {backup && fallback && <p className="text-[11px] font-semibold text-[#F3C26B]">Ahora mismo las herramientas están usando tu clave de AI Studio porque la IA de la UNAD no responde.</p>}

      {guide && (
        <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-snug text-brand-textSecondary">
          <li>
            Abre{' '}
            <a className="font-semibold text-[var(--brand-teal-text)] underline inline-flex items-center gap-0.5" href={STUDIO_KEY_URL} target="_blank" rel="noopener noreferrer">
              aistudio.google.com/apikey <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>{' '}
            e ingresa con tu correo institucional.
          </li>
          <li>Acepta los términos si te los pide y pulsa «Crear clave de API» (Create API key).</li>
          <li>Elige un proyecto nuevo o el que te ofrezca y copia la clave que aparece: empieza por AIza.</li>
          <li>Pégala arriba y pulsa «Validar mi clave». Si sale en verde, ya quedó lista.</li>
          <li className="list-none -ml-4 pt-1 text-brand-textMuted">
            Si tu cuenta institucional no te deja entrar, puede que el administrador de la universidad tenga AI Studio desactivado: prueba con otra cuenta de Google.
          </li>
        </ol>
      )}
    </div>
  );
};

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
              <>
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-textSecondary">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--brand-teal-text)]" aria-hidden="true" />
                  IA institucional UNAD. Las credenciales las pone el servidor: no necesitas ninguna clave personal.
                </p>
                <div className="pt-3 border-t border-white/10">
                  <StudioKeyField backup />
                </div>
              </>
            ) : aiProvider === 'gemini' ? (
              <StudioKeyField backup={false} />
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
