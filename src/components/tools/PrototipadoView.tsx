import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, CheckCircle2, FileText, ListChecks, Rocket, ShieldAlert, Sparkles, Target, Trash2, Trees, Wrench } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GenerationCancelledError } from '@/services/ai';
import {
  generatePrototypePlan,
  PROTOTYPE_CATEGORIES,
  SCOPE_OPTIONS,
  TRL_OPTIONS,
  type PrototypeCategory,
  type PrototypeOrigin,
  type PrototypePlan,
} from '@/services/prototyping';
import { signalAsInput } from '@/services/observatorio';
import { FRUIT_LABEL, LEVEL_LABEL } from '@/lib/innovationTreeGraph';
import { prototipadoReport } from '@/lib/labReports';
import { EmptyState, ErrorNotice, GenerationProgress, ReportActions, SegmentedControl, ToolHeader, type ProgressState } from '@/components/lab/common';
import { ObservatorioPicker } from '@/components/lab/ObservatorioPicker';
import type { ToolId } from '@/components/layout/Header';

type OriginMode = 'idea' | 'arbol' | 'observatorio';
type PlanTab = 'general' | 'fases' | 'arquitectura' | 'validacion';

const TABS: Array<{ id: PlanTab; label: string }> = [
  { id: 'general', label: 'Problema e hipótesis' },
  { id: 'fases', label: 'Cronograma' },
  { id: 'arquitectura', label: 'Arquitectura' },
  { id: 'validacion', label: 'Validación y riesgos' },
];

