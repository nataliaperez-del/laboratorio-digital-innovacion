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
  Calendar,
  Clock,
  Edit3,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  evaluateGamification,
  INNOVATION_BADGES,
} from '@/lib/gamification';
import { BadgeGraphicRenderer } from './BadgeGraphics';
import {
  openCertificatePrintWindow,
  BADGE_CERTIFICATES,
  type BadgeCertificateMetadata,
} from '@/lib/certificatePdfExport';
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
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('pionero_territorial');

  // Datos del recipiente (Nombre inventado y C.C. cualquiera según solicitud)
  const [recipientName, setRecipientName] = useState<string>('Natalia Elizabeth Pérez Cabrera');
  const [recipientId, setRecipientId] = useState<string>('C.C. 1.085.241.978');
  const [teamName, setTeamName] = useState<string>('Equipo Innovador UNAD');
  const [isEditingRecipient, setIsEditingRecipient] = useState<boolean>(false);

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

  const handleOpenCertificateForBadge = (badgeId: string) => {
    setSelectedBadgeId(badgeId);
    setActiveTab('credencial');
  };

  const currentBadgeCert: BadgeCertificateMetadata =
    BADGE_CERTIFICATES[selectedBadgeId] || BADGE_CERTIFICATES['pionero_territorial'];

  const handlePrintCertificate = () => {
    openCertificatePrintWindow({
      recipientName,
      recipientId,
      teamName,
      badgeId: selectedBadgeId,
    });
  };

  const todayFormatted = `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badges-modal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-white/15 bg-[#030e16]/95 backdrop-blur-xl shadow-2xl overflow-hidden text-white">
        {/* Header Superior del Modal */}
        <header className="px-5 sm:px-7 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5FF]/20 to-[#B4FF2B]/10 border border-[#00F5FF]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.2)]">
              <Trophy className="w-5 h-5 text-[#FFD23F]" />
            </div>
            <div>
              <h2 id="badges-modal-title" className="text-lg font-bold text-white tracking-wide sy">
                Vitrina y Certificación de Innovación
              </h2>
              <p className="text-xs text-brand-textMuted">
                Acreditación oficial por competencias en experimentación regional InnovaHub360
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas de Navegación */}
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('vitrina')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'vitrina'
                    ? 'bg-[#00F5FF]/20 text-[#00F5FF] border border-[#00F5FF]/40 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                    : 'text-brand-textMuted hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Insignias</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('credencial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'credencial'
                    ? 'bg-[#FFD23F]/20 text-[#FFD23F] border border-[#FFD23F]/40 shadow-[0_0_10px_rgba(255,210,63,0.2)]'
                    : 'text-brand-textMuted hover:text-white'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Certificados Oficiales</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintCertificate}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FFD23F]/15 border border-[#FFD23F]/40 text-[#FFD23F] hover:bg-[#FFD23F]/25 hover:border-[#FFD23F] items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(255,210,63,0.15)]"
              title="Descargar o Imprimir Certificado en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'vitrina' ? (
            <>
              {/* Tarjeta de Rango y Progreso General */}
              <div className="p-5 rounded-2xl border border-white/15 bg-gradient-to-r from-[#031d28]/70 via-[#052b38]/50 to-[#02141d]/70 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-5 shadow-[0_0_25px_rgba(0,245,255,0.08)]">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 p-1 rounded-2xl bg-black/40 border border-[#00F5FF]/30 shadow-[0_0_18px_rgba(0,245,255,0.2)]">
                    <BadgeGraphicRenderer badgeId={selectedBadgeId} size={74} isUnlocked={true} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00F5FF]">
                      Rango Actual · Nivel {currentRank.level}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white sy">
                      {currentRank.title}
                    </h3>
                    <p className="text-xs text-brand-textSecondary mt-0.5 max-w-md">
                      {currentRank.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 w-full md:w-auto min-w-[240px]">
                  <div className="flex items-center justify-between w-full text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#FFD23F]" />
                      {totalXp} XP Acumulado
                    </span>
                    <span className="text-brand-textMuted text-[11px]">
                      {nextRank ? `Meta: ${nextRank.minXp} XP` : '¡Nivel Máximo!'}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00F5FF] via-[#B4FF2B] to-[#FFD23F] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between w-full text-[10px] text-brand-textMuted">
                    <span>{unlockedBadgeIds.length} de {INNOVATION_BADGES.length} Insignias</span>
                    <span>{nextRank ? `Próximo: ${nextRank.title}` : 'Maestro 360'}</span>
                  </div>
                </div>
              </div>

              {/* Vitrina de Insignias Oficiales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#00F5FF]">
                    Insignias del Laboratorio
                  </h3>
                  <span className="text-xs text-brand-textMuted">
                    Diseños 3D oficiales por eje de innovación
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INNOVATION_BADGES.map((badge) => {
                    const isUnlocked = unlockedBadgeIds.includes(badge.id);
                    const toolTarget = getToolForBadge(badge.id);

                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
                          isUnlocked
                            ? 'bg-white/[0.04] backdrop-blur-md shadow-sm border-[#00F5FF]/30 hover:border-[#00F5FF]/60 hover:shadow-[0_0_20px_rgba(0,245,255,0.15)]'
                            : 'bg-black/30 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Header con la Insignia Gráfica */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="shrink-0 transition-transform group-hover:scale-105">
                              <BadgeGraphicRenderer badgeId={badge.id} size={86} isUnlocked={isUnlocked} />
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                  color: badge.color,
                                  borderColor: `${badge.color}40`,
                                  backgroundColor: `${badge.color}15`,
                                }}
                              >
                                +{badge.xp} XP
                              </span>
                              {isUnlocked ? (
                                <span className="text-[10px] text-[#A8C63C] font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Ganada
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/50 flex items-center gap-1">
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

                        {/* Footer con acciones */}
                        <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenCertificateForBadge(badge.id)}
                            className="text-[11px] font-semibold text-[#FFD23F] hover:underline flex items-center gap-1.5 cursor-pointer"
                            title={`Ver el certificado de competencias de ${badge.title}`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Ver Certificado</span>
                          </button>

                          {!isUnlocked && toolTarget && onNavigate && (
                            <button
                              type="button"
                              onClick={() => handleGoToTool(badge.id)}
                              className="text-[11px] font-semibold text-[#00F5FF] hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
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
            /* Vista del Certificado Oficial Individual por Insignia */
            <div className="space-y-4">
              {/* Barra de Selección de Insignia para el Certificado */}
              <div className="p-3 rounded-xl border border-white/10 bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00F5FF]">
                    Selecciona la Insignia a Certificar:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {INNOVATION_BADGES.map((b) => {
                      const isSelected = selectedBadgeId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBadgeId(b.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#00F5FF]/20 text-white border border-[#00F5FF] shadow-[0_0_10px_rgba(0,245,255,0.3)]'
                              : 'bg-white/[0.03] text-brand-textMuted border border-white/10 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: b.color }}
                          />
                          <span>{b.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditingRecipient(!isEditingRecipient)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingRecipient ? 'Ocultar Edición' : 'Editar Recipiente'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#FFD23F] text-[#061824] hover:bg-[#ffe066] flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(255,210,63,0.3)]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Descargar o Imprimir PDF</span>
                  </button>
                </div>
              </div>

              {/* Panel de Edición Rápida de Datos del Recipiente */}
              {isEditingRecipient && (
                <div className="p-4 rounded-xl border border-[#00F5FF]/30 bg-[#00F5FF]/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150">
                  <div>
                    <label className="block text-brand-textMuted mb-1 font-semibold">Nombre del Recipiente:</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white focus:border-[#00F5FF] outline-none"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-textMuted mb-1 font-semibold">Cédula / Documento:</label>
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white focus:border-[#00F5FF] outline-none"
                      placeholder="C.C. 1.085.241.978"
                    />
                  </div>
                  <div>
                    <label className="block text-brand-textMuted mb-1 font-semibold">Equipo / Entidad:</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white focus:border-[#00F5FF] outline-none"
                      placeholder="Equipo Innovador UNAD"
                    />
                  </div>
                </div>
              )}

              {/* Maquetación del Certificado Fiel al Referente Institucional */}
              <div
                className="w-full p-6 sm:p-10 rounded-2xl border-2 relative overflow-hidden shadow-2xl flex flex-col justify-between"
                style={{
                  background: 'radial-gradient(ellipse at 75% 50%, #06313D 0%, #031D26 45%, #011218 100%)',
                  borderColor: 'rgba(0, 245, 255, 0.45)',
                  boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 245, 255, 0.08)',
                  minHeight: '460px',
                }}
              >
                {/* Malla de Fondo Sutil y Destellos */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(0, 245, 255, 0.15) 0%, transparent 40%), linear-gradient(rgba(0, 245, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.08) 1px, transparent 1px)',
                    backgroundSize: '100% 100%, 30px 30px, 30px 30px',
                  }}
                />

                {/* Header: Logo InnovaHub360 Oficial */}
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <img
                    src="/assets/innovahub360_cert_logo.png"
                    alt="InnovaHub360"
                    className="h-10 sm:h-12 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/logo-innovahub360-aislado.png';
                    }}
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-[#00F5FF] font-mono tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>EMISIÓN OFICIAL VIEM · UNAD</span>
                  </div>
                </div>

                {/* Cuerpo Principal: 2 Columnas (Texto a la izquierda, Insignia 3D a la derecha) */}
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 my-auto">
                  {/* Columna Izquierda: Información de Certificación */}
                  <div className="flex-1 space-y-2 text-left">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase sy leading-tight drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                      Certificado de Competencias<br />en Innovación
                    </h3>

                    <p className="text-xs sm:text-sm italic text-brand-textMuted pt-1">
                      Se certifica a:
                    </p>

                    <div className="text-2xl sm:text-3xl font-extrabold text-[#FFD23F] tracking-wide drop-shadow-[0_0_20px_rgba(255,210,63,0.35)]">
                      {recipientName}
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-[#A5F3FC] tracking-widest">
                      {recipientId}
                    </div>

                    {/* Divisor Luminoso Cian */}
                    <div className="w-full max-w-lg h-[1.5px] bg-gradient-to-r from-[#00F5FF] via-[#00F5FF]/50 to-transparent shadow-[0_0_8px_#00F5FF] my-2" />

                    <p className="text-[11px] sm:text-xs italic text-brand-textMuted">
                      Por haber demostrado la competencia:
                    </p>

                    <div className="text-lg sm:text-xl font-bold text-[#FFD23F] leading-snug">
                      {teamName} · {currentBadgeCert.competenceTitle}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                      <strong className="text-[#FFD23F]">Acredita:</strong> {currentBadgeCert.accreditationText}
                    </p>

                    <div className="inline-flex items-center gap-2 pt-2 text-xs font-semibold text-white">
                      <Clock className="w-4 h-4 text-[#FFD23F]" />
                      <span>| &nbsp; {currentBadgeCert.hours} horas de experiencia en el entorno InnovaHub360</span>
                    </div>
                  </div>

                  {/* Columna Derecha: Insignia Gigante 3D Oficial con Resplandor */}
                  <div className="w-full md:w-[280px] flex flex-col items-center justify-center shrink-0 relative py-4">
                    {/* Resplandor Halo Esférico */}
                    <div className="absolute w-56 h-56 rounded-full bg-gradient-to-br from-[#00F5FF]/30 to-[#B4FF2B]/15 blur-2xl pointer-events-none" />

                    <img
                      src={`/assets/badges/${currentBadgeCert.badgeAsset}.png`}
                      alt={currentBadgeCert.badgeTitle}
                      className="relative z-10 w-52 sm:w-60 h-52 sm:h-60 object-contain drop-shadow-[0_0_25px_rgba(0,245,255,0.6)] drop-shadow-[0_0_10px_rgba(180,255,43,0.4)] transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `/assets/badges/${currentBadgeCert.badgeAsset}.webp`;
                      }}
                    />

                    {/* Resplandor de suelo */}
                    <div className="w-44 h-4 rounded-full bg-[#00F5FF]/40 blur-md -mt-2 pointer-events-none" />
                  </div>
                </div>

                {/* Footer del Certificado: Fecha a la izquierda + Logos UNAD / VIEM a la derecha */}
                <div className="relative z-10 flex items-end justify-between pt-4 border-t border-white/10 mt-4">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                    <Calendar className="w-4 h-4 text-[#FFD23F]" />
                    <span>{todayFormatted}</span>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <img
                      src="/assets/unad_logo_dark_cert.png"
                      alt="UNAD Acreditada Institucionalmente"
                      className="h-10 sm:h-12 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/assets/unad_acreditada.png';
                      }}
                    />
                    <div className="w-[1.5px] h-8 sm:h-10 bg-[#00F5FF] opacity-60" />
                    <img
                      src="/assets/viem_logo_dark_cert.png"
                      alt="Vicerrectoría de Innovación y Emprendimiento - VIEM"
                      className="h-9 sm:h-11 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/assets/viem_logo.png';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <footer className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-brand-textMuted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00F5FF]" />
            Las credenciales acreditan competencias de innovación regional avaladas por la UNAD y la VIEM.
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
