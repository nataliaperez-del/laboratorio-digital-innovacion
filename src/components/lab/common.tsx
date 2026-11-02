import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileDown, FileText, FileUp, Printer, RefreshCw, Sparkles, Square, X } from 'lucide-react';
import { cancelActiveGeneration } from '@/services/ai';
import { INPUT_FILE_ACCEPT, readInputFile } from '@/lib/readInputFile';
import { buildDocumentPlan } from '@/lib/documentPlan';
import type { LabReport } from '@/lib/labReports';
import type { GenerationPartStatus } from '@/prompts/themeAndInnovationPrompts';

/** Encabezado común de cada herramienta. */
export const ToolHeader: React.FC<{
  title: string;
  description: string;
  titleColor?: string;
  children?: React.ReactNode;
}> = ({ title, description, titleColor, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1
        className="h2 text-3xl md:text-4xl font-bold tracking-tight"
        style={{ color: titleColor || '#FFFFFF' }}
      >
        {title}
      </h1>
      <p className="bd text-sm text-brand-textSecondary mt-1 max-w-3xl">{description}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
  </div>
);

export const ErrorNotice: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) =>
  message ? (
    <div className="lab-error" role="alert">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="whitespace-pre-line min-w-0">{message}</span>
      <button type="button" onClick={onClose} className="ml-auto shrink-0" aria-label="Cerrar aviso">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

export interface ProgressState {
  current: number;
  total: number;
  title: string;
}

/** Avance real de la generación, con la opción de detenerla (como en Fase 1). */
export const GenerationProgress: React.FC<{ progress: ProgressState | null; label: string }> = ({ progress, label }) => {
  if (!progress) return null;
  const pct = progress.total ? Math.round(((progress.current - 0.5) / progress.total) * 100) : 0;
  return (
    <div className="lab-panel space-y-2.5" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[var(--brand-teal-text)] flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {label} {progress.current} de {progress.total}: {progress.title}
        </span>
        <button type="button" onClick={cancelActiveGeneration} className="lab-btn lab-btn-sm">
          <Square className="w-3 h-3" aria-hidden="true" /> Detener
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#5EC2DD] to-[#A8C63C] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-brand-textMuted">La IA redacta cada parte por separado; puede tardar varios minutos. No cierres la página.</p>
    </div>
  );
};

export interface ReviewItem {
  number: number;
  title: string;
  status: GenerationPartStatus;
  issue?: string;
}

/** Autoevaluación por partes: permite rehacer solo la que quedó mal. */
export const SectionReview: React.FC<{
  title: string;
  sections: readonly ReviewItem[];
  busyIndex: number | null;
  disabled?: boolean;
  onRegenerate: (index: number) => void;
}> = ({ title, sections, busyIndex, disabled, onRegenerate }) => {
  const issues = sections.filter((s) => s.status !== 'ok').length;
  if (!sections.length) return null;
  return (
    <details className="lab-panel" open={issues > 0}>
      <summary className="cursor-pointer text-xs font-semibold text-white flex items-center gap-2">
        {issues ? <AlertCircle className="w-4 h-4 text-[#F3C26B]" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4 text-[var(--brand-olive)]" aria-hidden="true" />}
        {title}: {issues ? `${issues} por revisar de ${sections.length}` : `${sections.length} partes completas`}
      </summary>
      <ul className="mt-3 space-y-1.5">
        {sections.map((s, i) => (
          <li key={s.number} className="flex flex-wrap items-center gap-2 text-xs text-brand-textSecondary">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'ok' ? 'bg-[#A8C63C]' : s.status === 'warning' ? 'bg-[#F29F05]' : 'bg-rose-500'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {s.number}. {s.title}
              {s.issue && <span className="block text-[11px] text-[#F3C26B]">{s.issue}</span>}
            </span>
            <button type="button" className="lab-btn lab-btn-sm" disabled={disabled} onClick={() => onRegenerate(i)}>
              <RefreshCw className={`w-3 h-3 ${busyIndex === i ? 'animate-spin' : ''}`} aria-hidden="true" />
              {busyIndex === i ? 'Rehaciendo…' : 'Rehacer'}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
};

/**
 * Descargas formales. La pantalla es para explorar; aquí sale el documento académico con
 * portada, tabla de contenido, índices y numeración de páginas.
 */
export const ReportActions: React.FC<{ getReport: () => LabReport | null; disabled?: boolean }> = ({ getReport, disabled }) => {
  const [busy, setBusy] = useState<'word' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadWord = async () => {
    const report = getReport();
    if (!report) return;
    setBusy('word');
    setError(null);
    try {
      // Carga diferida: la librería de Word solo se descarga cuando alguien exporta.
      const { buildReportDocxBlob, downloadDocxBlob } = await import('@/lib/docxExport');
      const blob = await buildReportDocxBlob(buildDocumentPlan(report.markdown, report.figures), report.meta);
      downloadDocxBlob(blob, `${report.fileName}.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo de Word.');
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    const report = getReport();
    if (!report) return;
    setBusy('pdf');
    setError(null);
    try {
      const { buildPrintHtml } = await import('@/lib/printExport');
      const win = window.open('', '', 'height=900,width=900');
      if (!win) throw new Error('Permite las ventanas emergentes de este sitio para generar el PDF.');
      win.document.write(buildPrintHtml(buildDocumentPlan(report.markdown, report.figures), report.meta));
      win.document.close();
      win.document.title = report.fileName;
      setTimeout(() => win.print(), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar el PDF.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="lab-btn" disabled={disabled || busy !== null} onClick={downloadWord} title="Informe formal en Word editable: portada, tabla de contenido, índices y numeración">
        <FileDown className="w-4 h-4 text-[var(--brand-teal-text)]" aria-hidden="true" />
        {busy === 'word' ? 'Armando Word…' : 'Informe Word'}
      </button>
      <button type="button" className="lab-btn" disabled={disabled || busy !== null} onClick={downloadPdf} title="Informe formal en PDF: elige «Guardar como PDF» en la ventana de impresión">
        <Printer className="w-4 h-4 text-[var(--brand-olive)]" aria-hidden="true" />
        {busy === 'pdf' ? 'Preparando PDF…' : 'Informe PDF'}
      </button>
      {error && <span className="text-xs text-rose-300" role="alert">{error}</span>}
    </div>
  );
};

/** Zona de carga de archivo: extrae el texto real de PDF, Word y texto plano. */
export const FileDrop: React.FC<{ fileName: string | null; onLoaded: (name: string, text: string) => void; onError: (message: string) => void }> = ({
  fileName,
  onLoaded,
  onError,
}) => {
  const [reading, setReading] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      onLoaded(file.name, await readInputFile(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setReading(false);
    }
  };

  return (
    <label
      className="lab-drop"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handle(e.dataTransfer.files[0]);
      }}
    >
      <input type="file" accept={INPUT_FILE_ACCEPT} className="sr-only" onChange={(e) => void handle(e.target.files?.[0])} />
      <FileUp className="w-7 h-7 text-[var(--brand-teal-text)]" aria-hidden="true" />
      <span className="text-sm font-semibold text-white">
        {reading ? 'Leyendo el archivo…' : fileName ? `Archivo cargado: ${fileName}` : 'Arrastra un archivo o haz clic para elegirlo'}
      </span>
      <span className="text-[11px] text-brand-textMuted">PDF, Word (.docx), texto, Markdown, CSV o JSON</span>
    </label>
  );
};

export const EmptyState: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="lab-panel text-center py-12 px-6 space-y-2">
    <FileText className="w-10 h-10 mx-auto text-white/25" aria-hidden="true" />
    <h3 className="text-sm font-bold text-white sy">{title}</h3>
    <p className="text-sm text-brand-textMuted max-w-xl mx-auto">{children}</p>
  </div>
);

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) => (
  <div className="lab-seg" role="group" aria-label={label}>
    {options.map((o) => (
      <button key={o.value} type="button" disabled={o.disabled} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);
