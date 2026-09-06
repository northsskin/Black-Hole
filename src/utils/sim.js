import * as THREE from 'three';

/**
 * Shared per-frame simulation state, mutated in place from useFrame and by GSAP
 * timelines (the "directors"). Keeping it outside React means zero re-renders at
 * 60fps; React only sees coarse phase changes through the zustand store.
 */
export const makePose = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, u: 0 });

export const sim = {
  spin: 0, // accumulated disk rotation
  boost: 0, // scroll-speed boost, decays toward 0
  fov: 62, // eased camera fov

  // formation / opening
  form: 1, // 0..1 horizon + disk + captured matter (0 = nothing there yet)
  intro: 1, // 0..1 arrival flight progress
  pulse: 0, // 0..1 lensing shockwave progress (0 = inactive)

  // post-processing "time travel" effects
  warp: 0, // radial streaks
  flash: 0, // white-out
  frost: 0, // icy edges after arrival
  charge: 0, // electric arcs around the frame
  trails: 0, // plasma trails ahead after arrival
  sparks: 0, // falling sparks after arrival
  velocity: 0, // HUD readout during charge (0..88)
  warpTarget: new THREE.Vector3(), // what the streaks converge on

  // pointer drag orbit offsets (radians)
  drag: { az: 0, el: 0, active: false },

  // camera director
  cam: {
    mode: 'hold', // hold | intro | fall | jump | star
    t: 0, // 0..1 interpolation for the jump charge-up
    from: makePose(),
    to: makePose(),
    current: makePose(), // where the camera actually is this frame
    orbit: 0, // slow azimuth drift while parked at a star
    snapProgress: false, // fall mode: adopt the scroll position without easing on the next frame
  },
};

// handy in devtools alongside window.__scene
if (typeof window !== 'undefined') window.__sim = sim;