const PlanView: React.FC<{ plan: PrototypePlan }> = ({ plan }) => {
  const [tab, setTab] = useState<PlanTab>('general');
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setTab('general');
    setPhase(0);
  }, [plan.id]);
  const current = plan.phases[Math.min(phase, plan.phases.length - 1)];

  return (
    <div className="space-y-5">
      <div className="lab-tabs" role="tablist" aria-label="Secciones del plan">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-4">
          <div className="lab-card" style={{ borderLeft: '3px solid #E024A5' }}>
            <span className="text-xs font-bold text-[#E024A5] flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-[#E024A5]" aria-hidden="true" /> Hipótesis a validar</span>
            <p className="text-base text-white sy font-medium leading-relaxed">{plan.hypothesis}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="lab-card"><h4 className="text-xs font-bold text-[#E024A5] mb-1">Problema que resuelve</h4><p className="text-sm text-brand-textSecondary leading-relaxed">{plan.problemSolved}</p></div>
            <div className="lab-card"><h4 className="text-xs font-bold text-[#E024A5] mb-1">Población y actores</h4><p className="text-sm text-brand-textSecondary leading-relaxed">{plan.targetAudience}</p></div>
          </div>
          <div className="lab-card"><h4 className="text-xs font-bold text-[#E024A5] mb-1">La solución</h4><p className="text-sm text-brand-textSecondary leading-relaxed">{plan.solution}</p></div>
          {plan.unadSchools.length > 0 && <p className="text-xs text-brand-textMuted">Articula: {plan.unadSchools.join(' · ')}</p>}
        </div>
      )}

      {tab === 'fases' && current && (
        <div className="space-y-3">
          <ol className="lab-timeline">
            {plan.phases.map((p, i) => (
              <li key={i}>
                <button type="button" aria-current={i === phase} className={i === phase ? 'is-active' : ''} onClick={() => setPhase(i)}>
                  <span className="m text-[11px]">{p.semanas || `Fase ${i + 1}`}</span>
                  <span className="block text-xs font-semibold">{p.fase}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="lab-card space-y-3">
            <h4 className="text-sm font-bold text-[#E024A5] sy">{current.fase}</h4>
            <p className="text-sm text-brand-textSecondary leading-relaxed">{current.actividades}</p>
            <div>
              <span className="text-[11px] font-semibold text-[#E024A5] block mb-1">Entregables de la fase</span>
              <ul className="space-y-1">
                {current.entregables.map((e, i) => (
                  <li key={i} className="text-sm text-brand-textSecondary flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 text-[#E024A5]" aria-hidden="true" /> {e}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'arquitectura' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Wrench, title: 'Componente físico', text: plan.architecture.fisico, color: '#E024A5' },
            { icon: BrainCircuit, title: 'Componente digital', text: plan.architecture.digital, color: '#E024A5' },
            { icon: FileText, title: 'Componente metodológico', text: plan.architecture.metodologico, color: '#E024A5' },
          ].map(({ icon: Icon, title, text, color }) => (
            <div key={title} className="lab-card">
              <h4 className="text-xs font-bold flex items-center gap-2 mb-1.5" style={{ color }}><Icon className="w-4 h-4 text-[#E024A5]" aria-hidden="true" /> {title}</h4>
              <p className="text-sm text-brand-textSecondary leading-relaxed">{text || 'No aplica'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'validacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="lab-card">
            <h4 className="text-xs font-bold text-[#E024A5] flex items-center gap-2 mb-2"><ListChecks className="w-4 h-4 text-[#E024A5]" aria-hidden="true" /> Métricas de validación</h4>
            <ul className="space-y-1.5 text-sm text-brand-textSecondary list-disc pl-4">{plan.validationMetrics.map((m, i) => <li key={i}>{m}</li>)}</ul>
            <h4 className="text-xs font-bold text-[#E024A5] mt-4 mb-2">Entregables finales</h4>
            <ul className="space-y-1.5 text-sm text-brand-textSecondary list-disc pl-4">{plan.deliverables.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
          <div className="lab-card">
            <h4 className="text-xs font-bold text-[#E024A5] flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-[#E024A5]" aria-hidden="true" /> Riesgos y mitigación</h4>
            <ul className="space-y-2">
              {plan.risks.map((r, i) => (
                <li key={i} className="text-sm"><strong className="text-white font-semibold">{r.riesgo}</strong><span className="block text-brand-textSecondary">{r.mitigacion}</span></li>
              ))}
            </ul>
            {plan.supuestos.length > 0 && (
              <>
                <h4 className="text-xs font-bold text-[#E024A5] mt-4 mb-2">Supuestos por verificar</h4>
                <ul className="space-y-1.5 text-sm text-brand-textSecondary list-disc pl-4">{plan.supuestos.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface Props {
  onNavigate: (tool: ToolId) => void;
}

export const PrototipadoView: React.FC<Props> = ({ onNavigate }) => {
  const { prompt0Data, treeGraph, prototypeSeed, setPrototypeSeed, prototypes, addPrototype, removePrototype } = useStore();

  const [mode, setMode] = useState<OriginMode>('idea');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [origin, setOrigin] = useState<PrototypeOrigin>({ kind: 'idea', label: 'Idea libre' });
  const [category, setCategory] = useState<PrototypeCategory>(PROTOTYPE_CATEGORIES[0]);
  const [trl, setTrl] = useState<string>(TRL_OPTIONS[1]);
  const [scope, setScope] = useState<string>(SCOPE_OPTIONS[1]);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(prototypes[0]?.id ?? null);

  // Insumo que llega del Árbol, de Ideación o del Radar.
  useEffect(() => {
    if (!prototypeSeed) return;
    setTopic(prototypeSeed.topic);
    setContext(prototypeSeed.context);
    setOrigin(prototypeSeed.origin);
    setMode(prototypeSeed.origin.kind === 'arbol' ? 'arbol' : prototypeSeed.origin.kind === 'observatorio' ? 'observatorio' : 'idea');
    setPrototypeSeed(null);
  }, [prototypeSeed, setPrototypeSeed]);

  const fruits = useMemo(() => treeGraph?.nodos.filter((n) => n.nivel === 'fruto' || n.nivel === 'hoja') ?? [], [treeGraph]);
  const active = prototypes.find((p) => p.id === activeId) ?? prototypes[0] ?? null;
  const busy = progress !== null;

  const changeMode = (next: OriginMode) => {
    setMode(next);
    setTopic('');
    setContext('');
    setOrigin({ kind: 'idea', label: 'Idea libre' });
  };

  const generate = async () => {
    if (busy || !topic.trim()) return;
    setError(null);
    setProgress({ current: 1, total: 1, title: 'Diseñando el plan' });
    try {
      const plan = await generatePrototypePlan({ origin, topic: topic.trim(), context, category, trl, scope });
      addPrototype(plan);
      setActiveId(plan.id);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al generar el plan.');
    } finally {
      setProgress(null);
    }
  };

  const remove = (plan: PrototypePlan) => {
    if (window.confirm(`¿Eliminar el plan «${plan.name}»? No se puede deshacer.`)) removePrototype(plan.id);
  };

  return (
    <div className="w-full space-y-6">
      <ToolHeader
        title="Prototipado"
        titleColor="#E024A5"
        description="Arma un plan de prototipado completo con IA: hipótesis, arquitectura, fases, métricas y riesgos. Parte de una idea libre o de un resultado del Árbol de Innovación."
      />

      <ErrorNotice message={error} onClose={() => setError(null)} />

      <section className="lab-panel space-y-4" aria-label="Datos del plan">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#E024A5] sy flex items-center gap-2"><Rocket className="w-4 h-4 text-[#E024A5]" aria-hidden="true" /> ¿Qué vamos a prototipar?</h2>
          <SegmentedControl<OriginMode>
            label="Origen del plan"
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'idea', label: 'Una idea' },
              { value: 'arbol', label: 'Resultado del Árbol' },
              { value: 'observatorio', label: 'Señal del Observatorio' },
            ]}
          />
        </div>

        {mode === 'arbol' &&
          (fruits.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {fruits.map((n) => (
                <button
                  key={n.codigo}
                  type="button"
                  aria-pressed={origin.code === n.codigo}
                  className={`lab-card text-left ${origin.code === n.codigo ? 'is-selected' : ''}`}
                  onClick={() => {
                    setTopic(n.nombre);
                    setContext([n.descripcion, n.solucion && `Solución posible: ${n.solucion}`, n.impacto_esperado && `Impacto esperado: ${n.impacto_esperado}`].filter(Boolean).join('\n'));
                    setOrigin({ kind: 'arbol', code: n.codigo, label: `Árbol de Innovación: ${treeGraph?.tema}` });
                    if (n.tipo_fruto === 'servicio') setCategory('Servicio de Innovación');
                    if (n.tipo_fruto === 'proyecto') setCategory('Proyecto Territorial');
                    if (n.tipo_fruto === 'prototipo') setCategory('Prototipo Tecnológico');
                  }}
                >
                  <span className="text-[11px] text-brand-textMuted block m">{n.codigo} · {n.tipo_fruto ? FRUIT_LABEL[n.tipo_fruto] : LEVEL_LABEL[n.nivel].split(' · ')[0]}</span>
                  <span className="text-xs font-semibold text-white">{n.nombre}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-textMuted flex flex-wrap items-center gap-2">
              Aún no hay árbol.
              <button type="button" className="lab-btn lab-btn-sm" onClick={() => onNavigate('arbol')}><Trees className="w-3 h-3" aria-hidden="true" /> Ir al Árbol</button>
              o escribe tu idea en «Una idea».
            </p>
          ))}

        {mode === 'observatorio' && (
          <ObservatorioPicker
            onPick={(s) => {
              setTopic(s.nombre);
              setContext(signalAsInput(s));
              setOrigin({ kind: 'observatorio', label: `Radar del Observatorio: ${s.nombre}` });
            }}
          />
        )}

        <div>
          <label className="lab-label" htmlFor="proto-topic">Idea o tema</label>
          <textarea id="proto-topic" className="lab-input" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: detección temprana de plagas con visión artificial para pequeños productores" />
          {origin.kind !== 'idea' && <p className="text-[11px] text-[var(--brand-olive)] mt-1">Origen: {origin.label}{origin.code ? ` (${origin.code})` : ''}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="lab-label" htmlFor="proto-cat">Categoría</label>
            <select id="proto-cat" className="lab-input" value={category} onChange={(e) => setCategory(e.target.value as PrototypeCategory)}>{PROTOTYPE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="lab-label" htmlFor="proto-trl">Madurez objetivo</label>
            <select id="proto-trl" className="lab-input" value={trl} onChange={(e) => setTrl(e.target.value)}>{TRL_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="lab-label" htmlFor="proto-scope">Alcance de validación</label>
            <select id="proto-scope" className="lab-input" value={scope} onChange={(e) => setScope(e.target.value)}>{SCOPE_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="metal px-6 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-40" disabled={busy || !topic.trim()} onClick={() => void generate()}>
            <Sparkles className="w-4 h-4" aria-hidden="true" /> Armar el plan con IA
          </button>
        </div>
      </section>

      <GenerationProgress progress={progress} label="Paso" />

      {active ? (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
          <nav className="space-y-2" aria-label="Banco de prototipos">
            <h2 className="l text-[#E024A5] font-bold">Banco de prototipos ({prototypes.length})</h2>
            {prototypes.map((p) => (
              <button key={p.id} type="button" aria-current={p.id === active.id} className={`lab-card text-left w-full ${p.id === active.id ? 'is-selected' : ''}`} onClick={() => setActiveId(p.id)}>
                <span className="text-[11px] text-brand-textMuted block">{p.category}{p.origin.code ? ` · ${p.origin.code}` : ''}</span>
                <span className="text-sm font-bold text-white sy block leading-snug">{p.name}</span>
                <span className="text-[11px] text-brand-textMuted m">{p.durationWeeks ? `${p.durationWeeks} semanas` : 'Sin duración'}</span>
              </button>
            ))}
          </nav>

          <article className="lab-panel space-y-5 min-w-0">
            <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="lab-chip">{active.category}</span>
                  <span className="lab-chip">{active.trlTarget}</span>
                  <span className="lab-chip">{active.scope}</span>
                </div>
                <h2 className="text-2xl font-bold text-[#E024A5] sy">{active.name}</h2>
                {active.tagline && <p className="text-sm text-[var(--brand-teal-text)] mt-0.5">{active.tagline}</p>}
                <p className="text-xs text-brand-textMuted mt-1">Origen: {active.origin.label}{active.origin.code ? ` (${active.origin.code})` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ReportActions getReport={() => prototipadoReport(prompt0Data, active)} />
                <button type="button" className="lab-btn" onClick={() => remove(active)} aria-label={`Eliminar ${active.name}`}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </header>
            <PlanView plan={active} />
          </article>
        </div>
      ) : (
        !progress && (
          <EmptyState title="Aún no hay planes">
            Escribe una idea o elige un resultado del Árbol. El plan queda guardado en este navegador, con su informe formal en Word o PDF.
          </EmptyState>
        )
      )}
    </div>
  );
};

export default PrototipadoView;
