uniform sampler2D uSprite;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 sprite = texture2D(uSprite, gl_PointCoord);
  float a = sprite.a * vAlpha;
  if (a < 0.004) discard;
  // additive: premultiply so overlapping particles bloom instead of muddying
  gl_FragColor = vec4(vColor * a, a);
}
