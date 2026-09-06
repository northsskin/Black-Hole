// Film grain from a real scanned-noise texture, jittered every frame.
// Stronger in the darks (like film), almost gone in the highlights.
uniform sampler2D uGrain;
uniform float uAmount;
uniform vec2 uOffset;
uniform vec2 uScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 guv = uv * uScale + uOffset;
  float g = texture2D(uGrain, guv).r - 0.5;
  float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  // pure black (the shadow) stays pure black; grain rides on whatever light there is
  float amount = uAmount * smoothstep(0.0, 0.03, lum) * (1.0 - smoothstep(0.0, 1.2, lum) * 0.7);
  outputColor = vec4(inputColor.rgb + g * amount, inputColor.a);
}
