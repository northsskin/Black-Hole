// Accretion disk: superheated gas in differential (Keplerian) rotation.
// Rendered additively in HDR so the bloom pass can pick up the white-hot inner edge.
uniform float uTime;
uniform float uSpin;
uniform float uInner;
uniform float uOuter;
uniform float uIntensity;
uniform float uLayer;   // -1..1, which sheet of the volume this is
uniform float uForm;    // 0..1 formation: the disk ignites from the inner edge outward

varying vec3 vWorldPos;
varying vec2 vLocal;

#include <noise>

#define TAU 6.28318530718

void main() {
  float r = length(vLocal);
  float radial = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float angle = atan(vLocal.y, vLocal.x);

  // inner material orbits faster: omega ~ r^-1.5
  float omega = 1.0 / pow(r, 1.5);
  float a = angle - uSpin * omega;
  float turns = a / TAU + uLayer * 0.09; // shift the pattern per layer

  // long filaments (coarse in angle, fine in radius) sheared by the rotation
  float n1 = pfbm(vec2(r * 2.4 + uLayer * 1.7, turns * 8.0), 8.0);
  // slow, large-scale turbulence that evolves in time
  float n2 = pfbm(vec2(r * 1.2 + uTime * 0.035, turns * 5.0 + uTime * 0.008), 5.0);
  // fine streaks
  float n3 = pnoise(vec2(r * 18.0, turns * 11.0), 11.0);

  float density = n1 * 0.6 + n2 * 0.4 + n3 * 0.14;
  density = smoothstep(0.28, 0.9, density);
  density = mix(density, 1.0, 0.12);

  // radial profile: soft inner lip, long violet tail
  float innerEdge = smoothstep(0.0, 0.05, radial);
  float outerEdge = 1.0 - smoothstep(0.40, 1.0, radial);
  float profile = innerEdge * outerEdge / (0.45 + radial * 2.4);

  // temperature ramp — white-hot to ice-blue to violet, never warm
  vec3 hot = vec3(0.92, 0.97, 1.0) * 1.7;
  vec3 mid = vec3(0.42, 0.68, 1.0) * 1.2;
  vec3 cool = vec3(0.38, 0.22, 0.95) * 0.95;
  vec3 col = mix(hot, mid, smoothstep(0.0, 0.22, radial));
  col = mix(col, cool, smoothstep(0.22, 1.0, radial));

  // relativistic beaming: the side coming toward us is brighter and bluer
  vec3 tangent = normalize(vec3(vWorldPos.z, 0.0, -vWorldPos.x));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float doppler = dot(tangent, viewDir);
  float beaming = 1.0 + 0.8 * doppler;
  col *= max(beaming, 0.25);
  col = mix(col, col * vec3(0.78, 0.88, 1.2), clamp(doppler, 0.0, 1.0) * 0.6);
  // receding side: dimmer and deeper violet (never warm)
  col = mix(col, col * vec3(0.62, 0.58, 1.05), clamp(-doppler, 0.0, 1.0) * 0.6);

  // the volume: the middle sheet carries most of the light
  float layerWeight = 1.0 - 0.6 * abs(uLayer);

  // formation: an ignition front sweeps outward from the inner edge
  float front = uForm * 1.3;
  float formed = smoothstep(front, front - 0.2, radial);
  float ignite = exp(-pow((radial - front) * 9.0, 2.0)) * (1.0 - uForm) * 3.0;
  col *= 1.0 + ignite;
  col = mix(col, vec3(0.85, 0.92, 1.0) * 2.5, clamp(ignite * 0.4, 0.0, 1.0));

  float alpha = density * profile * layerWeight * formed;
  gl_FragColor = vec4(col * alpha * uIntensity, alpha);
}
