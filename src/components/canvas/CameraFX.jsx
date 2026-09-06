import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { sim } from '../../utils/sim';
import { asset } from '../../utils/assets';

/**
 * Effects that live in the camera's own frame — the "vehicle" during a time-jump:
 *   Trails — two plasma trails dissipating ahead of us on arrival
 *   Sparks — a shower that falls past the lens on arrival
 * The group is snapped to the camera every frame so everything stays screen-fixed.
 */
export default function CameraFX() {
  const group = useRef();
  const { camera } = useThree();
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={group}>
      <Trails />
      <Sparks />
    </group>
  );
}

const trailVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const trailFrag = /* glsl */ `
uniform float uFade; uniform float uTime;
varying vec2 vUv;
void main(){
  float across = sin(vUv.x * 3.14159);
  float along = pow(1.0 - vUv.y, 1.4);
  float flicker = 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 30.0);
  float a = across * along * flicker * uFade;
  vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(1.0, 1.0, 1.0), pow(across, 3.0) * 0.8) * 3.2;
  gl_FragColor = vec4(col * a, a);
}
`;

function Trails() {
  const left = useRef();
  const right = useRef();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        uniforms: { uFade: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const f = sim.trails;
    const vis = f > 0.005;
    material.uniforms.uFade.value = f;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    for (const ref of [left, right]) {
      if (!ref.current) continue;
      ref.current.visible = vis;
      if (!vis) continue;
      // the trails race away from us and stretch as they fade
      const gone = 1 - f;
      ref.current.position.z = -1.4 - gone * 4.5;
      ref.current.scale.set(1, 1 + gone * 2.2, 1);
    }
  });

  return (
    <group>
      <mesh ref={left} position={[-0.42, -0.4, -1.4]} rotation={[-1.32, 0, 0.12]} material={material} renderOrder={10}>
        <planeGeometry args={[0.12, 2.6]} />
      </mesh>
      <mesh ref={right} position={[0.42, -0.4, -1.4]} rotation={[-1.32, 0, -0.12]} material={material} renderOrder={10}>
        <planeGeometry args={[0.12, 2.6]} />
      </mesh>
    </group>
  );
}

const SPARK_COUNT = 160;

function Sparks() {
  const sprite = useTexture(asset('textures/particle.png'));
  const ref = useRef();
  const data = useMemo(() => {
    const pos = new Float32Array(SPARK_COUNT * 3);
    const vel = new Float32Array(SPARK_COUNT * 3);
    return { pos, vel, armed: true };
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -1.5), 5);
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const s = sim.sparks;
    if (s < 0.01) {
      pts.visible = false;
      data.armed = true;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const { pos, vel } = data;
    if (data.armed) {
      // fresh shower: spawn across the upper half of the frame, falling
      for (let i = 0; i < SPARK_COUNT; i++) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * 1.6;
        pos[i * 3 + 1] = -0.1 + Math.random() * 0.7;
        pos[i * 3 + 2] = -1.3 - Math.random() * 0.8;
        vel[i * 3 + 0] = (Math.random() - 0.5) * 0.5;
        vel[i * 3 + 1] = -0.2 - Math.random() * 0.9;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }
      data.armed = false;
    }
    for (let i = 0; i < SPARK_COUNT; i++) {
      vel[i * 3 + 1] -= 1.4 * dt;
      pos[i * 3 + 0] += vel[i * 3 + 0] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    geometry.attributes.position.needsUpdate = true;
    pts.visible = true;
    pts.material.opacity = s;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} renderOrder={10}>
      <pointsMaterial
        map={sprite}
        color={new THREE.Color(1.4, 1.8, 2.4)}
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
