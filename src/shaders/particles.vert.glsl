// Two populations share one draw call:
//   aType 0 -> distant stars on a shell (static, twinkling)
//   aType 1 -> infalling matter (orbits, spirals inward, respawns)
// Every position is computed here from a per-particle seed, so the CPU never touches
// the buffer after creation.
attribute vec4 aSeed;
attribute float aType;

uniform float uTime;
uniform float uSpin;
uniform float uMotion;
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform float uPixelRatio;
uniform float uSizeScale;

varying float vAlpha;
varying vec3 vColor;

#define TAU 6.28318530718

void main() {
  vec3 pos;
  float size;
  vec3 col;
  float alpha;

  if (aType < 0.5) {
    float rad = mix(60.0, 170.0, aSeed.x);
    float theta = aSeed.y * TAU;
    float phi = acos(2.0 * aSeed.z - 1.0);
    pos = rad * vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));

    float tw = 0.75 + 0.25 * sin(uTime * (0.5 + aSeed.w * 1.6) + aSeed.y * 40.0) * uMotion;
    size = (0.5 + aSeed.w * aSeed.w * 1.8) * tw;
    col = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.94, 0.86), step(0.82, aSeed.w));
    alpha = (0.35 + 0.45 * tw) * (0.4 + 0.6 * aSeed.w);
  } else {
    float r0 = mix(1.7, 10.5, pow(aSeed.x, 1.35));
    float rate = 0.010 + 0.018 * aSeed.w;
    float life = fract(uSpin * rate + aSeed.y * 7.0);
    // falls slowly at first, then plunges
    float r = mix(r0, 1.02, pow(life, 2.7));
    float omega = 1.0 / pow(r, 1.5);
    float phi = aSeed.y * TAU + uSpin * omega;
    float thickness = 0.22 * r * (0.25 + 0.75 * (1.0 - life));
    float h = (aSeed.z - 0.5) * thickness;
    pos = vec3(r * cos(phi), h, -r * sin(phi));

    float heat = 1.0 - clamp((r - 1.0) / 9.5, 0.0, 1.0);
    col = mix(vec3(0.40, 0.30, 0.95), vec3(0.62, 0.80, 1.0), heat);
    col = mix(col, vec3(0.95, 0.97, 1.0), pow(heat, 5.0));
    size = (0.45 + aSeed.w * 1.0) * (0.6 + heat * 1.1);
    alpha = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.92, 1.0, life)) * (0.18 + 0.5 * heat);
  }

  // the visitor's pointer is a soft gravitational disturbance: push + swirl
  vec3 d = pos - uMouse;
  float dist2 = dot(d, d);
  float field = exp(-dist2 / 2.4) * uMouseStrength;
  vec3 nd = normalize(d + vec3(1e-4));
  vec3 swirl = cross(nd, vec3(0.0, 1.0, 0.0));
  pos += (nd * 0.8 + swirl * 0.7) * field;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depth = max(-mvPosition.z, 0.5);
  float ps = size * uSizeScale * uPixelRatio * (52.0 / depth);
  gl_PointSize = clamp(ps, 1.0, 16.0);

  // matter that drifts right past the lens would become a giant blob: fade it out
  alpha *= smoothstep(0.6, 3.0, depth);

  vAlpha = alpha;
  vColor = col;
}
