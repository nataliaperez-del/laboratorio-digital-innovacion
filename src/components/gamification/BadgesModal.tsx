import React, { useState } from 'react';
import {
  Trophy,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Award,
  Zap,
  Printer,
  FileCheck2,
  Eye,
  Layers
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  evaluateGamification,
  INNOVATION_BADGES,
  INNOVATION_RANKS,
} from '@/lib/gamification';
import { BadgeGraphicRenderer, RankEmblem } from './BadgeGraphics';
import { openCertificatePrintWindow } from '@/lib/certificatePdfExport';
import type { ToolId } from '@/components/layout/Header';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tool: ToolId) => void;
}

export const BadgesModal: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const {
    containerData,
    savedStudies,
    themeProposalMarkdown,
    savedIdeations,
    treeGraph,
    savedTrees,
    prototypes,
    zoeInteractions,
    prompt0Data,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'vitrina' | 'credencial'>('vitrina');

  if (!isOpen) return null;

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

  const { unlockedBadgeIds, totalXp, currentRank, nextRank, progressPercent } = gamification;

  const getToolForBadge = (badgeId: string): ToolId | null => {
    switch (badgeId) {
      case 'pionero_territorial':
        return 'estudio';
      case 'visionario_estrategico':
        return 'ideacion';
      case 'arquitecto_tendencias':
        return 'arbol';
      case 'ingeniero_prototipos':
        return 'prototipado';
      case 'custodio_conocimiento':
        return 'banco';
      default:
        return null;
    }
  };

  const handleGoToTool = (badgeId: string) => {
    const tool = getToolForBadge(badgeId);
    if (tool && onNavigate) {
      onNavigate(tool);
      onClose();
    }
  };

  const handlePrintCertificate = () => {
    openCertificatePrintWindow({
      recipientName: prompt0Data.labName || 'Equipo Innovador UNAD',
      territoryName: prompt0Data.municipality || 'Territorio Regional',
      department: prompt0Data.department || '',
      zonaUNAD: prompt0Data.zonaUNAD || 'UNAD',
      rank: currentRank,
      totalXp,
      unlockedBadgeIds,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badges-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl g2 border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{
          boxShadow: `0 0 60px rgba(39, 220, 255, 0.18)`,
        }}
      >
        {/* Cabecera del Modal */}
        <header className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.25)]">
              <Trophy className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 id="badges-modal-title" className="text-lg sm:text-xl font-bold text-white sy">
                Vitrina y Credencial de Innovación
              </h2>
              <p className="text-xs text-brand-textMuted">
                Acreditación de competencias en experimentación regional InnovaHub360
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas internas del Modal */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('vitrina')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'vitrina'
                    ? 'bg-[#27DCFF]/20 text-[#27DCFF] border border-[#27DCFF]/40 shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Insignias
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credencial')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'credencial'
                    ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Credencial PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintCertificate}
              className="px-3 py-2 rounded-xl bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] text-xs font-bold border border-[#FFD700]/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(255,215,0,0.2)]"
              title="Descargar o Imprimir Certificado en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'vitrina' ? (
            <>
              {/* Tarjeta de Rango Actual y Progreso XP */}
              <div
                className="p-5 sm:p-6 rounded-2xl border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
                style={{
                  backgroundColor: `${currentRank.color}10`,
                  borderColor: `${currentRank.color}40`,
                  boxShadow: `0 0 30px ${currentRank.color}15`,
                }}
              >
                {/* Glow de fondo */}
                <div
                  className="absolute -right-16 -top-16 w-48 h-48 rounded-full pointer-events-none opacity-20"
                  style={{ background: `radial-gradient(circle, ${currentRank.color} 0%, transparent 70%)` }}
                />

                {/* Emblema y datos del rango */}
                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                  <div
                    className="w-18 h-18 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg bg-black/40"
                    style={{
                      borderColor: currentRank.color,
                      boxShadow: `0 0 20px ${currentRank.color}40`,
                    }}
                  >
                    <RankEmblem level={currentRank.level} size={56} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A6C0CA] block">
                      Rango Actual · Nivel {currentRank.level}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white sy leading-snug">
                      {currentRank.title}
                    </h3>
                    <p className="text-xs text-brand-textSecondary mt-0.5 max-w-md">
                      {currentRank.description}
                    </p>
                  </div>
                </div>

                {/* Barra de Progreso XP */}
                <div className="w-full md:w-72 space-y-2 relative z-10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#FFD700]" /> {totalXp} XP Acumulado
                    </span>
                    <span className="text-brand-textMuted">
                      {nextRank ? `Meta: ${nextRank.minXp} XP` : 'Nivel Máximo'}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: currentRank.color,
                        boxShadow: `0 0 10px ${currentRank.color}`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-brand-textMuted">
                    <span>{unlockedBadgeIds.length} de {INNOVATION_BADGES.length} Insignias</span>
                    <span>{nextRank ? `Próximo: ${nextRank.title}` : '¡Maestría completa!'}</span>
                  </div>
                </div>
              </div>

              {/* Grilla de Insignias Vectoriales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#5EC2DD] sy">
                    Insignias del Laboratorio
                  </h3>
                  <span className="text-xs text-brand-textMuted">
                    Diseños holográficos por eje de innovación
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INNOVATION_BADGES.map((badge) => {
                    const isUnlocked = unlockedBadgeIds.includes(badge.id);
                    const toolTarget = getToolForBadge(badge.id);

                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
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
                        {/* Header con la Insignia Gráfica Vectorial */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="shrink-0 transition-transform hover:scale-105">
                              <BadgeGraphicRenderer badgeId={badge.id} size={54} isUnlocked={isUnlocked} />
                            </div>

                            <div className="flex flex-col items-end gap-1">
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
                                <span className="text-[10px] text-[#A8C63C] font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Ganada
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/40 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Bloqueada
                                </span>
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

                        {/* Footer con criterio de desbloqueo o enlace */}
                        <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                          {isUnlocked ? (
                            <span className="text-[11px] text-[#A8C63C] font-semibold">
                              ¡Acreditada en Banco!
                            </span>
                          ) : (
                            <span className="text-[11px] text-brand-textMuted line-clamp-1" title={badge.howToUnlock}>
                              {badge.howToUnlock}
                            </span>
                          )}

                          {!isUnlocked && toolTarget && onNavigate && (
                            <button
                              type="button"
                              onClick={() => handleGoToTool(badge.id)}
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
            </>
          ) : (
            /* Vista Previa de la Credencial de Certificación */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-textMuted">
                  Vista previa de la credencial oficial expedida por el Observatorio InnovaHub360 y la UNAD - VIEM:
                </span>
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="metal px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Descargar o Imprimir PDF
                </button>
              </div>

              {/* Certificado Maquetado en Pantalla Estilo Diploma de Lujo */}
              <div
                className="p-6 sm:p-8 rounded-2xl border-2 relative overflow-hidden text-center space-y-4"
                style={{
                  background: 'radial-gradient(ellipse at center, #06313D 0%, #031C24 60%, #011015 100%)',
                  borderColor: '#D4AF37',
                  boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.8)',
                }}
              >
                {/* Bordes Ornamentales Internos */}
                <div className="border border-[#D4AF37]/40 p-6 rounded-xl space-y-4 relative z-10">
                  <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-3 text-left">
                    <div>
                      <span className="text-sm font-bold text-[#5EC2DD] tracking-wider uppercase">
                        INNOVA<span className="text-[#A8C63C]">HUB</span><span className="text-[#F29F05]">360</span>
                      </span>
                      <span className="text-[10px] text-brand-textMuted block font-mono">
                        LABORATORIO DE INNOVACIÓN EN LÍNEA
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-brand-textMuted">
                      <strong className="text-white block">VICERRECTORÍA DE INNOVACIÓN Y EMPRENDIMIENTO (VIEM)</strong>
                      UNAD · Acreditada Institucionalmente en Alta Calidad
                    </div>
                  </div>

                  <div className="py-2 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold block">
                      Acreditación de Competencias y Mérito Metodológico
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white uppercase sy tracking-wide">
                      Certificado de Competencias en Innovación
                    </h3>
                    <p className="text-xs text-brand-textSecondary max-w-lg mx-auto">
                      El Observatorio InnovaHub360 y la Vicerrectoría VIEM de la UNAD certifican que:
                    </p>

                    <div className="text-2xl sm:text-3xl font-bold text-[#FFD700] py-2 border-b-2 border-[#D4AF37]/50 inline-block px-8 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                      {prompt0Data.labName || 'Equipo Innovador UNAD'}
                    </div>

                    <p className="text-xs text-brand-textSecondary max-w-xl mx-auto pt-2">
                      Ha estructurado soluciones de innovación regional en el territorio de{' '}
                      <strong className="text-white">
                        {prompt0Data.municipality || 'Territorio Regional'}
                        {prompt0Data.department ? `, ${prompt0Data.department}` : ''}
                      </strong>{' '}
                      ({prompt0Data.zonaUNAD || 'UNAD'}), alcanzando con excelencia el rango de:
                    </p>

                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#04222B] border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)] my-2">
                      <RankEmblem level={currentRank.level} size={32} />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        Nivel {currentRank.level}: {currentRank.title}
                      </span>
                      <span className="text-xs font-bold text-[#FFD700]">★ {totalXp} XP</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase tracking-wider text-brand-textMuted block mb-2 font-bold">
                      Insignias Oficiales Registradas ({unlockedBadgeIds.length} de {INNOVATION_BADGES.length}):
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {INNOVATION_BADGES.filter((b) => unlockedBadgeIds.includes(b.id)).map((b) => (
                        <div
                          key={b.id}
                          className="px-3 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${b.color}15`,
                            borderColor: `${b.color}40`,
                            color: b.color,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                          <span>{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#D4AF37]/30 pt-3 text-xs text-brand-textMuted text-left">
                    <div>
                      <span>Fecha: {new Date().toLocaleDateString('es-CO')}</span>
                      <span className="block text-[10px] text-brand-textMuted">Registro Banco Unificado InnovaHub360</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold block">Vicerrectoría VIEM / InnovaHub360</span>
                      <span className="text-[10px]">Acreditación Oficial UNAD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-brand-textMuted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
            Las insignias y la credencial validan el rigor metodológico y el impacto en las regiones.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
