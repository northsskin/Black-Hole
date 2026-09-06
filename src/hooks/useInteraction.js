import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSceneStore } from '../store/useSceneStore';
import { drone } from '../utils/audio';
import { sim } from '../utils/sim';
import { returnToFall } from '../directors/jump';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll -> normalised progress (0..1 across the whole page) + velocity, but only
 * while we are on the fall. The page is locked (no scrolling) in every other phase.
 */
export function useScrollDriver() {
  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (useSceneStore.getState().phase !== 'fall') return;
        useSceneStore.setState({
          scrollProgress: self.progress,
          scrollVelocity: self.getVelocity(),
          scrollStamp: performance.now(),
        });
      },
    });
    return () => st.kill();
  }, []);

  const phase = useSceneStore((s) => s.phase);
  const prev = useRef(phase);
  useEffect(() => {
    const onFall = phase === 'fall';
    document.body.classList.toggle('is-locked', !onFall);
    if (onFall) {
      if (prev.current === 'intro') window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    }
    prev.current = phase;
    return () => document.body.classList.remove('is-locked');
  }, [phase]);
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
 * Mouse drag orbits the camera (around the singularity on the fall, around the
 * object while parked). Tiny movements still count as clicks on stars.
 */
export function useDragOrbit() {
  useEffect(() => {
    let down = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    const eligible = () => {
      const p = useSceneStore.getState().phase;
      return p === 'fall' || p === 'star';
    };
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest('button, a, input')) return;
      if (!eligible()) return;
      down = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        sim.drag.active = true;
        document.body.style.cursor = 'grabbing';
      }
      sim.drag.az -= dx * 0.0045;
      sim.drag.el = Math.max(-0.7, Math.min(0.7, sim.drag.el + dy * 0.0035));
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (moved) {
        sim.drag.active = false;
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);
}

/** While parked at a star: scrolling, swiping or Escape jumps back to the fall. */
export function useReturnGestures() {
  useEffect(() => {
    let touchY = null;
    const parked = () => useSceneStore.getState().phase === 'star';
    const onWheel = (e) => {
      if (parked() && Math.abs(e.deltaY) > 18) returnToFall();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && parked()) returnToFall();
    };
    const onTouchStart = (e) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (touchY == null || !parked()) return;
      if (Math.abs(e.touches[0].clientY - touchY) > 40) {
        touchY = null;
        returnToFall();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}

/**
 * The loader's "enter" click starts the drone. This keeps it in sync with the
 * mute flag and tab visibility, and covers the auto-enter path (no gesture yet:
 * the first later gesture starts sound if the visitor has not muted).
 */
export function useAudioBoot() {
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const boot = () => {
      const { muted, phase } = useSceneStore.getState();
      if (phase === 'loading' || phase === 'ready') return; // the loader handles the first gesture
      events.forEach((ev) => window.removeEventListener(ev, boot));
      if (!muted && !drone.started) drone.start();
      useSceneStore.setState({ audioStarted: true });
    };
    events.forEach((ev) => window.addEventListener(ev, boot, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, boot));
  }, []);

  const muted = useSceneStore((s) => s.muted);
  useEffect(() => {
    if (drone.started) drone.setMuted(muted);
  }, [muted]);

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
