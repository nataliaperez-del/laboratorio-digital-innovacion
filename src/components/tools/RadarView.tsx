import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, ExternalLink, Rocket, Trees } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { loadRadarFeed, OBSERVATORIO_URL, signalAsInput, type RadarFeed, type RadarSignal } from '@/services/observatorio';
import { ErrorNotice, SegmentedControl, ToolHeader } from '@/components/lab/common';
import { RadarScope } from './RadarScope';
import type { ToolId } from '@/components/layout/Header';

const PRIORITY_COLOR: Record<string, string> = { alta: '#F29F05', media: '#A8C63C', baja: '#2E9CBA' };

const colorOf = (s: RadarSignal) => PRIORITY_COLOR[s.prioridad.toLowerCase()] ?? '#5EC2DD';

interface Props {
  onNavigate: (tool: ToolId) => void;
}

/**
 * Radar del Observatorio dentro del Laboratorio. No es una herramienta del Laboratorio sino
 * su fuente: solo lee las señales publicadas y permite llevarlas a Ideación, Árbol o Prototipado.
 */
export const RadarView: React.FC<Props> = ({ onNavigate }) => {
  const { setIdeationResult, setTreeSeed, setPrototypeSeed, themeProposalMarkdown } = useStore();
  const [feed, setFeed] = useState<RadarFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'radar' | 'lista'>('radar');
  const [area, setArea] = useState('todas');
  const [priority, setPriority] = useState('todas');
  const [activeId, setActiveId] = useState<number | null>(null);

  const load = () => {
    setError(null);
    loadRadarFeed()
      .then((f) => {
        setFeed(f);
        setActiveId((id) => id ?? f.senales[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };
  useEffect(load, []);

  const areas = useMemo(() => [...new Set(feed?.senales.map((s) => s.area) ?? [])].sort(), [feed]);
  const priorities = useMemo(() => [...new Set(feed?.senales.map((s) => s.prioridad).filter(Boolean) ?? [])], [feed]);
  const signals = useMemo(
    () => (feed?.senales ?? []).filter((s) => (area === 'todas' || s.area === area) && (priority === 'todas' || s.prioridad === priority)),
    [feed, area, priority],
  );
  const visibleIds = useMemo(() => new Set(signals.map((s) => s.id)), [signals]);
  const active = feed?.senales.find((s) => s.id === activeId) ?? null;
  const related = active ? (feed?.senales ?? []).filter((s) => active.relacionadas.includes(s.id)) : [];

  const toIdeation = (s: RadarSignal) => {
    if (themeProposalMarkdown.trim() && !window.confirm('Ya hay un resultado en Crear Conceptos. ¿Quieres reemplazarlo?')) return;
    setIdeationResult({ kind: 'observatorio', label: s.nombre, text: signalAsInput(s) }, '', []);
    onNavigate('ideacion');
  };
  const toTree = (s: RadarSignal) => {
    setTreeSeed({ theme: s.nombre, explanation: signalAsInput(s) });
    onNavigate('arbol');
  };
  const toPrototype = (s: RadarSignal) => {
    setPrototypeSeed({ origin: { kind: 'observatorio', label: `Radar del Observatorio: ${s.nombre}` }, topic: s.nombre, context: signalAsInput(s) });
    onNavigate('prototipado');
  };

  return (
    <div className="w-full space-y-6">
      <ToolHeader
        title="Radar del Observatorio"
        description="Las señales que vigila el Observatorio InnovaHub360 alimentan al Laboratorio. Explóralas y lleva cualquiera a Crear Conceptos, a Validar Conceptos o a Desarrollar Soluciones."
      >
        <a className="lab-btn" href={`${OBSERVATORIO_URL}index.php?route=%2Fradar`} target="_blank" rel="noopener noreferrer">
          Ver en el Observatorio <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </ToolHeader>

      <ErrorNotice message={error} onClose={() => setError(null)} />
      {error && (
        <button type="button" className="lab-btn" onClick={load}>
          Reintentar
        </button>
      )}
      {!feed && !error && (
        <p className="lab-panel text-sm text-brand-textMuted" role="status">
          Leyendo el Radar del Observatorio…
        </p>
      )}

      {feed && (
        <>
          <div className="lab-panel flex flex-wrap items-center gap-3">
            <SegmentedControl<'radar' | 'lista'>
              label="Vista"
              value={view}
              onChange={setView}
              options={[
                { value: 'radar', label: 'Radar' },
                { value: 'lista', label: 'Lista' },
              ]}
            />
            <label className="text-xs text-brand-textMuted flex items-center gap-2">
              Área
              <select className="lab-input py-1.5" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="todas">Todas</option>
                {areas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-brand-textMuted flex items-center gap-2">
              Prioridad
              <select className="lab-input py-1.5" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="todas">Todas</option>
                {priorities.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <span className="ml-auto text-xs text-brand-textMuted m" aria-live="polite">
              {signals.length} de {feed.senales.length} señales · consultado {new Date(feed.consultadoEn).toLocaleDateString('es-CO')}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 min-w-0">
              {view === 'radar' ? (
                <div className="lab-tree-canvas radar-plate p-3">
                  <RadarScope
                    all={feed.senales}
                    visibleIds={visibleIds}
                    activeId={activeId}
                    relatedIds={active?.relacionadas ?? []}
                    colorOf={colorOf}
                    onSelect={(s) => setActiveId(s.id)}
                  />
                  <div className="radar-legend flex flex-wrap gap-4 px-2 pb-1 text-xs text-[#CFE6EE]">
                    <span>Sector: área · Cerca del centro: más impacto · Tamaño: más adopción</span>
                    {Object.entries(PRIORITY_COLOR).map(([k, c]) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} aria-hidden="true" /> Prioridad {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {signals.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={s.id === activeId}
                      className={`lab-card text-left ${s.id === activeId ? 'is-selected' : ''}`}
                      onClick={() => setActiveId(s.id)}
                    >
                      <span className="text-[11px] text-brand-textMuted block">
                        {s.area} · {s.accion}
                      </span>
                      <span className="text-sm font-bold text-white sy block">{s.nombre}</span>
                      <span className="text-xs text-brand-textSecondary line-clamp-2">{s.descripcion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {active && (
              <aside className="lg:col-span-4 lab-panel space-y-3 lg:sticky lg:top-4" aria-live="polite">
                <div className="flex flex-wrap gap-1.5">
                  <span className="lab-chip">Prioridad {active.prioridad.toLowerCase()}</span>
                  <span className="lab-chip">{active.accion}</span>
                </div>
                <h2 className="text-lg font-bold text-white sy leading-snug">{active.nombre}</h2>
                <p className="text-sm text-brand-textSecondary leading-relaxed">{active.descripcion}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Impacto territorial', `${active.impacto}%`],
                    ['Adopción', `${active.adopcion}%`],
                    ['Horizonte', active.horizonte],
                    ['Madurez', active.madurez],
                    ['Evidencia', active.evidencia],
                    ['Área', active.area],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-brand-textMuted">{k}</dt>
                      <dd className="font-semibold text-white">{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {active.casos.length > 0 && (
                  <p className="text-xs text-brand-textSecondary">
                    <strong className="text-white">Casos:</strong> {active.casos.join(' · ')}
                  </p>
                )}
                {related.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-brand-textMuted block mb-1">Señales relacionadas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {related.map((r) => (
                        <button key={r.id} type="button" className="lab-chip lab-chip-btn" onClick={() => setActiveId(r.id)}>
                          {r.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-brand-textMuted block">Usar esta señal en el Laboratorio</span>
                  <button type="button" className="lab-btn w-full" onClick={() => toIdeation(active)}>
                    <BrainCircuit className="w-4 h-4" aria-hidden="true" /> {MODULE_LABELS.ideacion.title}
                  </button>
                  <button type="button" className="lab-btn w-full" onClick={() => toTree(active)}>
                    <Trees className="w-4 h-4" aria-hidden="true" /> {MODULE_LABELS.arbol.title}
                  </button>
                  <button type="button" className="lab-btn w-full" onClick={() => toPrototype(active)}>
                    <Rocket className="w-4 h-4" aria-hidden="true" /> {MODULE_LABELS.prototipado.title}
                  </button>
                </div>
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
};
