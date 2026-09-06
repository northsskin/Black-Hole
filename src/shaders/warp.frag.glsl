// "Time travel" pass: radial speed streaks toward the singularity / destination,
// an electric rim while charging, a white-out flash, and icy frost creeping in from
// the frame edges afterwards. Everything is gated on its uniform so an idle frame
// costs one texture read.
uniform vec2 uCenter;
uniform float uWarp;
uniform float uFlash;
uniform float uFrost;
uniform float uCharge;
uniform float uSeed;

float wHash(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x),
    mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  vec2 asp = vec2(aspect, 1.0);
  vec2 pc = (uv - 0.5) * asp;
  float edge = smoothstep(0.3, 0.95, length(pc));

  if (uWarp > 0.001) {
    vec2 dir = uv - uCenter;
    float r = length(dir * asp);
    float amt = uWarp * (0.04 + 0.6 * r);

    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 14; i++) {
      float t = float(i) / 13.0;
      float w = 1.0 - t * 0.55;
      vec2 suv = clamp(uCenter + dir * (1.0 - amt * t), vec2(0.0), vec2(1.0));
      acc += texture2D(inputBuffer, suv).rgb * w;
      wsum += w;
    }
    col = acc / wsum;

    // dispersion grows with speed and distance from centre
    float ab = uWarp * 0.025 * r;
    col.r = mix(col.r, texture2D(inputBuffer, clamp(uCenter + dir * (1.0 - amt * 0.5 + ab), vec2(0.0), vec2(1.0))).r, 0.5);
    col.b = mix(col.b, texture2D(inputBuffer, clamp(uCenter + dir * (1.0 - amt * 0.5 - ab), vec2(0.0), vec2(1.0))).b, 0.5);

    // only what was already bright gets brighter: streaks, not haze
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= 1.0 + uWarp * 0.9 * smoothstep(0.05, 0.6, lum);
  }

  if (uCharge > 0.001) {
    // electric rim: the frame edge crackles blue, flickering faster as the charge builds
    float flick = 0.55 + 0.45 * wNoise(vec2(time * (18.0 + 30.0 * uCharge), uv.y * 6.0 + uv.x * 3.0));
    float rim = pow(edge, 2.2) * uCharge * flick;
    col += vec3(0.35, 0.6, 1.2) * rim * (0.25 + 0.55 * uCharge);
  }

  if (uFrost > 0.001) {
    // frost only in the corners and edges, like a windshield after a cold jump
    vec2 q = uv * asp * 44.0 + uSeed;
    float n = wNoise(q) * 0.5 + wNoise(q * 2.3 + 3.1) * 0.3 + wNoise(q * 6.1 + 9.2) * 0.2;
    float crystals = pow(1.0 - abs(n * 2.0 - 1.0), 10.0);
    // a rim that reaches a little further in at the peak, then retreats to the corners
    float band = smoothstep(0.78 - 0.22 * uFrost, 1.15, length(pc));
    float frost = uFrost * band * (0.3 + 0.7 * n);
    vec3 ice = vec3(0.74, 0.86, 1.0);
    col = col * (1.0 - frost * 0.35) + ice * frost * (0.08 + 0.2 * n);
    col += ice * crystals * frost * 0.7;
  }

  // HDR white-out, tone-mapped later so it blooms and clips cleanly
  col = mix(col, vec3(1.6), uFlash);

  outputColor = vec4(col, inputColor.a);
}
