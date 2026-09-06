import { forwardRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { shaders } from '../../shaders';
import { sim } from '../../utils/sim';

class WarpEffectImpl extends Effect {
  constructor() {
    super('WarpEffect', shaders.warpFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uWarp', new THREE.Uniform(0)],
        ['uFlash', new THREE.Uniform(0)],
        ['uFrost', new THREE.Uniform(0)],
        ['uCharge', new THREE.Uniform(0)],
        ['uSeed', new THREE.Uniform(0)],
      ]),
    });
  }
}

/** Streaks converge on whatever we are travelling toward (sim.warpTarget). */
const Warp = forwardRef(function Warp(_, ref) {
  const effect = useMemo(() => new WarpEffectImpl(), []);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const u = effect.uniforms;
    tmp.copy(sim.warpTarget).project(camera);
    const behind = tmp.z > 1 || Number.isNaN(tmp.x);
    if (behind) u.get('uCenter').value.set(0.5, 0.5);
    else
      u.get('uCenter').value.set(
        THREE.MathUtils.clamp(tmp.x * 0.5 + 0.5, -0.5, 1.5),
        THREE.MathUtils.clamp(tmp.y * 0.5 + 0.5, -0.5, 1.5)
      );
    u.get('uWarp').value = sim.warp;
    u.get('uFlash').value = sim.flash;
    u.get('uFrost').value = sim.frost;
    u.get('uCharge').value = sim.charge;
    if (sim.frost > 0.999) u.get('uSeed').value = Math.random() * 100;
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default Warp;
