// Event horizon: pure black with a cold Fresnel rim. The lensing pass will stretch
// this rim into the bright photon-ring edge of the shadow, so keep it thin.
uniform float uTime;
uniform float uRim;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
  float fresnel = pow(1.0 - facing, 5.0);

  // a very slow shimmer so the rim never reads as a static outline
  float shimmer = 0.85 + 0.15 * sin(uTime * 1.3 + vNormal.x * 5.0 + vNormal.y * 3.0);

  vec3 rim = vec3(0.55, 0.72, 1.0) * fresnel * uRim * shimmer;
  gl_FragColor = vec4(rim, 1.0);
}
