import gsap from 'gsap';
import { sim } from '../utils/sim';
import { useSceneStore } from '../store/useSceneStore';
import { drone } from '../utils/audio';
import { introPose, pathPose, copyPose, ORIGIN } from '../utils/poses';

/**
 * Park the camera far outside with nothing formed yet. Called as soon as the
 * loader mounts so the first rendered frame is already the "before" state.
 */
export function primeIntro() {
  const s = useSceneStore.getState();
  if (s.reducedMotion) return; // no warp arrival: the scene simply appears
  sim.form = 0;
  sim.intro = 0;
  sim.pulse = 0;
  sim.warpTarget.copy(ORIGIN);
  copyPose(sim.cam.from, introPose());
  pathPose(0, sim.cam.to);
  sim.cam.mode = 'intro';
}

/**
 * The arrival. Timeline (seconds):
 *   0.0  loader ring is collapsing; the drone comes up
 *   0.4  stars begin to streak, we accelerate in from far away
 *   1.15 white-out at peak speed
 *   1.5  the horizon grows in, the disk ignites from the inner edge outward,
 *        loose matter is captured into orbit
 *   2.9  a shockwave of distortion rolls across the frame
 *   3.4  HUD and title assemble; scrolling unlocks
 *   4.1  camera hands over to the scroll path
 */
export function startIntro({ withSound = true } = {}) {
  const store = useSceneStore;
  const s = store.getState();
  if (s.phase !== 'ready') return null;
  store.setState({ phase: 'intro' });

  if (withSound && !s.muted && !drone.started) {
    drone.start();
    store.setState({ audioStarted: true });
  }

  if (s.reducedMotion) {
    sim.form = 1;
    sim.intro = 1;
    sim.cam.mode = 'fall';
    sim.cam.snapProgress = true;
    store.setState({ phase: 'fall', entered: true });
    return null;
  }

  // the flight is short and fast; the formation happens once we are close enough to see it
  const tl = gsap.timeline();
  tl.add(() => drone.swell(4.5), 0.3);
  tl.to(
    sim,
    {
      intro: 1,
      duration: 2.3,
      ease: 'power3.inOut',
      onComplete: () => {
        sim.cam.mode = 'fall';
        sim.cam.snapProgress = true;
      },
    },
    0.4
  );
  tl.to(sim, { warp: 1, duration: 0.8, ease: 'power2.in' }, 0.4);
  tl.to(sim, { warp: 0, duration: 1.4, ease: 'power3.out' }, 1.35);
  tl.to(sim, { flash: 0.9, duration: 0.16, ease: 'power2.in' }, 1.15);
  tl.to(sim, { flash: 0, duration: 0.7, ease: 'power2.out' }, 1.32);
  tl.to(sim, { form: 1, duration: 3.0, ease: 'power2.inOut' }, 1.7);
  tl.to(sim, { pulse: 1, duration: 1.8, ease: 'power1.out' }, 3.3);
  tl.set(sim, { pulse: 0 }, 5.15);
  tl.add(() => store.setState({ phase: 'fall', entered: true }), 3.9);
  return tl;
}
