"use strict";

// Checks the window-observable infographic in index.html against the formulas and
// numbers of Cè et al., arXiv:2206.06582v2: Eqs. (4)-(8) for the weights and
// Eq. (45) and Sect. VII for the compared results.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const t0 = 0.4, t1 = 1.0, delta = 0.15;
const theta = (t, tp) => 0.5 * (1 + Math.tanh((t - tp) / delta));
const weights = {
  theta0: t => theta(t, t0),
  theta1: t => theta(t, t1),
  sd: t => 1 - theta(t, t0),
  id: t => theta(t, t0) - theta(t, t1),
  ld: t => theta(t, t1),
  sum: t => (1 - theta(t, t0)) + (theta(t, t0) - theta(t, t1)) + theta(t, t1)
};
// Plot mapping used by the SVG: t in fm to x, weight to y.
const tOf = x => (x - 48) / 225;
const yOf = w => 196 - 150 * w;

function curves(name) {
  const pattern = new RegExp(`data-curve="${name}" d="([^"]+)"`, "g");
  return [...html.matchAll(pattern)].map(match =>
    [...match[1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(p => [Number(p[1]), Number(p[2])]));
}

test("every plotted weight matches its formula to sub-pixel accuracy", function () {
  for (const [name, weight] of Object.entries(weights)) {
    const found = curves(name);
    assert.ok(found.length > 0, `missing curve ${name}`);
    for (const points of found) {
      assert.equal(points.length, 81, name);
      assert.ok(Math.abs(tOf(points[0][0])) < 1e-9 && Math.abs(tOf(points.at(-1)[0]) - 1.6) < 1e-9, name);
      for (const [x, y] of points) {
        assert.ok(Math.abs(y - yOf(weight(tOf(x)))) <= 0.051, `${name} at x=${x}: y=${y}`);
      }
    }
  }
});

test("the three weights add up to one at every plotted time", function () {
  for (let i = 0; i <= 80; i++) {
    const t = i * 0.02;
    assert.ok(Math.abs(weights.sd(t) + weights.id(t) + weights.ld(t) - 1) < 1e-12);
  }
  for (const [, y] of curves("sum")[0]) assert.equal(y, yOf(1));
});

test("the intermediate weight peaks at t = 0.7 fm with value tanh 2", function () {
  assert.ok(Math.abs(weights.id(0.7) - Math.tanh(2)) < 1e-12);
  assert.match(html, /max ≈ 0\.96/);
});

test("result chart positions match the values quoted in the paper", function () {
  const xOf = v => 178 + (v - 226) * (230 / 16);
  // CMD-3-based value: Davier et al., EPJC 84 (2024), Fig. 12, 234.2 ± 1.2 (pi pi) ± 1.0 (other channels).
  const rows = [["res-lattice", 237.30, 1.46], ["res-data", 229.4, 1.4], ["res-cmd3", 234.2, Math.hypot(1.2, 1.0)]];
  for (const [cls, value, error] of rows) {
    const group = html.match(new RegExp(`<g class="${cls}" data-value="([\\d.]+)" data-error="([\\d.]+)">(.*?)</g>`));
    assert.ok(group, cls);
    assert.equal(Number(group[1]), value);
    assert.ok(Math.abs(Number(group[2]) - error) < 0.005, `${cls} error`);
    const cx = Number(group[3].match(/cx="([\d.]+)"/)[1]);
    assert.ok(Math.abs(cx - xOf(value)) <= 0.051, `${cls} centre`);
    const bar = group[3].match(/class="res-bar" d="M([\d.]+) [\d.]+H([\d.]+)/);
    assert.ok(Math.abs(Number(bar[1]) - xOf(value - error)) <= 0.051, `${cls} lower`);
    assert.ok(Math.abs(Number(bar[2]) - xOf(value + error)) <= 0.051, `${cls} upper`);
  }
  // 3.9 sigma, as quoted in the paper, from the combined uncertainties.
  const sigma = (237.30 - 229.4) / Math.hypot(1.46, 1.4);
  assert.equal(sigma.toFixed(1), "3.9");
  assert.match(html, /3\.9σ above the data-driven evaluation \(229\.4 ± 1\.4\) × 10<sup>−10<\/sup>/);
  assert.match(html, /\(234\.2 ± 1\.2 ± 1\.0\) × 10<sup>−10<\/sup>/);
});
