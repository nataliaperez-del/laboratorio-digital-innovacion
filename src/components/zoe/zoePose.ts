import * as THREE from 'three';

/**
 * Poses quietas de ZOE aplicadas sobre el esqueleto del GLB (27 huesos).
 *
 * El Armature viene rotado +90° en X (Z-up → Y-up), así que en el espacio
 * de los huesos: +Y = hacia la cabeza (frente), +Z = arriba, X = lateral.
 * Cada hueso guarda su transformación de reposo para garantizar estabilidad absoluta
 * en modo quieto sin deformaciones ni acumulaciones de rotación.
 */
export interface ZoeBones {
  hips?: THREE.Object3D;
  chest?: THREE.Object3D;
  head?: THREE.Object3D;
  backL?: THREE.Object3D;
  backR?: THREE.Object3D;
  backL0?: THREE.Object3D;
  backR0?: THREE.Object3D;
  backL1?: THREE.Object3D;
  backR1?: THREE.Object3D;
  frontL?: THREE.Object3D;
  frontR?: THREE.Object3D;
  tail?: THREE.Object3D;
}

const BONE_NAMES: Record<string, keyof ZoeBones> = {
  hips: 'hips',
  chest: 'chest',
  head: 'head',
  backleg: 'backL',
  r_backleg: 'backR',
  backleg0: 'backL0',
  r_backleg0: 'backR0',
  backleg1: 'backL1',
  r_backleg1: 'backR1',
  frontleg: 'frontL',
  r_frontleg: 'frontR',
  tail: 'tail',
};

export function collectZoeBones(root: THREE.Object3D): ZoeBones {
  const bones: ZoeBones = {};
  root.traverse((n) => {
    const key = BONE_NAMES[n.name.toLowerCase()];
    if (key && !bones[key]) {
      bones[key] = n;
      n.userData.initialQuat = n.quaternion.clone();
      n.userData.initialPos = n.position.clone();
    }
  });
  return bones;
}

/** Ángulos (radianes) de la pose sentada. Ajustables sin tocar la malla. */
export const SIT_POSE = {
  hipsDrop: -0.16, // descenso de la cadera (unidades del armature; +Z local = abajo)
  torsoPitch: -0.4, // inclinación del torso hacia arriba
  chestPitch: 0.05, // el pecho se endereza un poco menos que la cadera
  thigh: 0.9, // muslos hacia adelante (relativo al torso)
  shin: -1.9, // corvejón plegado hacia atrás
  foot: 0.9, // pie apoyado plano
  frontLegs: 0.85, // patas delanteras verticales
  head: 0.3, // cabeza mirando al frente
  tail: -0.35, // cola descansando
};

const _q = new THREE.Quaternion();
const _X = new THREE.Vector3(1, 0, 0);

function rotX(bone: THREE.Object3D | undefined, angle: number) {
  if (!bone || angle === 0) return;
  _q.setFromAxisAngle(_X, angle);
  bone.quaternion.premultiply(_q);
}

function resetBone(bone?: THREE.Object3D) {
  if (!bone || !bone.userData.initialQuat) return;
  bone.quaternion.copy(bone.userData.initialQuat);
  bone.position.copy(bone.userData.initialPos);
}

/**
 * Aplica la pose sentada de forma limpia y estable.
 * Restablece cada hueso a su pose inicial antes de aplicar la flexión,
 * permitiendo una pose quieta estática sin depender de ningún clip de animación.
 */
export function applySitPose(b: ZoeBones, f: number = 1.0) {
  // Restablecer primero a la pose de reposo limpia
  Object.values(b).forEach((bone) => resetBone(bone));

  if (f <= 0.001) return;
  const p = SIT_POSE;
  if (b.hips) {
    b.hips.position.z -= p.hipsDrop * f;
    rotX(b.hips, p.torsoPitch * f);
  }
  rotX(b.chest, p.chestPitch * f);
  rotX(b.backL, p.thigh * f);
  rotX(b.backR, p.thigh * f);
  rotX(b.backL0, p.shin * f);
  rotX(b.backR0, p.shin * f);
  rotX(b.backL1, p.foot * f);
  rotX(b.backR1, p.foot * f);
  rotX(b.frontL, p.frontLegs * f);
  rotX(b.frontR, p.frontLegs * f);
  rotX(b.head, p.head * f);
  rotX(b.tail, p.tail * f);
}

export default applySitPose;
