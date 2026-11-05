import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Compass, Edit3, FolderArchive, Link2, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useStore, type FuentesMode, type Prompt0Data } from '@/store/useStore';
import { DIVIPOLA_DEPARTMENT_NAMES, DIVIPOLA_LOCATIONS } from '@/constants/divipola';
import { cargarManifest, manifestActual } from '@/repositorio/cargarRepositorio';
import { construirProcedencia } from '@/repositorio/procedencia';
import { GenerationCancelledError } from '@/services/ai';
import { generateContainer, regenerateContenedor2Section } from '@/services/territorialStudy';
import { connectOwnSourcesFolder, DriveFolderError, extractDriveFolderId } from '@/services/institutionalDrive';
import { CONTENEDOR2_SECTIONS, type Contenedor2SectionResult } from '@/prompts/contenedor2Sections';
import { estudioReport } from '@/lib/labReports';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { readInputFile, INPUT_FILE_ACCEPT } from '@/lib/readInputFile';
import { EVIDENCE_SCORE, parseAlerts, parseFoda, parseInsightCards, parsePillars, parseSources, type FodaMatrix, type Pillar } from '@/lib/territorialInsights';
import { Disclosure, RichDocument } from '@/components/lab/RichDocument';
import {
  BancoStatus,
  ClearButton,
  EmptyState,
  ErrorNotice,
  GenerationProgress,
  ReportActions,
  SectionReview,
  ToolHeader,
  type ProgressState,
} from '@/components/lab/common';
import type { ToolId } from '@/components/layout/Header';

const ZONAS_UNAD = [
  'Zona Amazonía Orinoquía (ZAO)',
  'Zona Caribe (ZCAR)',
  'Zona Centro Bogotá Cundinamarca (ZCBC)',
  'Zona Centro Boyacá (ZCB)',
  'Zona Centro Oriente (ZCOR)',
  'Zona Centro Sur (ZCSUR)',
  'Zona Occidente (ZOCC)',
  'Zona Sur (ZSUR)',
];

const PHASES = [...new Set(CONTENEDOR2_SECTIONS.map((s) => s.phase))];

/** Qué explica cada bloque: la pantalla enseña a leer el resultado, no solo lo muestra. */
const BLOCK_HELP: Record<number, string> = {
  1: 'Ubica el territorio y su papel en la región.',
  2: 'Los datos duros: perfil productivo e indicadores con fuente y año.',
  3: 'Cómo está el territorio en los cinco pilares de competitividad y con cuánta evidencia.',
  4: 'Qué se está moviendo en el territorio.',
  5: 'Vacíos frente a territorios comparables o estándares nacionales.',
  6: 'Condiciones favorables que se pueden aprovechar.',
  7: 'Síntesis estratégica: de aquí parte Crear Conceptos (Ideación).',
  8: 'Contraste del diagnóstico con las fuentes propias del territorio.',
  9: 'Lo que una persona debe verificar antes de citar este estudio.',
  10: 'Referencias en APA 7.',
  11: 'De dónde salió cada dato y qué fuentes faltaron.',
  12: 'Alcance del estudio.',
};

const FODA_CELLS: Array<{ key: keyof FodaMatrix; title: string; color: string }> = [
  { key: 'fortalezas', title: 'Fortalezas', color: '#A8C63C' },
  { key: 'debilidades', title: 'Debilidades', color: '#F29F05' },
  { key: 'oportunidades', title: 'Oportunidades', color: '#5EC2DD' },
  { key: 'amenazas', title: 'Amenazas', color: '#E2665A' },
];

