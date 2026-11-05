import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Lightbulb, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SegmentedControl } from '@/components/lab/common';
import {
  buildConclusions,
  computeMetrics,
  MODULE_METRIC_LABEL,
  MODULE_ORDER,
  type Bar,
  type ConclusionTone,
  type MetricsPeriod,
  type PartsQuality,
} from '@/lib/contenedorMetrics';
import { npsReading } from '@/lib/satisfaction';
import type { ReportModule } from '@/lib/labReports';

/**
 * Tablero de métricas del Contenedor de resultados: cifras, gráficos y conclusiones calculados
 * en el navegador con lo que ya está guardado. Funciona sin conexión y sin IA.
 *
 * Colores (validados con el validador de paletas en modo claro y oscuro, ver `.viz` en
 * `src/index.css`): un solo tono para magnitudes, una rampa ordinal para la evidencia, rojo y
 * azul verdoso con gris neutro para el NPS, y los colores de estado solo para la calidad,
 * siempre con ícono y rótulo.
 */

const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
/** «1 departamento», «3 departamentos». */
const count = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

interface Tip {
  x: number;
  y: number;
  value: string;
  label: string;
}

/** Manejadores de la descripción emergente: con el puntero y con el teclado. */
function tipHandlers(setTip: (t: Tip | null) => void, label: string, value: string) {
  return {
    tabIndex: 0,
    'aria-label': `${label}: ${value}`,
    onPointerMove: (e: React.PointerEvent) => setTip({ x: e.clientX, y: e.clientY, label, value }),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.top, label, value });
    },
    onBlur: () => setTip(null),
  };
}

const Card: React.FC<{ title: string; subtitle?: string; table?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  table,
  className = '',
  children,
}) => (
  <section className={`lab-card viz-card ${className}`}>
    <header className="mb-3">
      <h3 className="text-sm font-bold sy">{title}</h3>
      {subtitle && <p className="text-[11px] text-brand-textMuted mt-0.5">{subtitle}</p>}
    </header>
    {children}
    {table && (
      <details className="mt-3">
        <summary className="text-[11px] text-brand-textMuted cursor-pointer">Ver los datos</summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    )}
  </section>
);

