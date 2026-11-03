import * as THREE from 'three';

/**
 * Director de clips de ZOE: decide qué animación del modelo se ve y cómo se pasa de una a otra.
 * No depende de un origen concreto: reconoce por su nombre los clips de este proyecto, los de un
 * autorig de cuadrúpedos (afk.ai: «Idle», «Sit», «Lie Down», «Tail Wag»…) o los de Meshy, y usa los
 * que haya. Lo que falte se resuelve con fundidos y con la capa procedimental de `ZoeCanvas3D`.
 */

/** Lo que el cuerpo debe estar haciendo. */
export type ZoeBodyState = 'stand' | 'walk' | 'sit' | 'lie' | 'sleep';

/** Nombres con que cada origen llama a un mismo clip, ya normalizados (minúsculas, sin signos). */
export const CLIP_ROLES = {
  idle: ['idle', 'standidle', 'breathing', 'idlebreathing'],
  alert: ['idlealert', 'alert', 'listen'],
  walk: ['walk', 'walking', 'walkcycle'],
  trot: ['trot', 'trotting'],
  sit: ['sit', 'sitdown', 'sitting'],
  sitIdle: ['sitidle', 'sittingidle'],
  standUp: ['standup', 'sittostand', 'getup'],
  lie: ['liedown', 'lie', 'laydown', 'lying'],
  lieIdle: ['lieidle', 'lyingidle'],
  sleep: ['sleep', 'sleeping'],
  wakeUp: ['wakeup', 'laytoidle'],
  happy: ['tailwag', 'happy', 'wag'],
  play: ['playbow', 'play'],
  wave: ['beg', 'wave', 'givepaw'],
  shake: ['shake'],
  scratch: ['earscratch', 'scratch'],
  sniff: ['sniff'],
  jump: ['jump'],
  rollOver: ['rollover'],
} as const;

export type ClipRole = keyof typeof CLIP_ROLES;
/** Gestos de una sola vez que se pueden pedir encima de la postura. */
export type ZoeGesture = Extract<ClipRole, 'happy' | 'play' | 'wave' | 'shake' | 'scratch' | 'sniff' | 'jump' | 'rollOver'>;

/** «Armature|Lie Down|baselayer» → «liedown». */
export function normalizeClipName(name: string): string {
  const parts = name.split(/[|:]/).filter((p) => p && !/^(armature|baselayer|take\d*|unreal take|mixamo\.com)$/i.test(p.trim()));
  return (parts.length ? parts.join('') : name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Asigna a cada rol el clip que le corresponde. Primero por nombre exacto; luego por inicio del nombre. */
export function pickClips(names: readonly string[]): Partial<Record<ClipRole, string>> {
  const normalized = names.map((n) => ({ name: n, key: normalizeClipName(n) }));
  const picked: Partial<Record<ClipRole, string>> = {};
  const used = new Set<string>();
  const roles = Object.keys(CLIP_ROLES) as ClipRole[];
  for (const role of roles) {
    const hit = normalized.find((c) => !used.has(c.name) && (CLIP_ROLES[role] as readonly string[]).includes(c.key));
    if (hit) {
      picked[role] = hit.name;
      used.add(hit.name);
    }
  }
  for (const role of roles) {
    if (picked[role]) continue;
    const hit = normalized.find((c) => !used.has(c.name) && (CLIP_ROLES[role] as readonly string[]).some((k) => c.key.startsWith(k)));
    if (hit) {
      picked[role] = hit.name;
      used.add(hit.name);
    }
  }
  return picked;
}

/** Postura quieta del esqueleto como clip: lo que se ve cuando el modelo no trae «idle». */
export function restClip(root: THREE.Object3D): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  root.traverse((node) => {
    if (!(node as THREE.Bone).isBone) return;
    tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, [0, 1], [...node.quaternion.toArray(), ...node.quaternion.toArray()]));
    tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, [0, 1], [...node.position.toArray(), ...node.position.toArray()]));
  });
  return new THREE.AnimationClip('reposo', 1, tracks);
}

const FADE = 0.45;
/** Un clip más corto que esto es una pose fija (como «sit» del modelo actual), no un movimiento. */
const POSE_CLIP = 0.25;

interface Step {
  action: THREE.AnimationAction;
  /** -1 la reproduce al revés: levantarse con el clip de sentarse. */
  direction: 1 | -1;
  loop: boolean;
  fade: number;
}

export class ZoeClipDirector {
  readonly roles: Partial<Record<ClipRole, string>>;
  private readonly actions = new Map<ClipRole | 'rest', THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private queue: Step[] = [];
  private state: ZoeBodyState = 'stand';
  private standVariant: 'idle' | 'alert' = 'idle';
  private gesturing = false;

  constructor(
    private readonly mixer: THREE.AnimationMixer,
    clips: readonly THREE.AnimationClip[],
    rest: THREE.AnimationClip,
  ) {
    this.roles = pickClips(clips.map((c) => c.name));
    for (const [role, name] of Object.entries(this.roles) as Array<[ClipRole, string]>) {
      const clip = clips.find((c) => c.name === name);
      if (clip) this.actions.set(role, mixer.clipAction(clip));
    }
    this.actions.set('rest', mixer.clipAction(rest));
    mixer.addEventListener('finished', (e) => this.onFinished(e.action as THREE.AnimationAction));
    this.go([this.loopOf('stand')]);
  }

