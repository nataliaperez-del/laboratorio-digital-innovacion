import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { restClip, ZoeClipDirector, type ClipRole, type ZoeBodyState, type ZoeGesture } from './zoeClipDirector';

/** Ánimo de ZOE: tranquilo, escucha, piensa, habla, feliz o duerme. */
export type ZoeSoulState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sleeping';

/**
 * Trucos de una sola vez: sacudirse, dar vueltas, saltar, mover la cola, hacer una reverencia y
 * «boop», el toque con el hocico con que presiona un botón. Los que el modelo trae como clip
 * (Shake, Tail_Wag, play_bow) se reproducen; los demás los pone la capa procedimental.
 */
export type ZoeTrick = 'shake' | 'spin' | 'jump' | 'wag' | 'bow' | 'boop';

/** Lo que se le pide al ZOE 3D: ánimo, postura, caminar o trotar, hacia dónde mira, entorno y modelo. */
export interface ZoeCanvas3DProps {
  behavior?: ZoeSoulState;
  isWalking?: boolean;
  /** Mientras camina, va al trote (para los trayectos largos, como volver a su casita). */
  trotting?: boolean;
  posture?: 'sitting' | 'standing' | 'lying';
  show360Environment?: boolean;
  petTrigger?: number;
  /** Un truco pedido; cada `id` nuevo lo dispara una vez. */
  trick?: { name: ZoeTrick; id: number } | null;
  /** Hacia dónde mira el cuerpo al caminar: -1 izquierda, 1 derecha, 0 de frente. */
  facing?: -1 | 0 | 1;
  /** 0 = cuerpo sólido; 1 = malla de alambre, para la materialización de la presentación. */
  wire?: number;
  framing?: 'full' | 'close';
  /** Otro GLB (por ejemplo, el que devuelve un autorig) para probarlo sin reemplazar el oficial. */
  modelUrl?: string;
  /** Avisa qué clips trae el modelo y qué papel tomó cada uno: lo usa el visor de clips. */
  onModelInfo?: (info: ZoeModelInfo) => void;
}

/** Lo que trae el modelo cargado: clips, papel de cada uno, huesos y si es el esqueleto propio. */
export interface ZoeModelInfo {
  clips: string[];
  roles: Partial<Record<ClipRole, string>>;
  bones: number;
  /** El esqueleto es el de este proyecto (ojos de shader y gestos finos disponibles). */
  ownRig: boolean;
}

/** Interpolación independiente de los cuadros por segundo: de aquí sale la suavidad. */
const damp = (from: number, to: number, speed: number, dt: number) => from + (to - from) * (1 - Math.exp(-speed * dt));
const range = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * El modelo (`public/assets/zoe/zoe.glb`) sale de `scripts/zoe/retopologia_zoe.py`. Sus clips los
 * reproduce `ZoeClipDirector`, que también entiende los de un autorig de cuadrúpedos: basta con
 * reemplazar el GLB para que ZOE use animaciones nuevas.
 */
const MODEL_URL = '/assets/zoe/zoe.glb';
/** Alto y largo máximos de ZOE en la escena (la cámara ve ~1,6 de alto). */
const FIT_HEIGHT = 1.16;
const FIT_LENGTH = 1.42;

interface PoseBone {
  bone: THREE.Bone;
  restQuat: THREE.Quaternion;
  restPos: THREE.Vector3;
  /** Orientación de reposo del padre en el espacio del perro: permite girar sin depender de los ejes del hueso. */
  parent: THREE.Quaternion;
  parentInv: THREE.Quaternion;
  depth: number;
}

/** Huesos que la capa procedimental mueve, con su nombre en este esqueleto o en uno de autorig. */
interface ProceduralRig {
  head?: string;
  neck?: string;
  chest?: string;
  snout?: string;
  /** Mandíbula: abre y cierra la boca al hablar. */
  jaw?: string;
  tail: string[];
}

function findRig(bones: Record<string, PoseBone>): ProceduralRig {
  const names = Object.keys(bones);
  const find = (...patterns: RegExp[]) => patterns.map((re) => names.find((n) => re.test(n))).find(Boolean);
  return {
    head: find(/^head$/i, /^(def[-_.])?head$/i, /head(?!.*(end|top|nose|tip))/i),
    neck: find(/^neck$/i, /neck(?!.*(end|tip))/i),
    chest: find(/^chest$/i, /spine.*(2|3|upper|chest)/i, /chest/i),
    snout: find(/^headend$/i),
    jaw: find(/^chin$/i, /^(def[-_.])?jaw$/i),
    tail: names.filter((n) => /tail/i.test(n) && !/^tail$/i.test(n)).sort((a, b) => bones[a].depth - bones[b].depth),
  };
}

