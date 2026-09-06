import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSceneStore } from '../store/useSceneStore';
import { drone } from '../utils/audio';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll -> normalised progress (0..1 across the whole page) + velocity.
 * One ScrollTrigger drives the store; the HUD builds its own scrubbed timeline
 * on the same range so both stay in lockstep.
 */
export function useScrollDriver() {
  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        useSceneStore.setState({
          scrollProgress: self.progress,
          scrollVelocity: self.getVelocity(),
          scrollStamp: performance.now(),
        });
      },
    });
    return () => st.kill();
  }, []);

  // once the loader hands over, unlock the page and re-measure
  const entered = useSceneStore((s) => s.entered);
  useEffect(() => {
    document.body.classList.toggle('is-locked', !entered);
    if (entered) {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    }
    return () => document.body.classList.remove('is-locked');
  }, [entered]);
}

/** Pointer position, normalised to -1..1 with y up. */
export function usePointer() {
  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      useSceneStore.setState({ mouse: { x, y } });
    };
    const onLeave = () => useSceneStore.setState({ mouse: { x: 0, y: 0 } });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
}

/**
 * Browser autoplay policy: sound may only start after a user gesture.
 * We listen once for the first click / key / wheel / touch and start the drone
 * then (unless the visitor muted it on a previous visit).
 */
export function useAudioBoot() {
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const boot = () => {
      events.forEach((ev) => window.removeEventListener(ev, boot));
      const { muted } = useSceneStore.getState();
      if (!muted) {
        drone.start();
      }
      useSceneStore.setState({ audioStarted: true });
    };
    events.forEach((ev) => window.addEventListener(ev, boot, { passive: true, once: false }));
    return () => events.forEach((ev) => window.removeEventListener(ev, boot));
  }, []);

  // keep the drone in sync with the mute flag
  const muted = useSceneStore((s) => s.muted);
  useEffect(() => {
    if (drone.started) drone.setMuted(muted);
  }, [muted]);

  // pause when the tab is hidden, resume when it is back
  useEffect(() => {
    const onVis = () => {
      if (!drone.started) return;
      if (document.hidden) drone.fadeTo(0.0001, 0.4);
      else if (!useSceneStore.getState().muted) drone.fadeTo(drone.targetGain, 2);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
}