  has(role: ClipRole): boolean {
    return this.actions.has(role);
  }

  /** ¿El modelo trae su propio reposo vivo? Si no, la capa procedimental pone la respiración. */
  get hasIdle(): boolean {
    return this.actions.has('idle');
  }

  /** Se llama en cada cuadro con lo que el cuerpo debe hacer; solo actúa cuando cambia. */
  setState(target: ZoeBodyState, alert = false): void {
    const variant = alert && this.has('alert') ? 'alert' : 'idle';
    if (target === this.state) {
      if (target === 'stand' && variant !== this.standVariant && !this.queue.length && !this.gesturing) {
        this.standVariant = variant;
        this.go([this.loopOf('stand')]);
      }
      return;
    }
    const from = this.state;
    this.state = target;
    this.standVariant = variant;
    this.gesturing = false;
    this.go(this.route(from, target));
  }

  /** Un gesto de una sola vez (mover la cola, saludar); al terminar vuelve a la postura. */
  gesture(role: ZoeGesture): boolean {
    const action = this.actions.get(role);
    // Los gestos parten de estar de pie: desde otra postura se verían como un salto.
    if (!action || this.queue.length || this.state !== 'stand') return false;
    this.gesturing = true;
    this.go([{ action, direction: 1, loop: false, fade: 0.25 }, this.loopOf(this.state)]);
    return true;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** Clip que se repite mientras el cuerpo está en un estado. */
  private loopOf(state: ZoeBodyState): Step {
    const loop = (role: ClipRole | 'rest', fade = FADE): Step => ({ action: this.actions.get(role) ?? this.actions.get('rest')!, direction: 1, loop: true, fade });
    const hold = (role: ClipRole): Step => ({ action: this.actions.get(role)!, direction: 1, loop: false, fade: FADE });
    switch (state) {
      case 'walk':
        return loop(this.has('walk') ? 'walk' : 'rest', 0.3);
      case 'sit':
        return this.has('sitIdle') ? loop('sitIdle') : this.has('sit') ? hold('sit') : loop('rest');
      case 'lie':
        return this.has('lieIdle') ? loop('lieIdle') : this.has('lie') ? hold('lie') : loop('rest');
      case 'sleep':
        return this.has('sleep') ? loop('sleep', 0.8) : this.loopOf('lie');
      default:
        return loop(this.standVariant === 'alert' ? 'alert' : this.has('idle') ? 'idle' : 'rest');
    }
  }

  /** Pasos para ir de un estado a otro, como lo haría un perro: se levanta antes de echarse, etc. */
  private route(from: ZoeBodyState, to: ZoeBodyState): Step[] {
    const steps: Step[] = [];
    const settle = from === 'walk' ? 'stand' : from;
    // Primero, volver a estar de pie si hace falta.
    if ((settle === 'sit' && to !== 'sit') || ((settle === 'lie' || settle === 'sleep') && to !== 'lie' && to !== 'sleep')) {
      steps.push(...this.standUpFrom(settle));
    }
    if (settle === 'sleep' && to === 'lie' && this.has('wakeUp')) steps.push(this.once('wakeUp'));
    // Después, bajar a la postura pedida.
    if (to === 'sit' && settle !== 'sit') {
      if (this.isMotion('sit')) steps.push(this.once('sit'));
    } else if ((to === 'lie' || to === 'sleep') && settle !== 'lie' && settle !== 'sleep') {
      if (this.isMotion('lie')) steps.push(this.once('lie'));
    }
    steps.push(this.loopOf(to));
    return steps;
  }

  private standUpFrom(state: ZoeBodyState): Step[] {
    if (state === 'sit') {
      if (this.has('standUp')) return [this.once('standUp')];
      if (this.isMotion('sit')) return [{ ...this.once('sit'), direction: -1 }];
    } else if (this.isMotion('lie')) {
      return [{ ...this.once('lie'), direction: -1 }];
    }
    return [];
  }

  private once(role: ClipRole): Step {
    return { action: this.actions.get(role)!, direction: 1, loop: false, fade: FADE };
  }

  private isMotion(role: ClipRole): boolean {
    const action = this.actions.get(role);
    return Boolean(action && action.getClip().duration > POSE_CLIP);
  }

  private go(steps: Step[]): void {
    this.queue = steps;
    this.next();
  }

  private next(): void {
    const step = this.queue.shift();
    if (!step) return;
    const { action, direction, loop, fade } = step;
    const duration = action.getClip().duration;
    // El mismo bucle que ya suena sigue tal cual: reiniciarlo se vería como un salto.
    if (loop && action === this.current && action.isRunning() && action.timeScale > 0) {
      if (this.queue.length) this.next();
      return;
    }
    action.reset();
    action.enabled = true;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.timeScale = direction;
    action.time = direction < 0 ? duration : 0;
    action.setEffectiveWeight(1);
    if (this.current && this.current !== action) {
      action.play();
      this.current.crossFadeTo(action, fade, false);
    } else {
      action.fadeIn(fade).play();
    }
    this.current = action;
    // Una pose fija o un bucle no avisan al terminar: se sigue con el paso siguiente de inmediato.
    if ((loop || duration <= POSE_CLIP) && this.queue.length) this.next();
  }

  private onFinished(action: THREE.AnimationAction): void {
    if (action !== this.current) return;
    if (this.queue.length) this.next();
    else this.gesturing = false;
  }
}
