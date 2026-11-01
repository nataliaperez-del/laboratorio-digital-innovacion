import React, { useState, useEffect } from 'react';
import {
  Compass,
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  ArrowRight,
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Radio,
  FileText,
  Users,
  Calendar,
  ChevronRight,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { ToolId } from '../layout/Header';

interface PortalCatalogProps {
  onSelectTool: (tool: ToolId) => void;
  onOpenZoe: () => void;
}

export const PortalCatalog: React.FC<PortalCatalogProps> = ({ onSelectTool, onOpenZoe }) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [slideProgress, setSlideProgress] = useState<number>(0);

  const bannerSlides = [
    {
      id: 0,
      eyebrow: 'MÓDULO ESTRATÉGICO · OBSERVATORIO INNOVAHUB360',
      title: 'Laboratorio de Innovación',
      subtitle: 'Del Radar y el Diagnóstico Zonal al Prototipado Rápido con IA',
      description:
        'Espacio neurálgico del Observatorio para la vigilancia prospectiva, caracterización territorial en 12 bloques, ideación estratégica, visualización holográfica en árbol y prototipado rápido de soluciones, con asistencia cognitiva transversal de ZOE.',
      badge: '5 Herramientas Integradas',
      badgeColor: '#2E9CBA',
      ctaText: 'Entrar al Laboratorio de Innovación',
      targetTool: 'radar' as ToolId,
      statNumber: '05',
      statLabel: 'Herramientas Conectadas',
      accentGradient: 'from-[#0C5E78]/35 via-transparent to-[#2E9CBA]/20',
      accentColor: '#5EC2DD',
    },
    {
      id: 1,
      eyebrow: 'HERRAMIENTA 01 · VIGILANCIA TECNOLÓGICA',
      title: 'Radar de Innovación',
      subtitle: '31 Señales en Matriz de Impacto vs. Velocidad de Adopción',
      description:
        'Mapeo interactivo de macrotendencias globales, nacionales y territoriales sobre cuatro cuadrantes de acción: Tecnologías Críticas, Habilitadores, Modelos Disruptivos y Sostenibilidad Zonal.',
      badge: '31 Señales Activas',
      badgeColor: '#5EC2DD',
      ctaText: 'Explorar Radar de Innovación',
      targetTool: 'radar' as ToolId,
      statNumber: '31',
      statLabel: 'Señales Prospectivas',
      accentGradient: 'from-[#0C5E78]/35 via-transparent to-[#5EC2DD]/20',
      accentColor: '#5EC2DD',
    },
    {
      id: 2,
      eyebrow: 'HERRAMIENTA 02 · CARACTERIZACIÓN REGIONAL',
      title: 'Estudio Territorial',
      subtitle: 'Diagnóstico en 12 Bloques y Fuentes Oficiales',
      description:
        'Cruce riguroso de fuentes del territorio, códigos DIVIPOLA, planes de desarrollo municipal y banco de iniciativas para fundamentar la vocación productiva y social.',
      badge: '12 Bloques Analíticos',
      badgeColor: '#A8C63C',
      ctaText: 'Ver Estudio Territorial',
      targetTool: 'estudio' as ToolId,
      statNumber: '12',
      statLabel: 'Bloques de Análisis',
      accentGradient: 'from-[#2B4008]/40 via-transparent to-[#A8C63C]/20',
      accentColor: '#A8C63C',
    },
    {
      id: 3,
      eyebrow: 'HERRAMIENTAS 03 & 04 · ESTRUCTURACIÓN Y MODELADO',
      title: 'Ideación Estratégica & Árbol de Innovación',
      subtitle: 'Elección del Tema Ancla y Circuito Holográfico 10-5-3',
      description:
        'Define el tema central a partir de la deliberación territorial o de forma independiente, y explora la arquitectura viva: actores del suelo, retos en raíces, tronco y ramas de valor.',
      badge: 'Circuito Holográfico 10-5-3',
      badgeColor: '#F29F05',
      ctaText: 'Visualizar Árbol de Innovación',
      targetTool: 'arbol' as ToolId,
      statNumber: '18',
      statLabel: 'Ramas en Circuito',
      accentGradient: 'from-[#6E4202]/35 via-transparent to-[#F29F05]/20',
      accentColor: '#F3C26B',
    },
    {
      id: 4,
      eyebrow: 'HERRAMIENTA 05 · SOLUCIONES TANGIBLES',
      title: 'Prototipado Rápido con IA',
      subtitle: 'Estructuración Integral de Prototipos para Cualquier Tema',
      description:
        'Diseña y valida prototipos tecnológicos o de servicios a partir de los frutos del árbol o desde cualquier tema libre, obteniendo arquitectura técnica, 4 fases y KPIs medibles.',
      badge: 'Plan con IA Generativa',
      badgeColor: '#A98FD6',
      ctaText: 'Crear Plan de Prototipado',
      targetTool: 'prototipado' as ToolId,
      statNumber: 'TRL 5',
      statLabel: 'Madurez Objetivo',
      accentGradient: 'from-[#3A225B]/40 via-transparent to-[#A98FD6]/20',
      accentColor: '#A98FD6',
    },
  ];

  // Auto-play progress bar and slide rotation
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = 60;
    const totalDuration = 7000; // 7 seconds per slide
    const stepIncrement = (intervalMs / totalDuration) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((current) => (current + 1) % bannerSlides.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPaused, bannerSlides.length]);

  const handleSelectSlide = (index: number) => {
    setActiveSlide(index);
    setSlideProgress(0);
  };

  const currentSlideData = bannerSlides[activeSlide];

  const tools = [
    {
      id: 'radar' as ToolId,
      name: 'Radar de Innovación',
      tagline: 'Vigilancia activa y prospectiva tecnológica territorial',
      description:
        'Exploración interactiva de 31 señales y macrotendencias en matriz de impacto versus velocidad de adopción en cuatro cuadrantes de acción.',
      icon: Compass,
      color: '#5EC2DD',
      accentColor: '#2E9CBA',
      badge: 'Herramienta 1 · 31 Señales',
    },
    {
      id: 'estudio' as ToolId,
      name: 'Estudio Territorial',
      tagline: 'Diagnóstico zonal y caracterización en 12 bloques',
      description:
        'Ingesta y procesamiento de fuentes del territorio, códigos DIVIPOLA y banco de iniciativas para generar un diagnóstico contextual riguroso.',
      icon: Layers,
      color: '#A8C63C',
      accentColor: '#7A9706',
      badge: 'Herramienta 2 · 12 Bloques',
    },
    {
      id: 'ideacion' as ToolId,
      name: 'Ideación Estratégica y Elección del Tema',
      tagline: 'Decisión deliberada de vocación y tema ancla',
      description:
        'Consecuente con el diagnóstico territorial o de formulación independiente. Evaluación de alternativas y selección del eje estructurador.',
      icon: BrainCircuit,
      color: '#F3C26B',
      accentColor: '#F29F05',
      badge: 'Herramienta 3 · Decisión Temática',
    },
    {
      id: 'arbol' as ToolId,
      name: 'Árbol de Innovación',
      tagline: 'Estructura holográfica y circuito de valor 10-5-3',
      description:
        'Visualización interactiva tipo circuito: suelo (actores), raíces (riesgos), tronco (tema central), ramas (10 globales, 5 nacionales, 3 territoriales) y frutos.',
      icon: Trees,
      color: '#A8C63C',
      accentColor: '#A8C63C',
      badge: 'Herramienta 4 · Circuito Holográfico',
    },
    {
      id: 'prototipado' as ToolId,
      name: 'Prototipado',
      tagline: 'Banco de diseño, especificación y validación rápida',
      description:
        'Estructuración de prototipos tecnológicos, servicios de innovación y proyectos territoriales. Funciona a partir de los frutos del árbol o de forma 100% independiente con IA.',
      icon: Rocket,
      color: '#A98FD6',
      accentColor: '#6B4FA0',
      badge: 'Herramienta 5 · Banco de Prototipos',
    },
  ];

  return (
    <div className="w-full space-y-12 pb-16">
      {/* =========================================================================
          BANNER ANIMADO PRINCIPAL DEL OBSERVATORIO CON MÓDULO LABORATORIO (UX/UI)
          ========================================================================= */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative overflow-hidden g rounded-[28px] border border-white/15 shadow-2xl transition-all"
      >
        {/* Animated Background Mesh & Halo Accent */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${currentSlideData.accentGradient} banner-shimmer transition-all duration-700 pointer-events-none`}
        />
        
        {/* Subtle Decorative SVG Grid in Background */}
        <svg
          width="100%"
          height="100%"
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-25"
        >
          <defs>
            <pattern id="bannerGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#FFFFFF" strokeWidth="0.75" strokeOpacity="0.2" />
              <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" fillOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bannerGrid)" />
        </svg>

        {/* Top Segmented Progress Bar (Fidelidad UX/UI InnovaHub360 .seg) */}
        <div className="relative z-10 px-6 sm:px-10 pt-6 flex items-center gap-2.5">
          {bannerSlides.map((slide, idx) => {
            const isCurrent = activeSlide === idx;
            const isCompleted = activeSlide > idx;
            return (
              <div
                key={slide.id}
                onClick={() => handleSelectSlide(idx)}
                className="seg-bar group"
                title={`Ver diapositiva ${idx + 1}: ${slide.title}`}
              >
                <div
                  className="seg-bar-fill"
                  style={{
                    width: isCurrent ? `${slideProgress}%` : isCompleted ? '100%' : '0%',
                    backgroundColor: isCurrent ? slide.accentColor : '#F29F05',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Banner Content Container */}
        <div className="relative z-10 p-6 sm:p-10 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 min-h-[380px]">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="chip bg-white/10 border border-white/20 text-[#5EC2DD] m text-[10px]">
                {currentSlideData.eyebrow}
              </span>
              <span
                className="chip border text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${currentSlideData.badgeColor}22`,
                  borderColor: `${currentSlideData.badgeColor}55`,
                  color: currentSlideData.accentColor,
                }}
              >
                {currentSlideData.badge}
              </span>
            </div>

            <h1 className="h2 text-3xl sm:text-4xl md:text-5xl text-white font-bold tracking-tight leading-tight sy transition-all">
              {currentSlideData.title}
            </h1>

            <p className="text-base sm:text-lg font-semibold sy" style={{ color: currentSlideData.accentColor }}>
              {currentSlideData.subtitle}
            </p>

            <p className="bd text-sm sm:text-base text-[#CFE0E6] leading-relaxed max-w-2xl">
              {currentSlideData.description}
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSelectTool(currentSlideData.targetTool)}
                className="metal px-6 py-3.5 text-sm font-bold text-white flex items-center gap-2.5 cursor-pointer shadow-lg hover:scale-105 transition-all"
              >
                <span>{currentSlideData.ctaText}</span>
                <ArrowRight className="w-4 h-4 text-[#F3C26B]" />
              </button>

              <button
                type="button"
                onClick={onOpenZoe}
                className="g2 px-5 py-3.5 rounded-full text-sm font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all zoe-glow"
              >
                <Sparkles className="w-4 h-4 text-[#27DCFF] animate-spin" style={{ animationDuration: '6s' }} />
                <span>Hablar con ZOE (Transversal)</span>
              </button>
            </div>
          </div>

          {/* Right Floating Metric Card */}
          <div className="w-full lg:w-[320px] shrink-0 g2 p-6 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[11px] font-semibold text-brand-textMuted uppercase tracking-wider sy">
                Módulo en Observatorio
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#A8C63C] font-semibold m">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A8C63C] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A8C63C]"></span>
                </span>
                Activo
              </span>
            </div>

            <div>
              <span className="text-4xl sm:text-5xl font-bold sy tracking-tight" style={{ color: currentSlideData.accentColor }}>
                {currentSlideData.statNumber}
              </span>
              <span className="block text-xs text-brand-textSecondary mt-1 font-medium">
                {currentSlideData.statLabel}
              </span>
            </div>

            <div className="pt-2 text-xs text-brand-textMuted flex items-center justify-between">
              <span>Navegación Interactiva</span>
              <span className="m text-white/90">
                0{activeSlide + 1} / 0{bannerSlides.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZOE TRANSVERSAL BANNER DE ASISTENCIA COGNITIVA
          ========================================================================= */}
      <section className="g2 p-6 sm:p-8 rounded-2xl border border-[#27DCFF]/30 relative overflow-hidden zoe-glow">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#27DCFF]/20 border border-[#27DCFF]/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(39,220,255,0.4)]">
              <Bot className="w-6 h-6 text-[#27DCFF]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white sy">ZOE Companion · Inteligencia Asistente Transversal</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#27DCFF]/20 text-[#27DCFF] border border-[#27DCFF]/30">
                  Transversal en todo el Observatorio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#CFE0E6] max-w-3xl leading-relaxed">
                ZOE no está confinada a una sola pantalla. Acompaña de forma transversal cada destino del Observatorio InnovaHub360 y cada fase del Laboratorio de Innovación: responde consultas sobre tendencias, analiza variables territoriales, sugiere ramificaciones para el árbol y estructura planes de prototipado en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={onOpenZoe}
              className="metal px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow hover:scale-105 transition-all w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
              <span>Consultar a ZOE Ahora</span>
            </button>
          </div>
        </div>

        {/* Quick Transversal Prompt Pills */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-brand-textMuted font-medium mr-1">Consultas rápidas con ZOE:</span>
          <button
            onClick={onOpenZoe}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "¿Cómo integro el estudio territorial con el árbol?"
          </button>
          <button
            onClick={onOpenZoe}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "Genera una idea de prototipado para mi municipio"
          </button>
          <button
            onClick={onOpenZoe}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "Explícame las 31 señales del Radar"
          </button>
        </div>
      </section>

      {/* =========================================================================
          CATÁLOGO DE LAS 5 HERRAMIENTAS DEL MÓDULO LABORATORIO DE INNOVACIÓN
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#5EC2DD] m">
                MÓDULO DE LABORATORIO
              </span>
              <span className="text-xs text-brand-textMuted">·</span>
              <span className="text-xs text-brand-textMuted">5 Herramientas Especializadas</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white sy">
              Herramientas del Laboratorio de Innovación
            </h2>
            <p className="text-xs sm:text-sm text-brand-textSecondary mt-1 max-w-2xl">
              Cada herramienta puede utilizarse de forma 100% independiente con datos propios o encadenada como una ruta metodológica completa.
            </p>
          </div>
          <span className="text-xs text-brand-textMuted m hidden sm:inline-block">
            InnovaHub360 · Arquitectura Modular
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="g p-6 rounded-2xl cursor-pointer card-hover-glow flex flex-col justify-between group border border-white/10 hover:border-white/25"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all"
                      style={{
                        backgroundColor: `${tool.accentColor}20`,
                        borderColor: `${tool.accentColor}55`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: tool.color }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 m">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white sy group-hover:text-[#5EC2DD] transition-colors mb-1">
                    {tool.name}
                  </h3>
                  <span className="text-xs font-semibold block mb-2" style={{ color: tool.color }}>
                    {tool.tagline}
                  </span>
                  <p className="text-xs text-brand-textSecondary leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-brand-textMuted font-medium group-hover:text-white transition-colors">
                    Abrir en el Laboratorio
                  </span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          RUTA METODOLÓGICA INTEGRADA (01 A 05)
          ========================================================================= */}
      <section className="g p-8 rounded-2xl border border-white/15 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-5 h-5 text-[#A8C63C]" />
            <h3 className="text-lg font-bold text-white sy">Ruta Metodológica Integrada del Laboratorio</h3>
          </div>
          <span className="text-xs text-brand-textMuted m hidden md:inline-block">
            Encadenamiento Opcional o Autónomo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            onClick={() => onSelectTool('radar')}
            className="g2 p-4 rounded-xl space-y-2 cursor-pointer hover:border-[#5EC2DD]/50 transition-all"
          >
            <span className="text-xs font-bold text-[#5EC2DD] m">01 · VIGILANCIA</span>
            <h4 className="text-sm font-bold text-white sy">Radar de Innovación</h4>
            <p className="text-xs text-brand-textSecondary">
              Mapeo de 31 señales y macrotendencias con niveles de impacto y velocidad.
            </p>
          </div>

          <div
            onClick={() => onSelectTool('estudio')}
            className="g2 p-4 rounded-xl space-y-2 cursor-pointer hover:border-[#A8C63C]/50 transition-all"
          >
            <span className="text-xs font-bold text-[#A8C63C] m">02 · TERRITORIO</span>
            <h4 className="text-sm font-bold text-white sy">Estudio Territorial</h4>
            <p className="text-xs text-brand-textSecondary">
              Diagnóstico territorial estructurado en 12 bloques y fuentes primarias.
            </p>
          </div>

          <div
            onClick={() => onSelectTool('ideacion')}
            className="g2 p-4 rounded-xl space-y-2 cursor-pointer hover:border-[#F3C26B]/50 transition-all"
          >
            <span className="text-xs font-bold text-[#F3C26B] m">03 · IDEACIÓN</span>
            <h4 className="text-sm font-bold text-white sy">Ideación Estratégica</h4>
            <p className="text-xs text-brand-textSecondary">
              Elección deliberada del tema ancla a partir de los retos y vocaciones zonales.
            </p>
          </div>

          <div
            onClick={() => onSelectTool('arbol')}
            className="g2 p-4 rounded-xl space-y-2 cursor-pointer hover:border-[#A8C63C]/50 transition-all"
          >
            <span className="text-xs font-bold text-[#A8C63C] m">04 · MODELADO</span>
            <h4 className="text-sm font-bold text-white sy">Árbol de Innovación</h4>
            <p className="text-xs text-brand-textSecondary">
              Estructura holográfica: actores, riesgos, tronco temático y ramas 10-5-3.
            </p>
          </div>

          <div
            onClick={() => onSelectTool('prototipado')}
            className="g2 p-4 rounded-xl space-y-2 cursor-pointer hover:border-[#A98FD6]/50 transition-all"
          >
            <span className="text-xs font-bold text-[#A98FD6] m">05 · SOLUCIONES</span>
            <h4 className="text-sm font-bold text-white sy">Prototipado</h4>
            <p className="text-xs text-brand-textSecondary">
              Especificación técnica, validación rápida y estructuración de proyectos y servicios.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ARTICULACIÓN CON EL ECOSISTEMA DEL OBSERVATORIO INNOVAHUB360
          ========================================================================= */}
      <section className="g2 p-8 rounded-2xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white sy">
              Ecosistema Integral del Observatorio InnovaHub360
            </h3>
            <p className="text-xs text-brand-textSecondary mt-0.5">
              Cómo se articula el módulo de Laboratorio de Innovación con los demás destinos del Observatorio.
            </p>
          </div>
          <span className="chip bg-white/5 border border-white/10 text-brand-textMuted text-[10px] m">
            VIEM · UNAD
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#5EC2DD]">
              <Radio className="w-4 h-4" />
              <span className="text-xs font-bold sy">Vigilancia Prospectiva</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Alimenta al Radar de Innovación del laboratorio con señales científicas, patentes y macrotendencias globales.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#A8C63C]">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold sy">Mapa de Actores</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Conecta los actores de la cuádruple hélice con el Suelo del Árbol de Innovación y las redes territoriales.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#F3C26B]">
              <Rocket className="w-4 h-4" />
              <span className="text-xs font-bold sy">Repositorio de Proyectos</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Recibe los prototipos validados generados en el módulo para su escalamiento institucional y seguimiento TRL.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#A98FD6]">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold sy">Boletines y Publicaciones</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Difunde los resultados del observatorio y los frutos de innovación a la comunidad académica y regional.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PortalCatalog;
