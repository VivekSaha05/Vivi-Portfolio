/**
 * Particle portrait.
 *
 * Face particles know their place in the photo (`position`), a scattered
 * origin (`aScatter`), the sampled luminance (`aLum`) and how far they sit
 * from the face centre (`aEdge`, 0 → 1): the further out, the more they are
 * thrown off their spot and faded, so the portrait has no hard outline.
 * Ambient particles (`aAmbient` = 1) never settle: they orbit the head and
 * tighten their orbit as the face assembles.
 *
 * `uTheme` (0 dark → 1 light) changes how luminance becomes ink:
 *   dark  — bright particles, drawn additively, lit areas glow
 *   light — luminance inverted: dark charcoal/violet particles, drawn with
 *           normal blending (additive light is invisible on a pale page)
 * The fragment shader outputs premultiplied colour and scales alpha by the
 * theme, so one blend function covers both modes and the switch can fade.
 */
export const TRAIL_LENGTH = 8;

export const portraitVertex = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uSize;
uniform float uPixelRatio;
uniform float uTheme;
uniform vec3 uTrail[${TRAIL_LENGTH}]; // xy = position on the portrait plane, z = strength

attribute vec3 aScatter;
attribute float aLum;
attribute float aAlpha;
attribute float aSeed;
attribute float aEdge;
attribute float aAmbient;

varying float vInk;
varying float vAlpha;

void main() {
  // Every particle leaves on its own beat so the face condenses, not snaps.
  float local = clamp((uProgress - aSeed * 0.45) / 0.55, 0.0, 1.0);
  float p = local * local * (3.0 - 2.0 * local);

  // Face target, pushed outward and jittered more the nearer the rim it is.
  vec3 target = position;
  vec2 outward = normalize(position.xy + 0.0001);
  float loose = aEdge * aEdge;
  target.xy += outward * loose * (0.25 + aSeed * 0.7);
  target.xy += loose * 0.35 * vec2(sin(aSeed * 91.0 + uTime * 0.35), cos(aSeed * 57.0 + uTime * 0.3));
  target.z += (aLum - 0.5) * 0.32;
  target.xy += 0.004 * vec2(sin(uTime * 0.8 + aSeed * 40.0), cos(uTime * 0.7 + aSeed * 31.0));

  // Ambient target: a slow orbit that closes in as the portrait forms.
  float angle = aSeed * 6.2831 + uTime * (0.05 + aScatter.z * 0.02) * sign(aScatter.x);
  float radius = mix(2.9, 1.25, p) + aAlpha * 1.5;
  vec3 orbit = vec3(cos(angle) * radius * 0.82, sin(angle) * radius, aScatter.z * 0.35);
  target = mix(target, orbit, aAmbient);

  vec3 chaos = aScatter;
  chaos.xy += 0.22 * vec2(sin(uTime * 0.3 + aSeed * 20.0), cos(uTime * 0.25 + aSeed * 17.0));

  vec3 pos = mix(chaos, target, p);
  // A swirl that peaks mid-flight.
  float swirl = p * (1.0 - p) * 4.0;
  pos.xy += swirl * 0.28 * vec2(sin(aSeed * 50.0 + uTime), cos(aSeed * 43.0 + uTime));

  // Cursor wake: repel in-plane, lift and ripple toward the camera.
  vec2 push = vec2(0.0);
  float lift = 0.0;
  for (int i = 0; i < ${TRAIL_LENGTH}; i++) {
    vec2 away = pos.xy - uTrail[i].xy;
    float dist = length(away);
    float strength = uTrail[i].z;
    // Small radius, smooth falloff, light touch: a ripple, never a hole in the face.
    float falloff = smoothstep(0.27, 0.0, dist);
    push += normalize(away + 0.0001) * falloff * strength * 0.065;
    lift += falloff * strength * (0.06 + 0.04 * sin(dist * 30.0 - uTime * 6.0));
  }
  pos.xy += push * p;
  pos.z += lift * p;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Luminance → ink. Light theme inverts it, so shadows carry the image.
  float ink = mix(aLum, 1.0 - aLum, uTheme);
  ink = mix(ink, 0.45, aAmbient);
  float size = mix(0.55 + ink * 0.9, 0.7, aAmbient);
  gl_PointSize = uSize * size * mix(1.7, 1.0, p) * uPixelRatio / -mv.z;

  float fade = mix(1.0 - loose * 0.85, 0.32, aAmbient);
  vInk = ink;
  // On paper the faint end of the ramp should vanish rather than smudge.
  vAlpha = aAlpha * fade * mix(0.3, 1.0, p) * mix(1.0, smoothstep(0.08, 0.6, ink), uTheme * (1.0 - aAmbient));
}
`;

export const portraitFragment = /* glsl */ `
uniform float uTheme;
uniform vec3 uDarkLow;
uniform vec3 uDarkHigh;
uniform vec3 uLightLow;
uniform vec3 uLightHigh;
uniform vec3 uMid;

varying float vInk;
varying float vAlpha;

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

  // Premultiplied output with blend (ONE, ONE_MINUS_SRC_ALPHA):
  // alpha 0 adds light (dark theme), alpha = coverage lays down ink (light theme).
  gl_FragColor = vec4(color * alpha, alpha * uTheme);
  #include <colorspace_fragment>
}
`;
