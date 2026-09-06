// A spiral galaxy seen on a tilted disk: two logarithmic arms, a bright core,
// dust lanes from noise.
uniform float uTime;
uniform float uAlpha;

varying vec2 vUv;

#include <noise>

#define TAU 6.28318530718

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float ang = atan(p.y, p.x);

  float phase = ang * 2.0 - log(r + 0.04) * 5.5 + uTime * 0.01;
  float arms = pow(0.5 + 0.5 * cos(phase), 1.8) * 1.4;
  float dust = fbm(vec2(r * 7.0, ang / TAU * 7.0 + r * 2.0) + 3.0);
  arms *= 0.3 + 1.1 * dust;
  // knots of star formation along the arms
  float knots = pow(fbm(vec2(r * 14.0, ang / TAU * 14.0) + 7.0), 3.0) * 2.0;

  float core = exp(-r * r * 40.0) * 1.1;
  float bulge = exp(-r * r * 9.0) * 0.3;
  float diskFall = exp(-r * 2.0) * (1.0 - smoothstep(0.7, 1.0, r));

  float a = ((arms + knots * arms) * diskFall + bulge + core) * uAlpha;
  vec3 col = mix(vec3(0.5, 0.68, 1.0), vec3(0.95, 0.9, 0.82), clamp(core + bulge * 0.8, 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}
