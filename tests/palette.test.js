"use strict";

// The figures' categorical colours must stay distinguishable for colour-blind visitors.
// Simulates protanopia, deuteranopia and tritanopia (Machado, Oliveira & Fernandes 2009,
// severity 1) and requires a CIEDE2000 difference of at least 20 between every pair.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "assets", "css", "scholar.css"), "utf8");
const palette = { red: "#d77343", green: "#b2f6d7", blue: "#8085c8" };
const machado = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = c => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

function simulate(hex, matrix) {
  const linear = rgb(hex).map(toLinear);
  return matrix.map(row => toGamma(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]));
}

function lab(srgb) {
  const [r, g, b] = srgb.map(toLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function ciede2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = (Math.atan2(b1, a1p) / rad + 360) % 360, h2p = (Math.atan2(b2, a2p) / rad + 360) % 360;
  let dh = h2p - h1p;
  if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dLp = L2 - L1, dCp = C2p - C1p, dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  const hbp = C1p * C2p === 0 ? h1p + h2p : Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.20 * Math.cos((4 * hbp - 63) * rad);
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (Lbp - 50) ** 2 / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * 30 * Math.exp(-(((hbp - 275) / 25) ** 2)) * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

test("CIEDE2000 implementation matches a published reference pair", function () {
  // Sharma, Wu & Dalal (2005), test pair 1: ΔE00 = 2.0425.
  assert.ok(Math.abs(ciede2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-4);
});

test("categorical colours stay distinguishable under colour-vision deficiencies", function () {
  const names = Object.keys(palette);
  for (const [kind, matrix] of Object.entries(machado)) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d = ciede2000(lab(simulate(palette[names[i]], matrix)), lab(simulate(palette[names[j]], matrix)));
        assert.ok(d >= 20, `${names[i]} vs ${names[j]} under ${kind}: ΔE00 = ${d.toFixed(1)}`);
      }
    }
  }
});

test("quark colour charges use the safe palette", function () {
  assert.match(css, new RegExp(`\\.qcd-r \\{ --quark-color: ${palette.red}; \\}`));
  assert.match(css, new RegExp(`\\.qcd-g \\{ --quark-color: ${palette.green}; \\}`));
  assert.match(css, new RegExp(`\\.qcd-b \\{ --quark-color: ${palette.blue}; \\}`));
});

test("the old red-green-confusable colours are gone", function () {
  for (const old of ["#dfa893", "#f0a3a0", "#add59f", "#9fc59a", "#a7c7f5", "#8fb0d6"]) {
    assert.ok(!css.includes(old), old);
  }
});
