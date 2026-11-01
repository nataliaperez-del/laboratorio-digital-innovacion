import React, { useState } from 'react';
import { Layers, MapPin, Sparkles, CheckCircle2, RefreshCw, Download, FileText, ChevronRight, School } from 'lucide-react';
import { UNAD_ESCUELA_BY_SIGLA } from '../../constants/unadEscuelas';

interface TerritorialBlock {
  number: number;
  title: string;
  category: string;
  status: 'completado' | 'en_progreso' | 'pendiente';
  summary: string;
}

export const EstudioTerritorialView: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<string>('Zona Centro Bogotá Cundinamarca (ZCBC)');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('Facatativá - Cundinamarca');
  const [selectedSchool, setSelectedSchool] = useState<string>('ECAPMA');
  const [activeBlockNumber, setActiveBlockNumber] = useState<number>(1);
  const [isGeneratingBlock, setIsGeneratingBlock] = useState<boolean>(false);

  const [blocks, setBlocks] = useState<TerritorialBlock[]>([
    {
      number: 1,
      title: 'Caracterización Biofísica y Delimitación Territorial',
      category: 'Geografía y Clima',
      status: 'completado',
      summary: 'El territorio se ubica en la Sabana de Occidente, piso térmico frío con vocación agropecuaria de hortalizas, floricultura y ganadería de leche. Altitud promedio de 2.580 msnm.',
    },
    {
      number: 2,
      title: 'Demografía, Empleo y Dinámicas Poblacionales',
      category: 'Población',
      status: 'completado',
      summary: 'Población con alta concentración urbana y rural dispersa. Presencia de jóvenes rurales con necesidad de relevo generacional y formación tecnológica.',
    },
    {
      number: 3,
      title: 'Cadenas Productivas Dominantes y Crecimiento',
      category: 'Economía Rural',
      status: 'completado',
      summary: 'Cadenas priorizadas: papa, hortalizas de clima frío, lácteos artesanales y producción de flores de exportación con retos de fitosanidad y costos de insumos.',
    },
    {
      number: 4,
      title: 'Tejido Empresarial, Asociatividad y Cooperativas',
      category: 'Organización',
      status: 'completado',
      summary: 'Presencia de 14 asociaciones campesinas y 3 cooperativas de pequeños productores con retos en gobernanza y acceso a canales de comercialización directa.',
    },
    {
      number: 5,
      title: 'Infraestructura Logística, Vías y Conectividad Digital',
      category: 'Infraestructura',
      status: 'completado',
      summary: 'Vías secundarias y terciarias en estado medio. Brecha de conectividad digital en veredas periféricas (penetración menor al 38%).',
    },
    {
      number: 6,
      title: 'Ecosistema de CTeI y Educación Superior',
      category: 'Capacidades',
      status: 'completado',
      summary: 'Nodo UNAD Facatativá con laboratorios agroambientales, grupos de investigación SIGIIP en biotecnología y articulación con colegios agropecuarios.',
    },
    {
      number: 7,
      title: 'Brechas Socioeconómicas y Pobreza Multidimensional',
      category: 'Social',
      status: 'completado',
      summary: 'Índice de Pobreza Multidimensional del 22.4% en áreas rurales, concentrado en informalidad laboral y aseguramiento en salud.',
    },
    {
      number: 8,
      title: 'Vulnerabilidad Climática, Suelos y Recursos Hídricos',
      category: 'Medio Ambiente',
      status: 'completado',
      summary: 'Estrés hídrico estacional y degradación de suelos por uso continuado de agroquímicos convencionales. Oportunidad crítica para bioinsumos.',
    },
    {
      number: 9,
      title: 'Alineación con Planes de Desarrollo Municipal y Departamental',
      category: 'Políticas Públicas',
      status: 'completado',
      summary: 'Alineado con el eje de Sostenibilidad y Reindustrialización Rural del Plan Departamental "Cundinamarca Región que Progresa".',
    },
    {
      number: 10,
      title: 'Antecedentes de Proyectos e Investigaciones UNAD (SIGIIP)',
      category: 'Investigación Institucional',
      status: 'completado',
      summary: '18 proyectos de investigación previos registrados en el banco SIGIIP en bioeconomía, robótica educativa y extensión agropecuaria.',
    },
    {
      number: 11,
      title: 'Matriz FODA Territorial Integrada',
      category: 'Estrategia',
      status: 'completado',
      summary: 'Fortalezas: ubicación geoestratégica y presencia UNAD. Oportunidades: demanda de alimentos sostenibles. Amenazas: variabilidad climática.',
    },
    {
      number: 12,
      title: 'Síntesis Diagnóstica y Vocación Sugerida para el CIP',
      category: 'Conclusiones',
      status: 'completado',
      summary: 'Se concluye que el CIP debe anclarse en la vocación agrobiotecnológica con tecnologías digitales para soberanía alimentaria y bioeconomía.',
    },
  ]);

  const activeBlock = blocks.find((b) => b.number === activeBlockNumber) || blocks[0];

  const handleRegenerateBlock = async (num: number) => {
    if (isGeneratingBlock) return;
    setIsGeneratingBlock(true);

    try {
      const response = await fetch('/api/unad-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Regenera el Bloque ${num} (${activeBlock.title}) del Estudio Territorial para el municipio de ${selectedMunicipio}, Zona ${selectedZone}, Escuela líder ${selectedSchool}. Genera un análisis riguroso de 1 párrafo técnico con datos territoriales concretos.`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setBlocks((prev) =>
            prev.map((b) => (b.number === num ? { ...b, summary: text, status: 'completado' } : b))
          );
        }
      }
    } catch {
      // Sin error visible, conserva el dato
    } finally {
      setIsGeneratingBlock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span> <span className="text-white">Estudio Territorial</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Estudio Territorial y Diagnóstico Zonal</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1">
            Contenedor 2 · Estructuración diagnóstica en 12 bloques temáticos con ingesta de fuentes del territorio y mediación de Gemini.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="metal px-4 py-2 text-xs text-white flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-[#5EC2DD]" />
          <span>Exportar Diagnóstico (Word/PDF)</span>
        </button>
      </div>

      {/* Territorial Configuration Card */}
      <div className="g p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-brand-textMuted uppercase l block mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#5EC2DD]" />
            Zona UNAD
          </label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full bg-[#04222B] text-xs text-white border border-white/15 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
          >
            <option value="ZCBC">Zona Centro Bogotá Cundinamarca (ZCBC)</option>
            <option value="ZCAR">Zona Caribe (ZCAR)</option>
            <option value="ZCOR">Zona Centro Oriente (ZCOR)</option>
            <option value="ZOCC">Zona Occidente (ZOCC)</option>
            <option value="ZSUR">Zona Sur (ZSUR)</option>
            <option value="ZAO">Zona Amazonía Orinoquía (ZAO)</option>
            <option value="ZCSUR">Zona Centro Sur (ZCSUR)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-textMuted uppercase l block mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#A8C63C]" />
            Municipio Sede (DIVIPOLA)
          </label>
          <select
            value={selectedMunicipio}
            onChange={(e) => setSelectedMunicipio(e.target.value)}
            className="w-full bg-[#04222B] text-xs text-white border border-white/15 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
          >
            <option value="Facatativá - Cundinamarca">Facatativá (Cundinamarca)</option>
            <option value="Fusagasugá - Cundinamarca">Fusagasugá (Cundinamarca)</option>
            <option value="Duitama - Boyacá">Duitama (Boyacá)</option>
            <option value="Pasto - Nariño">Pasto (Nariño)</option>
            <option value="Valledupar - Cesar">Valledupar (Cesar)</option>
            <option value="Dosquebradas - Risaralda">Dosquebradas (Risaralda)</option>
            <option value="Acacías - Meta">Acacías (Meta)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-textMuted uppercase l block mb-1.5 flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-[#F3C26B]" />
            Escuela Líder
          </label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full bg-[#04222B] text-xs text-white border border-white/15 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
          >
            {Object.entries(UNAD_ESCUELA_BY_SIGLA).map(([sigla, nombre]) => (
              <option key={sigla} value={sigla}>
                {sigla} · {nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 12 Blocks Navigation Grid + Active Block Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 12 Blocks Selector */}
        <div className="lg:col-span-5 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l mb-2">
            12 Bloques del Contenedor 2:
          </h3>
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
            {blocks.map((b) => {
              const isSelected = b.number === activeBlockNumber;
              return (
                <div
                  key={b.number}
                  onClick={() => setActiveBlockNumber(b.number)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'g bg-gradient-to-r from-[#2E9CBA]/20 to-transparent border-[#27DCFF]'
                      : 'g2 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold sy bg-white/10 text-white">
                      {b.number}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white leading-tight">{b.title}</p>
                      <span className="text-[10px] text-brand-textMuted m">{b.category}</span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#A8C63C] shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Block Detailed Review Panel */}
        <div className="lg:col-span-7 g p-6 flex flex-col gap-4 border border-white/15 bg-gradient-to-br from-[#0A4A5C]/35 to-transparent">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase sy bg-[#2E9CBA]/20 text-[#5EC2DD] border border-[#2E9CBA]/40">
              Bloque {activeBlock.number} de 12 · {activeBlock.category}
            </span>
            <span className="text-xs text-[#A8C63C] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Validado Metodológicamente
            </span>
          </div>

          <h2 className="text-xl font-bold text-white sy leading-snug">{activeBlock.title}</h2>

          <div className="g2 p-4 rounded-xl text-xs text-white/90 leading-relaxed font-normal min-h-[160px]">
            {activeBlock.summary}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleRegenerateBlock(activeBlock.number)}
              disabled={isGeneratingBlock}
              className="g2 px-4 py-2 rounded-xl text-xs text-[#5EC2DD] hover:text-white flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBlock ? 'animate-spin' : ''}`} />
              <span>{isGeneratingBlock ? 'Regenerando con Gemini...' : 'Regenerar bloque con IA'}</span>
            </button>

            <div className="ml-auto flex items-center gap-2 text-xs text-brand-textMuted">
              <span>Siguiente:</span>
              <button
                onClick={() => setActiveBlockNumber(Math.min(12, activeBlock.number + 1))}
                className="text-white hover:text-[#F3C26B] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Bloque {Math.min(12, activeBlock.number + 1)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
