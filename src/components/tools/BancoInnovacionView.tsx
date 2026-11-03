import React, { useState } from 'react';
import {
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  FolderArchive,
  Trash2,
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useStore, type SavedStudy, type SavedIdeation, type SavedTree } from '@/store/useStore';
import { ToolHeader, EmptyState, ReportActions } from '@/components/lab/common';
import { PlanView } from './PrototipadoView';
import { SectionReview } from '@/components/lab/common';
import { CONTENEDOR2_SECTIONS } from '@/prompts/contenedor2Sections';
import { estudioReport, ideacionReport, arbolReport, prototipadoReport } from '@/lib/labReports';
import type { PrototypePlan } from '@/services/prototyping';
import type { ToolId } from '@/components/layout/Header';

export type BancoTab = 'estudio' | 'ideacion' | 'arbol' | 'prototipado';

interface Props {
  onNavigate: (tool: ToolId) => void;
  defaultTab?: BancoTab;
}

export const BancoInnovacionView: React.FC<Props> = ({ onNavigate, defaultTab = 'prototipado' }) => {
  const [activeTab, setActiveTab] = useState<BancoTab>(defaultTab);

  const {
    savedStudies,
    removeSavedStudy,
    containerData,
    prompt0Data,
    contenedor2Sections,
    savedIdeations,
    removeSavedIdeation,
    themeProposalMarkdown,
    vocationSections,
    ideationSource,
    savedTrees,
    removeSavedTree,
    treeGraph,
    innovationTreeMarkdown,
    prototypes,
    removePrototype,
    setContainerData,
    setPrompt0Data,
    setContenedor2Sections,
    setIdeationResult,
    setTreeResult,
  } = useStore();

  // Selección activa por pestaña
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(
    savedStudies[0]?.id ?? (containerData.trim() ? 'current' : null),
  );
  const [selectedIdeationId, setSelectedIdeationId] = useState<string | null>(
    savedIdeations[0]?.id ?? (themeProposalMarkdown.trim() ? 'current' : null),
  );
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(
    savedTrees[0]?.id ?? (treeGraph ? 'current' : null),
  );
  const [selectedPrototypeId, setSelectedPrototypeId] = useState<string | null>(prototypes[0]?.id ?? null);

  const tabs = [
    {
      id: 'estudio' as BancoTab,
      label: 'Estudio Territorial',
      icon: Layers,
      color: '#A8C63C',
      count: savedStudies.length + (containerData.trim() ? 1 : 0),
    },
    {
      id: 'ideacion' as BancoTab,
      label: 'Ideación Estratégica',
      icon: BrainCircuit,
      color: '#F29F05',
      count: savedIdeations.length + (themeProposalMarkdown.trim() ? 1 : 0),
    },
    {
      id: 'arbol' as BancoTab,
      label: 'Árboles de Innovación',
      icon: Trees,
      color: '#5EC2DD',
      count: savedTrees.length + (treeGraph ? 1 : 0),
    },
    {
      id: 'prototipado' as BancoTab,
      label: 'Planes de Prototipado',
      icon: Rocket,
      color: '#E024A5',
      count: prototypes.length,
    },
  ];

  const activeMeta = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Principal del Banco Unificado */}
      <ToolHeader
        title="Banco Unificado de Innovación"
        titleColor="#A78BFA"
        description="Repositorio transversal del Laboratorio. Centraliza, consulta y descarga los ejercicios relevantes y completos desarrollados en las cuatro líneas estratégicas, sin interferir en los talleres de trabajo."
      />

      {/* Pestañas de las 4 Líneas Estratégicas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'border-current shadow-lg scale-102'
                  : 'bg-white/5 border-white/10 text-brand-textSecondary hover:text-white hover:bg-white/10'
              }`}
              style={{
                color: isActive ? t.color : undefined,
                backgroundColor: isActive ? `${t.color}18` : undefined,
                borderColor: isActive ? t.color : undefined,
                boxShadow: isActive ? `0 0 16px ${t.color}35` : undefined,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: t.color }} />
              <span>{t.label}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: `${t.color}25`,
                  color: t.color,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          SECCIÓN 1: ESTUDIOS TERRITORIALES
          ========================================================================= */}
      {activeTab === 'estudio' && (
        <div className="w-full">
          {savedStudies.length === 0 && !containerData.trim() ? (
            <EmptyState title="No hay estudios territoriales depositados">
              El Banco de Estudios Territoriales preserva los diagnósticos completos en 12 puntos generados con la metodología MDVT.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('estudio')}
                  className="lab-btn text-[#A8C63C] border-[#A8C63C]/40 hover:bg-[#A8C63C]/15"
                >
                  <Layers className="w-4 h-4" />
                  <span>Ir al Taller de Estudio Territorial</span>
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
              {/* Lista lateral de estudios */}
              <nav className="space-y-2.5" aria-label="Estudios territoriales guardados">
                <h3 className="text-xs uppercase tracking-wider text-[#A8C63C] font-bold block mb-2 m">
                  Estudios Registrados ({savedStudies.length + (containerData.trim() ? 1 : 0)})
                </h3>

                {/* Estudio activo en memoria de sesión */}
                {containerData.trim() && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudyId('current')}
                    className={`lab-card text-left w-full transition-all cursor-pointer ${
                      selectedStudyId === 'current' ? 'is-selected border-[#A8C63C]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#A8C63C] font-mono mb-1">
                      <span>Sesión Vigente</span>
                      <span className="w-2 h-2 rounded-full bg-[#A8C63C] shadow-[0_0_6px_#A8C63C]" />
                    </div>
                    <span className="text-sm font-bold text-white block sy">
                      {prompt0Data.municipality || 'Territorio'}, {prompt0Data.department || 'Colombia'}
                    </span>
                    <span className="text-xs text-brand-textMuted block mt-0.5">
                      Zona UNAD: {prompt0Data.zonaUNAD || 'General'}
                    </span>
                  </button>
                )}

                {/* Historial guardado */}
                {savedStudies.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStudyId(s.id)}
                    className={`lab-card text-left w-full transition-all cursor-pointer ${
                      selectedStudyId === s.id ? 'is-selected border-[#A8C63C]' : ''
                    }`}
                  >
                    <span className="text-[10px] text-brand-textMuted block mb-1">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-bold text-white block sy">
                      {s.territoryName}, {s.department}
                    </span>
                    <span className="text-xs text-brand-textMuted block mt-0.5">
                      Zona {s.zonaUNAD}
                    </span>
                  </button>
                ))}
              </nav>

              {/* Detalle del estudio seleccionado */}
              <article className="lab-panel space-y-5 min-w-0">
                <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#A8C63C]/15 text-[#A8C63C] border border-[#A8C63C]/30">
                      Metodología MDVT · 12 Puntos
                    </span>
                    <h2 className="text-2xl font-bold text-[#A8C63C] sy mt-1">
                      {prompt0Data.municipality || 'Diagnóstico Territorial'}, {prompt0Data.department || 'Colombia'}
                    </h2>
                    <p className="text-xs text-brand-textMuted mt-1">
                      Zona UNAD: {prompt0Data.zonaUNAD || 'Nacional'} · {prompt0Data.country}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('estudio')}
                      className="lab-btn lab-btn-sm text-[#A8C63C] border-[#A8C63C]/40 hover:bg-[#A8C63C]/15"
                    >
                      <span>Abrir en Taller</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <ReportActions getReport={() => estudioReport(prompt0Data, containerData)} />
                  </div>
                </header>

                <div className="space-y-4">
                  {contenedor2Sections.map((s) => {
                    const meta = CONTENEDOR2_SECTIONS.find((c) => c.number === s.number);
                    return (
                      <div key={s.number} className="lab-card space-y-2">
                        <h4 className="text-xs font-bold text-[#A8C63C] uppercase tracking-wide">
                          Punto {s.number}: {meta?.title || `Sección ${s.number}`}
                        </h4>
                        <div className="text-sm text-brand-textSecondary leading-relaxed whitespace-pre-line">
                          {s.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 2: IDEACIÓN ESTRATÉGICA
          ========================================================================= */}
      {activeTab === 'ideacion' && (
        <div className="w-full">
          {savedIdeations.length === 0 && !themeProposalMarkdown.trim() ? (
            <EmptyState title="No hay ejercicios de ideación depositados">
              El Banco de Ideación Estratégica preserva las propuestas de vocación, temas priorizados y alternativas estratégicas.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('ideacion')}
                  className="lab-btn text-[#F29F05] border-[#F29F05]/40 hover:bg-[#F29F05]/15"
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Ir al Taller de Ideación</span>
                </button>
              </div>
            </EmptyState>
          ) : (
            <article className="lab-panel space-y-5">
              <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#F29F05]/15 text-[#F29F05] border border-[#F29F05]/30">
                    Vocación & Tres Alternativas
                  </span>
                  <h2 className="text-2xl font-bold text-[#F29F05] sy mt-1">
                    {ideationSource?.label || 'Ejercicio de Ideación Estratégica'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('ideacion')}
                    className="lab-btn lab-btn-sm text-[#F29F05] border-[#F29F05]/40 hover:bg-[#F29F05]/15"
                  >
                    <span>Abrir en Taller</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <ReportActions
                    getReport={() =>
                      ideacionReport(prompt0Data, themeProposalMarkdown, ideationSource?.label || 'Ideación')
                    }
                  />
                </div>
              </header>

              <div className="space-y-4">
                {vocationSections.map((sec, idx) => (
                  <div key={idx} className="lab-card space-y-2">
                    <h4 className="text-xs font-bold text-[#F29F05] uppercase tracking-wide">
                      {sec.partTitle || `Parte ${idx + 1}`}
                    </h4>
                    <div className="text-sm text-brand-textSecondary leading-relaxed whitespace-pre-line">
                      {sec.markdown}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 3: ÁRBOLES DE INNOVACIÓN
          ========================================================================= */}
      {activeTab === 'arbol' && (
        <div className="w-full">
          {!treeGraph && savedTrees.length === 0 ? (
            <EmptyState title="No hay árboles de innovación depositados">
              El Banco de Árboles de Innovación resguarda las estructuras holográficas de tendencias (Globales, Colombia, Territorio y Frutos).
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('arbol')}
                  className="lab-btn text-[#5EC2DD] border-[#5EC2DD]/40 hover:bg-[#5EC2DD]/15"
                >
                  <Trees className="w-4 h-4" />
                  <span>Ir al Taller del Árbol</span>
                </button>
              </div>
            </EmptyState>
          ) : (
            <article className="lab-panel space-y-5">
              <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#5EC2DD]/15 text-[#5EC2DD] border border-[#5EC2DD]/30">
                    Circuito 10 Globales · 5 Colombia · 3 Territorio
                  </span>
                  <h2 className="text-2xl font-bold text-[#5EC2DD] sy mt-1">
                    Árbol: {treeGraph?.tema || 'Tema de Innovación'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('arbol')}
                    className="lab-btn lab-btn-sm text-[#5EC2DD] border-[#5EC2DD]/40 hover:bg-[#5EC2DD]/15"
                  >
                    <span>Explorar en Taller</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {treeGraph && (
                    <ReportActions getReport={() => arbolReport(prompt0Data, innovationTreeMarkdown, treeGraph)} />
                  )}
                </div>
              </header>

              {/* Nodos y frutos registrados */}
              {treeGraph && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {treeGraph.nodos.map((n) => (
                    <div key={n.codigo} className="lab-card space-y-1 border-l-2 border-[#5EC2DD]">
                      <span className="text-[10px] font-mono text-[#5EC2DD]">{n.codigo} · {n.nivel}</span>
                      <h4 className="text-xs font-bold text-white">{n.nombre}</h4>
                      <p className="text-[11px] text-brand-textSecondary leading-snug">{n.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 4: PLANES DE PROTOTIPADO
          ========================================================================= */}
      {activeTab === 'prototipado' && (
        <div className="w-full">
          {prototypes.length === 0 ? (
            <EmptyState title="No hay planes de prototipado depositados">
              El Banco de Prototipado almacena los planes completos de solución con hipótesis, arquitectura, cronograma de fases y métricas de validación.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('prototipado')}
                  className="lab-btn text-[#E024A5] border-[#E024A5]/40 hover:bg-[#E024A5]/15"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Ir al Taller de Prototipado</span>
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
              {/* Lista lateral de prototipos en el Banco */}
              <nav className="space-y-2" aria-label="Planes de prototipado en el Banco">
                <h3 className="text-xs uppercase tracking-wider text-[#E024A5] font-bold block mb-2 m">
                  Planes Depositados ({prototypes.length})
                </h3>
                {prototypes.map((p) => {
                  const isSelected = (selectedPrototypeId || prototypes[0]?.id) === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPrototypeId(p.id)}
                      className={`lab-card text-left w-full transition-all cursor-pointer ${
                        isSelected ? 'is-selected border-[#E024A5] shadow-[0_0_12px_rgba(224,36,165,0.25)]' : ''
                      }`}
                    >
                      <span className="text-[11px] text-brand-textMuted block">
                        {p.category} {p.origin.code ? `· ${p.origin.code}` : ''}
                      </span>
                      <span className="text-sm font-bold text-white sy block leading-snug">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-brand-textMuted m">
                        {p.durationWeeks ? `${p.durationWeeks} semanas` : 'Sin duración'}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Visualización y acciones del prototipo seleccionado */}
              {(() => {
                const activePlan =
                  prototypes.find((p) => p.id === (selectedPrototypeId || prototypes[0]?.id)) ?? prototypes[0];
                if (!activePlan) return null;
                return (
                  <article className="lab-panel space-y-5 min-w-0">
                    <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="lab-chip">{activePlan.category}</span>
                          <span className="lab-chip">{activePlan.trlTarget}</span>
                          <span className="lab-chip">{activePlan.scope}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#E024A5] sy">{activePlan.name}</h2>
                        {activePlan.tagline && (
                          <p className="text-sm text-[var(--brand-teal-text)] mt-0.5">{activePlan.tagline}</p>
                        )}
                        <p className="text-xs text-brand-textMuted mt-1">
                          Origen: {activePlan.origin.label}
                          {activePlan.origin.code ? ` (${activePlan.origin.code})` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ReportActions getReport={() => prototipadoReport(prompt0Data, activePlan)} />
                        <button
                          type="button"
                          className="lab-btn"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar «${activePlan.name}» del Banco?`)) {
                              removePrototype(activePlan.id);
                            }
                          }}
                          aria-label={`Eliminar ${activePlan.name}`}
                          title="Eliminar del Banco"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </header>

                    <PlanView plan={activePlan} />
                  </article>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BancoInnovacionView;
