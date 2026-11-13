import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { MetricasDashboard, Stat } from './MetricasDashboard';
import { InsumosBank } from '@/components/lab/InsumosBank';
import { ReportActions } from '@/components/lab/common';
import { fetchGlobalDashboard, fetchGlobalResult, fetchGlobalResults, hasLabPass, isLabAdmin } from '@/services/labCollector';
import { dashboardToMetricsInput, type GlobalDashboard, type GlobalResultRow } from '@/lib/labData';
import { MODULE_METRIC_LABEL, MODULE_ORDER } from '@/lib/contenedorMetrics';
import { arbolReport, estudioReport, ideacionReport, prototipadoReport, type LabReport, type ReportModule } from '@/lib/labReports';
import type { Prompt0Data } from '@/store/useStore';
import type { TreeGraph } from '@/lib/innovationTreeGraph';
import type { PrototypePlan } from '@/services/prototyping';

const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const day = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

/** Arma el informe formal de un resultado traído del servidor, con los mismos generadores de cada herramienta. */
export function reportFromDocument(modulo: ReportModule, documento: Record<string, unknown> | null): LabReport | null {
  if (!documento) return null;
  const ficha = (documento.prompt0Data ?? {}) as Prompt0Data;
  const text = (key: string) => (typeof documento[key] === 'string' ? (documento[key] as string) : '');
  if (modulo === 'estudio') return text('containerData') ? estudioReport(ficha, text('containerData')) : null;
  if (modulo === 'ideacion') return text('markdown') ? ideacionReport(ficha, text('markdown'), text('sourceLabel')) : null;
  if (modulo === 'arbol') return text('markdown') && documento.graph ? arbolReport(ficha, text('markdown'), documento.graph as TreeGraph) : null;
  return documento.name ? prototipadoReport(ficha, documento as unknown as PrototypePlan) : null;
}

