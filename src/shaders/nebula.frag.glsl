// Soft gas cloud on a billboard: layered fbm with a round falloff.
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
uniform float uSeed;

varying vec2 vUv;

#include <noise>

void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float falloff = 1.0 - smoothstep(0.35, 1.0, r);

  vec2 q = vUv * 3.0 + uSeed;
  float n = fbm(q + uTime * 0.01);
  float n2 = fbm(q * 2.3 - uTime * 0.007 + 5.0);
  float cloud = smoothstep(0.35, 0.85, n * 0.7 + n2 * 0.45);

  vec3 col = mix(uColorA, uColorB, n2);
  float a = cloud * falloff * uAlpha;
  gl_FragColor = vec4(col * a, a);
}
