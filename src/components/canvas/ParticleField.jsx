import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../utils/sim';

const STAR_SHARE = 0.5;

export default function ParticleField({ count = 8000 }) {
  const sprite = useTexture('/textures/particle.png');
  const { gl, camera } = useThree();
  const pointsRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3); // real positions are computed on the GPU
    const seeds = new Float32Array(count * 4);
    const types = new Float32Array(count);
    const starCount = Math.floor(count * STAR_SHARE);
    for (let i = 0; i < count; i++) {
      seeds[i * 4 + 0] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
      types[i] = i < starCount ? 0 : 1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shaders.particlesVert,
        fragmentShader: shaders.particlesFrag,
        uniforms: {
          uTime: { value: 0 },
          uSpin: { value: 0 },
          uMotion: { value: 1 },
          uMouse: { value: new THREE.Vector3(0, 0, 0) },
          uMouseStrength: { value: 0 },
          uPixelRatio: { value: 1 },
          uSizeScale: { value: 1 },
          uSprite: { value: sprite },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [sprite]
  );

  useEffect(() => () => material.dispose(), [material]);

  const scratch = useMemo(
    () => ({ ndc: new THREE.Vector3(), dir: new THREE.Vector3(), target: new THREE.Vector3(), smoothMouse: new THREE.Vector2() }),
    []
  );

  useFrame((state, delta) => {
    const s = useSceneStore.getState();
    const u = material.uniforms;
    const dt = Math.min(delta, 0.05);

    u.uTime.value = state.clock.elapsedTime;
    u.uSpin.value = sim.spin;
    u.uMotion.value = s.reducedMotion ? 0 : 1;
    u.uPixelRatio.value = gl.getPixelRatio();

    // pointer -> a point in world space at the singularity's depth
    const sm = scratch.smoothMouse;
    sm.x += (s.mouse.x - sm.x) * (1 - Math.exp(-dt * 6));
    sm.y += (s.mouse.y - sm.y) * (1 - Math.exp(-dt * 6));
    scratch.ndc.set(sm.x, sm.y, 0.5).unproject(camera);
    scratch.dir.copy(scratch.ndc).sub(camera.position).normalize();
    const depth = camera.position.length();
    scratch.target.copy(camera.position).addScaledVector(scratch.dir, depth);
    u.uMouse.value.lerp(scratch.target, 1 - Math.exp(-dt * 5));

    const wantStrength = s.reducedMotion ? 0 : 1;
    u.uMouseStrength.value += (wantStrength - u.uMouseStrength.value) * (1 - Math.exp(-dt * 2));
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
