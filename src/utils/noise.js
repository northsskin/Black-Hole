/**
 * Shared GLSL noise, injected into shaders as a template string so the disk,
 * the particles and the post pass all agree on what "turbulence" looks like.
 *
 * `pnoise` is value noise that wraps on its y-axis with an integer period — we
 * feed it (radius, angle) so the accretion disk has no seam at angle = ±π.
 */
export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// periodic on y with period "per" (lattice units)
float pnoise(vec2 p, float per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, per);
  float y1 = mod(i.y + 1.0, per);
  float a = hash21(vec2(i.x, y0));
  float b = hash21(vec2(i.x + 1.0, y0));
  float c = hash21(vec2(i.x, y1));
  float d = hash21(vec2(i.x + 1.0, y1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float pfbm(vec2 p, float per) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * pnoise(p, per);
    p *= 2.0;
    per *= 2.0;
    amp *= 0.5;
  }
  return v;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}
`;