/** Lista de los resultados de todos, con búsqueda; al abrir uno se puede descargar su informe. */
const GlobalResults: React.FC = () => {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [modulo, setModulo] = useState<ReportModule | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; porPagina: number; resultados: GlobalResultRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ row: GlobalResultRow; sintesis: string; report: LabReport | null } | null>(null);
  const [opening, setOpening] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchGlobalResults({ modulo, q: search, pagina: page })
      .then((result) => alive && setData(result))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [modulo, search, page]);

  const open = async (row: GlobalResultRow) => {
    setOpening(row.id);
    setError(null);
    try {
      const full = await fetchGlobalResult(row.id);
      setOpened({ row, sintesis: full.sintesis, report: reportFromDocument(full.modulo, full.documento) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <section className="lab-panel space-y-3" aria-label="Resultados de todos los usuarios">
      <h3 className="text-sm font-bold text-white sy">Resultados de todos los usuarios</h3>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(query);
        }}
      >
        <div className="grow min-w-[12rem]">
          <label className="lab-label" htmlFor="global-buscar">
            Buscar
          </label>
          <input id="global-buscar" className="lab-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título, territorio o persona" />
        </div>
        <div>
          <label className="lab-label" htmlFor="global-linea">
            Línea
          </label>
          <select
            id="global-linea"
            className="lab-input"
            value={modulo ?? ''}
            onChange={(e) => {
              setPage(1);
              setModulo((e.target.value || null) as ReportModule | null);
            }}
          >
            <option value="">Todas</option>
            {MODULE_ORDER.map((m) => (
              <option key={m} value={m}>
                {MODULE_METRIC_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="lab-btn">
          <Search className="w-3.5 h-3.5" aria-hidden="true" /> Buscar
        </button>
      </form>

      {error && (
        <p className="text-xs text-[#F3C26B]" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="text-xs text-brand-textMuted">Leyendo los resultados…</p>}
      {data && !data.resultados.length && <p className="text-xs text-brand-textMuted">No hay resultados que coincidan.</p>}

      {opened && (
        <div className="lab-card space-y-2">
          <p className="text-[11px] text-brand-textMuted">
            {MODULE_METRIC_LABEL[opened.row.modulo]} · {opened.row.autor} · {day(opened.row.actualizadoEn)}
          </p>
          <h4 className="text-sm font-semibold text-white">{opened.row.titulo}</h4>
          {opened.sintesis && <p className="text-xs text-brand-textSecondary leading-snug">{opened.sintesis}</p>}
          {opened.report ? (
            <ReportActions direct getReport={() => opened.report} />
          ) : (
            <p className="text-xs text-brand-textMuted">Este resultado no trae un documento descargable.</p>
          )}
        </div>
      )}

      {data && data.resultados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-brand-textMuted">
              <tr>
                <th className="py-1.5 pr-3 font-semibold">Resultado</th>
                <th className="py-1.5 pr-3 font-semibold">Línea</th>
                <th className="py-1.5 pr-3 font-semibold">Territorio</th>
                <th className="py-1.5 pr-3 font-semibold">Persona</th>
                <th className="py-1.5 pr-3 font-semibold">Actualizado</th>
                <th className="py-1.5 font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-brand-textSecondary">
              {data.resultados.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="py-1.5 pr-3 text-white">{row.titulo || 'Sin título'}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{MODULE_METRIC_LABEL[row.modulo]}</td>
                  <td className="py-1.5 pr-3">{[row.municipio, row.departamento].filter(Boolean).join(', ') || '—'}</td>
                  <td className="py-1.5 pr-3" title={row.correo}>
                    {row.autor}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{day(row.actualizadoEn)}</td>
                  <td className="py-1.5">
                    <button type="button" className="lab-btn lab-btn-sm" disabled={opening !== null} onClick={() => void open(row)}>
                      {opening === row.id ? 'Abriendo…' : 'Abrir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && pages > 1 && (
        <div className="flex items-center gap-2 text-xs text-brand-textMuted">
          <button type="button" className="lab-btn lab-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          Página {page} de {pages} · {num(data.total)} resultados
          <button type="button" className="lab-btn lab-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
};

/**
 * Datos de todos los usuarios, concentrados en el servidor: participación, uso de la IA, las
 * mismas métricas del tablero de cada navegador, los resultados de todos y el banco de insumos.
 * Solo para administradores; el servidor lo vuelve a comprobar en cada consulta.
 */
export const GlobalDataView: React.FC = () => {
  const [data, setData] = useState<GlobalDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allowed = hasLabPass() && isLabAdmin();

  const load = () => {
    setLoading(true);
    setError(null);
    fetchGlobalDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const input = useMemo(() => (data ? dashboardToMetricsInput(data) : null), [data]);

  if (!allowed) {
    return (
      <div className="lab-panel space-y-2">
        <h3 className="text-sm font-bold text-white sy">Los datos de todos los usuarios no están disponibles aquí</h3>
        <p className="text-sm text-brand-textSecondary">
          Se concentran en el servidor del Laboratorio y solo los ven los administradores que ingresaron con su cuenta institucional. Si eres administrador, cierra
          la sesión y vuelve a ingresar. En el sitio de respaldo no hay concentrador: allí cada navegador conserva sus propios datos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-brand-textMuted">
          {data ? `Datos del servidor, leídos el ${new Date(data.generadoEn).toLocaleString('es-CO')}.` : 'Leyendo los datos del servidor…'}
        </p>
        <button type="button" className="lab-btn lab-btn-sm" disabled={loading} onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-[#F3C26B]" role="alert">
          No se pudieron leer los datos de todos: {error}
        </p>
      )}

      {data && input && (
        <>
          <div className="viz">
            <div className="viz-kpis">
              <Stat hero label="Personas registradas" value={num(data.usuarios.total)} hint={`${num(data.usuarios.activos7dias)} activas en los últimos 7 días`} />
              <Stat label="Ingresos" value={num(data.usuarios.ingresos)} />
              <Stat label="Conversaciones con ZOE" value={num(data.zoe)} />
              <Stat label="Insignias obtenidas" value={num(data.insignias)} />
              <Stat label="Insumos en el banco" value={num(data.insumos ?? 0)} />
            </div>
          </div>

          <section className="lab-panel space-y-2" aria-label="Uso de la IA por herramienta">
            <h3 className="text-sm font-bold text-white sy">Uso de la IA por herramienta</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-brand-textMuted">
                  <tr>
                    <th className="py-1.5 pr-3 font-semibold">Herramienta</th>
                    <th className="py-1.5 pr-3 font-semibold">Generaciones completas</th>
                    <th className="py-1.5 pr-3 font-semibold">Fallidas</th>
                    <th className="py-1.5 font-semibold">Tiempo promedio</th>
                  </tr>
                </thead>
                <tbody className="text-brand-textSecondary">
                  {data.uso.map((u) => (
                    <tr key={u.modulo} className="border-t border-white/10">
                      <td className="py-1.5 pr-3 text-white">{MODULE_METRIC_LABEL[u.modulo]}</td>
                      <td className="py-1.5 pr-3">{num(u.ok)}</td>
                      <td className="py-1.5 pr-3">{num(u.fallidas)}</td>
                      <td className="py-1.5">{u.segundosPromedio === null ? '—' : `${num(u.segundosPromedio)} s`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.recortado && (
            <p className="text-xs text-[#F3C26B]">
              Hay más datos de los que caben en el tablero: los gráficos de abajo usan los {num(data.maximoFilas)} más recientes de cada tipo. Los totales de arriba
              sí cuentan todo.
            </p>
          )}
          <MetricasDashboard input={input} sourceNote="Datos de todos los usuarios, concentrados en el servidor del Laboratorio." />
          <GlobalResults />
          <section className="lab-panel space-y-3" aria-label="Banco de insumos">
            <h3 className="text-sm font-bold text-white sy">Banco de insumos</h3>
            <p className="text-xs text-brand-textMuted">
              Lo más relevante de cada resultado, elegido por un filtro con IA y guardado sin el nombre de su autor. Por ahora solo lo consultan los administradores.
            </p>
            <InsumosBank />
          </section>
        </>
      )}
    </div>
  );
};
