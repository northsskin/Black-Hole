// Gravitational lensing as a screen-space pass.
//
// We treat the singularity as a (softened) point-mass thin lens. For a pixel at
// angular distance r from the centre we look up the source at
//
//     beta = r - thetaE^2 * r / (r^2 + eps^2)
//
// which is the classic lens equation beta = theta - thetaE^2 / theta with a
// small softening term so the core never divides by zero. Anything that maps
// inside the horizon sphere is black (the mesh is black), so the shadow comes
// out ~1.6x larger than the geometric sphere — exactly as it should — and the
// far side of the accretion disk gets folded up over the top and under the
// bottom. A per-channel thetaE gives chromatic dispersion that grows toward the
// edge, and a tiny rotation of the sample direction fakes frame dragging.
uniform vec2 uCenter;     // screen-space position of the singularity (uv)
uniform float uRadius;    // screen-space radius of the horizon (fraction of viewport height)
uniform float uStrength;  // thetaE^2 as a multiple of uRadius^2
uniform float uEdge;      // solved radius of the shadow edge (same units as uRadius)
uniform float uSoft;      // softening radius as a multiple of uRadius
uniform float uAberration;
uniform float uSwirl;
uniform float uRing;

vec2 lensSample(vec2 p, float r, float k) {
  float rs = uRadius;
  float eps = rs * uSoft;
  float e2 = rs * rs * uStrength * k;
  float denom = r * r + eps * eps;
  float beta = r - e2 * r / denom;

  float twist = uSwirl * e2 / denom;
  float c = cos(twist);
  float s = sin(twist);
  vec2 dir = p / max(r, 1e-5);
  dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
  return dir * beta;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 asp = vec2(aspect, 1.0);
  vec2 p = (uv - uCenter) * asp;
  float r = length(p);
  float rs = uRadius;

  float proximity = 1.0 - smoothstep(rs * 1.0, rs * 7.0, r);
  float ab = uAberration * proximity;

  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float k = 1.0 + ab * (float(i) - 1.0);
    vec2 q = lensSample(p, r, k);
    vec2 suv = clamp(uCenter + q / asp, vec2(0.0), vec2(1.0));
    col[i] = texture2D(inputBuffer, suv)[i];
  }

  // photon ring hugging the shadow edge
  float w = max(rs * 0.016, 0.0009);
  float dEdge = r - uEdge;
  float ringCore = exp(-(dEdge * dEdge) / (w * w));
  float ringHalo = exp(-(dEdge * dEdge) / (w * w * 30.0)) * 0.16;
  col += vec3(0.66, 0.82, 1.0) * (ringCore * 1.1 + ringHalo) * uRing;

  // clean shadow: everything inside the solved edge is the hole
  col *= smoothstep(uEdge - w * 0.8, uEdge + w * 0.15, r);

  outputColor = vec4(col, inputColor.a);
}
