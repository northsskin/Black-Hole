/**
 * A deliberately simple device-tier heuristic. We never try to be exact —
 * the goal is to keep the piece smooth on a laptop iGPU and not melt phones.
 */
export function detectCapabilities() {
  if (typeof window === 'undefined') {
    return { tier: 'high', reducedMotion: false, webgl: true, particleCount: 16000, dpr: [1, 2] };
  }

  const reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 1;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (touch && window.innerWidth < 1024);

  let tier = 'high';
  if (mobile || cores <= 4 || memory <= 4) tier = 'low';
  else if (cores <= 8 || memory <= 8) tier = 'mid';

  const budget = {
    low: { particleCount: 3500, dpr: [1, 1.25] },
    mid: { particleCount: 9000, dpr: [1, 1.5] },
    high: { particleCount: 16000, dpr: [1, 1.75] },
  }[tier];

  return {
    tier,
    reducedMotion,
    webgl: hasWebGL(),
    // reduced-motion visitors get a calmer, sparser field
    particleCount: reducedMotion ? Math.round(budget.particleCount * 0.5) : budget.particleCount,
    dpr: budget.dpr,
  };
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}
