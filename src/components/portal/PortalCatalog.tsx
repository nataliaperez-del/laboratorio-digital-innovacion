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
  /** Inicia la conversación por voz con ZOE; si trae texto, se lo pregunta. */
  onOpenZoe: (text?: string) => void;
  onPlayIntro: () => void;
}

export const PortalCatalog: React.FC<PortalCatalogProps> = ({ onSelectTool, onOpenZoe, onPlayIntro }) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [slideProgress, setSlideProgress] = useState<number>(0);

  const bannerSlides = [
    {
      id: 0,
      eyebrow: 'MÓDULO ESTRATÉGICO · OBSERVATORIO INNOVAHUB360',
      title: 'Laboratorio de Innovación en Línea',
      subtitle: 'Del diagnóstico territorial al prototipado, con la IA como mediadora',
      description:
        'Un módulo del Observatorio InnovaHub360 que se alimenta de sus señales. Cuatro herramientas que funcionan solas o encadenadas: Estudio Territorial, Ideación, Árbol de Innovación y Prototipado.',
      badge: '4 Herramientas Modulares',
      badgeColor: '#2E9CBA',
      ctaText: 'Empezar con un Estudio Territorial',
      targetTool: 'estudio' as ToolId,
      statNumber: '04',
      statLabel: 'Herramientas modulares',
      accentGradient: 'from-[#0C5E78]/35 via-transparent to-[#2E9CBA]/20',
      accentColor: '#5EC2DD',
    },
    {
      id: 1,
      eyebrow: 'INSUMO DEL OBSERVATORIO',
      title: 'Radar del Observatorio',
      subtitle: 'Señales reales en matriz de impacto y velocidad de adopción',
      description:
        'El Laboratorio lee las señales que publica el Observatorio y permite llevar cualquiera a Ideación, al Árbol de Innovación o a Prototipado.',
      badge: 'Datos del Observatorio',
      badgeColor: '#5EC2DD',
      ctaText: 'Explorar el Radar',
      targetTool: 'radar' as ToolId,
      statNumber: 'En vivo',
      statLabel: 'Leído del Observatorio',
      accentGradient: 'from-[#0C5E78]/35 via-transparent to-[#5EC2DD]/20',
      accentColor: '#5EC2DD',
    },
    {
      id: 2,
      eyebrow: 'HERRAMIENTA 01 · DIAGNÓSTICO',
      title: 'Estudio Territorial',
      subtitle: 'Diagnóstico en 12 puntos con la metodología MDVT',
      description:
        'Caracterización productiva, lectura por pilares, matriz FODA y contraste con fuentes propias del territorio, con informe formal en Word y PDF.',
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
      eyebrow: 'HERRAMIENTAS 02 Y 03 · IDEACIÓN Y ÁRBOL',
      title: 'Ideación y Árbol de Innovación',
      subtitle: 'De una vocación y tres temas al árbol 10-5-3',
      description:
        'Parte de un tema, un archivo o el estudio; declara la vocación y explora en el árbol interactivo las tendencias, oportunidades y frutos que la IA construye.',
      badge: 'Árbol interactivo 10-5-3',
      badgeColor: '#F29F05',
      ctaText: 'Visualizar Árbol de Innovación',
      targetTool: 'arbol' as ToolId,
      statNumber: '10·5·3',
      statLabel: 'Global, Colombia, territorio',
      accentGradient: 'from-[#6E4202]/35 via-transparent to-[#F29F05]/20',
      accentColor: '#F3C26B',
    },
    {
      id: 4,
      eyebrow: 'HERRAMIENTA 04 · SOLUCIONES',
      title: 'Prototipado',
      subtitle: 'Un plan completo desde una idea o un fruto del árbol',
      description:
        'Hipótesis, arquitectura, fases, métricas y riesgos, con informe formal en Word y PDF.',
      badge: 'Plan con IA Generativa',
      badgeColor: '#A98FD6',
      ctaText: 'Crear Plan de Prototipado',
      targetTool: 'prototipado' as ToolId,
      statNumber: 'TRL 3–6',
      statLabel: 'Madurez objetivo a elegir',
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
      id: 'estudio' as ToolId,
      name: 'Estudio Territorial',
      tagline: 'Diagnóstico de un territorio en 12 puntos',
      description: 'Ficha Base, fuentes propias, lectura por pilares, matriz FODA y alertas de verificación con la metodología MDVT.',
      icon: Layers,
      color: '#A8C63C',
      accentColor: '#7A9706',
      badge: 'Herramienta 1',
    },
    {
      id: 'ideacion' as ToolId,
      name: 'Ideación',
      tagline: 'Vocación y tres temas para decidir',
      description: 'El proceso de vocación aplicado a un tema, un archivo, una señal del Observatorio o el Estudio Territorial.',
      icon: BrainCircuit,
      color: '#F3C26B',
      accentColor: '#F29F05',
      badge: 'Herramienta 2',
    },
    {
      id: 'arbol' as ToolId,
      name: 'Árbol de Innovación',
      tagline: '10 globales · 5 Colombia · 3 territorio',
      description: 'Árbol interactivo construido por la IA para cualquier tema: raíces, tronco, ramas, hojas y frutos, con informe formal.',
      icon: Trees,
      color: '#A8C63C',
      accentColor: '#A8C63C',
      badge: 'Herramienta 3',
    },
    {
      id: 'prototipado' as ToolId,
      name: 'Prototipado',
      tagline: 'De la idea al plan de validación',
      description: 'Plan completo con hipótesis, arquitectura, fases y métricas, desde una idea libre o un fruto del árbol.',
      icon: Rocket,
      color: '#A98FD6',
      accentColor: '#6B4FA0',
      badge: 'Herramienta 4',
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
                onClick={() => onOpenZoe()}
                className="g2 px-5 py-3.5 rounded-full text-sm font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all zoe-glow"
              >
                <Sparkles className="w-4 h-4 text-[#27DCFF] animate-spin" style={{ animationDuration: '6s' }} />
                <span>Conversar con ZOE</span>
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
                <h3 className="text-lg font-bold text-white sy">ZOE</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#CFE0E6] max-w-3xl leading-relaxed">
                ZOE vive en la interfaz y conversa por voz: tócalo y háblale. Te explica las herramientas y tus resultados, te ayuda a formular retos y hace alguna broma en el camino. Los documentos los generan las herramientas y la última palabra es tuya.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <button type="button" onClick={onPlayIntro} className="lab-btn w-full sm:w-auto">
              Ver su presentación
            </button>
            <button
              type="button"
              onClick={() => onOpenZoe()}
              className="metal px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow hover:scale-105 transition-all w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
              <span>Conversar con ZOE</span>
            </button>
          </div>
        </div>

        {/* Quick Transversal Prompt Pills */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-brand-textMuted font-medium mr-1">Pregúntale a ZOE:</span>
          <button
            onClick={() => onOpenZoe('¿Cómo uso el Estudio Territorial con el Árbol?')}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "¿Cómo uso el Estudio Territorial con el Árbol?"
          </button>
          <button
            onClick={() => onOpenZoe('¿Qué necesito para armar un plan de prototipado?')}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "¿Qué necesito para armar un plan de prototipado?"
          </button>
          <button
            onClick={() => onOpenZoe('Explícame las señales del Radar')}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors cursor-pointer"
          >
            "Explícame las señales del Radar"
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
              <span className="text-xs text-brand-textMuted">4 herramientas modulares</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white sy">
              Herramientas del Laboratorio de Innovación en Línea
            </h2>
            <p className="text-xs sm:text-sm text-brand-textSecondary mt-1 max-w-2xl">
              Cada herramienta puede utilizarse de forma 100% independiente con datos propios o encadenada como una ruta metodológica completa.
            </p>
          </div>
          <span className="text-xs text-brand-textMuted m hidden sm:inline-block">
            InnovaHub360 · Arquitectura Modular
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
            <h3 className="text-lg font-bold text-white sy">Una ruta posible: cada herramienta también funciona sola</h3>
          </div>
          <span className="text-xs text-brand-textMuted m hidden md:inline-block">
            Encadenada o autónoma
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { tool: 'radar' as ToolId, tag: 'OBSERVATORIO', title: 'Radar', text: 'Señales que el Observatorio ya vigila.', color: '#5EC2DD' },
            { tool: 'estudio' as ToolId, tag: '01 · TERRITORIO', title: 'Estudio Territorial', text: 'Diagnóstico del territorio en 12 puntos.', color: '#A8C63C' },
            { tool: 'ideacion' as ToolId, tag: '02 · IDEACIÓN', title: 'Ideación', text: 'Vocación y elección de un tema.', color: '#F3C26B' },
            { tool: 'arbol' as ToolId, tag: '03 · ÁRBOL', title: 'Árbol de Innovación', text: 'Tendencias 10-5-3, oportunidades y frutos.', color: '#A8C63C' },
            { tool: 'prototipado' as ToolId, tag: '04 · SOLUCIONES', title: 'Prototipado', text: 'Plan de validación de una idea o un fruto.', color: '#A98FD6' },
          ].map((step) => (
            <button key={step.tool} type="button" onClick={() => onSelectTool(step.tool)} className="g2 p-4 rounded-xl space-y-2 text-left transition-all hover:border-white/30">
              <span className="text-xs font-bold m" style={{ color: step.color }}>{step.tag}</span>
              <span className="text-sm font-bold text-white sy block">{step.title}</span>
              <span className="text-xs text-brand-textSecondary block">{step.text}</span>
            </button>
          ))}
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
              El Laboratorio es una parte del Observatorio: se alimenta de él y entrega resultados a otros de sus destinos.
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
              Sus señales llegan al Laboratorio por el Radar y sirven de insumo a cada herramienta.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#A8C63C]">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold sy">Mapa de Actores</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Un destino propio del Observatorio: los actores que el Estudio Territorial identifica se contrastan allí.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#F3C26B]">
              <Rocket className="w-4 h-4" />
              <span className="text-xs font-bold sy">Repositorio de Proyectos</span>
            </div>
            <p className="text-xs text-brand-textSecondary leading-relaxed">
              Destino natural de los planes de prototipado una vez validados por el equipo.
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