const DataTable: React.FC<{ head: [string, string]; rows: Array<[string, string]> }> = ({ head, rows }) => (
  <table className="viz-table">
    <thead>
      <tr>
        <th scope="col">{head[0]}</th>
        <th scope="col">{head[1]}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(([a, b]) => (
        <tr key={a}>
          <td>{a}</td>
          <td>{b}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Empty: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-brand-textMuted py-4 text-center">{children ?? 'Sin datos en este período.'}</p>
);

/** Barras horizontales de un solo tono; `highlight` resalta una y atenúa las demás. */
const HBars: React.FC<{
  bars: ReadonlyArray<Bar & { key?: string }>;
  setTip: (t: Tip | null) => void;
  max?: number;
  format?: (v: number) => string;
  highlight?: string | null;
  onPick?: (key: string) => void;
}> = ({ bars, setTip, max, format = num, highlight = null, onPick }) => {
  const top = Math.max(max ?? 0, ...bars.map((b) => b.value), 1);
  return (
    <ul className="viz-hbars">
      {bars.map((b) => {
        const key = b.key ?? b.label;
        const dim = highlight !== null && highlight !== key;
        const handlers = tipHandlers(setTip, b.label, format(b.value));
        const content = (
          <>
            <span className="viz-hbar-label">{b.label}</span>
            <span className="viz-hbar-track">
              <span className={`viz-hbar ${dim ? 'is-dim' : ''}`} style={{ width: b.value > 0 ? `max(2px, ${(b.value / top) * 100}%)` : 0 }} />
              <span className="viz-hbar-value">{format(b.value)}</span>
            </span>
          </>
        );
        return (
          <li key={key}>
            {onPick ? (
              <button type="button" className="viz-hbar-row" aria-pressed={highlight === key} onClick={() => onPick(key)} {...handlers}>
                {content}
              </button>
            ) : (
              <div className="viz-hbar-row" {...handlers}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** Columnas en el tiempo, una sola serie; el valor máximo lleva su rótulo. */
const Columns: React.FC<{ bars: readonly Bar[]; unit: string; setTip: (t: Tip | null) => void }> = ({ bars, unit, setTip }) => {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = Math.max(step * Math.ceil(max / step), 1);
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const every = Math.ceil(bars.length / 8);
  const peak = bars.findIndex((b) => b.value === max && max > 0);
  return (
    <div className="viz-cols" role="group" aria-label={`Resultados por ${unit}`}>
      <div className="viz-cols-plot">
        {ticks.map((t) => (
          <span key={t} className="viz-grid" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="viz-tick">{t}</span>
          </span>
        ))}
        <div className="viz-cols-bars">
          {bars.map((b, i) => (
            <div key={`${b.label}-${i}`} className="viz-col-slot" {...tipHandlers(setTip, `${unit === 'semana' ? 'Semana del' : 'Mes de'} ${b.label}`, count(b.value, 'resultado', 'resultados'))}>
              {i === peak && (
                <span className="viz-col-value" style={{ bottom: `calc(${(b.value / top) * 100}% + 2px)` }}>
                  {b.value}
                </span>
              )}
              <span className="viz-col" style={{ height: `${(b.value / top) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="viz-cols-x" aria-hidden="true">
        {bars.map((b, i) => (
          <span key={`${b.label}-${i}`}>{i % every === 0 || i === bars.length - 1 ? b.label : ''}</span>
        ))}
      </div>
    </div>
  );
};

interface Segment {
  label: string;
  value: number;
  fill: string;
  ink: string;
  icon?: React.ReactNode;
}

/** Un todo partido en partes: bloques con su porcentaje y una leyenda con los nombres. */
const SegmentedBar: React.FC<{ parts: readonly Segment[]; setTip: (t: Tip | null) => void; name: string }> = ({ parts, setTip, name }) => {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <Empty />;
  return (
    <div>
      <div className="viz-seg" role="group" aria-label={`${name}: ${parts.map((p) => `${p.label} ${pct(p.value, total)} %`).join(', ')}`}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const share = pct(p.value, total);
            return (
              <span
                key={p.label}
                className="viz-seg-part"
                style={{ flexGrow: p.value, background: p.fill, color: p.ink }}
                {...tipHandlers(setTip, p.label, `${num(p.value)} (${share} %)`)}
              >
                {share >= 12 ? `${share} %` : ''}
              </span>
            );
          })}
      </div>
      <ul className="viz-legend">
        {parts.map((p) => (
          <li key={p.label}>
            {p.icon ?? <span className="viz-swatch" style={{ background: p.fill }} aria-hidden="true" />}
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

const qualityParts = (q: PartsQuality): Segment[] => [
  { label: 'Completas', value: q.ok, fill: 'var(--viz-good)', ink: '#fff', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--viz-good)]" aria-hidden="true" /> },
  { label: 'Con aviso', value: q.warning, fill: 'var(--viz-warn)', ink: '#0b0b0b', icon: <AlertTriangle className="w-3.5 h-3.5 text-[var(--viz-warn)]" aria-hidden="true" /> },
  { label: 'Fallidas', value: q.failed, fill: 'var(--viz-crit)', ink: '#fff', icon: <XCircle className="w-3.5 h-3.5 text-[var(--viz-crit)]" aria-hidden="true" /> },
];

const Stat: React.FC<{ label: string; value: string; hint?: string; hero?: boolean }> = ({ label, value, hint, hero }) => (
  <div className={`lab-card viz-stat ${hero ? 'is-hero' : ''}`}>
    <span className="text-[11px] text-brand-textMuted">{label}</span>
    <span className="viz-stat-value">{value}</span>
    {hint && <span className="text-[11px] text-brand-textSecondary">{hint}</span>}
  </div>
);

const TONE: Record<ConclusionTone, { icon: React.ReactNode; label: string }> = {
  good: { icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--viz-good)]" aria-hidden="true" />, label: 'Fortaleza' },
  warning: { icon: <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--viz-warn)]" aria-hidden="true" />, label: 'Atención' },
  info: { icon: <Info className="w-4 h-4 shrink-0 text-[var(--brand-teal-text)]" aria-hidden="true" />, label: 'Dato' },
};

const PERIODS: ReadonlyArray<{ value: MetricsPeriod; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: '365', label: '12 meses' },
];

export const MetricasDashboard: React.FC = () => {
  const { savedStudies, savedIdeations, savedTrees, prototypes, surveyResponses, downloads } = useStore();
  const [period, setPeriod] = useState<MetricsPeriod>('todo');
  const [line, setLine] = useState<ReportModule | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const m = useMemo(
    () => computeMetrics({ savedStudies, savedIdeations, savedTrees, prototypes, surveyResponses: surveyResponses ?? [], downloads: downloads ?? [] }, { period, module: line }),
    [savedStudies, savedIdeations, savedTrees, prototypes, surveyResponses, downloads, period, line],
  );
  const conclusions = useMemo(() => buildConclusions(m), [m]);
  const shows = (mod: ReportModule) => line === null || line === mod;
  const s = m.satisfaction;
  const npsParts: Segment[] = [
    { label: 'Detractores (0 a 6)', value: s.detractors, fill: 'var(--viz-neg)', ink: '#fff' },
    { label: 'Pasivos (7 y 8)', value: s.passives, fill: 'var(--viz-mid)', ink: 'var(--viz-mid-ink)' },
    { label: 'Promotores (9 y 10)', value: s.promoters, fill: 'var(--viz-series)', ink: '#fff' },
  ];
  const evidenceParts: Segment[] = [
    { label: 'N1 · del Observatorio', value: m.evidence.N1, fill: 'var(--viz-ord-1)', ink: 'var(--viz-ord-1-ink)' },
    { label: 'N2 · contrastada', value: m.evidence.N2, fill: 'var(--viz-ord-2)', ink: 'var(--viz-ord-2-ink)' },
    { label: 'N3 · hipótesis', value: m.evidence.N3, fill: 'var(--viz-ord-3)', ink: 'var(--viz-ord-3-ink)' },
  ];
  const qEst = m.quality.estudio;
  const qIde = m.quality.ideacion;

  return (
    <div className="viz space-y-5">
      {/* Filtros: una fila, encima de todo lo que afectan. */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="lab-label">Período</span>
          <SegmentedControl<MetricsPeriod> label="Período" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
        <div>
          <label className="lab-label" htmlFor="metricas-linea">
            Línea del método
          </label>
          <select
            id="metricas-linea"
            className="lab-input"
            value={line ?? ''}
            onChange={(e) => setLine((e.target.value || null) as ReportModule | null)}
          >
            <option value="">Todas las líneas</option>
            {MODULE_ORDER.map((mod) => (
              <option key={mod} value={mod}>
                {MODULE_METRIC_LABEL[mod]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-brand-textMuted basis-full sm:basis-auto sm:ml-auto sm:max-w-xs">
          Calculado en este navegador con lo guardado en el Contenedor. Funciona sin conexión.
        </p>
      </div>

      {/* Cifras principales */}
      <div className="viz-kpis">
        <Stat hero label={line ? `Resultados de ${MODULE_METRIC_LABEL[line]}` : 'Resultados en el Contenedor'} value={num(m.totals.total)} />
        {shows('estudio') && (
          <Stat
            label="Territorios estudiados"
            value={num(m.territory.municipalities)}
            hint={m.territory.departments ? `${count(m.territory.departments, 'departamento', 'departamentos')} · ${count(m.territory.zones, 'zona', 'zonas')}` : undefined}
          />
        )}
        <Stat label="Utilidad percibida" value={s.utilidad === null ? '—' : `${num(s.utilidad)} / 5`} hint={s.n ? count(s.n, 'respuesta', 'respuestas') : 'Sin respuestas aún'} />
        <Stat
          label="NPS (recomendación)"
          value={s.nps === null ? '—' : `${s.nps > 0 ? '+' : ''}${s.nps}`}
          hint={s.nps === null ? 'De -100 a +100' : npsReading(s.nps)}
        />
        <Stat label="Documentos entregados" value={num(m.downloads.total)} hint={`${num(m.downloads.word)} Word · ${num(m.downloads.pdf)} PDF`} />
      </div>

      <div className="viz-grid-cards">
        <Card
          title="Resultados por línea del método"
          subtitle="Toca una línea para ver solo sus métricas."
          table={<DataTable head={['Línea', 'Resultados']} rows={m.funnel.map((f) => [f.label, num(f.value)])} />}
        >
          <HBars bars={m.funnel.map((f) => ({ ...f, key: f.module }))} setTip={setTip} highlight={line} onPick={(k) => setLine(line === k ? null : (k as ReportModule))} />
        </Card>

        <Card
          title="Actividad en el tiempo"
          subtitle={`Resultados guardados por ${m.activity.unit}`}
          table={<DataTable head={[m.activity.unit === 'semana' ? 'Semana' : 'Mes', 'Resultados']} rows={m.activity.buckets.map((b) => [b.label, num(b.value)])} />}
        >
          {m.activity.buckets.some((b) => b.value) ? <Columns bars={m.activity.buckets} unit={m.activity.unit} setTip={setTip} /> : <Empty />}
        </Card>

        {shows('estudio') && (
          <Card
            title="Calidad de los estudios territoriales"
            subtitle="Bloques según la autoevaluación de cada parte"
            table={<DataTable head={['Estado', 'Bloques']} rows={qualityParts(qEst).map((p) => [p.label, num(p.value)])} />}
          >
            <SegmentedBar parts={qualityParts(qEst)} setTip={setTip} name="Calidad de los estudios" />
          </Card>
        )}

        {shows('ideacion') && (
          <Card
            title="Calidad y decisión en Ideación"
            subtitle={
              m.decisions.ideations
                ? m.decisions.withTheme
                  ? `${pct(m.decisions.withTheme, m.decisions.ideations)} % de las ideaciones tiene tema elegido`
                  : 'Ninguna ideación tiene tema elegido todavía'
                : undefined
            }
            table={<DataTable head={['Estado', 'Partes']} rows={qualityParts(qIde).map((p) => [p.label, num(p.value)])} />}
          >
            <SegmentedBar parts={qualityParts(qIde)} setTip={setTip} name="Calidad de las ideaciones" />
          </Card>
        )}

        {shows('arbol') && (
          <Card
            title="Evidencia de los árboles"
            subtitle="Elementos del árbol según el nivel de evidencia"
            table={<DataTable head={['Nivel', 'Elementos']} rows={evidenceParts.map((p) => [p.label, num(p.value)])} />}
          >
            <SegmentedBar parts={evidenceParts} setTip={setTip} name="Evidencia de los árboles" />
          </Card>
        )}

        {shows('arbol') && (
          <Card title="Frutos del árbol por tipo" table={<DataTable head={['Tipo', 'Frutos']} rows={m.fruits.map((f) => [f.label, num(f.value)])} />}>
            {m.fruits.some((f) => f.value) ? <HBars bars={m.fruits} setTip={setTip} /> : <Empty />}
          </Card>
        )}

        {shows('prototipado') && (
          <Card
            title="Planes de prototipado por madurez"
            subtitle={
              m.decisions.prototypes ? `${pct(m.decisions.fromTree, m.decisions.prototypes)} % nace de un fruto del Árbol${m.offlinePlans ? ` · ${num(m.offlinePlans)} sin IA` : ''}` : undefined
            }
            table={<DataTable head={['Madurez', 'Planes']} rows={m.trl.map((t) => [t.label, num(t.value)])} />}
          >
            {m.trl.some((t) => t.value) ? <HBars bars={m.trl} setTip={setTip} /> : <Empty />}
          </Card>
        )}

        {shows('estudio') && (
          <Card
            title="Cobertura territorial"
            subtitle="Estudios por departamento"
            table={<DataTable head={['Departamento', 'Estudios']} rows={m.territory.byDepartment.map((d) => [d.label, num(d.value)])} />}
          >
            {m.territory.byDepartment.length ? <HBars bars={m.territory.byDepartment} setTip={setTip} /> : <Empty />}
          </Card>
        )}

        <Card
          title="Satisfacción: recomendación (NPS)"
          subtitle={s.n ? `${count(s.n, 'respuesta', 'respuestas')} · NPS ${s.nps !== null && s.nps > 0 ? '+' : ''}${s.nps}` : 'Se pregunta antes de descargar un documento'}
          table={<DataTable head={['Grupo', 'Respuestas']} rows={npsParts.map((p) => [p.label, num(p.value)])} />}
        >
          {s.n ? <SegmentedBar parts={npsParts} setTip={setTip} name="Recomendación" /> : <Empty>Aún no hay respuestas.</Empty>}
        </Card>

        <Card
          title="Satisfacción: utilidad por línea"
          subtitle="Promedio de 1 a 5"
          table={
            <DataTable head={['Línea', 'Utilidad (respuestas)']} rows={s.byModule.map((b) => [b.label, b.utilidad === null ? 'Sin respuestas' : `${num(b.utilidad)} (${num(b.n)})`])} />
          }
        >
          {s.byModule.some((b) => b.n) ? (
            <HBars bars={s.byModule.map((b) => ({ label: b.label, value: b.utilidad ?? 0 }))} max={5} format={(v) => (v ? `${num(v)} / 5` : '—')} setTip={setTip} />
          ) : (
            <Empty>Aún no hay respuestas.</Empty>
          )}
        </Card>
      </div>

      {/* Conclusiones */}
      <section className="lab-panel space-y-3" aria-labelledby="metricas-conclusiones">
        <h3 id="metricas-conclusiones" className="text-sm font-bold sy flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[var(--brand-amber-text)]" aria-hidden="true" /> Conclusiones
        </h3>
        <ul className="space-y-2.5">
          {conclusions.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-brand-textSecondary leading-relaxed">
              {TONE[c.tone].icon}
              <span>
                <span className="sr-only">{TONE[c.tone].label}: </span>
                {c.text}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-brand-textMuted">Conclusiones calculadas con reglas fijas sobre las cifras de arriba: no las redacta la IA.</p>
      </section>

      {tip && (
        <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
          <strong>{tip.value}</strong>
          <span>{tip.label}</span>
        </div>
      )}
    </div>
  );
};
