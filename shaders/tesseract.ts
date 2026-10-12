/**
 * Vertices of the tesseract: soft round points whose size and brightness
 * follow their depth in the fourth dimension (`aDepth`, 0 far → 1 near).
 */
export const vertexPointVertex = /* glsl */ `
uniform float uSize;
uniform float uPixelRatio;

attribute float aDepth;

varying float vDepth;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * mix(0.55, 1.25, aDepth) * uPixelRatio / -mv.z;
  vDepth = aDepth;
}
`;

export const vertexPointFragment = /* glsl */ `
uniform vec3 uNear;
uniform vec3 uFar;
uniform float uGlow; // 1 on dark (halo adds light), 0 on light (solid dot)

varying float vDepth;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.22, 0.12, d);
  float halo = smoothstep(0.5, 0.0, d) * 0.45 * uGlow;
  float alpha = clamp(core + halo, 0.0, 1.0);
  vec3 color = mix(uFar, uNear, vDepth);
  gl_FragColor = vec4(color, alpha * mix(0.55, 1.0, vDepth));
  #include <colorspace_fragment>
}
`;
