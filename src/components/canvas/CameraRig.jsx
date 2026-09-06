import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STATIC_VANTAGE } from '../../utils/curve';
import { useSceneStore } from '../../store/useSceneStore';
import { sim, makePose } from '../../utils/sim';
import { cameraCurve, pathPose, arrivalPose, lerpPose, ORIGIN } from '../../utils/poses';
import { getStar } from '../../stars';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * The one owner of the camera. Modes (sim.cam.mode):
 *   hold  — leave the camera where the last mode put it
 *   intro — warp arrival: lerp from far outside onto the start of the path
 *   fall  — scroll-driven spline, with drag-orbit, banking and a shiver near the horizon
 *   jump  — time-jump charge-up: lerp from the current pose a little toward the target
 *   star  — parked at a distant object, drifting slowly around it
 */
export default function CameraRig() {
  const { camera } = useThree();
  const s = useRef({
    progress: 0,
    pose: makePose(),
    base: makePose(),
    offset: new THREE.Vector3(),
    look: new THREE.Vector3(),
    mouse: new THREE.Vector2(),
    tangent: new THREE.Vector3(),
    tangent2: new THREE.Vector3(),
    cross: new THREE.Vector3(),
    axis: new THREE.Vector3(),
    rel: new THREE.Vector3(),
    bank: 0,
    fov: 62,
    frame: 0,
  });
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const store = useSceneStore.getState();
    const r = s.current;
    const c = sim.cam;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // smooth pointer
    r.mouse.x += (store.mouse.x - r.mouse.x) * (1 - Math.exp(-dt * 4));
    r.mouse.y += (store.mouse.y - r.mouse.y) * (1 - Math.exp(-dt * 4));

    // drag-orbit offsets relax back when released (only on the fall path)
    if (!sim.drag.active && c.mode === 'fall') {
      const k = Math.exp(-dt * 1.1);
      sim.drag.az *= k;
      sim.drag.el *= k;
    }

    let wantBank = 0;
    const pose = r.pose;

    if (store.reducedMotion && c.mode !== 'star' && c.mode !== 'jump') {
      // static-but-beautiful: one fixed vantage, no travel, no drift
      pose.pos.copy(STATIC_VANTAGE);
      pose.look.copy(ORIGIN);
      pose.fov = 50;
    } else if (c.mode === 'intro') {
      lerpPose(pose, c.from, c.to, THREE.MathUtils.clamp(sim.intro, 0, 1));
    } else if (c.mode === 'jump') {
      lerpPose(pose, c.from, c.to, THREE.MathUtils.clamp(c.t, 0, 1));
    } else if (c.mode === 'star') {
      const star = getStar(store.activeStar);
      if (star) {
        arrivalPose(star, r.base);
        c.orbit += dt * 0.045;
        r.rel.copy(r.base.pos).sub(star.position);
        r.rel.applyAxisAngle(UP, c.orbit + sim.drag.az);
        r.axis.crossVectors(UP, r.rel).normalize();
        r.rel.applyAxisAngle(r.axis, THREE.MathUtils.clamp(sim.drag.el, -0.7, 0.7));
        pose.pos.copy(star.position).add(r.rel);
        pose.look.copy(r.base.look);
        pose.fov = r.base.fov;
      }
    } else if (c.mode === 'fall') {
      if (c.snapProgress) {
        r.progress = store.scrollProgress;
        c.snapProgress = false;
      }
      // eased follow of the scroll position along the spline
      r.progress += (store.scrollProgress - r.progress) * (1 - Math.exp(-dt * 3.4));
      pathPose(r.progress, pose);

      // drag-orbit around the singularity
      if (Math.abs(sim.drag.az) > 1e-4 || Math.abs(sim.drag.el) > 1e-4) {
        pose.pos.applyAxisAngle(UP, sim.drag.az);
        r.axis.crossVectors(UP, pose.pos).normalize();
        pose.pos.applyAxisAngle(r.axis, THREE.MathUtils.clamp(sim.drag.el, -0.7, 0.7));
      }

      // bank into turns: compare the path tangent a little ahead
      const u = pose.u;
      cameraCurve.getTangentAt(u, r.tangent);
      cameraCurve.getTangentAt(Math.min(u + 0.012, 1), r.tangent2);
      r.cross.crossVectors(r.tangent, r.tangent2);
      wantBank = THREE.MathUtils.clamp(r.cross.dot(UP) * 26, -0.26, 0.26);
    } else {
      // hold: keep the current camera
      return finish(r, camera, store, dt, t, false);
    }

    // ease the bank so it never snaps
    r.bank += (wantBank - r.bank) * (1 - Math.exp(-dt * 2.2));

    camera.position.copy(pose.pos);
    camera.lookAt(pose.look);

    const d = camera.position.length();
    const free = c.mode === 'fall' || c.mode === 'star';

    if (free && !store.reducedMotion) {
      // sideways drift + pointer parallax, applied in the camera's own frame
      const parallax = c.mode === 'star' ? 0.9 : Math.min(d * 0.028, 0.7);
      r.offset.set(
        r.mouse.x * parallax + Math.sin(t * 0.11) * parallax * 0.35,
        r.mouse.y * parallax * 0.6 + Math.cos(t * 0.16) * parallax * 0.22,
        0
      );
      // a shiver as the horizon closes in
      const shake = 0.028 * (1 - smoothstep(1.4, 7, d));
      if (shake > 0.0005) {
        r.offset.x += (Math.sin(t * 13.7) + Math.sin(t * 7.3) * 0.5) * shake;
        r.offset.y += (Math.cos(t * 11.1) + Math.sin(t * 17.9) * 0.4) * shake;
      }
      r.offset.applyQuaternion(camera.quaternion);
      camera.position.add(r.offset);

      // look a touch past the pointer so the hole slides against the stars
      r.look.set(-r.mouse.x * parallax * 0.35, -r.mouse.y * parallax * 0.25, 0).applyQuaternion(camera.quaternion);
      r.look.add(pose.look);
      camera.lookAt(r.look);
    }

    if (Math.abs(r.bank) > 1e-4) camera.rotateZ(r.bank);

    // fov follows the pose; the intro/jump poses carry their own wide angles
    r.fov += (pose.fov - r.fov) * (1 - Math.exp(-dt * (c.mode === 'jump' ? 12 : 3)));
    if (Math.abs(camera.fov - r.fov) > 0.01) {
      camera.fov = r.fov;
      camera.updateProjectionMatrix();
    }

    finish(r, camera, store, dt, t, true);
  });

  function finish(r, cam, store, dt, t, computed) {
    // record where the camera actually is so a jump can start from here
    const cur = sim.cam.current;
    cur.pos.copy(cam.position);
    if (computed) cur.look.copy(r.look.lengthSq() > 0 ? r.look : r.pose.look);
    cur.fov = cam.fov;
    scratch.copy(cur.look);

    // throttled HUD readout
    if ((r.frame++ & 3) === 0) {
      const dist = cam.position.length();
      if (Math.abs(dist - store.distance) > 0.004) useSceneStore.setState({ distance: dist });
    }
  }

  return null;
}

function smoothstep(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
