import React from 'react';
import {
  Trophy,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Award,
  Zap,
  Download
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  evaluateGamification,
  INNOVATION_BADGES,
  INNOVATION_RANKS,
  type BadgeDefinition,
} from '@/lib/gamification';
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

  const handleDownloadCertificate = () => {
    const userName = prompt0Data.labName || 'Innovador UNAD';
    const territory = prompt0Data.municipality
      ? `${prompt0Data.municipality}, ${prompt0Data.department}`
      : 'Ecosistema InnovaHub360';
    const dateStr = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const certificateContent = `========================================================================
       RECONOCIMIENTO OFICIAL DE LOGROS EN INNOVACIÓN
                 OBSERVATORIO INNOVAHUB360 · VIEM - UNAD
========================================================================

Por medio del presente se certifica que:
NOMBRE / EQUIPO: ${userName}
TERRITORIO: ${territory}
FECHA DE EXPEDICIÓN: ${dateStr}

Ha alcanzado con distinción el rango de:
★ ${currentRank.title.toUpperCase()} (NIVEL ${currentRank.level}) ★
Total de Experiencia en Innovación: ${totalXp} XP
Insignias Oficiales Desbloqueadas: ${unlockedBadgeIds.length} de ${INNOVATION_BADGES.length}

DETALLE DE INSIGNIAS OBTENIDAS:
${INNOVATION_BADGES.map((b) => {
  const isUnlocked = unlockedBadgeIds.includes(b.id);
  return ` [${isUnlocked ? 'X' : ' '}] ${b.title.toUpperCase()} (${b.xp} XP) - ${b.subtitle}
     ${b.description}`;
}).join('\n')}

========================================================================
Vicerrectoría de Innovación y Emprendimiento (VIEM)
Universidad Nacional Abierta y a Distancia - UNAD
Acreditada en Alta Calidad
========================================================================`;

    const blob = new Blob([certificateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificado_Innovacion_${userName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badges-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl g2 border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden"
        style={{
          boxShadow: `0 0 50px rgba(39, 220, 255, 0.15)`,
        }}
      >
        {/* Cabecera del Modal */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.25)]">
              <Trophy className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 id="badges-modal-title" className="text-lg sm:text-xl font-bold text-white sy">
                Vitrina de Insignias y Logros
              </h2>
              <p className="text-xs text-brand-textMuted">
                Reconocimiento a tu avance en experimentación y prototipado regional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCertificate}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Descargar constancia de insignias alcanzadas"
            >
              <Download className="w-3.5 h-3.5 text-[#27DCFF]" />
              <span className="hidden sm:inline">Constancia</span>
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

            {/* Información del Rango */}
            <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg"
                style={{
                  backgroundColor: `${currentRank.color}25`,
                  borderColor: currentRank.color,
                  boxShadow: `0 0 20px ${currentRank.color}40`,
                }}
              >
                <Award className="w-8 h-8" style={{ color: currentRank.color }} />
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
                  <Zap className="w-3.5 h-3.5 text-[#FFD700]" /> {totalXp} XP Total
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

          {/* Grilla de Insignias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#5EC2DD] sy">
                Insignias del Laboratorio
              </h3>
              <span className="text-xs text-brand-textMuted">
                Completa acciones en el laboratorio para desbloquearlas todas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {INNOVATION_BADGES.map((badge) => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                const Icon = badge.icon;
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
                    {/* Header de la insignia */}
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

                    {/* Footer con estado o acción para ir a la herramienta */}
                    <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      {isUnlocked ? (
                        <span className="text-[11px] text-[#A8C63C] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Desbloqueada
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
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-brand-textMuted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
            Las insignias reconocen la excelencia metodológica y el impacto territorial.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer transition-colors"
          >
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
};
