import * as THREE from 'three';
import { createCameraCurve } from './curve';
import { makePose } from './sim';

export const TARGET_FOV = 50;
export const PACING = 1.65;
export const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

export const cameraCurve = createCameraCurve();

/** Camera pose on the fall path for a scroll progress 0..1. */
export function pathPose(progress, out = makePose()) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  // the spline is arc-length parameterised and most of its length is far away,
  // so bias the mapping: the closer we get, the more scroll each metre costs
  const u = 1 - Math.pow(1 - p, PACING);
  cameraCurve.getPointAt(u, out.pos);
  out.look.copy(ORIGIN);
  out.fov = TARGET_FOV;
  out.u = u;
  return out;
}

const tmpToOrigin = new THREE.Vector3();
const tmpSide = new THREE.Vector3();

/**
 * Where the camera parks when it arrives at a distant object: off to one side and
 * slightly behind it (relative to the singularity), so the black hole hangs in the
 * background as a distant point of light.
 */
export function arrivalPose(star, out = makePose()) {
  const d = star.view;
  tmpToOrigin.copy(star.position).negate().normalize();
  tmpSide.crossVectors(tmpToOrigin, UP);
  if (tmpSide.lengthSq() < 1e-4) tmpSide.set(1, 0, 0);
  tmpSide.normalize();
  out.pos
    .copy(star.position)
    .addScaledVector(tmpSide, d * 0.8)
    .addScaledVector(tmpToOrigin, -d * 0.5)
    .addScaledVector(UP, d * 0.22);
  out.look.copy(star.position).addScaledVector(tmpToOrigin, d * 0.12);
  out.fov = TARGET_FOV;
  return out;
}

/** Pose for the very start of the warp arrival: far out along the opening view. */
export function introPose(out = makePose()) {
  const start = pathPose(0);
  out.pos.copy(start.pos).normalize().multiplyScalar(90);
  out.pos.x += 6;
  out.pos.y += 3;
  out.look.copy(ORIGIN);
  out.fov = 100;
  return out;
}

export function copyPose(dst, src) {
  dst.pos.copy(src.pos);
  dst.look.copy(src.look);
  dst.fov = src.fov;
  return dst;
}

export function lerpPose(out, a, b, t) {
  out.pos.lerpVectors(a.pos, b.pos, t);
  out.look.lerpVectors(a.look, b.look, t);
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}
