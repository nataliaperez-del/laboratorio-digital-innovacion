import React, { useState, useRef, useEffect } from 'react';
import { AiSettings } from '@/components/lab/AiSettings';
import { Sparkles, Sun, Moon, Layers, Compass, Trees, BrainCircuit, Rocket, Menu, X, Home, FolderArchive, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { evaluateGamification, INNOVATION_BADGES } from '@/lib/gamification';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { AiStatusDot } from './AiStatusDot';
import { endSession, useAuth } from '@/components/auth/AuthGate';

/** Identificador de cada pantalla del Laboratorio. */
export type ToolId = 'portal' | 'radar' | 'estudio' | 'ideacion' | 'arbol' | 'prototipado' | 'banco';
/** Pantallas en el orden del menú. */
export const TOOL_IDS: readonly ToolId[] = ['portal', 'radar', 'estudio', 'ideacion', 'arbol', 'prototipado', 'banco'];

interface HeaderProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isZoeOpen: boolean;
  onToggleZoe: () => void;
  zoeState: string;
  onOpenBadges?: () => void;
}

/** Cabecera: navegación entre herramientas, insignias, panel de IA, ZOE y tema claro/oscuro. */
export const Header: React.FC<HeaderProps> = ({ currentTool, onSelectTool, theme, onToggleTheme, isZoeOpen, onToggleZoe, zoeState, onOpenBadges }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const auth = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const { containerData, savedStudies, themeProposalMarkdown, savedIdeations, treeGraph, savedTrees, prototypes, zoeInteractions } = useStore();

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

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const allNavTools = [
    { id: 'portal' as ToolId, name: 'Inicio', icon: Home, color: '#27DCFF' },
    { id: 'estudio' as ToolId, name: MODULE_LABELS.estudio.title, icon: Layers, color: '#A8C63C' },
    { id: 'ideacion' as ToolId, name: MODULE_LABELS.ideacion.title, icon: BrainCircuit, color: '#F29F05' },
    { id: 'arbol' as ToolId, name: MODULE_LABELS.arbol.title, icon: Trees, color: '#5EC2DD' },
    { id: 'prototipado' as ToolId, name: MODULE_LABELS.prototipado.title, icon: Rocket, color: '#E024A5' },
    { id: 'banco' as ToolId, name: MODULE_LABELS.banco.short!, icon: FolderArchive, color: '#A78BFA' },
  ];
  // El Contenedor de resultados es solo del administrador.
  const navTools = allNavTools.filter((t) => t.id !== 'banco' || auth.role === 'admin');

  return (
    <header className="relative z-40 w-full box-border px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pt-5 pb-3">
      {/* Hidden SVGs for Logo Symbol */}
      <svg width="0" height="0" className="hidden" aria-hidden="true">
        <symbol id="mkFull" viewBox="0 0 1145 1113">
          <path
            fill="#035E73"
            d="M513.5 1111.9C285.2 1096.1 85.5 948.8 21.6 749.1C-2.6 673.6 -6.4 592.3 10.6 510.5C15.9 484.6 23.3 460.2 29.1 449L32 443.5L31.2 448C30.8 450.5 30.5 461.7 30.6 473C30.7 522.2 44.1 563.7 74.2 608.2C79.3 615.8 81 616.7 84.7 613.6C91.3 608.1 167.9 571.2 194.8 560.6C213.4 553.3 213 553.4 213 556C213 561.9 223.1 586.3 228.5 593.6L230.9 596.7L212.7 604.5C191.7 613.5 149.6 633.8 131.8 643.6C116.3 652 94.1 665 93.6 665.9C93.4 666.2 95.1 674.2 97.5 683.5C111 737.2 126.6 777.5 148.5 815C159 833.1 155.3 831.4 190 834.4C249.7 839.7 300.5 843.2 338.6 844.6L356.7 845.3L357.4 841.4C359.1 832.6 370.5 813.7 377 808.8C378.7 807.6 380 805.7 380 804.4C380 803.2 361.8 762.5 339.5 713.9C317.2 665.3 298.8 624.7 298.7 623.6C298.5 622.1 300 621.3 307.4 619.4C317.1 616.7 320.6 615.2 332.5 608.5C341.2 603.6 344 603 344 605.9C344 606.9 348.1 616.4 353.1 627.1C369 661.1 400.3 729.6 412.5 757C419 771.6 424.7 784 425.1 784.6C425.6 785.2 429 786 432.8 786.3C454 788.3 477.7 799.2 487.3 811.4C488.8 813.4 490.5 815 491.1 815C491.6 815 545.1 790.9 609.9 761.5C674.7 732.1 728.7 708 729.9 708C731.8 708 732 708.5 732 715C732 723.9 734.3 735.3 738.1 744.9C739.6 749 740.8 752.5 740.6 752.7C740.5 752.9 688.2 776.4 624.4 805L508.5 856.9L507.7 861.7C504.3 882.8 500.9 892.6 492.9 903.5C488.9 909 487.9 911.1 488.2 913.5C488.4 915.1 506.3 947.3 527.8 985L567 1053.5L555.3 1053.8C537.5 1054.3 508 1051.7 508 1049.7C508 1049.1 501.1 1036.7 492.6 1022.1C478.3 997.4 453.9 954.2 447.6 942.4L444.8 937.3L431.7 936.7C398.3 935.2 374.7 921.2 361.7 895.4L359.1 890.2L349.8 889.6C344.7 889.3 329.9 888.3 317 887.4C304.1 886.6 271.7 884.2 245 882.1C216.3 879.8 196.1 878.6 195.5 879.1C191 883.3 232.9 928.1 266 954.5C328.6 1004.5 403.8 1036.2 488.6 1048.5C500 1050.2 506.8 1051.6 507.2 1052.4C518.9 1073.3 551.3 1098 581.4 1108.9L589.2 1111.7L584.5 1112.3C578 1113.2 528.3 1112.9 513.5 1111.9ZM735 422.5L735 318L839.2 318.2L943.5 318.5L943.8 422.8L944 527L839.5 527L735 527L735 422.5Z"
          ></path>
          <path
            fill="#7A9706"
            d="M581.5 1108.9C563.3 1102.2 545.2 1091.7 530.9 1079.5C522.3 1072.3 505.9 1052.8 507.2 1051.4C507.5 1051.2 515.3 1051.7 524.6 1052.6C564.9 1056.5 625 1051.9 669.2 1041.5C686.9 1037.4 699.1 1034.2 700.7 1033.2C701.9 1032.4 773 787.3 773 783.8C773 780.3 771 778 765.2 774.8C754.9 769.1 741.8 754.9 738.2 745.5C734.3 735.2 732 723.9 732 715C732 708.4 731.9 708 729.8 707.9C728.5 707.9 728.1 707.6 728.8 707.3C729.4 707.1 730 705.4 730 703.7C730.1 693.9 737.2 676.1 745.5 665.1C778.1 622.1 851.8 629.3 875.6 677.8C877.1 680.6 878.4 683 878.7 683C880 683 951.1 665.8 979.6 658.5C1041.2 642.9 1084.7 630.2 1108.3 621.1C1137.7 609.7 1139 609.6 1139 618.2C1138.9 643.9 1122.9 704.5 1103.6 752.1C1022.3 953.2 836.2 1088.4 610.1 1110.5C590.5 1112.4 591 1112.4 581.5 1108.9ZM777 1006.3C914.9 945.3 1021.9 831.1 1066.7 697.2C1069.2 689.8 1071 683.7 1070.8 683.5C1070.5 683.1 881.9 730.7 881.6 731.2C881.4 731.4 880.6 733.5 879.7 736C871.6 757.9 849.3 778.4 828.6 783.1C823.7 784.2 822.9 784.7 822.1 787.4C821.5 789.1 807.1 840 790 900.5C772.9 961 758.7 1011.3 758.4 1012.3C757.6 1014.8 758.5 1014.5 777 1006.3ZM30.3 479.5C30.3 475.6 30.5 474.2 30.7 476.3C30.9 478.3 30.9 481.5 30.7 483.3C30.5 485 30.3 483.4 30.3 479.5ZM30.3 464C30.3 459.9 30.5 458.2 30.7 460.2C30.9 462.3 30.9 465.7 30.7 467.8C30.5 469.8 30.3 468.1 30.3 464ZM884 274.9C859.2 274.1 854.7 273.2 852.5 269C849.9 264 848.7 237.1 849.4 198.5C850.2 149.9 850.2 149.8 862.7 148C883.9 145 961.4 146.1 966.6 149.5C969.8 151.6 969.9 153 970.1 211.5C970.3 270.8 970.4 270.1 964.4 272.6C961.4 273.9 916.4 276.4 907.5 275.8C906.4 275.7 895.8 275.4 884 274.9Z"
          ></path>
          <path
            fill="#F29F05"
            d="M725.5 706.1C724.9 705.5 641.8 677.4 540.8 643.6C372.2 587.2 357 582.3 356.5 584.1C356.1 585.1 353.6 588.6 350.9 591.7C348.2 594.9 345.5 598.7 344.8 600.1C344.1 601.7 341.4 603.7 337.1 605.8C333.5 607.5 327.1 610.8 323 613C301.4 624.6 278 624.3 252.5 612.1C233.1 602.9 221.9 588.1 214.9 562.4C206.8 532.9 225.9 494.8 256.2 480.2L263.9 476.5L263.9 467.5C263.9 462.6 263.3 453.3 262.5 447C257.9 410.6 258.4 323.7 263.4 274.5C265.6 252.8 266.9 236 266.3 236C266.2 236 262.6 238.8 258.3 242.2C175.3 307.6 114.4 409.4 94 516.5C89.1 542.4 85 589.9 86.5 604.5C87.1 609.7 86.9 610.8 85 612.8C80.4 617.7 78.7 615.9 63.5 590C40.5 550.8 30.8 515.6 31 471.8C31 439.4 32.8 432.4 48.5 401.5C101.3 297.5 187.1 210.4 292.7 153.5C309.3 144.6 336.6 131.7 337.8 132.2C338.2 132.4 335.8 170.1 332.3 216C328.9 261.9 325.6 311.6 325 326.5C324.5 341.4 323.1 367.9 322 385.5C320.8 403.1 319.6 430.9 319.3 447.2L318.7 477L323.6 479.1C344.9 488.4 360.5 508.1 367 533.5L368 537.5L393.7 546.2C407.9 550.9 466.1 570.9 523 590.5C635.5 629.3 739.7 664.3 741.2 663.8C741.7 663.6 735.8 655.1 728.1 645C720.3 634.8 706.8 617 698 605.5C689.2 594 676.1 577.5 668.9 569C655.4 553.2 633.2 523.8 599.4 477.5C569 435.7 538.5 398.7 533.5 397.4C532.2 397.1 526.7 398.2 520.9 399.9C508.9 403.5 502.4 403.8 491.8 401.1C467.8 394.9 446.9 375.1 438.3 350.5C434 338 434.1 315.3 438.6 302.7C452.3 264.5 494.4 241.8 535.4 250.5C539.2 251.3 542.4 251.9 542.5 251.7C546.3 244.8 723.1 8.8 729.4 2.2L731.6 -0L763.8 0.2L796.1 0.5L780.2 22.5C771.5 34.6 724.8 96.2 676.4 159.5C628 222.8 587.2 276.2 585.7 278.2L582.9 281.8L586.9 292.4C596.2 317.2 595.8 335.1 585.5 354.6C583 359.3 581 364.4 581 365.8C581.1 367.8 608.5 405 682.5 503.5C777.5 629.9 783.8 638.6 781.7 639.4C759.5 648.4 745.8 660.7 736.9 679.6C732.9 688 730 698.1 730 703.8C730 707.1 727.7 708.3 725.5 706.1ZM1022.2 403.9C1005.3 403 1000.2 402 997.6 399.1C994.2 395.4 993.7 384.7 994.6 339.5C995.1 315.9 995.4 287.7 995.2 277C994.9 255 995.3 252.6 1000.4 250.5C1011.2 246 1127.6 245.8 1137 250.3C1138.3 251 1140 252.7 1140.7 254.2C1145.7 264.5 1145.5 391 1140.5 398.6C1138.5 401.6 1132.5 402.9 1113.8 404C1094.9 405.1 1044.3 405.1 1022.2 403.9Z"
          ></path>
        </symbol>
      </svg>

      <div className="flex items-center justify-between gap-4">
        {/* Brand Lockup Oficial InnovaHub360 */}
        <button
          type="button"
          onClick={() => onSelectTool('portal')}
          className="lk cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-3.5"
        >
          <svg width="42" height="41" aria-hidden="true" className="shrink-0 drop-shadow-md">
            <use href="#mkFull" width="42" height="41"></use>
          </svg>
          <span className="lkw text-left">
            <span className="text-[22px] relative tracking-tight">
              <span className="a font-bold text-[#5EC2DD]">INNOVA</span>
              <span className="b font-bold text-[#A8C63C]">HUB</span>
              {/* Official 6-dot amber arc */}
              <svg width="72" height="24" viewBox="0 0 72 24" aria-hidden="true" className="absolute -top-[21px] left-[61px] w-[39px] height-[26px]">
                <circle cx="6" cy="20" r="2.1" fill="#F29F05"></circle>
                <circle cx="16" cy="11" r="2.3" fill="#F29F05"></circle>
                <circle cx="29" cy="6" r="2.5" fill="#F29F05"></circle>
                <circle cx="43" cy="6" r="2.5" fill="#F29F05"></circle>
                <circle cx="56" cy="11" r="2.3" fill="#F29F05"></circle>
                <circle cx="66" cy="20" r="2.1" fill="#F29F05"></circle>
              </svg>
            </span>
            <span className="c text-[22px] font-bold text-[#F29F05]">360</span>
          </span>
        </button>

        {/* =========================================================================
            BLOQUE JUSTIFICADO A LA DERECHA: ICONOS CON TOOLTIPS + MENÚ HAMBURGUESA
            ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Señal de la IA, antes de la casita de Inicio: verde conectada, rojo sin conexión. */}
          <AiStatusDot />

          {/* Tira compacta de sólo iconos con Tooltip Flotante */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 g2 rounded-full border border-white/10">
            {navTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <div key={tool.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => onSelectTool(tool.id)}
                    aria-label={tool.name}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isActive ? 'scale-105' : 'text-brand-textSecondary hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${tool.color}25`,
                            border: `1.5px solid ${tool.color}`,
                            boxShadow: `0 0 14px ${tool.color}65`,
                          }
                        : undefined
                    }
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform group-hover:scale-110" style={{ color: tool.color }} />
                  </button>

                  {/* Tooltip Flotante que aparece al señalar (hover) con el color característico */}
                  <div
                    className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-[#04222B]/95 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-[0_8px_20px_rgba(0,0,0,0.6)] z-50 flex items-center gap-1.5 transform group-hover:translate-y-0 translate-y-1"
                    style={{ border: `1px solid ${tool.color}60` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block shadow-[0_0_6px]" style={{ backgroundColor: tool.color, color: tool.color }} />
                    <span>{tool.name}</span>
                  </div>
                </div>
              );
            })}

            {/* Vitrina de insignias: al final de la tira, solo el trofeo; el nivel va en su descripción. */}
            <div className="relative group">
              <button
                type="button"
                onClick={onOpenBadges}
                aria-label={`Abrir vitrina de insignias · ${gamification.currentRank.title}, nivel ${gamification.currentRank.level} (${gamification.unlockedBadgeIds.length} de ${INNOVATION_BADGES.length})`}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer text-brand-textSecondary hover:bg-white/10 border border-transparent"
              >
                <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform group-hover:scale-110" style={{ color: '#FFD700' }} />
              </button>
              <div
                className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-[#04222B]/95 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-[0_8px_20px_rgba(0,0,0,0.6)] z-50 flex items-center gap-1.5 transform group-hover:translate-y-0 translate-y-1"
                style={{ border: '1px solid #FFD70060' }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block shadow-[0_0_6px]" style={{ backgroundColor: '#FFD700', color: '#FFD700' }} />
                <span>
                  Insignias · Nv.{gamification.currentRank.level} · {gamification.unlockedBadgeIds.length}/{INNOVATION_BADGES.length}
                </span>
              </div>
            </div>
          </nav>

          {/* Botón y Menú Hamburguesa Superior Derecho */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full g2 border transition-all cursor-pointer flex items-center justify-center ${
                isMenuOpen
                  ? 'border-[#27DCFF] text-[#27DCFF] shadow-[0_0_15px_rgba(39,220,255,0.4)] bg-[#0C5E78]/50'
                  : 'border-white/15 text-brand-textSecondary hover:text-white hover:border-[#27DCFF]/40 hover:bg-white/5'
              }`}
              title="Menú de funciones: IA, ZOE y Tema"
              aria-label="Abrir menú de funciones"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5 text-[#27DCFF]" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Menú Desplegable Flotante Elegante Glassmorphism Perfectamente Diagramado */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 g2 rounded-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3.5">
                {/* Cabecera del Panel */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27DCFF] shadow-[0_0_6px_#27DCFF]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white sy">Ajustes y Asistentes</span>
                  </div>
                  <span className="text-[10px] m text-[#5EC2DD] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">InnovaHub360</span>
                </div>

                {/* Sesión institucional */}
                {auth.signedIn && auth.email && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 block truncate">{auth.name}</span>
                      <span className="text-[10px] text-brand-textMuted block truncate">
                        {auth.email} · {auth.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        endSession();
                        onSelectTool('portal');
                      }}
                      className="text-[11px] font-semibold text-[#5EC2DD] px-2.5 py-1 rounded-lg border border-white/15 hover:bg-white/10 cursor-pointer"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}

                {/* 0. Insignias de Innovación */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                    <span>Insignias de Innovación</span>
                    <span className="text-[10px] text-[#FFD700] font-mono">{gamification.totalXp} XP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenBadges?.();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 hover:bg-[#FFD700]/20 text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trophy className="w-4 h-4 text-[#FFD700]" />
                      <div className="text-left">
                        <span className="text-xs font-bold block sy">{gamification.currentRank.title}</span>
                        <span className="text-[10px] text-brand-textMuted block">
                          Nivel {gamification.currentRank.level} · {gamification.unlockedBadgeIds.length} de {INNOVATION_BADGES.length} insignias
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#FFD700]">Vitrina</span>
                  </button>
                </div>

                {/* 1. Selector de Proveedor / Configuración IA */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                    <span>Inteligencia Artificial</span>
                    <span className="text-[10px] text-[#27DCFF] font-mono">IA Motor</span>
                  </div>
                  <div className="w-full pt-1">
                    <AiSettings />
                  </div>
                </div>

                {/* 2. Control de ZOE 3D */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/90 mb-1">
                    <span>Asistente ZOE</span>
                    <span className="text-[10px] text-[#A8C63C] font-mono">3D Avatar</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleZoe();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      isZoeOpen
                        ? 'bg-[#27DCFF]/20 border-[#27DCFF] text-[#27DCFF] shadow-[0_0_15px_rgba(39,220,255,0.25)]'
                        : 'bg-white/5 border-white/10 text-white/90 hover:border-[#27DCFF]/40 hover:bg-white/10'
                    }`}
                    aria-pressed={isZoeOpen}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#27DCFF] animate-spin" style={{ animationDuration: '6s' }} />
                      <span className="text-xs font-bold sy tracking-wide">ZOE 3D</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#A8C63C]">{isZoeOpen ? 'Activo en pantalla' : 'En su casita'}</span>
                  </button>
                </div>

                {/* 3. Modo Claro / Oscuro */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/90 mb-1">
                    <span>Apariencia Visual</span>
                    <span className="text-[10px] text-[#F3C26B] font-mono">Theme</span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-[#5EC2DD]" /> : <Sun className="w-4 h-4 text-[#F3C26B]" />}
                      <span className="text-xs font-medium">Modo de Pantalla</span>
                    </div>
                    <span className="text-xs font-bold capitalize text-[#F3C26B]">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
