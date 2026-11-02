import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ZoeSoulState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sleeping';

export interface ZoeCanvas3DProps {
  behavior?: ZoeSoulState;
  isWalking?: boolean;
  posture?: 'sitting' | 'standing' | 'lying';
  show360Environment?: boolean;
  petTrigger?: number;
  facing?: -1 | 0 | 1;
  framing?: 'full' | 'close';
}

const damp = (from: number, to: number, speed: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-speed * dt));

export const ZoeCanvas3D: React.FC<ZoeCanvas3DProps> = ({
  behavior = 'idle',
  isWalking = false,
  posture = 'standing',
  show360Environment = false,
  petTrigger,
  facing = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ behavior, isWalking, posture, show360Environment, facing });
  liveRef.current = { behavior, isWalking, posture, show360Environment, facing };

  const petRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (petTrigger) {
      petRef.current();
    }
  }, [petTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, width / height, 0.1, 100);
    camera.position.set(0, 0.02, 3.3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Iluminación equilibrada de estudio para resaltar la textura y geometría sin artefactos
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xdcf8ff, 1.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x27dcff, 1.2);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xb85eff, 0.6);
    softFill.position.set(0, -2, 2);
    scene.add(softFill);

    // Disco sutil en el punto de apoyo en el piso
    const contactGeo = new THREE.CircleGeometry(0.48, 32);
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = new THREE.MeshBasicMaterial({
      color: 0x27dcff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const contactMesh = new THREE.Mesh(contactGeo, contactMat);
    contactMesh.position.y = -0.54;
    scene.add(contactMesh);

    const pawLight = new THREE.PointLight(0x27dcff, 0.7, 2.5);
    pawLight.position.set(0, -0.5, 0.1);
    scene.add(pawLight);

    // Entorno 360° holográfico opcional
    const env360Group = new THREE.Group();
    env360Group.visible = Boolean(show360Environment);
    scene.add(env360Group);

    const domeGeo = new THREE.SphereGeometry(2.3, 24, 16);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x27dcff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    env360Group.add(domeMesh);

    const orbitalRingGeo = new THREE.RingGeometry(0.82, 0.94, 48);
    orbitalRingGeo.rotateX(-Math.PI / 2);
    const orbitalRingMat = new THREE.MeshBasicMaterial({
      color: 0x27dcff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orbitalRingMesh = new THREE.Mesh(orbitalRingGeo, orbitalRingMat);
    orbitalRingMesh.position.y = -0.53;
    env360Group.add(orbitalRingMesh);

    // Partículas cuánticas en el entorno 360
    const partCount = 50;
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 3;
      partPos[i + 1] = Math.random() * 2 - 0.5;
      partPos[i + 2] = (Math.random() - 0.5) * 3;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0x5ec2dd,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const partMesh = new THREE.Points(partGeo, partMat);
    env360Group.add(partMesh);

    // Contenedor principal de ZOE
    const zoeContainer = new THREE.Group();
    zoeContainer.rotation.set(0, -0.35, 0);
    scene.add(zoeContainer);

    let zoeGroup: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let walkAction: THREE.AnimationAction | null = null;

    // Huesos clave para micro-gestos naturales en reposo
    let headBone: THREE.Bone | null = null;
    let headEndBone: THREE.Bone | null = null;
    let chestBone: THREE.Bone | null = null;
    let tailBone: THREE.Bone | null = null;

    const baseHeadRot = new THREE.Euler();
    const baseHeadEndRot = new THREE.Euler();
    const baseChestRot = new THREE.Euler();
    const baseTailRot = new THREE.Euler();

    let sniffStart = -99;
    petRef.current = () => {
      sniffStart = clock.getElapsedTime();
    };

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/assets/zoe/zoe.glb',
      (gltf) => {
        zoeGroup = gltf.scene;

        // Centrado y escala precisa: 1.25 encuadra a ZOE grande y majestuoso
        const bbox = new THREE.Box3().setFromObject(zoeGroup);
        const bSize = bbox.getSize(new THREE.Vector3());
        const bCenter = bbox.getCenter(new THREE.Vector3());
        const maxD = Math.max(bSize.x, bSize.y, bSize.z) || 1;
        const s = 1.26 / maxD;

        zoeGroup.scale.set(s, s, s);
        zoeGroup.position.set(-bCenter.x * s, -bCenter.y * s, -bCenter.z * s);
        zoeContainer.add(zoeGroup);

        // Nivel de piso exacto bajo las 4 patas
        const groundLevel = -(bSize.y * s) * 0.48;
        contactMesh.position.y = groundLevel;
        pawLight.position.set(0, groundLevel + 0.04, 0.15);

        // Optimización de la malla: Preservar textura original limpia y sólida (sin transparencias rotas)
        zoeGroup.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            const origMat = mesh.material as THREE.MeshStandardMaterial;
            // Material limpio y sólido: preserva la textura nativa de 25k polígonos
            const solidMat = new THREE.MeshStandardMaterial({
              map: origMat.map || null,
              roughness: 0.65,
              metalness: 0.05,
              emissive: new THREE.Color(0x04222b),
              emissiveIntensity: 0.2,
              transparent: false,
              depthWrite: true,
              depthTest: true,
              side: THREE.FrontSide,
            });
            mesh.material = solidMat;
          }

          if ((node as THREE.Bone).isBone) {
            if (node.name === 'head') {
              headBone = node as THREE.Bone;
              baseHeadRot.copy(headBone.rotation);
            } else if (node.name === 'headend') {
              headEndBone = node as THREE.Bone;
              baseHeadEndRot.copy(headEndBone.rotation);
            } else if (node.name === 'chest') {
              chestBone = node as THREE.Bone;
              baseChestRot.copy(chestBone.rotation);
            } else if (node.name === 'tail' || node.name === 'tailstart') {
              tailBone = node as THREE.Bone;
              baseTailRot.copy(tailBone.rotation);
            }
          }
        });

        // Configuración de animación de caminata oficial de 4 patas
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(zoeGroup);
          walkAction = mixer.clipAction(gltf.animations[0]);
          walkAction.setEffectiveTimeScale(0.85); // Ritmo de marcha noble y natural
          if (liveRef.current.isWalking) {
            walkAction.play();
          }
        }
      },
      undefined,
      (err) => console.warn('[ZoeCanvas3D] Error cargando modelo:', err)
    );

    // Seguimiento suave del puntero del mouse
    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.x = Math.max(-1, Math.min(1, x));
      pointer.y = Math.max(-1, Math.min(1, y));
    };
    window.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 320;
      height = container.clientHeight || 340;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let animId: number;
    let bodyYaw = -0.35;
    let walkWeight = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();
      const state = liveRef.current;

      // Control fluido de la animación de caminata
      const isWalking = Boolean(state.isWalking);
      if (walkAction) {
        if (isWalking && !walkAction.isRunning()) {
          walkAction.reset().fadeIn(0.25).play();
        } else if (!isWalking && walkAction.isRunning()) {
          walkAction.fadeOut(0.25);
        }
      }

      walkWeight = damp(walkWeight, isWalking ? 1 : 0, 4, dt);
      if (mixer && (walkAction?.isRunning() || walkWeight > 0.01)) {
        mixer.update(dt);
      }

      // Entorno 360° opcional
      env360Group.visible = Boolean(state.show360Environment);
      if (state.show360Environment) {
        domeMesh.rotation.y += 0.002;
        orbitalRingMesh.rotation.z += 0.006;
        partMesh.rotation.y += 0.003;
        bodyYaw += 0.005; // Rotación orbital suave en 360°
      } else {
        const targetYaw = state.facing !== 0 ? state.facing * 1.1 : -0.35;
        bodyYaw = damp(bodyYaw, targetYaw, 4, dt);
      }
      zoeContainer.rotation.y = bodyYaw;

      // Micro-gestos naturales en reposo (cuando no está caminando)
      const restFactor = 1 - walkWeight;
      if (restFactor > 0.05) {
        // 1. Respiración viva y suave en el pecho
        if (chestBone) {
          const breath = Math.sin(t * 1.6) * 0.018 * restFactor;
          chestBone.rotation.x = baseChestRot.x + breath;
        }

        // 2. Movimiento sutil y sereno de la cola
        if (tailBone) {
          const wag = Math.sin(t * 2.4) * 0.07 * restFactor;
          tailBone.rotation.y = baseTailRot.y + wag;
        }

        // 3. Cabeza atenta que sigue con dulzura el puntero
        const lookYaw = damp(0, pointer.x * 0.28, 4, dt) * restFactor;
        const lookPitch = damp(0, -pointer.y * 0.16, 4, dt) * restFactor;

        // 4. Olfateo noble al acariciar (1.4 segundos de micro-pulsos curiosos)
        const sniffElapsed = t - sniffStart;
        if (sniffElapsed >= 0 && sniffElapsed < 1.4) {
          const p = sniffElapsed / 1.4;
          const lift = Math.sin(p * Math.PI) * 0.08;
          const twitch = Math.sin(p * Math.PI * 6) * Math.sin(p * Math.PI) * 0.06;

          if (headBone) {
            headBone.rotation.x = baseHeadRot.x - lift;
            headBone.rotation.y = baseHeadRot.y + lookYaw;
          }
          if (headEndBone) {
            headEndBone.rotation.x = baseHeadEndRot.x + twitch;
          }
          contactMat.opacity = 0.18 + Math.sin(p * Math.PI) * 0.35;
          pawLight.intensity = 0.7 + Math.sin(p * Math.PI) * 1.2;
        } else {
          if (headBone) {
            headBone.rotation.x = baseHeadRot.x + lookPitch;
            headBone.rotation.y = baseHeadRot.y + lookYaw;
          }
          if (headEndBone) {
            headEndBone.rotation.copy(baseHeadEndRot);
          }
          contactMat.opacity = 0.18;
          pawLight.intensity = 0.7;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      orbitalRingGeo.dispose();
      orbitalRingMat.dispose();
      partGeo.dispose();
      partMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center cursor-pointer select-none bg-transparent"
      title="Zoe · Asistente IA"
    />
  );
};

export default ZoeCanvas3D;
