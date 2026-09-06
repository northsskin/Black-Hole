import { create } from 'zustand';
import { detectCapabilities } from '../utils/deviceTier';

const caps = detectCapabilities();

/**
 * Global scene state.
 *
 * Per-frame values (scrollProgress, scrollVelocity, mouse, distance) are written
 * with `useSceneStore.setState` and READ inside `useFrame` via `getState()` so
 * that nothing re-renders sixty times a second. Only UI-level flags
 * (loaded / entered / muted) are consumed through React selectors.
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
  loaded: false, // three.js assets resolved
  postfxReady: false, // lazy post-processing chunk mounted
  entered: false, // loader has finished converging
  muted: (() => {
    try {
      return window.localStorage.getItem('singularity:muted') === '1';
    } catch {
      return false;
    }
  })(),
  audioStarted: false,

  setScrollProgress: (p) => set({ scrollProgress: p }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setLoaded: (v) => set({ loaded: v }),
  setEntered: (v) => set({ entered: v }),
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
