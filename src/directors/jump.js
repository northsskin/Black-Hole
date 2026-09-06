import gsap from 'gsap';
import * as THREE from 'three';
import { sim, makePose } from '../utils/sim';
import { useSceneStore } from '../store/useSceneStore';
import { drone } from '../utils/audio';
import { arrivalPose, pathPose, copyPose, ORIGIN } from '../utils/poses';
import { getStar } from '../stars';

const dest = makePose();
const dir = new THREE.Vector3();
let current = null;

/** Jump to a distant object. Works from the fall or from another object. */
export function jumpToStar(id) {
  const s = useSceneStore.getState();
  if (s.phase !== 'fall' && s.phase !== 'star') return;
  if (s.activeStar === id) return;
  const star = getStar(id);
  if (!star) return;
  arrivalPose(star, dest);
  beginJump(dest, star.position, () => {
    useSceneStore.setState({ activeStar: id, phase: 'star', hoverStar: null });
    sim.cam.orbit = 0;
    sim.drag.az = 0;
    sim.drag.el = 0;
    sim.cam.mode = 'star';
  });
}

/** Back to wherever the scroll left us on the fall path. */
export function returnToFall() {
  const s = useSceneStore.getState();
  if (s.phase !== 'star') return;
  pathPose(s.scrollProgress, dest);
  beginJump(dest, ORIGIN, () => {
    useSceneStore.setState({ activeStar: null, phase: 'fall', hoverStar: null });
    sim.drag.az = 0;
    sim.drag.el = 0;
    sim.cam.mode = 'fall';
    sim.cam.snapProgress = true;
  });
}

/**
 * The time-jump. Charge-up: arcs crawl around the frame, the velocity readout
 * climbs, we surge toward the target with streaks and a widening lens. At the
 * flash we are simply *there*; trails race ahead, sparks fall, frost creeps in
 * from the edges and melts.
 */
function beginJump(to, target, onArrive) {
  const s = useSceneStore.getState();
  if (current) current.kill();
  useSceneStore.setState({ phase: 'jump', hoverStar: null });
  document.body.style.cursor = '';

  const c = sim.cam;
  copyPose(c.from, c.current);
  sim.warpTarget.copy(target);

  // the charge-up carries us a little way toward the target, lens opening wide
  dir.copy(to.pos).sub(c.from.pos);
  const dist = dir.length();
  dir.normalize();
  c.to.pos.copy(c.from.pos).addScaledVector(dir, Math.min(dist * 0.1, 9));
  c.to.look.copy(target);
  c.to.fov = 86;
  c.t = 0;
  c.mode = 'jump';

  const arrive = () => {
    onArrive();
    sim.charge = 0;
    sim.velocity = 0;
    sim.warpTarget.copy(to.look);
  };

  const tl = gsap.timeline({ onComplete: () => (current = null) });
  current = tl;

  if (s.reducedMotion) {
    tl.to(sim, { flash: 0.7, duration: 0.35, ease: 'power2.in' }, 0);
    tl.add(arrive, 0.35);
    tl.to(sim, { flash: 0, duration: 0.6, ease: 'power2.out' }, 0.4);
    return;
  }

  const CHARGE = 1.15;
  tl.add(() => drone.whine(CHARGE), 0);
  tl.to(sim, { charge: 1, duration: CHARGE, ease: 'power2.in' }, 0);
  tl.to(sim, { velocity: 88, duration: CHARGE, ease: 'power3.in' }, 0);
  tl.to(c, { t: 1, duration: CHARGE, ease: 'power3.in' }, 0);
  tl.to(sim, { warp: 1, duration: CHARGE - 0.15, ease: 'power3.in' }, 0.15);
  tl.to(sim, { flash: 1, duration: 0.12, ease: 'power2.in' }, CHARGE - 0.1);
  tl.add(() => {
    drone.boom();
    arrive();
    sim.trails = 1;
    sim.sparks = 1;
    sim.frost = 1;
  }, CHARGE + 0.02);
  tl.to(sim, { flash: 0, duration: 0.6, ease: 'power2.out' }, CHARGE + 0.05);
  tl.to(sim, { warp: 0, duration: 0.7, ease: 'power3.out' }, CHARGE + 0.05);
  tl.to(sim, { trails: 0, duration: 1.1, ease: 'power2.out' }, CHARGE + 0.2);
  tl.to(sim, { sparks: 0, duration: 1.7, ease: 'power1.out' }, CHARGE + 0.15);
  tl.to(sim, { frost: 0, duration: 2.6, ease: 'power2.inOut' }, CHARGE + 0.4);
}
