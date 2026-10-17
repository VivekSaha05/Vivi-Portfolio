/**
 * Particle portrait.
 *
 * Face particles know their place in the photo (`position`), a scattered
 * origin (`aScatter`), the sampled luminance (`aLum`, already contrast-curved
 * on the CPU) and how far they sit from the face centre (`aEdge`, 0 → 1): the
 * further out, the more they are thrown off their spot and faded, so the
 * portrait has no hard outline. Ambient particles (`aAmbient` = 1) never
 * settle: they orbit the head, outside the face, so they never veil it.
 *
 * Luminance drives everything that makes the face readable:
 *   bright → large, near-white, full alpha
 *   mid    → medium, violet
 *   dark   → small and dim, so eye sockets, beard and hair read as shadow
 * Point size is `uSize * mix(0.4, 1.3, ink) * uPixelRatio` in screen pixels.
 * There is no distance attenuation and nothing time- or scroll-dependent in
 * it, so the portrait can never swell.
 *
 * The canvas spans the whole section, so nothing clips the particles: a soft
 * elliptical mask around the face (`uMaskCentre`, `uMaskRadius`, plane units)
 * dissolves the halo in every direction, and a thin guard near the canvas
 * edges makes sure no particle ever ends on a straight line.
 *
 * Hover: inside a small radius around the cursor, particles swirl gently
 * around it (a tangential, noise-modulated drift of ~10px at most) and
 * twinkle, brightening and tinting toward violet. Everything is weighted by a
 * smoothstep falloff, so the face stays readable under the cursor.
 *
 * `uTheme` (0 dark → 1 light) changes how luminance becomes ink:
 *   dark  — bright particles, drawn additively, lit areas glow
 *   light — luminance inverted: dark charcoal/violet particles, drawn with
 *           normal blending (additive light is invisible on a pale page)
 * The fragment shader outputs premultiplied colour and scales alpha by the
 * theme, so one blend function covers both modes and the switch can fade.
 */

export const portraitVertex = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uSize;
uniform float uPixelRatio;
uniform float uTheme;
uniform vec2 uMouse;      // cursor on the portrait plane
uniform float uRadius;    // hover radius, plane units
uniform float uMaxShift;  // largest hover displacement, plane units
uniform float uHover;     // 0 → 1, eased in while the cursor is over the portrait
uniform vec2 uMaskCentre; // face centre, plane units
uniform vec2 uMaskRadius; // where the halo has fully dissolved, plane units

attribute vec3 aScatter;
attribute float aLum;
attribute float aAlpha;
attribute float aSeed;
attribute float aEdge;
attribute float aAmbient;

varying float vInk;
varying float vAlpha;
varying float vGlow;

