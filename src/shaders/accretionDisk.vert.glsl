// The disk is drawn several times with different uLayer values (-1..1). Each
// layer is lifted off the plane by an amount that grows with radius, so the
// stack reads as a puffy, slightly turbulent volume instead of a paper-thin ring.
uniform float uLayer;
uniform float uSpin;
uniform float uInner;
uniform float uOuter;

varying vec3 vWorldPos;
varying vec2 vLocal;

void main() {
  vLocal = position.xy;
  float r = length(position.xy);
  float radial = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float ang = atan(position.y, position.x);

  // gentle corrugation so the layers never read as flat sheets
  float wobble = 0.5 + 0.5 * sin(ang * 3.0 + r * 1.7 - uSpin * 0.35);
  float lift = uLayer * (0.035 + 0.12 * radial) * (0.7 + 0.6 * wobble);

  // local z becomes world y after the ring is rotated into the XZ plane
  vec3 p = vec3(position.xy, position.z + lift);
  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
