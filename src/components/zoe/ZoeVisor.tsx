import React, { useEffect, useState } from 'react';
import { ZoeCanvas3D, type ZoeModelInfo, type ZoeSoulState } from './ZoeCanvas3D';
import { CLIP_ROLES, type ClipRole } from './zoeClipDirector';

/** Para qué usa la web cada clip: así se revisa una entrega antes de publicarla. */
const ROLE_LABELS: Record<ClipRole, string> = {
  idle: 'De pie, respirando',
  alert: 'De pie, atento (al escuchar)',
  walk: 'Caminar',
  trot: 'Trotar',
  sit: 'Sentarse',
  sitIdle: 'Sentado, en bucle',
  standUp: 'Levantarse',
  lie: 'Echarse',
  lieIdle: 'Echado, en bucle',
  sleep: 'Dormir',
  wakeUp: 'Despertar',
  happy: 'Alegría (cola)',
  play: 'Reverencia de juego',
  wave: 'Saludo / pedir',
  shake: 'Sacudirse',
  scratch: 'Rascarse',
  sniff: 'Olfatear',
  jump: 'Saltar',
  rollOver: 'Rodar',
};

type Posture = 'standing' | 'sitting' | 'lying';

/**
 * Visor de clips de ZOE (`#/zoe-visor`). Carga el modelo oficial o cualquier GLB local —por
 * ejemplo el que devuelve un autorig— y lo pone en cada estado con el mismo código de la app.
 */
export const ZoeVisor: React.FC = () => {
  const [modelUrl, setModelUrl] = useState<string | undefined>(undefined);
  const [modelName, setModelName] = useState('Modelo oficial');
  const [info, setInfo] = useState<ZoeModelInfo | null>(null);
  const [posture, setPosture] = useState<Posture>('standing');
  const [behavior, setBehavior] = useState<ZoeSoulState>('idle');
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<-1 | 0 | 1>(0);
  const [pet, setPet] = useState(0);

  useEffect(() => () => {
    if (modelUrl) URL.revokeObjectURL(modelUrl);
  }, [modelUrl]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    setInfo(null);
    setModelName(file.name);
    setModelUrl(URL.createObjectURL(file));
  };

  const button = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} type="button" className={`lab-btn ${active ? 'is-selected' : ''}`} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );

  const roles = Object.keys(CLIP_ROLES) as ClipRole[];
  const used = new Set(Object.values(info?.roles ?? {}));
  const unused = (info?.clips ?? []).filter((c) => !used.has(c));

  return (
    <main className="min-h-screen p-4 sm:p-8 text-brand-textPrimary" style={{ background: 'var(--bg-page)' }}>
      <header className="mb-6 max-w-5xl">
        <h1 className="text-2xl font-bold sy text-white">Visor de clips de ZOE</h1>
        <p className="text-sm text-brand-textSecondary mt-1">
          Carga un GLB —por ejemplo el que devuelve el autorig— para ver cómo lo reproduce la web antes de reemplazar el oficial en
          <code className="mx-1">public/assets/zoe/zoe.glb</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
        <section className="lg:col-span-7 lab-panel p-0 overflow-hidden" aria-label="Vista de ZOE">
          <div style={{ height: 560, background: '#071526' }}>
            <ZoeCanvas3D
              key={modelUrl ?? 'oficial'}
              modelUrl={modelUrl}
              onModelInfo={setInfo}
              behavior={behavior}
              posture={posture}
              isWalking={walking}
              facing={facing}
              petTrigger={pet}
            />
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-4">
          <div className="lab-panel space-y-3">
            <h2 className="text-sm font-bold text-white">Modelo</h2>
            <p className="text-xs text-brand-textMuted">{modelName}</p>
            <div className="flex flex-wrap gap-2">
              <label className="lab-btn cursor-pointer">
                Cargar GLB…
                <input type="file" accept=".glb,.gltf" className="sr-only" onChange={(e) => loadFile(e.target.files?.[0])} />
              </label>
              {button('Modelo oficial', !modelUrl, () => {
                setInfo(null);
                setModelUrl(undefined);
                setModelName('Modelo oficial');
              })}
            </div>
          </div>

          <div className="lab-panel space-y-3">
            <h2 className="text-sm font-bold text-white">Postura</h2>
            <div className="flex flex-wrap gap-2">
              {button('De pie', posture === 'standing' && !walking, () => { setWalking(false); setPosture('standing'); })}
              {button('Sentado', posture === 'sitting' && !walking, () => { setWalking(false); setPosture('sitting'); })}
              {button('Echado', posture === 'lying' && !walking && behavior !== 'sleeping', () => { setWalking(false); setPosture('lying'); setBehavior('idle'); })}
              {button('Dormir', behavior === 'sleeping', () => { setWalking(false); setPosture('lying'); setBehavior('sleeping'); })}
              {button('Caminar', walking, () => setWalking((w) => !w))}
            </div>
            <h2 className="text-sm font-bold text-white pt-1">Ánimo</h2>
            <div className="flex flex-wrap gap-2">
              {(['idle', 'listening', 'thinking', 'speaking', 'happy'] as ZoeSoulState[]).map((b) =>
                button({ idle: 'Tranquilo', listening: 'Escucha', thinking: 'Piensa', speaking: 'Habla', happy: 'Feliz', sleeping: 'Duerme' }[b], behavior === b, () => setBehavior(b)),
              )}
              {button('Acariciar', false, () => setPet((n) => n + 1))}
            </div>
            <h2 className="text-sm font-bold text-white pt-1">Vista</h2>
            <div className="flex flex-wrap gap-2">
              {button('Tres cuartos', facing === 0, () => setFacing(0))}
              {button('Perfil izquierdo', facing === -1, () => setFacing(-1))}
              {button('Perfil derecho', facing === 1, () => setFacing(1))}
            </div>
          </div>

          <div className="lab-panel">
            <h2 className="text-sm font-bold text-white mb-2">Clips reconocidos</h2>
            {!info ? (
              <p className="text-xs text-brand-textMuted" role="status">Cargando modelo…</p>
            ) : (
              <>
                <p className="text-xs text-brand-textMuted mb-2">
                  {info.clips.length} clips · {info.bones} huesos · {info.ownRig ? 'esqueleto de este proyecto (ojos animados)' : 'esqueleto externo (ojos de la textura)'}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-brand-textMuted">
                      <th className="py-1 pr-2 font-semibold">Uso en la web</th>
                      <th className="py-1 font-semibold">Clip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role} className="border-t border-white/5">
                        <td className="py-1 pr-2">{ROLE_LABELS[role]}</td>
                        <td className={`py-1 ${info.roles[role] ? 'text-white' : 'text-brand-textMuted'}`}>{info.roles[role] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {unused.length > 0 && <p className="text-xs text-brand-textMuted mt-2">Sin uso por ahora: {unused.join(', ')}.</p>}
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};

export default ZoeVisor;
