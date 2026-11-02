import React, { useEffect, useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { loadRadarFeed, type RadarSignal } from '@/services/observatorio';

/** Selector de señales del Radar del Observatorio, disponible en cada herramienta. */
export const ObservatorioPicker: React.FC<{ selectedId?: number | null; onPick: (signal: RadarSignal) => void }> = ({ selectedId, onPick }) => {
  const [signals, setSignals] = useState<RadarSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    loadRadarFeed()
      .then((feed) => alive && setSignals(feed.senales))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (signals ?? []).filter((s) => !q || `${s.nombre} ${s.area}`.toLowerCase().includes(q)).slice(0, 24);
  }, [signals, query]);

  if (error) return <p className="text-xs text-[#F3C26B]">{error} Puedes escribir el tema o cargar un archivo.</p>;
  if (!signals) return <p className="text-xs text-brand-textMuted">Leyendo el Radar del Observatorio…</p>;

  return (
    <div className="space-y-2">
      <input className="lab-input" placeholder={`Buscar entre ${signals.length} señales del Radar…`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar señales del Radar" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
        {visible.map((s) => (
          <button key={s.id} type="button" aria-pressed={selectedId === s.id} className={`lab-card text-left ${selectedId === s.id ? 'is-selected' : ''}`} onClick={() => onPick(s)}>
            <span className="flex items-center gap-1.5 text-[11px] text-brand-textMuted mb-0.5">
              <Radio className="w-3 h-3 shrink-0" style={{ color: s.color }} aria-hidden="true" /> {s.area}
            </span>
            <span className="text-xs font-semibold text-white">{s.nombre}</span>
          </button>
        ))}
        {!visible.length && <p className="text-xs text-brand-textMuted">Ninguna señal coincide con la búsqueda.</p>}
      </div>
    </div>
  );
};
