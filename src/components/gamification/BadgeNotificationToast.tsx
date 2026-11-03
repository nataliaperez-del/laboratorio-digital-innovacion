import React, { useEffect, useState } from 'react';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { evaluateGamification, INNOVATION_BADGES, type BadgeDefinition } from '@/lib/gamification';
import { BadgeGraphicRenderer } from './BadgeGraphics';

interface Props {
  onOpenBadgesModal: () => void;
}

export const BadgeNotificationToast: React.FC<Props> = ({ onOpenBadgesModal }) => {
  const {
    containerData,
    savedStudies,
    themeProposalMarkdown,
    savedIdeations,
    treeGraph,
    savedTrees,
    prototypes,
    zoeInteractions,
    acknowledgedBadges,
    acknowledgeBadge,
  } = useStore();

  const [activeToast, setActiveToast] = useState<BadgeDefinition | null>(null);

  useEffect(() => {
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

    const unacknowledgedId = gamification.unlockedBadgeIds.find(
      (id) => !(acknowledgedBadges || []).includes(id)
    );

    if (unacknowledgedId) {
      const badge = INNOVATION_BADGES.find((b) => b.id === unacknowledgedId);
      if (badge) {
        setActiveToast(badge);
      }
    } else {
      setActiveToast(null);
    }
  }, [
    containerData,
    savedStudies,
    themeProposalMarkdown,
    savedIdeations,
    treeGraph,
    savedTrees,
    prototypes,
    zoeInteractions,
    acknowledgedBadges,
  ]);

  if (!activeToast) return null;

  const handleDismiss = () => {
    acknowledgeBadge(activeToast.id);
    setActiveToast(null);
  };

  const handleViewModal = () => {
    acknowledgeBadge(activeToast.id);
    setActiveToast(null);
    onOpenBadgesModal();
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className="p-4 rounded-2xl g2 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl border transition-all relative overflow-hidden"
        style={{
          borderColor: `${activeToast.color}60`,
          boxShadow: `0 0 30px ${activeToast.color}35`,
        }}
      >
        {/* Glow de fondo animado */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle, ${activeToast.color} 0%, transparent 70%)` }}
        />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* Insignia Vectorial Holográfica Animada */}
          <div className="shrink-0 transition-transform hover:scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
            <BadgeGraphicRenderer badgeId={activeToast.id} size={52} isUnlocked={true} />
          </div>

          {/* Información */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#FFD700]" /> ¡Insignia Desbloqueada!
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-white/40 hover:text-white transition-colors p-1"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-base font-bold text-white sy mt-0.5 leading-snug">
              {activeToast.title}
            </h4>
            <p className="text-xs text-brand-textSecondary mt-0.5 line-clamp-2">
              {activeToast.description}
            </p>

            <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/10">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                style={{
                  color: activeToast.color,
                  backgroundColor: `${activeToast.color}15`,
                  borderColor: `${activeToast.color}40`,
                }}
              >
                +{activeToast.xp} XP
              </span>

              <button
                type="button"
                onClick={handleViewModal}
                className="text-xs font-semibold text-[#27DCFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver vitrina y credencial</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
