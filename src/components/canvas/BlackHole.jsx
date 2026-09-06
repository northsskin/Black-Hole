import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../utils/sim';

export const HORIZON_RADIUS = 1.0;
export const DISK_INNER = 1.55;
export const DISK_OUTER = 6.2;
const JET_LENGTH = 9;

export default function BlackHole() {
  const tier = useSceneStore((s) => s.tier);
  const horizonRef = useRef();
  const horizonMat = useRef();
  const jetTop = useRef();
  const jetBottom = useRef();

  const horizonUniforms = useMemo(() => ({ uTime: { value: 0 }, uRim: { value: 1.1 } }), []);

  // the disk is a small stack of sheets; the middle one carries most of the light
  const layers = useMemo(() => (tier === 'low' ? [-1, 0, 1] : [-1, -0.5, 0, 0.5, 1]), [tier]);
  const diskMaterials = useMemo(
    () =>
      layers.map(
        (layer) =>
          new THREE.ShaderMaterial({
            vertexShader: shaders.accretionDiskVert,
            fragmentShader: shaders.accretionDiskFrag,
            uniforms: {
              uTime: { value: 0 },
              uSpin: { value: 0 },
              uInner: { value: DISK_INNER },
              uOuter: { value: DISK_OUTER },
              uIntensity: { value: 0.55 * (layers.length === 3 ? 1.25 : 1) },
              uLayer: { value: layer },
              uForm: { value: 1 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false,
          })
      ),
    [layers]
  );
  useEffect(() => () => diskMaterials.forEach((m) => m.dispose()), [diskMaterials]);

  const jetUniforms = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: tier === 'low' ? 0.26 : 0.34 } }), [tier]);

  useFrame((state, delta) => {
    const s = useSceneStore.getState();
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // scroll speed briefly spins the disk up; the boost decays on its own
    const fresh = performance.now() - s.scrollStamp < 140;
    const target = fresh ? Math.min(Math.abs(s.scrollVelocity) / 1400, 3.0) : 0;
    sim.boost = THREE.MathUtils.lerp(sim.boost, target, 1 - Math.exp(-dt * 4.5));

    const motion = s.reducedMotion ? 0.12 : 1.0;
    // during formation the young disk spins up fast
    const forming = sim.form < 1 ? 1.5 + (1 - sim.form) * 4 : 1;
    sim.spin += dt * (0.55 + sim.boost) * motion * forming;

    const form = THREE.MathUtils.clamp(sim.form, 0, 1);

    if (horizonMat.current) horizonMat.current.uniforms.uTime.value = t;
    if (horizonRef.current) {
      // grows in with a little overshoot
      const grow = form < 1 ? form * (1 + 0.18 * Math.sin(form * Math.PI)) : 1;
      const sc = Math.max(grow, 0.0005);
      horizonRef.current.scale.setScalar(sc);
    }

    for (const m of diskMaterials) {
      m.uniforms.uTime.value = t * motion;
      m.uniforms.uSpin.value = sim.spin;
      m.uniforms.uForm.value = form;
    }

    jetUniforms.uTime.value = t * motion;
    const jetScale = Math.max(smoothstep(0.35, 1, form), 0.0005);
    if (jetTop.current) jetTop.current.scale.set(1, jetScale, 1);
    if (jetBottom.current) jetBottom.current.scale.set(1, jetScale, 1);
  });

  return (
    <group>
      {/* event horizon */}
      <mesh ref={horizonRef} renderOrder={0}>
        <sphereGeometry args={[HORIZON_RADIUS, 96, 96]} />
        <shaderMaterial
          ref={horizonMat}
          vertexShader={shaders.blackHoleVert}
          fragmentShader={shaders.blackHoleFrag}
          uniforms={horizonUniforms}
          toneMapped={false}
        />
      </mesh>

      {/* accretion disk — stacked sheets in the XZ plane, additive HDR */}
      {diskMaterials.map((material, i) => (
        <mesh key={layers[i]} rotation-x={-Math.PI / 2} renderOrder={1} material={material}>
          <ringGeometry args={[DISK_INNER, DISK_OUTER, 256, 12]} />
        </mesh>
      ))}

      {/* polar jets: open cylinders, narrow at the horizon, scaled in along the axis */}
      <mesh ref={jetTop} position={[0, 0, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.38, 0.05, JET_LENGTH, 28, 1, true]} />
        <shaderMaterial
          vertexShader={shaders.jetsVert}
          fragmentShader={shaders.jetsFrag}
          uniforms={jetUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={jetBottom} rotation-z={Math.PI} renderOrder={1}>
        <cylinderGeometry args={[0.38, 0.05, JET_LENGTH, 28, 1, true]} />
        <shaderMaterial
          vertexShader={shaders.jetsVert}
          fragmentShader={shaders.jetsFrag}
          uniforms={jetUniforms}
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

function smoothstep(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
