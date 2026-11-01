import React, { useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  FileText,
  Compass,
  ArrowRight,
  Layers,
  Edit3,
  Check,
  AlertCircle
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface ThemeAlternative {
  id: string;
  title: string;
  shortTag: string;
  focus: string;
  description: string;
  strengths: string[];
  impactScore: number;
  feasibilityScore: number;
}

interface IdeacionEstrategicaViewProps {
  onNavigateToTree?: () => void;
}

export const IdeacionEstrategicaView: React.FC<IdeacionEstrategicaViewProps> = ({ onNavigateToTree }) => {
  const containerData = useStore((state) => state.containerData);
  const selectedStrategicTheme = useStore((state) => state.selectedStrategicTheme);
  const setSelectedStrategicTheme = useStore((state) => state.setSelectedStrategicTheme);
  const prompt0Data = useStore((state) => state.prompt0Data);

  const [selectedThemeId, setSelectedThemeId] = useState<string>('tema-1');
  const [customThemeText, setCustomThemeText] = useState<string>('');
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  const [showTerritoryDetails, setShowTerritoryDetails] = useState<boolean>(false);

  const defaultTerritoryExcerpt =
    containerData.trim() ||
    `Diagnóstico Territorial Integrado: Zona ${prompt0Data.zonaUNAD || 'Cundinamarca / Sabana Centro - Soacha'}
El territorio presenta una vocación agroproductiva, manufacturera y de servicios en transición hacia la economía circular y la digitalización. Principales brechas identificadas: dependencia de insumos químicos de alto costo, intermediación comercial excesiva en la cadena alimentaria, y necesidad de microrredes energéticas descentralizadas para acopio y poscosecha.`;

  const themes: ThemeAlternative[] = [
    {
      id: 'tema-1',
      title: 'Biotecnología Aplicada y Valorización de Biomasa Agropecuaria',
      shortTag: 'Bioeconomía y Agricultura Regenerativa',
      focus: 'Aprovechamiento de residuos de cosechas, biofertilizantes y bioplaguicidas para sustituir químicos.',
      description: 'Ancla el laboratorio en la capacidad científica de ECAPMA y la necesidad regional de reducir costos de insumos, restaurar suelos degradados y promover agricultura regenerativa.',
      strengths: [
        'Resuelve la principal brecha de rentabilidad campesina y salud del suelo',
        'Alta disponibilidad de biomasa residual en la cuenca territorial',
        'Grupos de investigación UNAD con laboratorios biológicos especializados',
      ],
      impactScore: 92,
      feasibilityScore: 88,
    },
    {
      id: 'tema-2',
      title: 'Tecnologías Digitales, IA y Trazabilidad para Cadenas Cortas',
      shortTag: 'Agrotech, Logística y Comercio Justo',
      focus: 'Plataformas de trazabilidad, monitoreo microclimático IoT y comercialización directa con blockchain.',
      description: 'Conecta la producción campesina directamente con mercados institucionales y consumidores urbanos, eliminando intermediación abusiva y garantizando origen.',
      strengths: [
        'Demanda creciente de alimentos con certificación de origen y precio justo',
        'Capacidades de la Escuela de Ciencias Básicas, Tecnología e Ingeniería (ECBTI)',
        'Rápida adopción por cooperativas juveniles rurales y organizaciones comunitarias',
      ],
      impactScore: 89,
      feasibilityScore: 85,
    },
    {
      id: 'tema-3',
      title: 'Comunidades Energéticas y Soluciones Solares Descentralizadas',
      shortTag: 'Transición Energética Justa y Sostenible',
      focus: 'Generación fotovoltaica distribuida para bombeo de agua, refrigeración y centros de acopio rurales.',
      description: 'Supera la vulnerabilidad de la red eléctrica en zonas dispersas mediante microrredes gestionadas cooperativamente por las asociaciones locales.',
      strengths: [
        'Alineación prioritaria con el Plan Nacional de Desarrollo y transición energética',
        'Reduce costos energéticos en poscosecha, bombeo y cadena de frío',
        'Aumenta la resiliencia climática ante sequías y eventos climáticos extremos',
      ],
      impactScore: 86,
      feasibilityScore: 80,
    },
  ];

  const handleSelectTheme = (theme: ThemeAlternative) => {
    setSelectedThemeId(theme.id);
    setIsEditingCustom(false);
    setSelectedStrategicTheme(theme.title);
  };

  const handleApplyCustomTheme = () => {
    if (!customThemeText.trim()) return;
    setSelectedThemeId('custom');
    setSelectedStrategicTheme(customThemeText.trim());
    setIsEditingCustom(false);
  };

  const activeTheme =
    selectedThemeId === 'custom'
      ? {
          id: 'custom',
          title: customThemeText || selectedStrategicTheme,
          shortTag: 'Tema Estratégico Personalizado',
          focus: 'Enfoque temático adaptado a las condiciones singulares del territorio.',
          description: 'Tema formulado directamente por el equipo territorial según el diagnóstico específico.',
          strengths: ['Alineado con el contexto local', 'Definido por el equipo del proyecto'],
          impactScore: 90,
          feasibilityScore: 85,
        }
      : themes.find((t) => t.id === selectedThemeId) || themes[0];

  return (
    <div className="w-full space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span>{' '}
            <span className="text-white">Ideación Estratégica y Elección del Tema</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">
            Ideación Estratégica y Elección del Tema
          </h1>
          <p className="bd text-sm text-brand-textSecondary mt-1 max-w-3xl">
            Herramienta 3 · Análisis deliberado de las vocaciones territoriales para seleccionar o formular el tema ancla que orientará el Árbol de Innovación y los Prototipos.
          </p>
        </div>

        <div className="flex items-center gap-2 g2 px-4 py-2 rounded-full text-xs text-[#A8C63C]">
          <CheckCircle2 className="w-4 h-4 text-[#A8C63C]" />
          <span>Diagnóstico Territorial Integrado</span>
        </div>
      </div>

      {/* Connected Territorial Document Synthesis */}
      <div className="g p-6 rounded-2xl border border-white/15 bg-gradient-to-r from-[#0C5E78]/30 via-transparent to-[#2E9CBA]/10">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#5EC2DD]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l">
              Documento del Territorio Conectado (Estudio Territorial)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowTerritoryDetails(!showTerritoryDetails)}
            className="text-xs text-[#5EC2DD] hover:underline flex items-center gap-1"
          >
            {showTerritoryDetails ? 'Ocultar texto completo' : 'Ver texto del diagnóstico'}
          </button>
        </div>

        <p className="text-sm md:text-base text-white sy font-medium leading-relaxed">
          "El territorio diagnosticado presenta una vocación agroproductiva, manufacturera y comunitaria de alta prioridad, con necesidad de soluciones en bioinsumos, trazabilidad tecnológica y transición energética descentralizada."
        </p>

        {showTerritoryDetails && (
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-brand-textSecondary font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
            {defaultTerritoryExcerpt}
          </div>
        )}
      </div>

      {/* Theme Selection Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white sy">Selección del Tema Estratégico</h2>
            <p className="text-xs text-brand-textSecondary">
              Elige una de las 3 alternativas generadas a partir del territorio o define un tema personalizado:
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingCustom(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 g2 rounded-full text-xs text-[#F3C26B] hover:text-white border border-[#F29F05]/30 hover:border-[#F29F05] transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Formular tema personalizado</span>
          </button>
        </div>

        {/* Custom Theme Editor Form if open */}
        {isEditingCustom && (
          <div className="g p-5 rounded-2xl border border-[#F29F05]/40 bg-black/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F3C26B] uppercase tracking-wider">
                Definir Tema Estratégico Personalizado
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCustom(false)}
                className="text-xs text-brand-textMuted hover:text-white"
              >
                Cancelar
              </button>
            </div>
            <textarea
              value={customThemeText}
              onChange={(e) => setCustomThemeText(e.target.value)}
              placeholder="Escribe o pega aquí el tema estratégico personalizado para el laboratorio (ej. Economía Circular y Gestión Comunitaria del Agua)..."
              className="w-full p-3 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:outline-none focus:border-[#F29F05] transition-colors"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleApplyCustomTheme}
                disabled={!customThemeText.trim()}
                className="metal px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar este tema estratégico</span>
              </button>
            </div>
          </div>
        )}

        {/* The 3 Pre-calculated Alternative Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {themes.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme)}
                className={`g p-6 rounded-2xl cursor-pointer transition-all flex flex-col justify-between border ${
                  isSelected
                    ? 'border-[#5EC2DD] shadow-[0_0_30px_rgba(46,156,186,0.35)] bg-gradient-to-b from-white/10 to-transparent'
                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#5EC2DD] uppercase tracking-wider m">
                      {theme.shortTag}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                        isSelected ? 'bg-[#5EC2DD] text-black font-bold' : 'border border-white/20 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white sy leading-snug mb-2">{theme.title}</h3>

                  <p className="text-xs text-brand-textSecondary leading-relaxed mb-4">{theme.description}</p>

                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                      Fortalezas Territoriales:
                    </span>
                    {theme.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-brand-textSecondary">
                        <span className="text-[#A8C63C]">•</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-brand-textMuted block">Impacto</span>
                      <span className="font-bold text-white m">{theme.impactScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-textMuted block">Factibilidad</span>
                      <span className="font-bold text-[#A8C63C] m">{theme.feasibilityScore}%</span>
                    </div>
                  </div>

                  <span className={`text-xs font-semibold ${isSelected ? 'text-[#5EC2DD]' : 'text-brand-textMuted'}`}>
                    {isSelected ? 'Seleccionado' : 'Elegir'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation and Next Step Action Bar */}
      <div className="g p-6 rounded-2xl border border-white/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5EC2DD]/20 border border-[#5EC2DD]/40 flex items-center justify-center text-[#5EC2DD]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-brand-textMuted uppercase tracking-wider block">Tema Activo para el Laboratorio:</span>
            <span className="text-base font-bold text-white sy">{activeTheme.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToTree && (
            <button
              type="button"
              onClick={onNavigateToTree}
              className="metal px-6 py-3 text-sm font-semibold text-white flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
            >
              <span>Continuar al Árbol de Innovación con este Tema</span>
              <ArrowRight className="w-4 h-4 text-[#5EC2DD]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default IdeacionEstrategicaView;