const FodaView: React.FC<{ matrix: FodaMatrix }> = ({ matrix }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {FODA_CELLS.map(({ key, title, color }) => (
      <div key={key} className="lab-card" style={{ borderTop: `3px solid ${color}` }}>
        <h4 className="text-sm font-bold sy mb-2 flex items-center justify-between" style={{ color }}>
          {title} <span className="m text-xs opacity-80">{matrix[key].length}</span>
        </h4>
        {matrix[key].length ? (
          <ul className="space-y-1.5 text-sm text-brand-textSecondary leading-snug list-disc pl-4">
            {matrix[key].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-brand-textMuted">El estudio no declaró elementos en este cuadrante.</p>
        )}
      </div>
    ))}
  </div>
);

const PillarsView: React.FC<{ pillars: Pillar[]; markdown: string }> = ({ pillars, markdown }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pillars.map((p, i) => (
          <button key={i} type="button" className="lab-card text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="text-sm font-bold text-white sy block mb-2">{p.shortTitle}</span>
            <span className="block h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
              <span
                className="block h-full bg-gradient-to-r from-[#2E9CBA] to-[#A8C63C]"
                style={{ width: `${p.evidence ? EVIDENCE_SCORE[p.evidence] : 0}%` }}
              />
            </span>
            <span className="text-[11px] text-brand-textMuted mt-1.5 block">Evidencia: {p.evidence ?? 'no declarada'}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lab-card">
          <h4 className="text-sm font-bold text-white sy mb-2">{pillars[open].shortTitle}</h4>
          <RichDocument markdown={sectionOf(markdown, pillars[open].title)} dropTitle />
        </div>
      )}
    </div>
  );
};

