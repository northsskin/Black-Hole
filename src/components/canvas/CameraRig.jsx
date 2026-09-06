import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createCameraCurve, STATIC_VANTAGE } from '../../utils/curve';
import { useSceneStore } from '../../store/useSceneStore';
import { sim } from '../../utils/sim';

const TARGET_FOV = 50;
const PACING = 1.65;

export default function CameraRig() {
  const { camera } = useThree();
  const curve = useMemo(() => createCameraCurve(), []);
  const s = useRef({
    progress: 0,
    pos: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    look: new THREE.Vector3(),
    mouse: new THREE.Vector2(),
    frame: 0,
  });

  useFrame((state, delta) => {
    const store = useSceneStore.getState();
    const r = s.current;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // smooth pointer
    r.mouse.x += (store.mouse.x - r.mouse.x) * (1 - Math.exp(-dt * 4));
    r.mouse.y += (store.mouse.y - r.mouse.y) * (1 - Math.exp(-dt * 4));

    if (store.reducedMotion) {
      // static-but-beautiful: one fixed vantage, no travel, no drift
      camera.position.copy(STATIC_VANTAGE);
      camera.lookAt(0, 0, 0);
    } else {
      // eased follow of the scroll position along the spline
      r.progress += (store.scrollProgress - r.progress) * (1 - Math.exp(-dt * 3.4));
      // the spline is arc-length parameterised and most of its length is far away,
      // so bias the mapping: the closer we get, the more scroll each metre costs
      const p = THREE.MathUtils.clamp(r.progress, 0, 1);
      const u = 1 - Math.pow(1 - p, PACING);
      curve.getPointAt(u, r.pos);

      const d = r.pos.length();
      const parallax = Math.min(d * 0.028, 0.7);

      camera.position.copy(r.pos);
      camera.lookAt(0, 0, 0);

      // sideways drift + pointer parallax, applied in the camera's own frame
      r.offset.set(
        r.mouse.x * parallax + Math.sin(t * 0.11) * parallax * 0.35,
        r.mouse.y * parallax * 0.6 + Math.cos(t * 0.16) * parallax * 0.22,
        0
      );
      r.offset.applyQuaternion(camera.quaternion);
      camera.position.add(r.offset);

      // look a touch past the pointer so the hole slides against the stars
      r.look.set(-r.mouse.x * parallax * 0.35, -r.mouse.y * parallax * 0.25, 0).applyQuaternion(camera.quaternion);
      camera.lookAt(r.look);
    }

    // intro dolly: fov eases from wide to normal once the loader hands over
    const wantFov = store.entered ? TARGET_FOV : 62;
    sim.fov += (wantFov - sim.fov) * (1 - Math.exp(-dt * 1.4));
    if (Math.abs(camera.fov - sim.fov) > 0.01) {
      camera.fov = sim.fov;
      camera.updateProjectionMatrix();
    }

    // throttled HUD readout
    if ((r.frame++ & 3) === 0) {
      const dist = camera.position.length();
      if (Math.abs(dist - store.distance) > 0.004) useSceneStore.setState({ distance: dist });
    }
  });

  return null;
}
