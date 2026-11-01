import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type ZoeAnimState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'greeting';

interface ZoeCanvas3DProps {
  state: ZoeAnimState;
  outfit: string;
}

export const ZoeCanvas3D: React.FC<ZoeCanvas3DProps> = ({ state, outfit }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x27dcff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x5091ff, 2.5, 50);
    pointLight.position.set(3, 4, 5);
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0xb85eff, 3, 50);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    // 3. Materials (Holographic / Wireframe / Translucent)
    const holoMaterial = new THREE.MeshStandardMaterial({
      color: 0x27dcff,
      emissive: 0x09526d,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.82,
      wireframe: false,
    });

    const beardMaterial = new THREE.MeshStandardMaterial({
      color: 0xeaf4f7,
      emissive: 0x27dcff,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.88,
      roughness: 0.3,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x5091ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    // 4. Group for Schnauzer Avatar
    const zoeGroup = new THREE.Group();
    scene.add(zoeGroup);

    // Head Base
    const headGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const headMesh = new THREE.Mesh(headGeo, holoMaterial);
    zoeGroup.add(headMesh);

    // Hologram Wireframe Glow Shell
    const shellGeo = new THREE.SphereGeometry(1.06, 16, 16);
    const shellMesh = new THREE.Mesh(shellGeo, glowMaterial);
    zoeGroup.add(shellMesh);

    // Distinctive Schnauzer Snout & Muzzle
    const snoutGeo = new THREE.CylinderGeometry(0.45, 0.65, 1.1, 16);
    snoutGeo.rotateX(Math.PI / 2);
    const snoutMesh = new THREE.Mesh(snoutGeo, beardMaterial);
    snoutMesh.position.set(0, -0.2, 0.85);
    zoeGroup.add(snoutMesh);

    // Signature Beard
    const beardGeo = new THREE.ConeGeometry(0.7, 1.2, 16);
    beardGeo.rotateX(Math.PI / 2 + 0.3);
    const beardMesh = new THREE.Mesh(beardGeo, beardMaterial);
    beardMesh.position.set(0, -0.65, 1.0);
    zoeGroup.add(beardMesh);

    // Nose (Dark Cyan)
    const noseGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x042f3c, roughness: 0.2 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, -0.05, 1.42);
    zoeGroup.add(noseMesh);

    // Schnauzer Eyebrows (Prominent & expressive)
    const browGeo = new THREE.BoxGeometry(0.48, 0.22, 0.3);
    const leftBrow = new THREE.Mesh(browGeo, beardMaterial);
    leftBrow.position.set(-0.45, 0.45, 0.85);
    leftBrow.rotation.z = -0.15;
    const rightBrow = new THREE.Mesh(browGeo, beardMaterial);
    rightBrow.position.set(0.45, 0.45, 0.85);
    rightBrow.rotation.z = 0.15;
    zoeGroup.add(leftBrow);
    zoeGroup.add(rightBrow);

    // Expressive Eyes
    const eyeGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x035e73 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.42, 0.22, 0.82);
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), pupilMat);
    leftPupil.position.set(-0.42, 0.22, 0.94);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.42, 0.22, 0.82);
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), pupilMat);
    rightPupil.position.set(0.42, 0.22, 0.94);

    zoeGroup.add(leftEye, leftPupil, rightEye, rightPupil);

    // Folded Schnauzer Ears
    const earGeo = new THREE.ConeGeometry(0.5, 0.9, 12);
    const leftEar = new THREE.Mesh(earGeo, holoMaterial);
    leftEar.position.set(-0.9, 0.9, -0.1);
    leftEar.rotation.z = 0.4;
    leftEar.rotation.x = 0.2;

    const rightEar = new THREE.Mesh(earGeo, holoMaterial);
    rightEar.position.set(0.9, 0.9, -0.1);
    rightEar.rotation.z = -0.4;
    rightEar.rotation.x = 0.2;

    zoeGroup.add(leftEar, rightEar);

    // Tech Accessory: Smart Collar / Projector Ring
    const ringGeo = new THREE.TorusGeometry(1.15, 0.08, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf29f05, wireframe: false });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -1.0, 0);
    zoeGroup.add(ringMesh);

    // 5. Orbiting Holographic Particles
    const particlesCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 5.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x27dcff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Animation Loop
    let clock = new THREE.Clock();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Idle subtle floating and breathing
      const floatSpeed = state === 'thinking' ? 3.5 : 1.8;
      zoeGroup.position.y = Math.sin(elapsed * floatSpeed) * 0.15;

      // Behavior per state
      if (state === 'idle') {
        zoeGroup.rotation.y = Math.sin(elapsed * 0.8) * 0.15;
        particleSystem.rotation.y = elapsed * 0.15;
      } else if (state === 'listening') {
        zoeGroup.rotation.y = 0.25;
        zoeGroup.rotation.z = -0.08; // Curious head tilt
        leftEar.rotation.x = 0.05;
        rightEar.rotation.x = 0.05;
        particleSystem.rotation.y = elapsed * 0.3;
      } else if (state === 'thinking') {
        zoeGroup.rotation.x = -0.15; // Looks slightly up
        particleSystem.rotation.y = elapsed * 1.2; // Fast orbiting particles
        ringMesh.rotation.z = elapsed * 2.5;
      } else if (state === 'speaking') {
        zoeGroup.rotation.y = Math.sin(elapsed * 4.0) * 0.08;
        beardMesh.position.y = -0.65 + Math.sin(elapsed * 12.0) * 0.04; // Jaw animation
        ringMat.color.setHex(0x27dcff);
      } else if (state === 'greeting') {
        zoeGroup.position.y = Math.abs(Math.sin(elapsed * 5)) * 0.4;
        zoeGroup.rotation.y = Math.sin(elapsed * 6) * 0.25;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [state, outfit]);

  return <div ref={containerRef} className="w-full h-full min-h-[260px] flex items-center justify-center" />;
};