// ── Ojos vivos: se dibujan por píxel sobre los ojos pintados de la textura ──

/** Centro del ojo pintado, en coordenadas del hueso de la cabeza (medido sobre el modelo). */
const EYE_LOCAL = { x: 0.0245, y: 0.0385, z: 0.0255 };
const EYE_RADIUS = 0.0285;
const EYE_LIFT = 0.0062;
const EYE_CAP_ANGLE = 0.9;

const EYE_VERTEX = `
  varying vec2 vP;
  void main() {
    vP = position.xy / ${Math.sin(EYE_CAP_ANGLE).toFixed(5)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EYE_FRAGMENT = `
  uniform vec2 uLook;
  uniform float uBlink;
  uniform float uSmile;
  uniform float uDilate;
  uniform float uShine;
  uniform float uOpacity;
  varying vec2 vP;

  float glint(vec2 p, vec2 at, float r) { return smoothstep(r, r * 0.45, length(p - at)); }

  void main() {
    float rim = length(vP);
    if (rim > 1.0) discard;
    vec2 c = vP - uLook * 0.2;
    float d = length(c);

    // Iris grande y pupila amplia: es lo que da la mirada tierna.
    vec3 col = vec3(0.02, 0.035, 0.09);
    float fibers = 0.88 + 0.12 * sin(atan(c.y, c.x) * 26.0 + d * 9.0);
    vec3 iris = mix(vec3(0.20, 0.66, 0.98), vec3(0.04, 0.18, 0.50), smoothstep(0.34, 0.86, d)) * fibers;
    iris += vec3(0.05, 0.22, 0.34) * smoothstep(0.0, -0.9, c.y);
    col = mix(col, iris, smoothstep(0.90, 0.85, d));
    float pupil = 0.47 + uDilate * 0.15;
    col = mix(col, vec3(0.006, 0.01, 0.03), smoothstep(pupil + 0.035, pupil - 0.035, d));

    // Brillos húmedos: se mueven menos que el iris, como un reflejo real.
    vec2 g = vP - uLook * 0.08;
    col += vec3(1.0) * glint(g, vec2(-0.30, 0.36), 0.31 * uShine);
    col += vec3(0.86, 0.96, 1.0) * glint(g, vec2(0.30, -0.28), 0.14 * (2.0 - uShine)) * 0.9;
    col += vec3(0.7, 0.9, 1.0) * glint(g, vec2(0.08, 0.46), 0.07) * 0.8;

    // Párpados: el superior baja al parpadear y el inferior sube al sonreír. Cerrados, se
    // encuentran en una curva hacia abajo: la carita de dormir plácido.
    float closed = -0.40 + 0.34 * vP.x * vP.x;
    float upper = mix(1.08 - 0.26 * vP.x * vP.x, closed, uBlink);
    float lower = mix(-1.08 + uSmile * 0.92 * (1.0 - 0.75 * vP.x * vP.x), closed, uBlink);
    float toLid = min(upper - vP.y, vP.y - lower);
    vec3 fur = mix(vec3(0.07, 0.17, 0.42), vec3(0.15, 0.30, 0.60), smoothstep(-1.0, 0.8, vP.y));
    vec3 lid = mix(vec3(0.015, 0.03, 0.08), fur, smoothstep(-0.05, -0.20, toLid));
    col = mix(col, lid, smoothstep(0.015, -0.015, toLid));

    gl_FragColor = vec4(col, uOpacity * smoothstep(1.0, 0.92, rim));
  }
`;

// ── Pelaje: capas («conchas») sobre la piel, la técnica de los juegos para el pelo corto ──

/** Capas de pelo: menos en celulares para cuidar el rendimiento. */
const FUR_SHELLS = typeof window !== 'undefined' && window.innerWidth < 768 ? 5 : 10;
/** Largo máximo del pelo en metros del modelo (ZOE mide ~33 cm): barba y cejas llegan a esto. */
const FUR_LENGTH = 0.0048;

/** Ruido de mechones: cada píxel es un pelo con su propio largo. */
function furNoiseTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.random() ** 1.6 * 255;
    data.set([v, v, v, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Cuánto pelo hay en un punto, según el color horneado: el gris claro y el blanco (barba, cejas,
 * patas) son pelo largo; el azul oscuro del traje y las líneas de neón no llevan pelo.
 */
const FUR_MASK_GLSL = `
  float furLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  float furAmount(vec3 c) {
    float luma = furLuma(c);
    float saturation = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    return smoothstep(0.2, 0.42, luma) * (1.0 - smoothstep(0.32, 0.55, saturation));
  }
  float furLength(vec3 c) { return furAmount(c) * mix(0.3, 1.0, smoothstep(0.42, 0.72, furLuma(c))); }
