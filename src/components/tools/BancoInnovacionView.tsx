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
  FileText,
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import { useStore, type SavedStudy, type SavedIdeation, type SavedTree } from '@/store/useStore';
import { ToolHeader, EmptyState, ReportActions } from '@/components/lab/common';
import { PlanView } from './PrototipadoView';
import { SectionReview } from '@/components/lab/common';
import { CONTENEDOR2_SECTIONS } from '@/prompts/contenedor2Sections';
import { estudioReport, ideacionReport, arbolReport, prototipadoReport } from '@/lib/labReports';
import { evaluateGamification, INNOVATION_BADGES } from '@/lib/gamification';
import type { PrototypePlan } from '@/services/prototyping';
import type { ToolId } from '@/components/layout/Header';

export type BancoTab = 'estudio' | 'ideacion' | 'arbol' | 'prototipado' | 'logros';

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
    zoeInteractions,
  } = useStore();

  const gamification = evaluateGamification({
    containerData,
    savedStudies,
    themeProposalMarkdown,
    savedIdeations,
    treeGraph,
    savedTrees,
    prototypes,
    zoeInteractions,
  });

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
    {
      id: 'logros' as BancoTab,
      label: 'Insignias y Logros',
      icon: Trophy,
      color: '#FFD700',
      count: gamification.unlockedBadgeIds.length,
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

      {/* Pestañas de las 4 Líneas Estratégicas + Insignias */}
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                isActive
                  ? 'scale-[1.02] shadow-lg'
                  : 'bg-white/5 border-white/10 text-brand-textSecondary hover:text-white hover:bg-white/10'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `${t.color}25`,
                      borderColor: t.color,
                      color: '#FFFFFF',
                      boxShadow: `0 0 16px ${t.color}40`,
                    }
                  : undefined
              }
            >
              <Icon className="w-4 h-4" style={{ color: t.color }} />
              <span>{t.label}</span>
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono border"
                style={{
                  backgroundColor: `${t.color}20`,
                  borderColor: `${t.color}50`,
                  color: t.color,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* PESTAÑA 1: ESTUDIO TERRITORIAL */}
      {activeTab === 'estudio' && (
        <div className="space-y-4">
          {savedStudies.length === 0 && !containerData.trim() ? (
            <EmptyState title="No hay estudios territoriales en el Banco">
              Cuando generes un Estudio Territorial completo en el taller, guárdalo para consultarlo aquí en cualquier momento.
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('estudio')}
                  className="metal px-4 py-2 text-xs font-bold flex items-center gap-2 mx-auto"
                >
                  Ir al Taller de Estudio <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Lista lateral de estudios archivados */}
              <aside className="lg:col-span-4 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-[#A8C63C] font-bold block mb-1">
                  Estudios Registrados
                </span>

                {/* Si hay un estudio en la sesión actual pero no guardado formalmente */}
                {containerData.trim() && (
                  <div
                    onClick={() => setSelectedStudyId('current')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedStudyId === 'current'
                        ? 'bg-[#A8C63C]/20 border-[#A8C63C] shadow-[0_0_12px_rgba(168,198,60,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span>{prompt0Data.municipality || 'Sesión Activa'}</span>
                      <span className="text-[10px] text-[#A8C63C] px-1.5 py-0.2 rounded bg-[#A8C63C]/20 border border-[#A8C63C]/40">
                        En Taller
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-textMuted line-clamp-1">
                      {prompt0Data.department} · {prompt0Data.zonaUNAD}
                    </p>
                  </div>
                )}

                {savedStudies.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudyId(st.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      selectedStudyId === st.id
                        ? 'bg-[#A8C63C]/20 border-[#A8C63C] shadow-[0_0_12px_rgba(168,198,60,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{st.territoryName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar el estudio de «${st.territoryName}» del Banco?`)) {
                            removeSavedStudy(st.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-all"
                        title="Eliminar del Banco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-brand-textMuted line-clamp-1">
                      {st.department} · {new Date(st.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </aside>

              {/* Vista detallada del estudio seleccionado */}
              {(() => {
                const isCurrent = selectedStudyId === 'current';
                const study = isCurrent
                  ? {
                      territoryName: prompt0Data.municipality || 'Territorio de la sesión',
                      department: prompt0Data.department,
                      zonaUNAD: prompt0Data.zonaUNAD,
                      prompt0Data,
                      containerData,
                      sections: contenedor2Sections,
                    }
                  : savedStudies.find((s) => s.id === selectedStudyId) ?? savedStudies[0];

                if (!study) return null;

                return (
                  <article className="lg:col-span-8 lab-panel space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <span className="text-[11px] text-[#A8C63C] font-semibold uppercase tracking-wider">
                          Diagnóstico Territorial MDVT
                        </span>
                        <h2 className="text-xl font-bold text-white sy">{study.territoryName}</h2>
                        <p className="text-xs text-brand-textMuted mt-0.5">
                          {study.department} · {study.zonaUNAD}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReportActions getReport={() => estudioReport(study.prompt0Data, study.containerData)} />
                        <button
                          type="button"
                          onClick={() => {
                            setPrompt0Data(study.prompt0Data);
                            setContainerData(study.containerData);
                            setContenedor2Sections(study.sections);
                            onNavigate('estudio');
                          }}
                          className="lab-btn lab-btn-sm text-[#A8C63C] border-[#A8C63C]/40 hover:bg-[#A8C63C]/15"
                        >
                          Cargar en Taller <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </header>

                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                      {study.sections && study.sections.length > 0 ? (
                        study.sections.map((sec) => (
                          <div key={sec.number} className="lab-card space-y-2">
                            <span className="text-[11px] font-bold text-[#A8C63C] block">
                              Bloque {sec.number} · {sec.title}
                            </span>
                            <div className="text-xs text-white/90 leading-relaxed whitespace-pre-line">
                              {sec.markdown.slice(0, 350)}…
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-white/80 whitespace-pre-line">
                          {study.containerData.slice(0, 1500)}…
                        </div>
                      )}
                    </div>
                  </article>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: IDEACIÓN ESTRATÉGICA */}
      {activeTab === 'ideacion' && (
        <div className="space-y-4">
          {savedIdeations.length === 0 && !themeProposalMarkdown.trim() ? (
            <EmptyState title="No hay propuestas de ideación en el Banco">
              Formula alternativas estratégicas y selección de tema para archivarlas en esta sección.
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('ideacion')}
                  className="metal px-4 py-2 text-xs font-bold flex items-center gap-2 mx-auto"
                >
                  Ir al Taller de Ideación <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <aside className="lg:col-span-4 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-[#F29F05] font-bold block mb-1">
                  Propuestas de Ideación
                </span>

                {themeProposalMarkdown.trim() && (
                  <div
                    onClick={() => setSelectedIdeationId('current')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedIdeationId === 'current'
                        ? 'bg-[#F29F05]/20 border-[#F29F05] shadow-[0_0_12px_rgba(242,159,5,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{ideationSource?.label || 'Sesión Activa'}</span>
                      <span className="text-[10px] text-[#F29F05] px-1.5 py-0.2 rounded bg-[#F29F05]/20 border border-[#F29F05]/40">
                        En Taller
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-textMuted">Propuesta en desarrollo</p>
                  </div>
                )}

                {savedIdeations.map((id) => (
                  <div
                    key={id.id}
                    onClick={() => setSelectedIdeationId(id.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      selectedIdeationId === id.id
                        ? 'bg-[#F29F05]/20 border-[#F29F05] shadow-[0_0_12px_rgba(242,159,5,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{id.topicName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar la ideación «${id.topicName}» del Banco?`)) {
                            removeSavedIdeation(id.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-all"
                        title="Eliminar del Banco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-brand-textMuted line-clamp-1">
                      {id.sourceLabel} · {new Date(id.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </aside>

              {(() => {
                const isCurrent = selectedIdeationId === 'current';
                const ideation = isCurrent
                  ? {
                      topicName: ideationSource?.label || 'Ideación en curso',
                      sourceLabel: ideationSource?.label || 'General',
                      markdown: themeProposalMarkdown,
                      sections: vocationSections,
                    }
                  : savedIdeations.find((i) => i.id === selectedIdeationId) ?? savedIdeations[0];

                if (!ideation) return null;

                return (
                  <article className="lg:col-span-8 lab-panel space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <span className="text-[11px] text-[#F29F05] font-semibold uppercase tracking-wider">
                          Vocación y Selección de Temas
                        </span>
                        <h2 className="text-xl font-bold text-white sy">{ideation.topicName}</h2>
                        <p className="text-xs text-brand-textMuted mt-0.5">Insumo: {ideation.sourceLabel}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReportActions
                          getReport={() => ideacionReport(prompt0Data, ideation.markdown, ideation.sourceLabel)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIdeationResult(
                              { kind: 'texto', label: ideation.topicName, text: ideation.markdown },
                              ideation.markdown,
                              ideation.sections,
                            );
                            onNavigate('ideacion');
                          }}
                          className="lab-btn lab-btn-sm text-[#F29F05] border-[#F29F05]/40 hover:bg-[#F29F05]/15"
                        >
                          Cargar en Taller <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </header>

                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="text-xs text-white/90 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-white/5 border border-white/10">
                        {ideation.markdown}
                      </div>
                    </div>
                  </article>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: ÁRBOLES DE INNOVACIÓN */}
      {activeTab === 'arbol' && (
        <div className="space-y-4">
          {savedTrees.length === 0 && !treeGraph ? (
            <EmptyState title="No hay árboles de innovación en el Banco">
              Genera árboles holográficos de tendencias y guárdalos para consulta y análisis de frutos.
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('arbol')}
                  className="metal px-4 py-2 text-xs font-bold flex items-center gap-2 mx-auto"
                >
                  Ir al Taller del Árbol <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <aside className="lg:col-span-4 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-[#5EC2DD] font-bold block mb-1">
                  Árboles Registrados
                </span>

                {treeGraph && (
                  <div
                    onClick={() => setSelectedTreeId('current')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTreeId === 'current'
                        ? 'bg-[#5EC2DD]/20 border-[#5EC2DD] shadow-[0_0_12px_rgba(94,194,221,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{treeGraph.tema}</span>
                      <span className="text-[10px] text-[#5EC2DD] px-1.5 py-0.2 rounded bg-[#5EC2DD]/20 border border-[#5EC2DD]/40">
                        En Taller
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-textMuted">{treeGraph.nodos.length} nodos conectados</p>
                  </div>
                )}

                {savedTrees.map((tr) => (
                  <div
                    key={tr.id}
                    onClick={() => setSelectedTreeId(tr.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      selectedTreeId === tr.id
                        ? 'bg-[#5EC2DD]/20 border-[#5EC2DD] shadow-[0_0_12px_rgba(94,194,221,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{tr.theme}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar el árbol «${tr.theme}» del Banco?`)) {
                            removeSavedTree(tr.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-all"
                        title="Eliminar del Banco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-brand-textMuted line-clamp-1">
                      {tr.graph.nodos.length} nodos · {new Date(tr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </aside>

              {(() => {
                const isCurrent = selectedTreeId === 'current';
                const tree = isCurrent
                  ? {
                      theme: treeGraph?.tema || 'Árbol en curso',
                      markdown: innovationTreeMarkdown,
                      graph: treeGraph,
                    }
                  : savedTrees.find((t) => t.id === selectedTreeId) ?? savedTrees[0];

                if (!tree || !tree.graph) return null;

                return (
                  <article className="lg:col-span-8 lab-panel space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <span className="text-[11px] text-[#5EC2DD] font-semibold uppercase tracking-wider">
                          Estructura de Tendencias y Frutos
                        </span>
                        <h2 className="text-xl font-bold text-white sy">{tree.theme}</h2>
                        <p className="text-xs text-brand-textMuted mt-0.5">
                          {tree.graph.nodos.length} nodos holográficos verificados
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReportActions
                          getReport={() => (tree.graph ? arbolReport(prompt0Data, tree.markdown, tree.graph) : null)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTreeResult(
                              { themeName: tree.theme, themeExplanation: '', useTerritorialStudy: true },
                              tree.markdown,
                              [],
                              tree.graph!,
                            );
                            onNavigate('arbol');
                          }}
                          className="lab-btn lab-btn-sm text-[#5EC2DD] border-[#5EC2DD]/40 hover:bg-[#5EC2DD]/15"
                        >
                          Cargar en Taller <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </header>

                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
                        Frutos y Oportunidades del Árbol:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tree.graph.nodos
                          .filter((n) => n.nivel === 'fruto' || n.nivel === 'hoja')
                          .map((node) => (
                            <div key={node.codigo} className="lab-card space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-[#5EC2DD]">{node.codigo}</span>
                                <span className="capitalize text-brand-textMuted">{node.tipo_fruto || 'Fruto'}</span>
                              </div>
                              <h4 className="text-xs font-bold text-white">{node.nombre}</h4>
                              {node.solucion && (
                                <p className="text-[11px] text-brand-textSecondary leading-snug">
                                  {node.solucion}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </article>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: PLANES DE PROTOTIPADO */}
      {activeTab === 'prototipado' && (
        <div className="space-y-4">
          {prototypes.length === 0 ? (
            <EmptyState title="No hay planes de prototipado en el Banco">
              Diseña soluciones e hipótesis en el Taller de Prototipado para guardarlas en este banco.
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('prototipado')}
                  className="metal px-4 py-2 text-xs font-bold flex items-center gap-2 mx-auto"
                >
                  Ir al Taller de Prototipado <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <aside className="lg:col-span-4 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-[#E024A5] font-bold block mb-1">
                  Planes de Prototipado ({prototypes.length})
                </span>

                {prototypes.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPrototypeId(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      (selectedPrototypeId ?? prototypes[0]?.id) === p.id
                        ? 'bg-[#E024A5]/20 border-[#E024A5] shadow-[0_0_12px_rgba(224,36,165,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="line-clamp-1">{p.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar «${p.name}» del Banco?`)) {
                            removePrototype(p.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-all"
                        title="Eliminar del Banco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-brand-textMuted">
                      <span>{p.category}</span>
                      <span className="font-mono text-[#E024A5]">TRL {p.trl}</span>
                    </div>
                  </div>
                ))}
              </aside>

              {(() => {
                const activePlan = prototypes.find((p) => p.id === (selectedPrototypeId ?? prototypes[0]?.id)) ?? prototypes[0];
                if (!activePlan) return null;

                return (
                  <article className="lg:col-span-8 lab-panel space-y-5">
                    <header className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="lab-chip text-[#E024A5] border-[#E024A5]/30">TRL {activePlan.trl}</span>
                          <span className="lab-chip">{activePlan.category}</span>
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

      {/* PESTAÑA 5: INSIGNIAS Y LOGROS DE INNOVACIÓN */}
      {activeTab === 'logros' && (
        <div className="space-y-6">
          {/* Tarjeta de Rango Actual y Progreso XP */}
          <div
            className="p-5 sm:p-6 rounded-2xl border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
            style={{
              backgroundColor: `${gamification.currentRank.color}10`,
              borderColor: `${gamification.currentRank.color}40`,
              boxShadow: `0 0 30px ${gamification.currentRank.color}15`,
            }}
          >
            {/* Información del Rango */}
            <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg"
                style={{
                  backgroundColor: `${gamification.currentRank.color}25`,
                  borderColor: gamification.currentRank.color,
                  boxShadow: `0 0 20px ${gamification.currentRank.color}40`,
                }}
              >
                <Award className="w-8 h-8" style={{ color: gamification.currentRank.color }} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A6C0CA] block">
                  Rango Actual · Nivel {gamification.currentRank.level}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white sy leading-snug">
                  {gamification.currentRank.title}
                </h3>
                <p className="text-xs text-brand-textSecondary mt-0.5 max-w-md">
                  {gamification.currentRank.description}
                </p>
              </div>
            </div>

            {/* Barra de Progreso XP */}
            <div className="w-full md:w-72 space-y-2 relative z-10">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FFD700]" /> {gamification.totalXp} XP Acumulado
                </span>
                <span className="text-brand-textMuted">
                  {gamification.nextRank ? `Meta: ${gamification.nextRank.minXp} XP` : 'Nivel Máximo'}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{
                    width: `${gamification.progressPercent}%`,
                    backgroundColor: gamification.currentRank.color,
                    boxShadow: `0 0 10px ${gamification.currentRank.color}`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-brand-textMuted">
                <span>{gamification.unlockedBadgeIds.length} de {INNOVATION_BADGES.length} Insignias</span>
                <span>{gamification.nextRank ? `Próximo: ${gamification.nextRank.title}` : '¡Maestría alcanzada!'}</span>
              </div>
            </div>
          </div>

          {/* Vitrina de Insignias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INNOVATION_BADGES.map((badge) => {
              const isUnlocked = gamification.unlockedBadgeIds.includes(badge.id);
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isUnlocked
                      ? 'bg-white/[0.04] backdrop-blur-md shadow-sm'
                      : 'bg-black/25 opacity-70 border-white/10'
                  }`}
                  style={
                    isUnlocked
                      ? {
                          borderColor: `${badge.color}50`,
                          boxShadow: `0 0 20px ${badge.color}15`,
                        }
                      : undefined
                  }
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform hover:scale-105"
                        style={{
                          backgroundColor: isUnlocked ? `${badge.color}25` : 'rgba(255,255,255,0.05)',
                          borderColor: isUnlocked ? badge.color : 'rgba(255,255,255,0.15)',
                          boxShadow: isUnlocked ? `0 0 14px ${badge.color}40` : 'none',
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: isUnlocked ? badge.color : 'rgba(255,255,255,0.4)' }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: isUnlocked ? badge.color : 'rgba(255,255,255,0.5)',
                            borderColor: isUnlocked ? `${badge.color}40` : 'rgba(255,255,255,0.1)',
                            backgroundColor: isUnlocked ? `${badge.color}15` : 'transparent',
                          }}
                        >
                          +{badge.xp} XP
                        </span>
                        {isUnlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#A8C63C]" title="Insignia desbloqueada" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-white/40" title="Insignia bloqueada" />
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white sy leading-snug">
                      {badge.title}
                    </h4>
                    <span className="text-[11px] font-semibold text-[#5EC2DD] block mt-0.5">
                      {badge.subtitle}
                    </span>
                    <p className="text-xs text-brand-textSecondary mt-2 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    {isUnlocked ? (
                      <span className="text-[11px] text-[#A8C63C] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Desbloqueada
                      </span>
                    ) : (
                      <span className="text-[11px] text-brand-textMuted line-clamp-1" title={badge.howToUnlock}>
                        {badge.howToUnlock}
                      </span>
                    )}

                    {!isUnlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          if (badge.id === 'pionero_territorial') onNavigate('estudio');
                          else if (badge.id === 'visionario_estrategico') onNavigate('ideacion');
                          else if (badge.id === 'arquitecto_tendencias') onNavigate('arbol');
                          else if (badge.id === 'ingeniero_prototipos') onNavigate('prototipado');
                          else if (badge.id === 'custodio_conocimiento') setActiveTab('prototipado');
                        }}
                        className="text-[11px] font-semibold text-[#27DCFF] hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                      >
                        <span>Ir al taller</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BancoInnovacionView;
