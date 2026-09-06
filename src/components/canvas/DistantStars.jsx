import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { stars } from '../../stars';
import { useSceneStore } from '../../store/useSceneStore';
import { asset } from '../../utils/assets';
import { jumpToStar } from '../../directors/jump';
import { drone } from '../../utils/audio';

/**
 * The company the singularity keeps: ten real objects on a shell far outside the
 * disk. Each is a glowing sprite with a hover label and a generous invisible hit
 * sphere; a few kinds get a small live rendering (a pulsar's beams, a binary's
 * orbit, a nebula's gas, a galaxy's arms) that only reads once you jump there.
 */
export default function DistantStars() {
  const sprite = useTexture(asset('textures/particle.png'));
  return (
    <group>
      {stars.map((star) => (
        <DistantObject key={star.id} star={star} sprite={sprite} />
      ))}
    </group>
  );
}

function DistantObject({ star, sprite }) {
  const groupRef = useRef();
  const hovered = useSceneStore((s) => s.hoverStar === star.id);
  const active = useSceneStore((s) => s.activeStar === star.id);
  const phase = useSceneStore((s) => s.phase);
  const interactive = phase === 'fall' || phase === 'star';

  const onOver = (e) => {
    e.stopPropagation();
    if (!interactive) return;
    useSceneStore.setState({ hoverStar: star.id });
    document.body.style.cursor = 'pointer';
    drone.ping(1100 + Math.random() * 400);
  };
  const onOut = () => {
    if (useSceneStore.getState().hoverStar === star.id) useSceneStore.setState({ hoverStar: null });
    document.body.style.cursor = '';
  };
  const onClick = (e) => {
    e.stopPropagation();
    if (!interactive) return;
    jumpToStar(star.id);
  };

  return (
    <group ref={groupRef} position={star.position}>
      <Glow star={star} sprite={sprite} hovered={hovered} />
      {star.kind === 'pulsar' && <Pulsar star={star} sprite={sprite} />}
      {star.kind === 'binary' && <Binary star={star} sprite={sprite} />}
      {star.kind === 'nebula' && <NebulaCloud star={star} />}
      {star.kind === 'galaxy' && <Galaxy star={star} />}

      {/* hit sphere: never drawn, always pickable */}
      <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <sphereGeometry args={[Math.max(star.size * 1.6, 10), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {hovered && !active && (
        <Html center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="hud whitespace-nowrap text-center" style={{ transform: 'translateY(-2.6em)' }}>
            <div className="text-ice">{star.name}</div>
            <div className="text-dim">{star.distance}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Glow({ star, sprite, hovered }) {
  const glowRef = useRef();
  const coreRef = useRef();
  const color = useMemo(() => new THREE.Color(star.color), [star.color]);
  const s = star.kind === 'galaxy' || star.kind === 'nebula' ? star.size * 0.55 : star.size;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tw = 0.9 + 0.1 * Math.sin(t * 2.3 + star.ly);
    const pulse = star.kind === 'pulsar' ? 0.55 + 0.45 * Math.abs(Math.cos(t * 3.0)) : 1;
    const h = hovered ? 1.35 : 1;
    if (glowRef.current) glowRef.current.scale.setScalar(s * tw * pulse * h);
    if (coreRef.current) coreRef.current.material.opacity = 0.8 * pulse;
  });

  return (
    <>
      <sprite ref={glowRef} scale={[s, s, 1]}>
        <spriteMaterial map={sprite} color={color} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={coreRef} scale={[s * 0.32, s * 0.32, 1]}>
        <spriteMaterial map={sprite} color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </>
  );
}

function Pulsar({ star }) {
  const spin = useRef();
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += Math.min(dt, 0.05) * 3.0;
  });
  return (
    <group rotation={[0.6, 0, 0.35]}>
      <group ref={spin}>
        {[1, -1].map((dir) => (
          <mesh key={dir} position={[0, dir * 8, 0]} rotation-x={dir > 0 ? Math.PI : 0}>
            <coneGeometry args={[0.9, 16, 20, 1, true]} />
            <meshBasicMaterial color="#9fd8ff" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Binary({ star, sprite }) {
  const a = useRef();
  const b = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.9;
    const r = 2.2;
    if (a.current) a.current.position.set(Math.cos(t) * r, 0, Math.sin(t) * r * 0.6);
    if (b.current) b.current.position.set(-Math.cos(t) * r * 0.7, 0, -Math.sin(t) * r * 0.42);
  });
  return (
    <group rotation={[0.4, 0, 0.2]}>
      <sprite ref={a} scale={[3.2, 3.2, 1]}>
        <spriteMaterial map={sprite} color="#ffd6a0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={b} scale={[2.2, 2.2, 1]}>
        <spriteMaterial map={sprite} color="#9cc4ff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

function NebulaCloud({ star }) {
  const mats = useMemo(
    () =>
      [
        { size: 18, a: '#3556c8', b: '#7fb6ff', alpha: 0.35, seed: 2.2, off: [0, 0, 0] },
        { size: 13, a: '#6a3fbf', b: '#3d8fd8', alpha: 0.32, seed: 6.4, off: [4, 2.5, -1] },
        { size: 11, a: '#2f7fd0', b: '#c8dcff', alpha: 0.28, seed: 9.9, off: [-4.5, -2, 1] },
      ].map((w) => ({
        ...w,
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
    for (const m of mats) m.material.uniforms.uTime.value = state.clock.elapsedTime * 3;
  });
  return (
    <group>
      {mats.map((m, i) => (
        <Billboard key={i} position={m.off}>
          <mesh material={m.material}>
            <planeGeometry args={[m.size, m.size]} />
          </mesh>
        </Billboard>
      ))}
    </group>
  );
}

function Galaxy({ star }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shaders.billboardVert,
        fragmentShader: shaders.galaxyFrag,
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0.9 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );
  const ref = useRef();
  useFrame((state, dt) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.z += Math.min(dt, 0.05) * 0.01;
  });
  return (
    <mesh ref={ref} rotation={[-1.05, 0.35, 0]} material={material}>
      <planeGeometry args={[star.size * 1.6, star.size * 1.6]} />
    </mesh>
  );
}