void main() {
  // Every particle leaves on its own beat so the face condenses, not snaps.
  float local = clamp((uProgress - aSeed * 0.45) / 0.55, 0.0, 1.0);
  float p = local * local * (3.0 - 2.0 * local);

  // Face target, pushed outward and jittered more the nearer the rim it is.
  vec3 target = position;
  vec2 outward = normalize(position.xy + 0.0001);
  float loose = aEdge * aEdge;
  target.xy += outward * loose * (0.35 + aSeed * 1.2);
  target.xy += loose * 0.35 * vec2(sin(aSeed * 91.0 + uTime * 0.35), cos(aSeed * 57.0 + uTime * 0.3));
  target.xy += 0.003 * vec2(sin(uTime * 0.8 + aSeed * 40.0), cos(uTime * 0.7 + aSeed * 31.0));

  // Ambient target: a slow orbit around the head that closes in as the
  // portrait forms. Its inner radius stays outside the face, so the dust
  // frames the portrait instead of veiling it.
  float angle = aSeed * 6.2831 + uTime * (0.05 + aScatter.z * 0.02) * sign(aScatter.x);
  float radius = mix(3.0, 1.15, p) + aAlpha * 1.4;
  vec3 orbit = vec3(cos(angle) * radius * 0.9, 0.4 + sin(angle) * radius * 0.85, 0.0);
  target = mix(target, orbit, aAmbient);

  vec3 chaos = vec3(aScatter.xy, 0.0);
  chaos.xy += 0.22 * vec2(sin(uTime * 0.3 + aSeed * 20.0), cos(uTime * 0.25 + aSeed * 17.0));

  // Everything lives on one plane: depth would only change how big things look.
  vec3 pos = mix(chaos, target, p);
  // A swirl that peaks mid-flight.
  float swirl = p * (1.0 - p) * 4.0;
  pos.xy += swirl * 0.28 * vec2(sin(aSeed * 50.0 + uTime), cos(aSeed * 43.0 + uTime));

  // Hover: a small, soft swirl around the cursor.
  vec2 toward = pos.xy - uMouse;
  float dist = length(toward);
  float near = smoothstep(uRadius, uRadius * 0.15, dist) * uHover * p;
  vec2 tangent = vec2(-toward.y, toward.x) / max(dist, 0.0001);
  // Curl-like: the tangential drift breathes per particle, plus a little noise.
  float flow = 0.65 + 0.35 * sin(uTime * 1.6 + aSeed * 23.0);
  vec2 jitter = vec2(sin(uTime * 2.3 + aSeed * 61.0), cos(uTime * 2.1 + aSeed * 47.0));
  pos.xy += (tangent * flow * 0.75 + jitter * 0.25) * uMaxShift * near;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  // Luminance → ink. Light theme inverts it, so shadows carry the image.
  float ink = mix(aLum, 1.0 - aLum, uTheme);
  ink = mix(ink, 0.45, aAmbient);
  // Fixed screen size, no attenuation; bright ink is big, shadow ink small.
  gl_PointSize = uSize * mix(mix(0.4, 1.3, ink), 0.6, aAmbient) * uPixelRatio;

  // The halo fades harder than it thins, and ambient dust stays faint, so the
  // face reads clearly against them (on dark, overlapping points add up).
  float fade = mix(1.0 - loose * 0.95, 0.22, aAmbient);
  // Shadows recede: dim on dark, gone on paper (the faint end would smudge).
  float shade = mix(
    mix(0.3, 1.0, smoothstep(0.0, 0.45, ink)),
    smoothstep(0.08, 0.6, ink),
    uTheme
  );
  shade = mix(shade, 1.0, aAmbient);

  // Radial dissolve around the face: no straight edge in any direction.
  float mask = smoothstep(1.0, 0.6, length((pos.xy - uMaskCentre) / uMaskRadius));
  // Guard band at the canvas edges, should the halo ever reach them.
  vec2 ndc = abs(gl_Position.xy / gl_Position.w);
  mask *= smoothstep(1.0, 0.86, ndc.x) * smoothstep(1.0, 0.86, ndc.y);

  vInk = ink;
  // Twinkle: each particle under the cursor flickers on its own phase.
  vGlow = near * (0.55 + 0.45 * sin(uTime * 7.0 + aSeed * 113.0));
  vAlpha = aAlpha * fade * shade * mix(0.3, 1.0, p);
  vAlpha = min(1.0, vAlpha + vGlow * 0.2) * mask;
}
`;

export const portraitFragment = /* glsl */ `
uniform float uTheme;
uniform vec3 uDarkLow;
uniform vec3 uDarkHigh;
uniform vec3 uLightLow;
uniform vec3 uLightHigh;
uniform vec3 uMid;
uniform vec3 uViolet;

varying float vInk;
varying float vAlpha;
varying float vGlow;

vec3 ramp(vec3 low, vec3 mid, vec3 high, float t) {
  return t < 0.5 ? mix(low, mid, t * 2.0) : mix(mid, high, (t - 0.5) * 2.0);
}

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.18, d) * vAlpha;

  // Dark: charcoal → violet → warm white. Light: pale violet → violet → charcoal.
  vec3 dark = ramp(uDarkLow, uMid, uDarkHigh, vInk);
  vec3 light = ramp(uLightLow, uMid, uLightHigh, vInk);
  vec3 color = mix(dark, light, uTheme);

  // Hovered particles lean violet and, on dark, brighten.
  color = mix(color, uViolet, vGlow * 0.45);
  color *= 1.0 + vGlow * 0.35 * (1.0 - uTheme);

  // Premultiplied output with blend (ONE, ONE_MINUS_SRC_ALPHA):
  // alpha 0 adds light (dark theme), alpha = coverage lays down ink (light theme).
  gl_FragColor = vec4(color * alpha, alpha * uTheme);
  #include <colorspace_fragment>
}
`;
