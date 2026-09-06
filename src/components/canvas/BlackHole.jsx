import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../utils/sim';

export const HORIZON_RADIUS = 1.0;
export const DISK_INNER = 1.55;
export const DISK_OUTER = 6.2;

export default function BlackHole() {
  const horizonMat = useRef();
  const diskMat = useRef();

  const horizonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRim: { value: 1.1 },
    }),
    []
  );

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpin: { value: 0 },
      uInner: { value: DISK_INNER },
      uOuter: { value: DISK_OUTER },
      uIntensity: { value: 0.55 },
    }),
    []
  );

  useFrame((state, delta) => {
    const s = useSceneStore.getState();
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // scroll speed briefly spins the disk up; the boost decays on its own
    const fresh = performance.now() - s.scrollStamp < 140;
    const target = fresh ? Math.min(Math.abs(s.scrollVelocity) / 1400, 3.0) : 0;
    sim.boost = THREE.MathUtils.lerp(sim.boost, target, 1 - Math.exp(-dt * 4.5));

    const motion = s.reducedMotion ? 0.12 : 1.0;
    sim.spin += dt * (0.55 + sim.boost) * motion;

    if (horizonMat.current) horizonMat.current.uniforms.uTime.value = t;
    if (diskMat.current) {
      diskMat.current.uniforms.uTime.value = t * motion;
      diskMat.current.uniforms.uSpin.value = sim.spin;
    }
  });

  return (
    <group>
      {/* event horizon */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[HORIZON_RADIUS, 96, 96]} />
        <shaderMaterial
          ref={horizonMat}
          vertexShader={shaders.blackHoleVert}
          fragmentShader={shaders.blackHoleFrag}
          uniforms={horizonUniforms}
          toneMapped={false}
        />
      </mesh>

      {/* accretion disk — a flat ring in the XZ plane, additive HDR */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={1}>
        <ringGeometry args={[DISK_INNER, DISK_OUTER, 256, 12]} />
        <shaderMaterial
          ref={diskMat}
          vertexShader={shaders.accretionDiskVert}
          fragmentShader={shaders.accretionDiskFrag}
          uniforms={diskUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
