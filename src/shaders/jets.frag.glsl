// Relativistic polar jet: a faint, flowing column of plasma leaving along the spin
// axis. Drawn on an open cylinder; the centre of the column is brightest.
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

#include <noise>

void main() {
  // uv.y runs along the jet (0 at the horizon), uv.x wraps around it
  float h = vUv.y;
  float flow = pfbm(vec2(h * 7.0 - uTime * 1.1, vUv.x * 4.0), 4.0);
  float knots = pnoise(vec2(h * 22.0 - uTime * 2.6, vUv.x * 6.0), 6.0);

  float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
  float core = pow(facing, 1.6);

  float a = core * (0.35 + 0.9 * flow + 0.3 * knots);
  a *= pow(1.0 - h, 1.7) * smoothstep(0.0, 0.06, h);
  a *= uIntensity;

  vec3 col = mix(vec3(0.55, 0.72, 1.0), vec3(0.55, 0.38, 1.0), h);
  gl_FragColor = vec4(col * a, a);
}
