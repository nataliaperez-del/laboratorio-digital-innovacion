import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ZoeSoulState =
  | 'idle'
  | 'sitting'
  | 'walking'
  | 'sleeping'
  | 'happy'
  | 'playing'
  | 'explaining'
  | 'speaking'
  | 'listening'
  | 'greeting'
  | 'thinking';

export type ZoeAnimState = ZoeSoulState;

export interface ZoeCanvas3DProps {
  behavior?: ZoeSoulState;
  state?: ZoeSoulState;
  outfit?: string;
  isListening?: boolean;
  isWalking?: boolean;
  posture?: 'sitting' | 'standing';
  show360Environment?: boolean;
  petTrigger?: number;
  onPet?: () => void;
  onLoaded?: () => void;
}

export const ZoeCanvas3D: React.FC<ZoeCanvas3DProps> = ({
  behavior = 'sitting',
  state = 'sitting',
  outfit,
  isListening = false,
  isWalking = false,
  posture = 'sitting',
  show360Environment = false,
  petTrigger,
  onPet,
  onLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const triggerSniffRef = useRef<(() => void) | null>(null);
  const isWalkingRef = useRef<boolean>(Boolean(isWalking));
  const postureRef = useRef<'sitting' | 'standing'>(posture || 'sitting');
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const show360Ref = useRef<boolean>(Boolean(show360Environment));
  const env360GroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    postureRef.current = posture || 'sitting';
  }, [posture]);

  useEffect(() => {
    isWalkingRef.current = Boolean(isWalking);
    if (walkActionRef.current) {
      if (isWalking) {
        walkActionRef.current.reset().fadeIn(0.25).play();
      } else {
        walkActionRef.current.fadeOut(0.25);
      }
    }
  }, [isWalking]);

  useEffect(() => {
    show360Ref.current = Boolean(show360Environment);
    if (env360GroupRef.current) {
      env360GroupRef.current.visible = Boolean(show360Environment);
    }
  }, [show360Environment]);

  useEffect(() => {
    if (petTrigger && triggerSniffRef.current) {
      triggerSniffRef.current();
    }
  }, [petTrigger]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 290;
    let height = container.clientHeight || 310;

    // 1. Escena y cámara encuadrada para ver a Zoe MÁS GRANDE y majestuoso
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    // Cámara ligeramente elevada mirando al centro del modelo, más cerca para mayor tamaño
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
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Iluminación suave de estudio
    const ambientLight = new THREE.AmbientLight(0x283845, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xd4f4ff, 1.2);
    keyLight.position.set(2.8, 4.0, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb85eff, 0.9);
    rimLight.position.set(-3.0, 3.0, -3.0);
    scene.add(rimLight);

    // Luz tenue y sutil bajo las patitas en el piso
    const pawGlowLight = new THREE.PointLight(0x27dcff, 0.7, 3.5);
    pawGlowLight.position.set(0, -0.52, 0.15);
    scene.add(pawGlowLight);

    // Disco sutil que sólo emite un destello tenue en el punto de contacto en el piso
    const contactGlowGeo = new THREE.CircleGeometry(0.44, 32);
    contactGlowGeo.rotateX(-Math.PI / 2);
    const contactGlowMat = new THREE.MeshBasicMaterial({
      color: 0x27dcff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const contactGlowMesh = new THREE.Mesh(contactGlowGeo, contactGlowMat);
    contactGlowMesh.position.y = -0.54;
    scene.add(contactGlowMesh);

    // Entorno 360° Holográfico Opcional (Cúpula geodésica, anillos orbitales y partículas cuánticas)
    const env360Group = new THREE.Group();
    env360Group.visible = show360Ref.current;
    scene.add(env360Group);
    env360GroupRef.current = env360Group;

    const domeGeo = new THREE.SphereGeometry(2.3, 28, 18);
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

    const outerRingGeo = new THREE.RingGeometry(1.05, 1.12, 36);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xf29f05,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.position.y = -0.535;
    env360Group.add(outerRingMesh);

    const particlesCount = 75;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 3.2;
      posArray[i + 1] = Math.random() * 2.2 - 0.5;
      posArray[i + 2] = (Math.random() - 0.5) * 3.2;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.038,
      color: 0x5ec2dd,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particlesMesh = new THREE.Points(partGeo, partMat);
    env360Group.add(particlesMesh);

    // 3. Contenedores y jerarquía 3D
    const zoeContainer = new THREE.Group();
    // Perspectiva 3/4 serena y noble (fija, sin giros bruscos)
    zoeContainer.rotation.set(0, -0.35, 0);
    scene.add(zoeContainer);

    let zoeGroup: THREE.Group | null = null;
    let headBone: THREE.Bone | null = null;
    let headEndBone: THREE.Bone | null = null;
    let hipsBone: THREE.Bone | null = null;
    let chestBone: THREE.Bone | null = null;
    let backLegBone: THREE.Bone | null = null;
    let rBackLegBone: THREE.Bone | null = null;
    let backLeg0Bone: THREE.Bone | null = null;
    let rBackLeg0Bone: THREE.Bone | null = null;

    let mixer: THREE.AnimationMixer | null = null;
    let walkAction: THREE.AnimationAction | null = null;
    const baseHeadRot = new THREE.Euler();
    const baseHeadEndRot = new THREE.Euler();
    const baseHipsPos = new THREE.Vector3();
    const baseChestRot = new THREE.Euler();
    const baseBackLegRot = new THREE.Euler();
    const baseRBackLegRot = new THREE.Euler();
    const baseBackLeg0Rot = new THREE.Euler();
    const baseRBackLeg0Rot = new THREE.Euler();

    const textureLoader = new THREE.TextureLoader();
    const furTexture = textureLoader.load('/assets/zoe/zoe_texture.png');
    furTexture.colorSpace = THREE.SRGBColorSpace;
    furTexture.flipY = false;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/assets/zoe/zoe.glb',
      (gltf) => {
        zoeGroup = gltf.scene;

        // Centrado y escala precisa: 1.15 garantiza que orejas, cola y patas se vean 100% completas
        const bbox = new THREE.Box3().setFromObject(zoeGroup);
        const bSize = new THREE.Vector3();
        const bCenter = new THREE.Vector3();
        bbox.getSize(bSize);
        bbox.getCenter(bCenter);

        const maxD = Math.max(bSize.x, bSize.y, bSize.z);
        const s = 1.28 / (maxD || 1);
        zoeGroup.scale.set(s, s, s);

        // Centrado exacto del modelo natural en el centro del viewport
        zoeGroup.position.set(-bCenter.x * s, -bCenter.y * s, -bCenter.z * s);
        zoeContainer.add(zoeGroup);

        // Clip de animación para caminar cuando se active el modo
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(zoeGroup);
          walkAction = mixer.clipAction(gltf.animations[0]);
          walkAction.setEffectiveTimeScale(0.85); // paso noble y natural
          walkActionRef.current = walkAction;
          if (isWalkingRef.current) {
            walkAction.play();
          }
        }

        // Ajustar contacto de patitas en el piso
        const groundLevel = -(bSize.y * s) * 0.48;
        contactGlowMesh.position.y = groundLevel;
        pawGlowLight.position.set(0, groundLevel + 0.04, 0.15);

        // Identificar huesos clave para animación noble, olfateo y postura sentada
        zoeGroup.traverse((node) => {
          if (node.name === 'head') {
            headBone = node as THREE.Bone;
            baseHeadRot.copy(headBone.rotation);
          } else if (node.name === 'headend') {
            headEndBone = node as THREE.Bone;
            baseHeadEndRot.copy(headEndBone.rotation);
          } else if (node.name === 'Hips') {
            hipsBone = node as THREE.Bone;
            baseHipsPos.copy(hipsBone.position);
          } else if (node.name === 'chest') {
            chestBone = node as THREE.Bone;
            baseChestRot.copy(chestBone.rotation);
          } else if (node.name === 'backleg') {
            backLegBone = node as THREE.Bone;
            baseBackLegRot.copy(backLegBone.rotation);
          } else if (node.name === 'R_backleg') {
            rBackLegBone = node as THREE.Bone;
            baseRBackLegRot.copy(rBackLegBone.rotation);
          } else if (node.name === 'backleg0') {
            backLeg0Bone = node as THREE.Bone;
            baseBackLeg0Rot.copy(backLeg0Bone.rotation);
          } else if (node.name === 'R_backleg0') {
            rBackLeg0Bone = node as THREE.Bone;
            baseRBackLeg0Rot.copy(rBackLeg0Bone.rotation);
          }
        });

        // Material físico y shaders holográficos suaves (sin distorsiones)
        zoeGroup.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const m = node as THREE.Mesh;
            const originalMat = m.material as THREE.MeshStandardMaterial;
            const activeMap = originalMat.map || furTexture;

            const soulMat = new THREE.MeshPhysicalMaterial({
              map: activeMap,
              color: new THREE.Color(0xffffff),
              emissive: new THREE.Color(0x021016),
              emissiveIntensity: 0.06,
              metalness: 0.02,
              roughness: 0.55,
              transmission: 0.20,
              ior: 1.2,
              transparent: true,
              opacity: 0.98,
              depthWrite: true,
              side: THREE.FrontSide,
            });

            soulMat.onBeforeCompile = (shader) => {
              shader.uniforms.uTime = { value: 0 };
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
                #include <common>
                varying vec3 vWorldPos;
                varying vec3 vViewNormal;
                `
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                vViewNormal = normalize(normalMatrix * normal);
                `
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
                #include <common>
                uniform float uTime;
                varying vec3 vWorldPos;
                varying vec3 vViewNormal;
                `
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>

                // Borde Fresnel sutil
                float fresnel = pow(1.0 - abs(dot(vViewNormal, vec3(0.0, 0.0, 1.0))), 3.2);
                vec3 cyanGlow = vec3(0.15, 0.86, 1.0) * fresnel * 0.25;
                vec3 violetGlow = vec3(0.72, 0.37, 1.0) * pow(fresnel, 4.0) * 0.15;
                gl_FragColor.rgb += cyanGlow + violetGlow;

                // Malla wireframe delicada
                float scanGrid = sin(vWorldPos.y * 36.0 + uTime * 1.2);
                float linePulse = smoothstep(0.95, 0.99, scanGrid) * 0.04;
                gl_FragColor.rgb += vec3(0.15, 0.86, 1.0) * linePulse;
                `
              );
              (soulMat as any).userData.shader = shader;
            };

            m.material = soulMat;
            m.castShadow = false;
            m.receiveShadow = false;
          }
        });

        // NOTA: NO se agregan aros artificiales en el cuello ni en el pecho
        // Zoe luce su modelo natural de Schnauzer fiel al Character Book

        triggerSniffRef.current = () => {
          sniffStartTime = clock.getElapsedTime();
        };

        setIsLoaded(true);
        if (onLoaded) onLoaded();
      },
      undefined,
      (err) => console.warn('[ZoeCanvas3D] Error cargando modelo holográfico:', err)
    );

    // 4. Eventos e interacción táctil / olfateo noble
    let sniffStartTime = -999;
    const triggerSniff = () => {
      sniffStartTime = clock.getElapsedTime();
      if (onPet) onPet();
    };

    const handleClick = () => {
      triggerSniff();
    };
    container.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 290;
      height = container.clientHeight || 310;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 5. Bucle de renderizado quieto y sereno (con opción de caminar y micro-olfateo)
    const clock = new THREE.Clock();
    let animId: number;
    let currentSitFactor = 0.0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Animación de caminata cuando se activa el modo caminar
      if (mixer && isWalkingRef.current) {
        mixer.update(delta);
      }

      // Shaders holográficos sutiles en la textura
      if (zoeGroup) {
        zoeGroup.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const m = node as THREE.Mesh;
            const mat = m.material as any;
            if (mat && mat.userData && mat.userData.shader) {
              mat.userData.shader.uniforms.uTime.value = elapsed;
            }
          }
        });
      }

      // Si el entorno 360° opcional está activo, animamos la cúpula, anillos y rotación orbital de Zoe
      if (show360Ref.current) {
        if (env360Group) {
          env360Group.visible = true;
          domeMesh.rotation.y += 0.0015;
          orbitalRingMesh.rotation.z += 0.007;
          outerRingMesh.rotation.z -= 0.004;
          particlesMesh.rotation.y += 0.003;
        }
        if (zoeContainer) {
          zoeContainer.position.set(0, 0, 0);
          zoeContainer.rotation.y += 0.006; // Giro orbital 360 panorámico suave
        }
      } else {
        if (env360Group) {
          env360Group.visible = false;
        }
        // MODO ESTÁNDAR LIMPIO Y TRANSPARENTE: ZOE PERMANECE SERENO EN PERSPECTIVA 3/4
        if (zoeContainer) {
          zoeContainer.position.set(0, 0, 0);
          zoeContainer.rotation.set(0, -0.35, 0);
        }
      }

      // Lógica de Postura Canina: Sentado vs De Pie vs Caminando
      const targetSit = (!isWalkingRef.current && postureRef.current === 'sitting') ? 1.0 : 0.0;
      currentSitFactor += (targetSit - currentSitFactor) * 0.08;

      if (currentSitFactor > 0.005) {
        if (hipsBone) {
          hipsBone.position.y = baseHipsPos.y - currentSitFactor * 0.055;
          hipsBone.position.z = baseHipsPos.z - currentSitFactor * 0.018;
        }
        if (backLegBone) {
          backLegBone.rotation.x = baseBackLegRot.x - currentSitFactor * 0.55;
        }
        if (rBackLegBone) {
          rBackLegBone.rotation.x = baseRBackLegRot.x - currentSitFactor * 0.55;
        }
        if (backLeg0Bone) {
          backLeg0Bone.rotation.x = baseBackLeg0Rot.x + currentSitFactor * 0.65;
        }
        if (rBackLeg0Bone) {
          rBackLeg0Bone.rotation.x = baseRBackLeg0Rot.x + currentSitFactor * 0.65;
        }
        if (chestBone) {
          chestBone.rotation.x = baseChestRot.x + currentSitFactor * 0.28;
        }
      } else if (currentSitFactor <= 0.005 && targetSit === 0.0) {
        if (hipsBone && baseHipsPos.lengthSq() > 0) hipsBone.position.copy(baseHipsPos);
        if (backLegBone && baseBackLegRot) backLegBone.rotation.copy(baseBackLegRot);
        if (rBackLegBone && baseRBackLegRot) rBackLegBone.rotation.copy(baseRBackLegRot);
        if (backLeg0Bone && baseBackLeg0Rot) backLeg0Bone.rotation.copy(baseBackLeg0Rot);
        if (rBackLeg0Bone && baseRBackLeg0Rot) rBackLeg0Bone.rotation.copy(baseRBackLeg0Rot);
        if (chestBone && baseChestRot) chestBone.rotation.copy(baseChestRot);
      }

      // MICRO-ANIMACIÓN PROCEDURAL DE OLFATEO NOBLE Y TIERNA AL TOCARLO (1.5 segundos)
      const sniffElapsed = elapsed - sniffStartTime;
      if (sniffElapsed >= 0 && sniffElapsed < 1.5) {
        const p = sniffElapsed / 1.5; // 0.0 a 1.0
        // Elevación suave de la cabeza hacia arriba con curiosidad (curva en campana)
        const headLift = Math.sin(p * Math.PI); // 0 -> 1 -> 0
        // Micro-pulsos rítmicos de olfateo en la punta del hocico (3 ciclos rápidos)
        const sniffTwitch = Math.sin(p * Math.PI * 6) * Math.sin(p * Math.PI);

        if (headBone) {
          headBone.rotation.x = baseHeadRot.x - headLift * 0.09;
          headBone.rotation.y = baseHeadRot.y + headLift * 0.025;
        }
        if (headEndBone) {
          headEndBone.rotation.x = baseHeadEndRot.x + sniffTwitch * 0.075;
        }
        // Suave destello de luz celeste en su punto de apoyo
        contactGlowMat.opacity = 0.16 + headLift * 0.38;
        pawGlowLight.intensity = 0.65 + headLift * 1.15;
      } else {
        if (headBone && baseHeadRot) {
          headBone.rotation.copy(baseHeadRot);
        }
        if (headEndBone && baseHeadEndRot) {
          headEndBone.rotation.copy(baseHeadEndRot);
        }
        contactGlowMat.opacity = 0.16;
        pawGlowLight.intensity = 0.65;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      contactGlowGeo.dispose();
      contactGlowMat.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      orbitalRingGeo.dispose();
      orbitalRingMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
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