/** Fragmento del bloque desde un subtítulo hasta el siguiente del mismo tipo. */
function sectionOf(markdown: string, title: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.includes(title));
  if (start < 0) return markdown;
  const isTitle = (l: string) => /^#{2,6}\s/.test(l) || /^\*\*[^*]+\*\*[:.]?\s*$/.test(l.trim());
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (isTitle(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

/** Cada bloque se presenta con la forma que mejor lo explica; si no se reconoce, con el lector interactivo. */
const BlockContent: React.FC<{ number: number; markdown: string }> = ({ number, markdown }) => {
  const pillars = useMemo(() => (number === 3 ? parsePillars(markdown) : []), [number, markdown]);
  const foda = useMemo(() => (number === 7 ? parseFoda(markdown) : null), [number, markdown]);
  const cards = useMemo(() => ([4, 5, 6].includes(number) ? parseInsightCards(markdown) : []), [number, markdown]);
  const sources = useMemo(() => (number === 10 ? parseSources(markdown) : []), [number, markdown]);

  if (pillars.length >= 3) return <PillarsView pillars={pillars} markdown={markdown} />;
  if (foda) return <FodaView matrix={foda} />;
  if (cards.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="lab-card">
            <h4 className="text-sm font-bold text-white sy mb-1">{c.title}</h4>
            {c.body && <p className="text-sm text-brand-textSecondary leading-relaxed">{c.body}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (sources.length) {
    return (
      <ol className="space-y-2 text-sm text-brand-textSecondary list-decimal pl-5">
        {sources.map((s, i) => (
          <li key={i} className="break-words">
            {s}
          </li>
        ))}
      </ol>
    );
  }
  return <RichDocument markdown={markdown} dropTitle />;
};

type DriveState = 'idle' | 'checking' | 'ok' | 'empty' | 'error';

/** Fuentes primarias del territorio: como en Fase 1, por carpeta de Drive; además, por carga directa. */
const OwnSources: React.FC<{ disabled: boolean; onError: (m: string) => void }> = ({ disabled, onError }) => {
  const { fuentesMode, setFuentesMode, fuentesConexion, setFuentesConexion, setInstitutionalDriveBundle, institutionalDriveBundle } = useStore();
  const [url, setUrl] = useState(fuentesConexion?.folderUrl ?? '');
  const [state, setState] = useState<DriveState>(fuentesConexion ? 'ok' : 'idle');
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setInstitutionalDriveBundle(null);
    setFuentesConexion(null);
    setState('idle');
  };

  const selectMode = (mode: FuentesMode) => {
    setFuentesMode(mode);
    if (mode === 'sin_fuentes') reset();
  };

  const connect = async () => {
    const folderId = extractDriveFolderId(url);
    if (!folderId) {
      onError('No se reconoce una carpeta en ese enlace. Cópialo desde «Compartir» en Google Drive (debe contener /folders/).');
      return;
    }
    setState('checking');
    try {
      const { status, result } = await connectOwnSourcesFolder(folderId);
      setInstitutionalDriveBundle({
        text: result.text,
        fileNames: result.fileNames,
        truncated: result.truncated,
        sourceCharCount: result.sourceCharCount,
        territories: result.territories,
        diagnostics: result.diagnostics,
      });
      setFuentesConexion({
        folderId,
        folderUrl: url.trim(),
        verificadoEn: new Date().toISOString(),
        documentos: result.documents.map((d) => ({ id: d.id, nombre: d.name, mimeType: d.mimeType, modificado: d.modifiedTime })),
      });
      setState(status === 'CONECTADA' ? 'ok' : 'empty');
    } catch (e) {
      reset();
      setState('error');
      onError(e instanceof DriveFolderError ? e.message : e instanceof Error ? e.message : 'No se pudo conectar la carpeta.');
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const read = await Promise.all([...files].map(async (f) => ({ file: f, text: await readInputFile(f) })));
      // Mismo marcador que escribe la lectura de Drive: así la priorización por archivo funciona igual.
      const text = read.map((r) => `--- Texto plano (${r.file.name}) ---\n${r.text}`).join('\n\n');
      const previous = institutionalDriveBundle;
      setInstitutionalDriveBundle({
        text: previous ? `${previous.text}\n\n${text}` : text,
        fileNames: [...(previous?.fileNames ?? []), ...read.map((r) => r.file.name)],
        truncated: false,
      });
      setFuentesConexion({
        folderId: fuentesConexion?.folderId ?? 'archivos-cargados',
        folderUrl: fuentesConexion?.folderUrl ?? '',
        verificadoEn: new Date().toISOString(),
        documentos: [
          ...(fuentesConexion?.documentos ?? []),
          ...read.map((r) => ({
            id: r.file.name,
            nombre: r.file.name,
            mimeType: r.file.type || 'archivo',
            modificado: new Date(r.file.lastModified).toISOString(),
          })),
        ],
      });
      setState('ok');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const docs = fuentesConexion?.documentos ?? [];
  return (
    <div className="lab-panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white sy flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--brand-olive)]" aria-hidden="true" /> Fuentes primarias del territorio
        </h3>
        <div className="lab-seg" role="group" aria-label="Fuentes primarias">
          <button type="button" aria-pressed={fuentesMode === 'sin_fuentes'} disabled={disabled} onClick={() => selectMode('sin_fuentes')}>
            Sin fuentes propias
          </button>
          <button type="button" aria-pressed={fuentesMode === 'con_fuentes'} disabled={disabled} onClick={() => selectMode('con_fuentes')}>
            Con fuentes propias
          </button>
        </div>
      </div>
      <p className="text-xs text-brand-textMuted leading-relaxed">
        {fuentesMode === 'sin_fuentes'
          ? 'El estudio se construye con el núcleo metodológico y la consulta por internet, y lo declara en una nota de trazabilidad.'
          : 'Planes de desarrollo, estudios locales o datos de cámaras de comercio: se usan como fuente prioritaria y quedan inventariados en el informe.'}
      </p>
      {fuentesMode === 'con_fuentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white block" htmlFor="fuentes-url">
              Carpeta de Google Drive
            </label>
            <div className="flex gap-2">
              <input
                id="fuentes-url"
                type="url"
                className="lab-input"
                placeholder="https://drive.google.com/drive/folders/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={disabled}
              />
              <button type="button" className="lab-btn shrink-0" disabled={disabled || !url.trim() || state === 'checking'} onClick={() => void connect()}>
                <Link2 className="w-4 h-4" aria-hidden="true" /> {state === 'checking' ? 'Verificando…' : 'Conectar'}
              </button>
            </div>
            {state === 'empty' && <p className="text-xs text-[#F3C26B]">La carpeta se abre pero no tiene documentos legibles.</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white block" htmlFor="fuentes-archivos">
              O carga los archivos directamente
            </label>
            <input
              id="fuentes-archivos"
              type="file"
              multiple
              accept={INPUT_FILE_ACCEPT}
              className="lab-input"
              disabled={disabled || uploading}
              onChange={(e) => void upload(e.target.files)}
            />
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {docs.map((d) => (
            <span key={d.id} className="lab-chip">
              {d.nombre}
            </span>
          ))}
          <button type="button" className="lab-btn lab-btn-sm" disabled={disabled} onClick={reset}>
            <Trash2 className="w-3 h-3" aria-hidden="true" /> Quitar
          </button>
        </div>
      )}
    </div>
  );
};

interface Props {
  onNavigate: (tool: ToolId) => void;
}

/** Herramienta Estudio Territorial: Ficha Base, fuentes y diagnóstico MDVT. */
export const EstudioTerritorialView: React.FC<Props> = ({ onNavigate }) => {
  const {
    prompt0Data,
    setPrompt0Data,
    containerData,
    setContainerData,
    contenedor2Sections,
    setContenedor2Sections,
    replaceContenedor2Section,
    containerProcedencia,
    setContainerProcedencia,
    fuentesMode,
    fuentesConexion,
    institutionalDriveBundle,
    setIdeationResult,
    clearEstudio,
  } = useStore();
  const inBank = useStore((st) => st.savedStudies.some((entry) => entry.id === st.bankIds.estudio));

  const [form, setForm] = useState<Prompt0Data>({ ...prompt0Data });
  const [editing, setEditing] = useState(!prompt0Data.municipality);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(1);
  const [nucleus, setNucleus] = useState<string | null>(null);

  useEffect(() => {
    cargarManifest()
      .then((m) => setNucleus(`v${m.version}`))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const busy = progress !== null || busyIndex !== null;
  const hasStudy = contenedor2Sections.length > 0;

  /** El estudio ya está en el Banco: se vacía la Ficha Base y el resultado para empezar otro. */
  const clearAll = () => {
    clearEstudio();
    setForm({ ...useStore.getState().prompt0Data });
    setEditing(true);
    setActive(1);
    setError(null);
  };
  const alerts = useMemo(() => parseAlerts(containerData), [containerData]);
  const issues = contenedor2Sections.filter((s) => s.status !== 'ok').length;
  const municipalities = form.department ? DIVIPOLA_LOCATIONS[form.department] || [] : [];
  const fuentesListas = fuentesMode === 'sin_fuentes' || Boolean(fuentesConexion);

  const saveFicha = (e: React.FormEvent) => {
    e.preventDefault();
    const territoryChanged = form.municipality !== prompt0Data.municipality || form.department !== prompt0Data.department;
    if (hasStudy && territoryChanged && !window.confirm('Cambiar el territorio descartará el Estudio Territorial generado. ¿Continuar?')) return;
    setPrompt0Data({ ...form });
    if (territoryChanged) {
      setContainerData('');
      setContainerProcedencia(null);
    }
    setEditing(false);
  };

  const generate = async () => {
    if (busy) return;
    if (hasStudy && !window.confirm('Esto reconstruye los 12 bloques desde cero. Si solo uno quedó mal, usa «Rehacer». ¿Continuar?')) return;
    setError(null);
    setProgress({ current: 1, total: CONTENEDOR2_SECTIONS.length, title: 'Preparando fuentes' });
    try {
      await cargarManifest();
      const procedencia = construirProcedencia({ manifest: manifestActual(), fuentesMode, fuentesConexion });
      const result = await generateContainer(
        prompt0Data,
        institutionalDriveBundle?.text,
        (p) => setProgress({ current: p.currentSection, total: p.totalSections, title: p.sectionTitle }),
        procedencia,
      );
      if (result.sections.every((s) => s.status === 'failed' || s.kind === 'app')) {
        throw new Error(result.sections.find((s) => s.issue)?.issue || 'La IA no generó contenido.');
      }
      setContainerData(result.markdown);
      setContenedor2Sections(result.sections);
      setContainerProcedencia(procedencia);
      setActive(1);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al generar el estudio.');
    } finally {
      setProgress(null);
    }
  };

  const regenerate = async (index: number) => {
    if (busy) return;
    setBusyIndex(index);
    setError(null);
    try {
      const result: Contenedor2SectionResult = await regenerateContenedor2Section(
        index,
        contenedor2Sections,
        prompt0Data,
        institutionalDriveBundle?.text,
        containerProcedencia ?? undefined,
      );
      replaceContenedor2Section(index, result);
      if (result.status === 'failed') setError(`El bloque ${result.number} volvió a fallar: ${result.issue || 'sin detalle'}`);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al rehacer el bloque.');
    } finally {
      setBusyIndex(null);
    }
  };

  const sendToIdeation = () => {
    const current = useStore.getState().ideationSource;
    if (
      current?.kind !== 'estudio' &&
      useStore.getState().themeProposalMarkdown.trim() &&
      !window.confirm('Ya hay un resultado en Crear Conceptos. ¿Quieres reemplazarlo por uno basado en este estudio?')
    )
      return;
    setIdeationResult({ kind: 'estudio', label: `Estudio Territorial de ${prompt0Data.municipality}`, text: containerData }, '', []);
    onNavigate('ideacion');
  };

  const section = contenedor2Sections.find((s) => s.number === active);
  const meta = CONTENEDOR2_SECTIONS.find((s) => s.number === active)!;

  return (
    <div className="w-full space-y-6">
      <ToolHeader
        title={MODULE_LABELS.estudio.title}
        subtitle={MODULE_LABELS.estudio.subtitle}
        titleColor="#A8C63C"
        description="Diagnóstico de un territorio en doce puntos de entrega con la metodología MDVT: caracterización productiva, lectura por pilares, matriz FODA y contraste con fuentes propias. Funciona solo y puede alimentar a Crear Conceptos y a Validar Conceptos."
      >
        {hasStudy && inBank && <BancoStatus color="#A8C63C" onOpen={() => onNavigate('banco')} />}
        {hasStudy && <ReportActions disabled={busy} getReport={() => estudioReport(prompt0Data, containerData)} />}
        {hasStudy && <ClearButton disabled={busy} onClear={clearAll} />}
        {hasStudy && (
          <button type="button" className="metal px-4 py-2 text-xs font-bold flex items-center gap-2" disabled={busy} onClick={sendToIdeation}>
            Llevar a {MODULE_LABELS.ideacion.title} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </ToolHeader>

      <ErrorNotice message={error} onClose={() => setError(null)} />

      {/* Ficha Base */}
      <section className="lab-panel space-y-4" aria-label="Ficha Base">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white sy flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--brand-teal-text)]" aria-hidden="true" /> Ficha Base
          </h2>
          {!editing && (
            <button type="button" className="lab-btn lab-btn-sm" disabled={busy} onClick={() => setEditing(true)}>
              <Edit3 className="w-3 h-3" aria-hidden="true" /> Editar
            </button>
          )}
        </div>
        {editing ? (
          <form onSubmit={saveFicha} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="lab-label" htmlFor="ficha-nombre">
                  Nombre del proyecto o idea
                </label>
                <input
                  id="ficha-nombre"
                  className="lab-input"
                  value={form.labName}
                  onChange={(e) => setForm({ ...form, labName: e.target.value })}
                  placeholder="Ej: Bioinnovación Sabana Centro"
                />
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-brand-textMuted">
                  <span>Lo escrito es:</span>
                  {(
                    [
                      ['nombre', 'Solo un nombre'],
                      ['tema', 'Un tema a verificar'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="labNameKind"
                        checked={(form.labNameKind ?? 'nombre') === value}
                        onChange={() => setForm({ ...form, labNameKind: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="lab-label" htmlFor="ficha-zona">
                  Zona UNAD *
                </label>
                <select id="ficha-zona" required className="lab-input" value={form.zonaUNAD} onChange={(e) => setForm({ ...form, zonaUNAD: e.target.value })}>
                  <option value="">Selecciona la zona…</option>
                  {ZONAS_UNAD.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lab-label" htmlFor="ficha-depto">
                  Departamento *
                </label>
                <select
                  id="ficha-depto"
                  required
                  className="lab-input"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value, municipality: '' })}
                >
                  <option value="">Selecciona…</option>
                  {DIVIPOLA_DEPARTMENT_NAMES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lab-label" htmlFor="ficha-muni">
                  Municipio *
                </label>
                <select
                  id="ficha-muni"
                  required
                  disabled={!form.department}
                  className="lab-input"
                  value={form.municipality}
                  onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                >
                  <option value="">{form.department ? 'Selecciona…' : 'Primero el departamento'}</option>
                  {municipalities.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lab-label" htmlFor="ficha-enlace">
                  Capital o nodo de enlace
                </label>
                <input
                  id="ficha-enlace"
                  className="lab-input"
                  value={form.capitalSede || ''}
                  onChange={(e) => setForm({ ...form, capitalSede: e.target.value })}
                  placeholder="Ej: Tunja"
                />
              </div>
              <div>
                <label className="lab-label" htmlFor="ficha-lugar">
                  Ubicación específica
                </label>
                <input
                  id="ficha-lugar"
                  className="lab-input"
                  value={form.specificLocation || ''}
                  onChange={(e) => setForm({ ...form, specificLocation: e.target.value })}
                  placeholder="Vereda, localidad o sede"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-white self-end pb-2.5 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.isCapital)} onChange={(e) => setForm({ ...form, isCapital: e.target.checked })} />
                Es capital o cabecera principal
              </label>
            </div>
            <div className="flex justify-end gap-2">
              {prompt0Data.municipality && (
                <button
                  type="button"
                  className="lab-btn"
                  onClick={() => {
                    setForm({ ...prompt0Data });
                    setEditing(false);
                  }}
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className="metal px-5 py-2 text-xs font-bold flex items-center gap-2">
                <Save className="w-4 h-4" aria-hidden="true" /> Guardar ficha
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              ['Proyecto o idea', prompt0Data.labName || 'Sin nombre'],
              ['Zona UNAD', prompt0Data.zonaUNAD || '—'],
              ['Territorio', `${prompt0Data.municipality}, ${prompt0Data.department}`],
              ['Ubicación', prompt0Data.specificLocation || prompt0Data.capitalSede || 'Sin precisar'],
            ].map(([k, v]) => (
              <div key={k} className="lab-card">
                <dt className="text-[11px] text-brand-textMuted">{k}</dt>
                <dd className="font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <OwnSources disabled={busy} onError={setError} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-brand-textMuted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--brand-olive)] shrink-0" aria-hidden="true" />
          {nucleus ? `Núcleo metodológico listo (${nucleus}). No hace falta conectar nada para empezar.` : 'Cargando el núcleo metodológico…'}
        </p>
        <button
          type="button"
          className="metal px-6 py-3 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
          disabled={busy || editing || !prompt0Data.municipality || !nucleus || !fuentesListas}
          title={!fuentesListas ? 'Conecta tus fuentes o elige «Sin fuentes propias»' : undefined}
          onClick={() => void generate()}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          {hasStudy ? 'Regenerar estudio completo' : 'Generar Estudio Territorial'}
        </button>
      </div>

      <GenerationProgress progress={progress} label="Bloque" />

      {hasStudy ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Resumen del estudio">
            {[
              [
                'Bloques completos',
                `${contenedor2Sections.length - issues}/${contenedor2Sections.length}`,
                issues ? 'Hay bloques por revisar' : 'Autoevaluación superada',
              ],
              ['Alertas a verificar', String(alerts.length), alerts.length ? 'Revísalas antes de citar' : 'Inusual: revisa las fuentes'],
              [
                'Fuentes propias',
                String(
                  fuentesConexion?.documentos.length ??
                    (containerProcedencia?.fuentesPropias.modo === 'con_fuentes' ? containerProcedencia.fuentesPropias.documentos.length : 0),
                ),
                containerProcedencia?.fuentesPropias.modo === 'con_fuentes' ? 'Inventariadas en el informe' : 'Solo fuentes públicas',
              ],
              ['Fases MDVT', String(PHASES.filter((p) => p.startsWith('Fase')).length), 'Caracterización a contraste'],
            ].map(([k, v, hint]) => (
              <div key={k} className="lab-card">
                <span className="text-[11px] text-brand-textMuted block">{k}</span>
                <span className="text-2xl font-bold text-white sy block">{v}</span>
                <span className="text-[11px] text-brand-textMuted">{hint}</span>
              </div>
            ))}
          </div>

          <SectionReview
            title="Revisión automática"
            sections={contenedor2Sections}
            busyIndex={busyIndex}
            disabled={busy}
            onRegenerate={(i) => void regenerate(i)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <nav className="lg:col-span-4 space-y-3 lg:sticky lg:top-4" aria-label="Bloques del estudio">
              {PHASES.map((phase) => (
                <div key={phase}>
                  <h3 className="l text-brand-textMuted mb-1.5">{phase}</h3>
                  <div className="space-y-1">
                    {CONTENEDOR2_SECTIONS.filter((s) => s.phase === phase).map((s) => {
                      const result = contenedor2Sections.find((r) => r.number === s.number);
                      return (
                        <button
                          key={s.number}
                          type="button"
                          aria-current={active === s.number}
                          className={`lab-navitem ${active === s.number ? 'is-active' : ''}`}
                          onClick={() => setActive(s.number)}
                        >
                          <span className="m text-[11px] opacity-70 w-5 shrink-0">{s.number}</span>
                          <span className="min-w-0 flex-1 text-left">{s.title}</span>
                          {result?.status === 'ok' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--brand-olive)]" aria-label="Completo" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#F29F05] shrink-0" aria-label="Por revisar" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <article className="lg:col-span-8 lab-panel space-y-4 min-w-0">
              <header className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
                <div className="min-w-0">
                  <span className="text-[11px] text-[var(--brand-teal-text)] font-semibold">{meta.phase}</span>
                  <h2 className="text-xl font-bold text-white sy">{meta.title}</h2>
                  <p className="text-xs text-brand-textMuted mt-0.5">{BLOCK_HELP[active]}</p>
                </div>
                <button type="button" className="lab-btn lab-btn-sm" disabled={busy} onClick={() => void regenerate(active - 1)}>
                  <RefreshCw className={`w-3 h-3 ${busyIndex === active - 1 ? 'animate-spin' : ''}`} aria-hidden="true" /> Rehacer bloque
                </button>
              </header>
              {section?.markdown.trim() ? (
                <>
                  <BlockContent number={active} markdown={section.markdown} />
                  {[3, 4, 5, 6, 7, 10].includes(active) && (
                    <Disclosure title={<span className="text-xs font-semibold text-brand-textSecondary">Ver el texto completo del bloque</span>}>
                      <RichDocument markdown={section.markdown} dropTitle />
                    </Disclosure>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#F3C26B]">{section?.issue || 'Este bloque quedó vacío. Usa «Rehacer bloque».'}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                <button type="button" className="lab-btn lab-btn-sm" disabled={active <= 1} onClick={() => setActive((a) => a - 1)}>
                  ← Anterior
                </button>
                <span className="m text-brand-textMuted">
                  {active} / {CONTENEDOR2_SECTIONS.length}
                </span>
                <button type="button" className="lab-btn lab-btn-sm" disabled={active >= CONTENEDOR2_SECTIONS.length} onClick={() => setActive((a) => a + 1)}>
                  Siguiente →
                </button>
              </div>
            </article>
          </div>
        </>
      ) : (
        !progress && (
          <EmptyState title="Aún no hay estudio">
            Completa la Ficha Base y pulsa «Generar Estudio Territorial». Verás aquí los doce puntos con su matriz FODA, los pilares y las alertas; en Word o
            PDF sale el informe formal.
          </EmptyState>
        )
      )}
    </div>
  );
};
