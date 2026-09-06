import { forwardRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { HORIZON_RADIUS } from './BlackHole';

class LensingEffectImpl extends Effect {
  constructor() {
    super('LensingEffect', shaders.lensingFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uRadius', new THREE.Uniform(0.04)],
        ['uStrength', new THREE.Uniform(1.0)],
        ['uEdge', new THREE.Uniform(0.06)],
        ['uSoft', new THREE.Uniform(0.5)],
        ['uAberration', new THREE.Uniform(0.03)],
        ['uSwirl', new THREE.Uniform(0.28)],
        ['uRing', new THREE.Uniform(1.0)],
      ]),
    });
  }
}

/** Solve x - s*x/(x^2 + e^2) = 1 for x (the shadow edge in horizon radii). */
function solveShadowEdge(s, e) {
  let x = 1 + Math.sqrt(s);
  for (let i = 0; i < 8; i++) {
    const denom = x * x + e * e;
    const f = x - (s * x) / denom - 1;
    const df = 1 - (s * (e * e - x * x)) / (denom * denom);
    const step = f / (Math.abs(df) > 1e-6 ? df : 1e-6);
    x -= step;
    if (Math.abs(step) < 1e-6) break;
  }
  return Math.max(x, 1);
}

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const Lensing = forwardRef(function Lensing({ strength = 1.0, soft = 0.5 }, ref) {
  const effect = useMemo(() => new LensingEffectImpl(), []);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const u = effect.uniforms;

    // where the singularity sits on screen
    tmp.set(0, 0, 0).project(camera);
    u.get('uCenter').value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);

    // apparent size of the horizon (as a fraction of viewport height)
    const d = camera.position.length();
    const ang = Math.asin(Math.min(HORIZON_RADIUS / Math.max(d, HORIZON_RADIUS + 1e-3), 0.9995));
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const radius = Math.tan(ang) / (2 * halfH);

    // let the bending relax as we fall in, otherwise the shadow eats the frame too early
    const s = strength * (0.06 + 0.94 * smoothstep(1.3, 4.8, d));

    u.get('uRadius').value = radius;
    u.get('uStrength').value = s;
    u.get('uSoft').value = soft;
    u.get('uEdge').value = radius * solveShadowEdge(s, soft);
    u.get('uAberration').value = 0.012 + 0.028 * (1 - smoothstep(2, 14, d));
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default Lensing;
