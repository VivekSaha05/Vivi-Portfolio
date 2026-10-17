// Generates the original, abstract cover art used by the project cards and
// the inline "capsule" images. Usage: node make-art.mjs <public dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
const C = {
  bg: "#161618",
  elev: "#1E1E21",
  panel: "#232327",
  line: "#34343A",
  text: "#F4F2EF",
  muted: "#8A8790",
  violet: "#8E80B8",
  taupe: "#A8978A",
};

const r = (x, y, w, h, rx, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const o = (x, y, w, h, rx, stroke, sw = 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
const c = (cx, cy, rad, fill, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" ${extra}/>`;
const l = (x1, y1, x2, y2, stroke, sw = 2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
const bar = (x, y, w, fill = C.muted, h = 10, op = 1) => r(x, y, w, h, h / 2, fill, `opacity="${op}"`);

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <radialGradient id="glow" cx="78%" cy="18%" r="75%">
    <stop offset="0" stop-color="${C.violet}" stop-opacity="0.26"/>
    <stop offset="1" stop-color="${C.violet}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1.2" fill="${C.line}"/>
  </pattern>
</defs>
<rect width="${w}" height="${h}" fill="${C.bg}"/>
<rect width="${w}" height="${h}" fill="url(#dots)"/>
<rect width="${w}" height="${h}" fill="url(#glow)"/>
${body}
</svg>
`;

/* ----------------------------- HealthCare SaaS ---------------------------- */

function healthcare() {
  const p = [];
  // App window
  p.push(r(130, 110, 1340, 780, 28, C.elev), o(130, 110, 1340, 780, 28, C.line));
  p.push(l(130, 182, 1470, 182, C.line));
  [0, 1, 2].forEach((i) => p.push(c(172 + i * 28, 146, 7, i === 0 ? C.taupe : C.line)));
  p.push(r(600, 132, 400, 28, 14, C.panel));

  // Three-step booking stepper
  const steps = [330, 620, 910];
  p.push(l(steps[0], 262, steps[2], 262, C.line, 3));
  p.push(l(steps[0], 262, steps[1], 262, C.violet, 3));
  steps.forEach((x, i) => {
    p.push(c(x, 262, 20, i < 2 ? C.violet : C.elev, `stroke="${i < 2 ? C.violet : C.muted}" stroke-width="2"`));
    if (i === 0) p.push(`<path d="M${x - 8} 262l6 6 11-12" fill="none" stroke="${C.bg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
    else p.push(c(x, 262, 5, i === 1 ? C.bg : C.muted));
    p.push(bar(x - 48, 300, 96, i < 2 ? C.text : C.muted, 9, i < 2 ? 0.9 : 0.5));
  });

  // Calendar
  p.push(r(190, 370, 560, 460, 22, C.panel), o(190, 370, 560, 460, 22, C.line));
  p.push(bar(226, 408, 150, C.text, 12), bar(650, 408, 64, C.muted, 12, 0.6));
  for (let col = 0; col < 7; col++) p.push(bar(232 + col * 72, 460, 28, C.muted, 6, 0.5));
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 246 + col * 72;
      const y = 512 + row * 62;
      const selected = row === 2 && col === 3;
      const busy = (row * 7 + col) % 5 === 1;
      if (selected) p.push(c(x, y, 24, C.violet));
      p.push(c(x, y, 5, selected ? C.bg : busy ? C.taupe : C.muted, `opacity="${selected || busy ? 1 : 0.55}"`));
    }
  }

  // Time slots
  p.push(bar(800, 386, 130, C.text, 12));
  [0, 1, 2, 3, 4, 5].forEach((i) => {
    const x = 800 + (i % 3) * 132;
    const y = 426 + Math.floor(i / 3) * 62;
    const active = i === 4;
    p.push(r(x, y, 116, 44, 22, active ? C.violet : "none", `stroke="${active ? C.violet : C.line}" stroke-width="2"`));
    p.push(bar(x + 34, y + 18, 48, active ? C.bg : C.muted, 8, active ? 1 : 0.7));
  });

  // Doctor cards
  [0, 1].forEach((i) => {
    const y = 572 + i * 132;
    p.push(r(800, y, 610, 112, 20, C.panel), o(800, y, 610, 112, 20, i === 0 ? C.violet : C.line));
    p.push(c(858, y + 56, 30, C.elev, `stroke="${C.taupe}" stroke-width="2"`));
    p.push(c(858, y + 48, 10, C.taupe), `<path d="M${840} ${y + 76}a18 14 0 0 1 36 0" fill="${C.taupe}"/>`);
    p.push(bar(910, y + 36, 190, C.text, 12), bar(910, y + 64, 120, C.muted, 9, 0.7));
    p.push(r(1270, y + 36, 104, 40, 20, i === 0 ? C.violet : "none", `stroke="${i === 0 ? C.violet : C.muted}" stroke-width="2"`));
    p.push(bar(1296, y + 52, 52, i === 0 ? C.bg : C.muted, 8));
  });

  return svg(1600, 1000, p.join("\n"));
}

