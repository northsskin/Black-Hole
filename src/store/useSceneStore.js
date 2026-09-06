import { create } from 'zustand';
import { detectCapabilities } from '../utils/deviceTier';

const caps = detectCapabilities();

/**
 * Global scene state.
 *
 * Per-frame values (scrollProgress, scrollVelocity, mouse, distance) are written
 * with `useSceneStore.setState` and READ inside `useFrame` via `getState()` so
 * that nothing re-renders sixty times a second. Only UI-level state (phase,
 * active star, muted) is consumed through React selectors.
 *
 * phase: loading -> ready (click to enter) -> intro (warp arrival) -> fall
 *        fall <-> jump <-> star (parked at a distant object)
 */
export const useSceneStore = create((set) => ({
  // capabilities (fixed for the session)
  tier: caps.tier,
  reducedMotion: caps.reducedMotion,
  webgl: caps.webgl,
  particleCount: caps.particleCount,
  dpr: caps.dpr,

  // per-frame signals
  scrollProgress: 0,
  scrollVelocity: 0,
  scrollStamp: 0,
  mouse: { x: 0, y: 0 }, // normalised -1..1, y up
  distance: 26, // camera distance to the singularity (in horizon radii)

  // lifecycle
  phase: 'loading',
  postfxReady: false, // lazy post-processing chunk mounted
  entered: false, // true once the intro has handed over to the fall (HUD/scroll live)
  activeStar: null, // id of the object we are parked at
  hoverStar: null,
  muted: (() => {
    try {
      return window.localStorage.getItem('singularity:muted') === '1';
    } catch {
      return false;
    }
  })(),
  audioStarted: false,

  setPhase: (phase) => set({ phase }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setMuted: (v) => {
    try {
      window.localStorage.setItem('singularity:muted', v ? '1' : '0');
    } catch {
      /* private mode etc. */
    }
    set({ muted: v });
  },
}));

// handy in devtools: window.__scene.getState()
if (typeof window !== 'undefined') window.__scene = useSceneStore;
