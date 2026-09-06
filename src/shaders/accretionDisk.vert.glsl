varying vec3 vWorldPos;
varying vec2 vLocal;

void main() {
  // RingGeometry lives in its local XY plane; we keep those coords for polar math
  vLocal = position.xy;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
