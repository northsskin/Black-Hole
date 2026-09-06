/**
 * Tiny shared simulation clock, mutated in place from useFrame.
 * The disk owns `spin`; particles and the HUD read it. Keeping it outside React
 * means zero re-renders and no subscription overhead at 60fps.
 */
export const sim = {
  spin: 0, // accumulated disk rotation (radians-ish)
  boost: 0, // current scroll-speed boost, decays toward 0
  fov: 62, // eased camera fov (intro dolly)
};
