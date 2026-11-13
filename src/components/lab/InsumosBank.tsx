import React, { useEffect, useState } from 'react';
import { Library, Search } from 'lucide-react';
import { fetchInsumos, hasLabPass, type BankInsumo } from '@/services/labCollector';
import { INSUMO_LABEL, INSUMO_TYPES, type InsumoType } from '@/lib/labInsumos';
import { MODULE_METRIC_LABEL } from '@/lib/contenedorMetrics';

/**
 * Banco de insumos: lo más relevante de los resultados de todos, elegido por el filtro con IA y
 * guardado en el servidor. Por ahora solo lo consultan los administradores (el servidor lo exige).
 * Se puede buscar y, si quien lo usa lo pide (`onPick`), elegir un insumo. No muestra quién hizo cada uno.
 */
export const InsumosBank: React.FC<{ onPick?: (insumo: BankInsumo) => void; pickLabel?: string; selectedId?: number | null }> = ({
  onPick,
  pickLabel = 'Usar este insumo',
  selectedId,
}) => {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<InsumoType | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; porPagina: number; insumos: BankInsumo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connected = hasLabPass();

  useEffect(() => {
    if (!connected) return;
    let alive = true;
    setError(null);
    fetchInsumos({ tipo, q: search, pagina: page })
      .then((result) => alive && setData(result))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [connected, tipo, search, page]);

  if (!connected) {
    return (
      <p className="text-xs text-brand-textMuted">
        El banco de insumos vive en el servidor del Laboratorio y este sitio no está conectado a él en este momento. Si acabas de abrir la página, vuelve a ingresar
        con tu cuenta institucional.
      </p>
    );
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(query);
        }}
      >
        <div className="grow min-w-[12rem]">
          <label className="lab-label" htmlFor="insumos-buscar">
            Buscar en el banco
          </label>
          <input
            id="insumos-buscar"
            className="lab-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tema, palabra clave o territorio"
          />
        </div>
        <div>
          <label className="lab-label" htmlFor="insumos-tipo">
            Tipo
          </label>
          <select
            id="insumos-tipo"
            className="lab-input"
            value={tipo ?? ''}
            onChange={(e) => {
              setPage(1);
              setTipo((e.target.value || null) as InsumoType | null);
            }}
          >
            <option value="">Todos</option>
            {INSUMO_TYPES.map((t) => (
              <option key={t} value={t}>
                {INSUMO_LABEL[t]}
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
          No se pudo leer el banco de insumos: {error}
        </p>
      )}
      {!data && !error && <p className="text-xs text-brand-textMuted">Leyendo el banco de insumos…</p>}
      {data && !data.insumos.length && (
        <p className="text-xs text-brand-textMuted">
          {search || tipo ? 'Ningún insumo coincide con la búsqueda.' : 'El banco aún está vacío: se llena solo a medida que se guardan resultados.'}
        </p>
      )}

      {data && data.insumos.length > 0 && (
        <>
          <p className="text-[11px] text-brand-textMuted flex items-center gap-1.5">
            <Library className="w-3.5 h-3.5" aria-hidden="true" /> {data.total.toLocaleString('es-CO')} {data.total === 1 ? 'insumo' : 'insumos'}, los más
            relevantes primero.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.insumos.map((insumo) => (
              <li key={insumo.id} className={`lab-card space-y-1.5 ${selectedId === insumo.id ? 'is-selected' : ''}`}>
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-brand-textMuted">
                  <span className="lab-chip">{INSUMO_LABEL[insumo.tipo]}</span>
                  <span>{MODULE_METRIC_LABEL[insumo.modulo]}</span>
                  {(insumo.municipio || insumo.departamento) && <span>· {[insumo.municipio, insumo.departamento].filter(Boolean).join(', ')}</span>}
                  <span aria-label={`Relevancia ${insumo.relevancia} de 5`}>· Relevancia {insumo.relevancia}/5</span>
                </p>
                <h4 className="text-sm font-semibold text-white">{insumo.titulo}</h4>
                <p className="text-xs text-brand-textSecondary leading-snug">{insumo.descripcion}</p>
                {insumo.palabrasClave.length > 0 && <p className="text-[11px] text-brand-textMuted">{insumo.palabrasClave.join(' · ')}</p>}
                {onPick && (
                  <button type="button" className="lab-btn lab-btn-sm" aria-pressed={selectedId === insumo.id} onClick={() => onPick(insumo)}>
                    {selectedId === insumo.id ? 'Elegido' : pickLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center gap-2 text-xs text-brand-textMuted">
              <button type="button" className="lab-btn lab-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              Página {page} de {pages}
              <button type="button" className="lab-btn lab-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
