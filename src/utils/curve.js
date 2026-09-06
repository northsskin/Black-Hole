import * as THREE from 'three';

/**
 * The camera's journey. Units are event-horizon radii (the horizon sphere is r = 1,
 * the accretion disk spans roughly r = 1.55 .. 6).
 *
 * Far and high above the plane -> a wide swing that brings us below the disk so we
 * see it lensed over the shadow -> back up through the plane -> a close spiral ->
 * falling in. The last point sits inside the photon-sphere-ish region so the shadow
 * swallows the frame right as the closing chapter appears.
 */
export const CAMERA_POINTS = [
  new THREE.Vector3(0.0, 5.0, 26.0),
  new THREE.Vector3(9.0, 3.2, 17.0),
  new THREE.Vector3(9.5, -1.6, 9.0),
  new THREE.Vector3(2.0, -2.2, 6.4),
  new THREE.Vector3(-4.2, 1.4, 5.0),
  new THREE.Vector3(-3.4, 2.0, 2.6),
  new THREE.Vector3(-1.3, 0.55, 1.9),
  new THREE.Vector3(0.0, 0.18, 1.6),
];

export function createCameraCurve() {
  const curve = new THREE.CatmullRomCurve3(CAMERA_POINTS, false, 'centripetal', 0.5);
  curve.arcLengthDivisions = 600;
  return curve;
}

/** Vantage used when the visitor prefers reduced motion (no camera travel). */
export const STATIC_VANTAGE = new THREE.Vector3(4.6, 1.8, 9.2);
