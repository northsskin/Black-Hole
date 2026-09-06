import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { sim } from '../../utils/sim';

const WISPS = [
  { dir: [0.7, 0.25, 0.65], size: 210, a: '#4a3aa8', b: '#2a7fb8', alpha: 0.11, seed: 1.3 },
  { dir: [-0.8, 0.1, 0.55], size: 170, a: '#3b2f8f', b: '#6a3aa0', alpha: 0.09, seed: 4.7 },
  { dir: [0.1, -0.45, -0.88], size: 240, a: '#243a8a', b: '#2a8aa8', alpha: 0.08, seed: 8.1 },
  { dir: [-0.4, 0.75, -0.5], size: 150, a: '#5a2f9f', b: '#2f5fbf', alpha: 0.1, seed: 12.9 },
];
const DISTANCE = 330;

/** Faint gas far out: gives the sky depth without competing with the disk. */
export default function Nebulae() {
  const items = useMemo(
    () =>
      WISPS.map((w) => ({
        position: new THREE.Vector3(...w.dir).normalize().multiplyScalar(DISTANCE),
        size: w.size,
        material: new THREE.ShaderMaterial({
          vertexShader: shaders.billboardVert,
          fragmentShader: shaders.nebulaFrag,
          uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color(w.a) },
            uColorB: { value: new THREE.Color(w.b) },
            uAlpha: { value: w.alpha },
            uSeed: { value: w.seed },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (const it of items) it.material.uniforms.uTime.value = t;
    // the sky arrives with the warp
    const a = THREE.MathUtils.clamp(sim.intro, 0, 1);
    items.forEach((it, i) => {
      it.material.uniforms.uAlpha.value = WISPS[i].alpha * a;
    });
  });

  return (
    <group renderOrder={-1}>
      {items.map((it, i) => (
        <Billboard key={i} position={it.position}>
          <mesh material={it.material}>
            <planeGeometry args={[it.size, it.size]} />
          </mesh>
        </Billboard>
      ))}
    </group>
  );
}
