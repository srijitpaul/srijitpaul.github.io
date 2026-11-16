"use strict";

// Checks the lattice figure and the lattice details quoted in the research captions.
// Sources: arXiv abstracts of 2307.12846 (Δ), 1704.05439 (ρ), 1807.08357 (πγ → ππ) and
// Sect. VII of 2206.06582 (window: 24 ensembles, six spacings 0.039–0.0993 fm).

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const figure = html.match(/<figure class="research-figure lattice-figure[\s\S]*?<\/figure>/)[0];

test("lattice figure draws a full grid of sites and nearest-neighbour links", function () {
  const [nt, nx, ny] = [8, 4, 4];
  const sites = figure.match(/<g class="lat-site">([\s\S]*?)<\/g>/)[1].match(/<circle /g).length;
  assert.equal(sites, nt * nx * ny);
  const links = figure.match(/class="lat-link" d="([^"]+)"/)[1].match(/M/g).length;
  assert.equal(links, (nt - 1) * nx * ny + nt * (nx - 1) * ny + nt * nx * (ny - 1));
});

test("continuum-limit squares use the paper's coarsest and finest spacings", function () {
  const cells = d => (d.match(/V/g).length - 1);
  const [coarse, fine] = [...figure.matchAll(/class="lat-fine" d="([^"]+)"/g)].map(m => cells(m[1]));
  // Same drawn width, so the number of cells scales as 1/a: 0.0993 / 0.039 = 2.55.
  assert.ok(Math.abs(fine / coarse - 0.0993 / 0.039) / (0.0993 / 0.039) < 0.03, `${coarse} vs ${fine}`);
  assert.ok(Math.abs(coarse * 0.0993 - 0.4) < 0.01 && Math.abs(fine * 0.039 - 0.4) < 0.015);
  assert.match(figure, /24 ensembles with six spacings between 0\.039 and 0\.099 fm/);
});

test("figure has four steps with matching texts", function () {
  for (let step = 1; step <= 4; step++) {
    assert.match(figure, new RegExp(`data-step-to="${step}"`));
    assert.match(figure, new RegExp(`data-step-text="${step}"`));
  }
  assert.match(figure, /The lines are symbolic: a propagator includes all paths/);
});

test("scattering captions state how the lattice obtains each amplitude", function () {
  assert.match(html, /\(L = 5\.1 fm, a = 0\.08 fm, physical quark masses\) using Lüscher’s formalism/);
  assert.match(html, /ππ states in a finite box \(L ≈ 3\.6 fm, m<sub>π<\/sub> ≈ 320 MeV\) using Lüscher’s formalism/);
  assert.match(html, /\(32³ × 96 points, L ≈ 3\.6 fm, m<sub>π<\/sub> ≈ 320 MeV\)[^<]*Lellouch–Lüscher factor/);
});