`;

/** Material de una capa: se infla según el largo del pelo y descarta lo que no es mechón. */
function furShellMaterial(base: THREE.MeshStandardMaterial, noise: THREE.Texture, layer: number) {
  const material = base.clone();
  material.transparent = false;
  material.depthWrite = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShell = { value: layer };
    shader.uniforms.uFurLength = { value: FUR_LENGTH };
    shader.uniforms.uFurNoise = { value: noise };
    shader.uniforms.uFurSource = { value: base.map };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uShell;\nuniform float uFurLength;\nuniform sampler2D uFurSource;\n${FUR_MASK_GLSL}`)
      .replace(
        '#include <skinning_vertex>',
        // Después del esqueleto: el pelo sigue a la piel en cada postura.
        '#include <skinning_vertex>\ntransformed += normalize(objectNormal) * uFurLength * uShell * furLength(texture2D(uFurSource, uv).rgb);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uShell;\nuniform sampler2D uFurNoise;\n${FUR_MASK_GLSL}`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // Cada mechón llega hasta donde dice el ruido: los pelos se afinan hacia la punta.
        float strand = texture2D(uFurNoise, vMapUv * 90.0).r;
        if (strand * furAmount(diffuseColor.rgb) < uShell) discard;
        // Raíz más oscura y puntas más claras: es lo que hace que se lea como pelo.
        diffuseColor.rgb *= mix(0.7, 1.12, uShell);`,
      );
  };
  material.customProgramCacheKey = () => 'zoe-fur-shell';
  return material;
}

/**
 * ZOE en 3D. Sobre la caminata y las posturas del modelo se suma una capa procedimental:
 * respiración, mirada que sigue a la persona, cola en cadena, gestos según el ánimo y ojos vivos.
 * Todos los giros se hacen en los ejes del perro, no en los del hueso: así no aparecen movimientos raros.
 */
export const ZoeCanvas3D: React.FC<ZoeCanvas3DProps> = ({
  behavior = 'idle',
  isWalking = false,
  trotting = false,
  posture = 'standing',
  show360Environment = false,
  petTrigger,
  trick,
  facing = 0,
  wire = 0,
  framing = 'full',
  modelUrl = MODEL_URL,
  onModelInfo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ behavior, isWalking, trotting, posture, show360Environment, facing, wire, framing });
  liveRef.current = { behavior, isWalking, trotting, posture, show360Environment, facing, wire, framing };
  const petRef = useRef<() => void>(() => undefined);
  const trickRef = useRef<(name: ZoeTrick) => void>(() => undefined);
  const infoRef = useRef(onModelInfo);
  infoRef.current = onModelInfo;

  useEffect(() => {
    if (petTrigger) petRef.current();
  }, [petTrigger]);

  useEffect(() => {
    if (trick) trickRef.current(trick.name);
    // Solo un id nuevo dispara el truco; el mismo objeto no lo repite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trick?.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, width / height, 0.1, 100);
    camera.position.set(0, 0.02, 3.3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Iluminación de estudio: resalta la textura y el relieve sin artefactos.
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const keyLight = new THREE.DirectionalLight(0xdcf8ff, 1.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x27dcff, 1.2);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);
    const softFill = new THREE.DirectionalLight(0xb85eff, 0.6);
    softFill.position.set(0, -2, 2);
    scene.add(softFill);

    const contactGeo = track(new THREE.CircleGeometry(0.48, 32));
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = track(
      new THREE.MeshBasicMaterial({ color: 0x27dcff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const contact = new THREE.Mesh(contactGeo, contactMat);
    contact.position.y = -0.54;
    scene.add(contact);
    const pawLight = new THREE.PointLight(0x27dcff, 0.7, 2.5);
    pawLight.position.set(0, -0.5, 0.1);
    scene.add(pawLight);

    // Entorno 360° holográfico opcional.
    const env360 = new THREE.Group();
    scene.add(env360);
    const dome = new THREE.Mesh(
      track(new THREE.SphereGeometry(2.3, 24, 16)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x27dcff,
          wireframe: true,
          transparent: true,
          opacity: 0.12,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    env360.add(dome);
    const ringGeo = track(new THREE.RingGeometry(0.82, 0.94, 48));
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: 0x27dcff,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    ring.position.y = -0.53;
    env360.add(ring);
    const particlePositions = new Float32Array(50 * 3).map((_, i) => (i % 3 === 1 ? Math.random() * 2 - 0.5 : (Math.random() - 0.5) * 3));
    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeo,
      track(new THREE.PointsMaterial({ size: 0.035, color: 0x5ec2dd, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    env360.add(particles);

    const zoeContainer = new THREE.Group();
    scene.add(zoeContainer);

    let disposed = false;
    let zoeGroup: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let director: ZoeClipDirector | null = null;
    let rig: ProceduralRig = { tail: [] };
    const bones: Record<string, PoseBone> = {};
    const bodyMaterials: THREE.MeshStandardMaterial[] = [];
    let wireMaterial: THREE.MeshBasicMaterial | null = null;
    const furShells: THREE.SkinnedMesh[] = [];
    let eyeMaterial: THREE.ShaderMaterial | null = null;
    const clock = new THREE.Clock();
    let appearStart = -1;
    let sniffStart = -99;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    petRef.current = () => {
      sniffStart = clock.getElapsedTime();
      director?.gesture('happy');
    };

    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        const group = gltf.scene;
        zoeGroup = group;

        const bbox = new THREE.Box3().setFromObject(group);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        // Se encaja por la altura (lo que se ve de frente) sin que el largo se salga al caminar de lado.
        const s = Math.min(FIT_HEIGHT / (size.y || 1), FIT_LENGTH / (Math.max(size.x, size.z) || 1));
        group.scale.setScalar(s);
        group.position.set(-center.x * s, -center.y * s, -center.z * s);
        zoeContainer.add(group);
        const ground = -(size.y * s) * 0.5;
        contact.position.y = ground;
        pawLight.position.set(0, ground + 0.04, 0.15);

        // La orientación de reposo se mide con el cuerpo de frente, en el espacio del perro.
        const savedYaw = zoeContainer.rotation.y;
        zoeContainer.rotation.y = 0;
        group.updateWorldMatrix(true, true);
        group.traverse((node) => {
          if (!(node as THREE.Bone).isBone || !node.parent) return;
          const parent = node.parent.getWorldQuaternion(new THREE.Quaternion());
          let depth = 0;
          for (let p = node.parent; p; p = p.parent) depth++;
          bones[node.name] = {
            bone: node as THREE.Bone,
            restQuat: node.quaternion.clone(),
            restPos: node.position.clone(),
            parent,
            parentInv: parent.clone().invert(),
            depth,
          };
        });
        zoeContainer.rotation.y = savedYaw;
        rig = findRig(bones);

        // El reposo se mide antes de que ningún clip mueva el esqueleto.
        mixer = new THREE.AnimationMixer(group);
        director = new ZoeClipDirector(mixer, gltf.animations, restClip(group));
        // Ojos de shader y gestos finos: solo con el esqueleto de este proyecto, que es donde se midieron.
        const ownRig = Boolean(bones.head && bones.headend);
        infoRef.current?.({ clips: gltf.animations.map((c) => c.name), roles: director.roles, bones: Object.keys(bones).length, ownRig });

        // Material sólido con la textura y el relieve horneados: la piel ya es cerrada, así que
        // basta la cara frontal y no hay transparencias que rompan el dibujo.
        wireMaterial = track(
          new THREE.MeshBasicMaterial({ color: 0x7fe9ff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        const skinned: THREE.SkinnedMesh[] = [];
        group.traverse((node) => {
          const mesh = node as THREE.SkinnedMesh;
          if (!mesh.isMesh) return;
          const original = mesh.material as THREE.MeshStandardMaterial;
          const body = track(
            new THREE.MeshStandardMaterial({
              map: original.map,
              normalMap: original.normalMap,
              roughness: 0.65,
              metalness: 0.05,
              emissive: new THREE.Color(0x04222b),
              emissiveIntensity: 0.2,
              transparent: true,
              opacity: 0,
            }),
          );
          original.dispose();
          mesh.material = body;
          bodyMaterials.push(body);
          if (mesh.isSkinnedMesh) skinned.push(mesh);
        });
        // La malla de alambre comparte esqueleto: se deforma igual que el cuerpo.
        for (const mesh of skinned) {
          const wireMesh = new THREE.SkinnedMesh(mesh.geometry, wireMaterial);
          wireMesh.bind(mesh.skeleton, mesh.bindMatrix);
          mesh.parent?.add(wireMesh);
        }

        // Pelaje en capas sobre la piel, con el mismo esqueleto: se mueve igual que el cuerpo. Solo
        // para el modelo de este proyecto; el de Meshy ya trae el pelo esculpido en la malla.
        const noise = track(furNoiseTexture());
        for (const mesh of Boolean(bones.head && bones.headend) ? skinned : []) {
          const base = mesh.material as THREE.MeshStandardMaterial;
          for (let i = 1; i <= FUR_SHELLS; i++) {
            const shellMaterial = track(furShellMaterial(base, noise, i / FUR_SHELLS));
            const shell = new THREE.SkinnedMesh(mesh.geometry, shellMaterial);
            shell.bind(mesh.skeleton, mesh.bindMatrix);
            shell.renderOrder = i;
            shell.frustumCulled = false;
            mesh.parent?.add(shell);
            furShells.push(shell);
          }
        }

        const headPose = ownRig ? bones.head : undefined;
        if (headPose) {
          const headWorld = headPose.parent.clone().multiply(headPose.restQuat);
          const headWorldInv = headWorld.clone().invert();
          const headScale = headPose.bone.getWorldScale(new THREE.Vector3()).x;
          const eyeGeometry = track(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, EYE_CAP_ANGLE));
          eyeGeometry.rotateX(Math.PI / 2);
          eyeMaterial = track(
            new THREE.ShaderMaterial({
              vertexShader: EYE_VERTEX,
              fragmentShader: EYE_FRAGMENT,
              transparent: true,
              depthWrite: false,
              uniforms: {
                uLook: { value: new THREE.Vector2() },
                uBlink: { value: 0 },
                uSmile: { value: 0 },
                uDilate: { value: 0.4 },
                uShine: { value: 1 },
                uOpacity: { value: 0 },
              },
            }),
          );
          const capRadius = EYE_RADIUS / Math.sin(EYE_CAP_ANGLE);
          for (const side of [-1, 1]) {
            const dir = new THREE.Vector3(side * 0.22, 0.02, 1).normalize();
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.quaternion.copy(headWorldInv).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
            eye.position.set(side * EYE_LOCAL.x, EYE_LOCAL.y, EYE_LOCAL.z).add(
              dir
                .clone()
                .applyQuaternion(headWorldInv)
                .multiplyScalar((EYE_LIFT - capRadius) / headScale),
            );
            eye.scale.setScalar(capRadius / headScale);
            headPose.bone.add(eye);
          }
        }
        appearStart = clock.getElapsedTime();
      },
      undefined,
      (err) => console.warn('[ZoeCanvas3D] No se pudo cargar el modelo:', err),
    );

    const onResize = () => {
      width = container.clientWidth || width;
      height = container.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Mirada: sigue el puntero mientras se mueve y, si se queda quieto, vuelve a lo suyo.
    const pointer = { x: 0, y: 0, at: -99 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp((e.clientX - (rect.left + rect.width / 2)) / 520, -1, 1);
      pointer.y = THREE.MathUtils.clamp((e.clientY - (rect.top + rect.height * 0.3)) / 420, -1, 1);
      pointer.at = clock.getElapsedTime();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const q = new THREE.Quaternion();
    const qTurn = new THREE.Quaternion();
    const euler = new THREE.Euler();
    /** Giros del cuadro: se deshacen tras dibujar, así no se acumulan en huesos que ningún clip reescribe. */
    const turned: Array<[THREE.Bone, THREE.Quaternion]> = [];
    /** Gira un hueso alrededor de los ejes del perro (x: asentir, y: voltear, z: ladear). */
    const turn = (name: string | undefined, x: number, y: number, z: number) => {
      const b = name ? bones[name] : undefined;
      if (!b) return;
      turned.push([b.bone, b.bone.quaternion.clone()]);
      q.setFromEuler(euler.set(x, y, z));
      qTurn.copy(b.parentInv).multiply(q).multiply(b.parent);
      b.bone.quaternion.premultiply(qTurn);
    };
    let lastMood: ZoeSoulState = 'idle';
    let jawOpen = 0;

    const look = { yaw: 0, pitch: 0, until: 0 };
    let nextGesture = range(3, 6);
    let tailBurstUntil = 0;
    const eye = { x: 0, y: 0, smile: 0, dilate: 0.4, sleepy: 0 };
    let blinkStart = -9;
    let nextBlink = range(1.5, 3.5);
    let doubleBlink = false;
    const saccade = { x: 0, y: 0, next: 0 };
    const pose = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      sit: 0,
      lie: 0,
      tailAmp: 0.08,
      tailSpeed: 2.4,
      tailPhase: 0,
      hop: 0,
      bodyYaw: -0.35,
      glow: 0.18,
      wire: 0,
      camZ: 3.3,
      camY: 0.02,
    };

    // Trucos: el clip se pide hasta que el cuerpo esté de pie y libre (puede venir levantándose).
    let pendingGesture: { role: ZoeGesture; until: number } | null = null;
    const SPIN_TURN_S = 0.95;
    const SPIN_TURNS = 2;
    const JUMP_S = 0.62;
    const BOOP_S = 0.55;
    let spinStart = -99;
    let jumpStart = -99;
    let boopStart = -99;
    trickRef.current = (name) => {
      const t = clock.getElapsedTime();
      // La cola acompaña cualquier truco, aunque el modelo no traiga el clip.
      tailBurstUntil = t + (name === 'boop' ? 0.9 : 2.2);
      if (name === 'spin') spinStart = t;
      else if (name === 'jump') jumpStart = t;
      else if (name === 'boop') boopStart = t;
      else pendingGesture = { role: name === 'shake' ? 'shake' : name === 'bow' ? 'play' : 'happy', until: t + 4 };
    };
    /** Arranca y frena suave: así la vuelta no se ve mecánica. */
    const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

    let animId = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;
    // Mientras la página se desplaza, la GPU es para el scroll: ZOE espera quieta un instante.
    let scrollingUntil = 0;
    const onScroll = () => {
      scrollingUntil = performance.now() + 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const animate = (now = 0) => {
      animId = requestAnimationFrame(animate);
      // ZOE acompaña, no es protagonista: 30 cuadros y en pausa si la pestaña no se ve o se está desplazando.
      if (document.hidden || now < scrollingUntil || now - lastFrame < FRAME_MS) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const t = clock.getElapsedTime();
      const state = liveRef.current;
      const motion = reduceMotion ? 0 : 1;
      const mood = state.behavior;

      // Dar vueltas es trotar en el sitio mientras el cuerpo gira: persigue su cola.
      const spinP = (t - spinStart) / (SPIN_TURN_S * SPIN_TURNS);
      const spinning = spinP >= 0 && spinP < 1 && motion > 0;
      // El cuerpo lo mueven los clips del modelo; el director elige cuál y cómo enlazarlos.
      const walking = (state.isWalking || spinning) && motion > 0;
      const body: ZoeBodyState = walking
        ? state.trotting || spinning
          ? 'trot'
          : 'walk'
        : mood === 'sleeping'
          ? 'sleep'
          : state.posture === 'lying'
            ? 'lie'
            : state.posture === 'sitting'
              ? 'sit'
              : 'stand';
      if (director) {
        director.setState(body, mood === 'listening');
        if (mood === 'happy' && lastMood !== 'happy') director.gesture('happy');
        if (pendingGesture) {
          if (t > pendingGesture.until || !director.has(pendingGesture.role)) pendingGesture = null;
          else if (body === 'stand' && director.gesture(pendingGesture.role)) pendingGesture = null;
        }
        director.update(motion ? dt : 0);
      }
      lastMood = mood;
      pose.sit = damp(pose.sit, body === 'sit' ? 1 : 0, 3, dt);
      pose.lie = damp(pose.lie, body === 'lie' || body === 'sleep' ? 1 : 0, 2, dt);
      // Sin un «idle» propio en el modelo, la respiración y la cola las pone el código.
      const lively = !director?.hasIdle;

      // Gestos en reposo: voltear a mirar algo, mover la cola, olfatear.
      if (mood === 'idle' && !walking && t > nextGesture && motion) {
        const roll = Math.random();
        const gestures = (['scratch', 'shake', 'sniff', 'play'] as ZoeGesture[]).filter((g) => director?.has(g));
        if (gestures.length && body === 'stand' && roll < 0.3) {
          director?.gesture(gestures[Math.floor(Math.random() * gestures.length)]);
        } else if (roll < 0.5) {
          look.yaw = range(-0.4, 0.4);
          look.pitch = range(-0.12, 0.08);
          look.until = t + range(1.2, 2.8);
        } else if (roll < 0.8) {
          tailBurstUntil = t + range(1, 2.2);
        } else {
          sniffStart = t;
        }
        nextGesture = t + range(2.8, 7.5);
      }

      let targetYaw = t < look.until ? look.yaw : 0;
      let targetPitch = t < look.until ? look.pitch : 0;
      let targetRoll = 0;
      let tailAmp = 0.08;
      let tailSpeed = 2.4;
      let glow = 0.18;
      let hop = 0;
      if (t - pointer.at < 2.5) {
        targetYaw = pointer.x * 0.5;
        targetPitch = pointer.y * 0.22;
      }
      if (t < tailBurstUntil) {
        tailAmp = 0.3;
        tailSpeed = 9;
      }
      if (mood === 'listening') {
        // Atento: cabeza ladeada hacia quien habla y pulso cian.
        targetRoll = 0.2;
        targetPitch = -0.04;
        tailAmp = 0.05;
        glow = 0.3 + Math.sin(t * 4) * 0.1 * motion;
      } else if (mood === 'thinking') {
        targetPitch = -0.2;
        targetYaw = Math.sin(t * 0.8) * 0.16 * motion;
        targetRoll = -0.06;
        glow = 0.24;
      } else if (mood === 'speaking') {
        // Gesticula por frases: asiente y ladea a ritmo irregular, nunca como metrónomo.
        const talk = Math.sin(t * 5.3) * 0.5 + Math.sin(t * 8.7) * 0.3 + Math.sin(t * 2.1) * 0.2;
        targetPitch += talk * 0.06 * motion;
        targetRoll = Math.sin(t * 1.3) * 0.08 * motion;
        tailAmp = 0.17;
        tailSpeed = 5.5;
      } else if (mood === 'happy') {
        targetPitch = -0.08;
        tailAmp = 0.42;
        tailSpeed = 13;
        glow = 0.36;
        hop = director?.has('happy') ? 0 : Math.abs(Math.sin(t * 6.5)) * 0.04 * motion * (1 - pose.lie);
      } else if (mood === 'sleeping') {
        // Dormido no sigue el puntero: la cabeza queda quieta, apenas ladeada.
        targetPitch = 0.2;
        targetYaw = 0;
        targetRoll = 0.08;
        tailAmp = 0;
        glow = 0.08;
      }

      // «Boop»: baja la cabeza y toca con el hocico, con un saltito; así presiona un botón.
      const boopP = (t - boopStart) / BOOP_S;
      if (boopP >= 0 && boopP < 1) {
        targetPitch += Math.sin(boopP * Math.PI) * 0.42;
        hop += Math.sin(boopP * Math.PI) * 0.035 * motion;
        glow += Math.sin(boopP * Math.PI) * 0.3;
      }

      const sniff = t - sniffStart;
      let sniffTwitch = 0;
      if (sniff >= 0 && sniff < 1.5) {
        const p = sniff / 1.5;
        targetPitch -= Math.sin(p * Math.PI) * 0.1;
        sniffTwitch = Math.sin(p * Math.PI * 7) * Math.sin(p * Math.PI) * 0.05;
        glow += Math.sin(p * Math.PI) * 0.25;
      }

      pose.yaw = damp(pose.yaw, targetYaw * motion, 5, dt);
      pose.pitch = damp(pose.pitch, targetPitch * motion, 6, dt);
      pose.roll = damp(pose.roll, targetRoll * motion, 5, dt);
      pose.tailAmp = damp(pose.tailAmp, tailAmp * motion, 3, dt);
      pose.tailSpeed = damp(pose.tailSpeed, tailSpeed, 3, dt);
      pose.tailPhase += pose.tailSpeed * dt;
      pose.glow = damp(pose.glow, glow, 5, dt);
      pose.hop = damp(pose.hop, hop, 12, dt);

      if (zoeGroup) {
        // Respiración repartida en pecho y cabeza: si solo se moviera la cabeza parecería muñeco.
        const asleep = mood === 'sleeping';
        const breath = lively ? Math.sin(t * (asleep ? 0.85 : 1.55)) * (asleep ? 0.03 : 0.016) * motion : 0;
        // La mirada y el ánimo van encima de cualquier clip; el resto solo si el modelo no los trae.
        turn(rig.chest, breath * 0.7, pose.yaw * 0.22, 0);
        turn(rig.head, pose.pitch + breath * 0.5, pose.yaw * 0.78, pose.roll);
        turn(rig.snout, sniffTwitch, 0, 0);
        // Boca: se abre por sílabas mientras habla, con un ritmo irregular como el del habla real.
        jawOpen = damp(jawOpen, mood === 'speaking' ? Math.max(0, Math.sin(t * 9.1) * 0.6 + Math.sin(t * 5.3) * 0.4) * 0.32 * motion : 0, 18, dt);
        turn(rig.jaw, jawOpen, 0, 0);
        if (lively && !walking) {
          // Cola en cadena: la onda viaja de la base a la punta.
          rig.tail.forEach((name, i) => {
            turn(name, 0, Math.sin(pose.tailPhase - i * 0.65) * pose.tailAmp * (0.55 + i * 0.2), 0);
          });
        }
      }

      // Cuerpo: gira hacia donde camina; en 360° orbita despacio.
      env360.visible = state.show360Environment;
      if (state.show360Environment) {
        dome.rotation.y += 0.09 * dt;
        ring.rotation.z += 0.4 * dt;
        particles.rotation.y += 0.1 * dt;
        pose.bodyYaw += 0.3 * dt;
      } else {
        pose.bodyYaw = damp(pose.bodyYaw, state.facing !== 0 ? state.facing * 1.1 : -0.35, 4, dt);
      }
      const spinYaw = spinning ? easeInOut(spinP) * Math.PI * 2 * SPIN_TURNS : 0;
      zoeContainer.rotation.y = pose.bodyYaw + spinYaw;
      // El salto va sin amortiguar: un salto suavizado se vería como flotar.
      const jumpP = (t - jumpStart) / JUMP_S;
      const jump = jumpP >= 0 && jumpP < 1 ? Math.sin(jumpP * Math.PI) * 0.2 * motion : 0;
      zoeContainer.position.y = pose.hop + jump;
      contactMat.opacity = pose.glow;
      pawLight.intensity = 0.4 + pose.glow * 1.8;

      // Encuadre: «close» acerca la cámara a la cara para la presentación.
      // Sentado o echado ocupa menos alto: la cámara se acerca para que no se vea diminuto.
      const low = walking ? 0 : pose.lie;
      const seated = walking ? 0 : pose.sit;
      pose.camZ = damp(pose.camZ, state.framing === 'close' ? 1.7 : 3.2 - seated * 0.1 - low * 0.4, 2.5, dt);
      pose.camY = damp(pose.camY, state.framing === 'close' ? 0.28 : 0.02 - seated * 0.06 - low * 0.15, 2.5, dt);
      camera.position.set(0, pose.camY, pose.camZ);
      camera.lookAt(0, pose.camY * 0.9, 0);

      if (eyeMaterial) {
        // La mirada se adelanta a la cabeza: primero miran los ojos y luego voltea.
        if (t > saccade.next) {
          saccade.x = range(-0.1, 0.1);
          saccade.y = range(-0.07, 0.07);
          saccade.next = t + range(0.7, 2.6);
        }
        let lookX = saccade.x + targetYaw * 1.5;
        let lookY = saccade.y - targetPitch * 1.5;
        let smile = 0;
        let dilate = 0.4;
        if (mood === 'listening') dilate = 0.85;
        else if (mood === 'thinking') {
          lookX = Math.sin(t * 0.7) * 0.35;
          lookY = 0.55;
          dilate = 0.25;
        } else if (mood === 'speaking') {
          smile = 0.18 + Math.max(0, Math.sin(t * 1.7)) * 0.16;
          dilate = 0.6;
        } else if (mood === 'happy') {
          smile = 0.82;
          dilate = 1;
        }
        eye.x = damp(eye.x, THREE.MathUtils.clamp(lookX, -0.8, 0.8), 16, dt);
        eye.y = damp(eye.y, THREE.MathUtils.clamp(lookY, -0.7, 0.7), 16, dt);
        eye.smile = damp(eye.smile, smile, 8, dt);
        eye.dilate = damp(eye.dilate, dilate, 4, dt);
        eye.sleepy = damp(eye.sleepy, mood === 'sleeping' ? 1 : 0, 3, dt);

        if (t > nextBlink) {
          blinkStart = t;
          doubleBlink = Math.random() < 0.22;
          // Al escuchar parpadea menos; al pensar, más seguido.
          nextBlink = t + (mood === 'listening' ? range(3.5, 7) : mood === 'thinking' ? range(1.2, 3) : range(2.2, 5.5));
        }
        const BLINK = 0.16;
        const since = t - blinkStart;
        const pulse = (x: number) => (x >= 0 && x < BLINK ? Math.sin((x / BLINK) * Math.PI) : 0);
        const blink = Math.max(pulse(since), doubleBlink ? pulse(since - BLINK * 1.5) : 0);

        const u = eyeMaterial.uniforms;
        u.uLook.value.set(eye.x, eye.y);
        // El margen asegura que cierren del todo: la interpolación nunca llega exacta a 1.
        u.uBlink.value = Math.min(1, Math.max(blink, eye.sleepy) * 1.08);
        u.uSmile.value = eye.smile;
        u.uDilate.value = eye.dilate;
        // El brillo tiembla apenas, como un ojo húmedo: es lo que los hace parecer vivos.
        u.uShine.value = 1 + Math.sin(t * 1.9) * 0.05 + Math.sin(t * 3.1) * 0.03;
      }

      // Aparición gradual y paso de alambre a cuerpo sólido.
      pose.wire = damp(pose.wire, state.wire, 2.4, dt);
      if (appearStart >= 0) {
        const appear = reduceMotion ? 1 : Math.min(1, (t - appearStart) / 0.9);
        const solid = appear * (1 - pose.wire);
        for (const m of bodyMaterials) {
          m.opacity = solid;
          // Opaco del todo en cuanto se puede: así no se ordena como transparente.
          m.transparent = solid < 0.995;
          m.depthWrite = solid > 0.5;
        }
        if (wireMaterial) wireMaterial.opacity = pose.wire * 0.75 * appear;
        // El pelo aparece solo con el cuerpo sólido: durante la materialización estorbaría.
        for (const shell of furShells) shell.visible = solid > 0.98;
        if (eyeMaterial) eyeMaterial.uniforms.uOpacity.value = solid;
      }

      renderer.render(scene, camera);
      for (let i = turned.length - 1; i >= 0; i--) turned[i][0].quaternion.copy(turned[i][1]);
      turned.length = 0;
    };
    animId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      mixer?.stopAllAction();
      zoeGroup?.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.map?.dispose();
        material.normalMap?.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [modelUrl]);

  return <div ref={containerRef} className="relative w-full h-full select-none bg-transparent" aria-hidden="true" />;
};

export default ZoeCanvas3D;