/* -------------------------------- SkySpace -------------------------------- */

function skyspace() {
  const p = [];
  p.push(r(130, 110, 1340, 780, 28, C.elev), o(130, 110, 1340, 780, 28, C.line));
  p.push(l(130, 182, 1470, 182, C.line), l(440, 182, 440, 890, C.line));
  [0, 1, 2].forEach((i) => p.push(c(172 + i * 28, 146, 7, i === 0 ? C.taupe : C.line)));
  p.push(r(520, 130, 520, 32, 16, C.panel), c(544, 146, 6, C.muted));

  // Shared avatars
  [0, 1, 2].forEach((i) =>
    p.push(c(1330 + i * 34, 146, 18, [C.violet, C.taupe, C.panel][i], `stroke="${C.elev}" stroke-width="4"`)),
  );

  // Folder tree
  const tree = [
    [0, 150, true],
    [1, 120, false],
    [1, 160, true],
    [2, 110, false],
    [2, 140, false],
    [1, 100, false],
    [0, 130, false],
    [1, 150, false],
  ];
  tree.forEach(([depth, w, hot], i) => {
    const x = 180 + depth * 34;
    const y = 240 + i * 58;
    if (hot && depth === 1) p.push(r(160, y - 18, 260, 46, 12, C.panel));
    p.push(`<path d="M${x} ${y - 6}h10l5 6h17v16h-32z" fill="${hot ? C.violet : "none"}" stroke="${hot ? C.violet : C.muted}" stroke-width="2" stroke-linejoin="round"/>`);
    p.push(bar(x + 48, y, w, hot ? C.text : C.muted, 10, hot ? 0.95 : 0.6));
    if (depth > 0) p.push(l(x - 18, y - 30, x - 18, y + 4, C.line), l(x - 18, y + 4, x - 6, y + 4, C.line));
  });

  // Storage meter
  p.push(r(180, 800, 220, 8, 4, C.line), r(180, 800, 132, 8, 4, C.taupe));

  // File grid
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 490 + col * 240;
      const y = 250 + row * 300;
      const hot = row === 0 && col === 1;
      p.push(r(x, y, 210, 260, 20, C.panel), o(x, y, 210, 260, 20, hot ? C.violet : C.line, hot ? 3 : 2));
      p.push(r(x + 18, y + 18, 174, 140, 12, C.elev));
      const kind = (row * 4 + col) % 4;
      if (kind === 0) {
        p.push(`<path d="M${x + 38} ${y + 132}l44-52 32 34 26-24 34 42z" fill="none" stroke="${C.taupe}" stroke-width="2.5" stroke-linejoin="round"/>`, c(x + 150, y + 56, 11, C.taupe));
      } else if (kind === 1) {
        [0, 1, 2, 3].forEach((k) => p.push(bar(x + 40, y + 46 + k * 24, [120, 90, 130, 70][k], hot ? C.violet : C.muted, 8, 0.8)));
      } else if (kind === 2) {
        [0, 1, 2, 3, 4].forEach((k) => p.push(r(x + 44 + k * 26, y + 130 - [40, 70, 52, 88, 60][k], 14, [40, 70, 52, 88, 60][k], 4, C.violet, `opacity="${0.5 + k * 0.1}"`)));
      } else {
        p.push(c(x + 105, y + 88, 34, "none", `stroke="${C.muted}" stroke-width="2.5"`), `<path d="M${x + 96} ${y + 72}v32l26-16z" fill="${C.muted}"/>`);
      }
      p.push(bar(x + 18, y + 184, 120, C.text, 10, 0.9), bar(x + 18, y + 210, 76, C.muted, 8, 0.6));
      if (hot) p.push(c(x + 178, y + 216, 12, C.violet), `<path d="M${x + 172} ${y + 216}l4 4 8-9" fill="none" stroke="${C.bg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }

  return svg(1600, 1000, p.join("\n"));
}

/* ------------------------------- Shrujan 2.0 ------------------------------ */

function shrujan() {
  const p = [];
  p.push(r(130, 110, 1340, 780, 28, C.elev), o(130, 110, 1340, 780, 28, C.line));
  p.push(l(130, 182, 1470, 182, C.line));
  [0, 1, 2].forEach((i) => p.push(c(172 + i * 28, 146, 7, i === 0 ? C.taupe : C.line)));
  p.push(r(600, 132, 400, 28, 14, C.panel));

  // Hero banner with a countdown
  p.push(r(180, 230, 820, 250, 22, C.panel));
  p.push(bar(220, 278, 300, C.text, 22), bar(220, 318, 200, C.muted, 12, 0.7));
  [0, 1, 2, 3].forEach((i) => {
    const x = 220 + i * 128;
    p.push(r(x, 372, 104, 72, 14, C.elev), o(x, 372, 104, 72, 14, i === 0 ? C.violet : C.line));
    p.push(bar(x + 22, 396, 60, i === 0 ? C.violet : C.text, 16), bar(x + 30, 422, 44, C.muted, 6, 0.6));
  });

  // Live attendee counter
  p.push(r(1040, 230, 380, 250, 22, C.panel), o(1040, 230, 380, 250, 22, C.violet));
  p.push(c(1086, 276, 9, C.violet), bar(1106, 270, 120, C.muted, 12, 0.8));
  p.push(bar(1080, 320, 230, C.text, 40), bar(1080, 384, 160, C.muted, 10, 0.6));
  [44, 70, 58, 92, 80, 112, 100].forEach((h, i) =>
    p.push(r(1084 + i * 44, 460 - h * 0.45, 22, h * 0.45, 5, C.violet, `opacity="${0.5 + i * 0.07}"`)),
  );

  // Event schedule
  for (let i = 0; i < 3; i++) {
    const y = 520 + i * 116;
    const hot = i === 1;
    p.push(r(180, y, 1240, 96, 18, C.panel), o(180, y, 1240, 96, 18, hot ? C.violet : C.line, hot ? 3 : 2));
    p.push(r(204, y + 20, 112, 56, 12, C.elev), bar(226, y + 38, 68, hot ? C.violet : C.taupe, 10));
    p.push(bar(346, y + 30, [320, 260, 360][i], C.text, 12, 0.9), bar(346, y + 56, [200, 240, 180][i], C.muted, 8, 0.6));
    p.push(r(1250, y + 28, 140, 40, 20, hot ? C.violet : "none", hot ? "" : `stroke="${C.muted}" stroke-width="2"`));
    p.push(bar(1282, y + 44, 76, hot ? C.bg : C.muted, 8));
  }

  return svg(1600, 1000, p.join("\n"));
}

/* ---------------------------- ProjectsWithMani ---------------------------- */

function storefront() {
  const p = [];
  p.push(r(130, 110, 1340, 780, 28, C.elev), o(130, 110, 1340, 780, 28, C.line));
  p.push(l(130, 182, 1470, 182, C.line));
  [0, 1, 2].forEach((i) => p.push(c(172 + i * 28, 146, 7, i === 0 ? C.taupe : C.line)));
  p.push(r(600, 132, 400, 28, 14, C.panel));

  // Cart
  p.push(`<path d="M1380 136h10l8 28h34l7-20h-44" fill="none" stroke="${C.muted}" stroke-width="2.5" stroke-linejoin="round"/>`);
  p.push(c(1404, 174, 4, C.muted), c(1426, 174, 4, C.muted), c(1440, 134, 10, C.violet));

  // Video banner
  p.push(r(180, 220, 1240, 230, 22, C.panel));
  p.push(c(380, 335, 58, "none", `stroke="${C.violet}" stroke-width="3"`), `<path d="M364 307v56l46-28z" fill="${C.violet}"/>`);
  p.push(bar(500, 290, 360, C.text, 22), bar(500, 330, 260, C.muted, 12, 0.7));
  p.push(r(500, 370, 170, 46, 23, C.violet), bar(536, 388, 98, C.bg, 10));
  p.push(r(1180, 250, 210, 170, 18, C.elev), bar(1204, 386, 120, C.muted, 8, 0.6));
  p.push(`<path d="M1204 360l52-60 36 40 30-26 44 46z" fill="none" stroke="${C.taupe}" stroke-width="2.5" stroke-linejoin="round"/>`);

  // Product grid
  for (let col = 0; col < 4; col++) {
    const x = 180 + col * 316;
    const hot = col === 2;
    p.push(r(x, 480, 292, 370, 20, C.panel), o(x, 480, 292, 370, 20, hot ? C.violet : C.line, hot ? 3 : 2));
    p.push(r(x + 18, 498, 256, 200, 14, C.elev));
    const kind = col % 2;
    if (kind === 0) {
      p.push(r(x + 96, 540, 100, 120, 16, "none", `stroke="${C.taupe}" stroke-width="2.5"`), l(x + 116, 540, x + 116, 520, C.taupe, 2.5), l(x + 176, 540, x + 176, 520, C.taupe, 2.5));
    } else {
      p.push(c(x + 146, 598, 54, "none", `stroke="${C.muted}" stroke-width="2.5"`), c(x + 146, 598, 18, C.violet, `opacity="0.7"`));
    }
    p.push(bar(x + 18, 726, 180, C.text, 12, 0.9), bar(x + 18, 754, 110, C.muted, 8, 0.6));
    p.push(bar(x + 18, 798, 70, hot ? C.violet : C.taupe, 14));
    p.push(r(x + 206, 786, 68, 38, 19, hot ? C.violet : "none", hot ? "" : `stroke="${C.muted}" stroke-width="2"`));
    p.push(`<path d="M${x + 232} ${805}h16M${x + 240} ${797}v16" stroke="${hot ? C.bg : C.muted}" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  return svg(1600, 1000, p.join("\n"));
}

/* -------------------------------- Capsules -------------------------------- */

function codeCapsule() {
  const p = [r(0, 0, 480, 210, 0, C.elev)];
  const rows = [
    [[C.violet, 46], [C.text, 70], [C.muted, 22]],
    [[C.muted, 26], [C.taupe, 96], [C.muted, 40]],
    [[C.muted, 26], [C.violet, 58], [C.text, 118]],
    [[C.muted, 26], [C.taupe, 74], [C.muted, 54]],
    [[C.violet, 34], [C.muted, 20]],
  ];
  rows.forEach((row, i) => {
    let x = 88 + (i > 0 && i < 4 ? 30 : 0);
    p.push(bar(40, 30 + i * 32, 22, C.line, 12));
    row.forEach(([fill, w]) => {
      p.push(bar(x, 30 + i * 32, w, fill, 12, 0.95));
      x += w + 14;
    });
  });
  p.push(r(412, 60, 10, 26, 2, C.violet));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="210" viewBox="0 0 480 210">${p.join("")}</svg>\n`;
}

function uiCapsule() {
  const p = [r(0, 0, 480, 210, 0, C.bg)];
  p.push(r(28, 26, 150, 158, 18, C.elev), o(28, 26, 150, 158, 18, C.violet));
  p.push(c(72, 76, 22, C.violet), bar(52, 120, 96, C.text, 12), bar(52, 146, 64, C.muted, 10, 0.7));
  p.push(r(196, 26, 256, 158, 18, C.elev), o(196, 26, 256, 158, 18, C.line));
  [38, 66, 50, 92, 74, 108].forEach((h, i) =>
    p.push(r(222 + i * 36, 162 - h, 20, h, 6, i === 5 ? C.taupe : C.violet, `opacity="${0.55 + i * 0.09}"`)),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="210" viewBox="0 0 480 210">${p.join("")}</svg>\n`;
}

mkdirSync(join(out, "projects"), { recursive: true });
mkdirSync(join(out, "capsules"), { recursive: true });
writeFileSync(join(out, "projects/healthcare.svg"), healthcare());
writeFileSync(join(out, "projects/skyspace.svg"), skyspace());
writeFileSync(join(out, "projects/shrujan.svg"), shrujan());
writeFileSync(join(out, "projects/projectswithmani.svg"), storefront());
writeFileSync(join(out, "capsules/code.svg"), codeCapsule());
writeFileSync(join(out, "capsules/ui.svg"), uiCapsule());
console.log("art written");
