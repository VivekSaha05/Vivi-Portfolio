/**
 * Project cover plane: on hover the image ripples around the cursor and its
 * colour channels split apart along the direction away from it.
 */
export const projectVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const projectFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uCover;   // uv scale that makes the image cover the plane
uniform vec2 uMouse;   // cursor in plane uv space
uniform float uHover;  // 0 → 1
uniform float uTime;

varying vec2 vUv;

void main() {
  // Cover-fit, with a slight push-in while hovered.
  vec2 uv = (vUv - 0.5) * uCover * (1.0 - 0.045 * uHover) + 0.5;

  float dist = distance(vUv, uMouse);
  float near = smoothstep(0.55, 0.0, dist);

  float wave =
    sin(vUv.y * 18.0 + uTime * 2.2) * 0.006 +
    sin(vUv.x * 14.0 - uTime * 1.7) * 0.004;
  float ripple = sin(dist * 34.0 - uTime * 5.0) * 0.012 * near;
  vec2 warp = vec2(wave + ripple, (wave + ripple) * 0.8) * uHover;

  vec2 dir = normalize(vUv - uMouse + 0.0001);
  vec2 shift = dir * (0.004 + 0.022 * near) * uHover;

  float r = texture2D(uTexture, uv + warp + shift).r;
  float g = texture2D(uTexture, uv + warp).g;
  float b = texture2D(uTexture, uv + warp - shift).b;

  // The texture is sampled as-is (already sRGB), so no output conversion.
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;
