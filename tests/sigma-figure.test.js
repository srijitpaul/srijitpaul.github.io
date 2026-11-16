"use strict";

// The σ-term chart must plot the values quoted in the cited abstracts:
// Hoferichter et al. 2015 (arXiv:1506.04142): 59.1 ± 3.5 MeV;
// Gupta et al. 2021 (arXiv:2105.12095): 41.9(4.9) MeV standard, 59.6(7.4) MeV with Nπ, Nππ;
// Alexandrou et al. 2026 (arXiv:2611.14103): 53.0(7.4)(1.6) MeV.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const figure = html.match(/<figure class="research-figure sigma-figure"[\s\S]*?<\/figure>/)[0];
const xOf = v => 178 + (v - 30) * (230 / 40);

test("σ-term rows sit at the quoted values", function () {
  const rows = [...figure.matchAll(/<g class="sig-row (sig-\w+)" data-value="([\d.]+)" data-error="([\d.]+)">(.*?)<\/g>/g)];
  const expected = [["sig-pheno", 59.1, 3.5], ["sig-lat", 41.9, 4.9], ["sig-lat", 59.6, 7.4], ["sig-this", 53.0, Math.hypot(7.4, 1.6)]];
  assert.equal(rows.length, expected.length);
  rows.forEach((row, i) => {
    const [cls, value, error] = expected[i];
    assert.equal(row[1], cls);
    assert.equal(Number(row[2]), value);
    assert.ok(Math.abs(Number(row[3]) - error) < 0.005);
    const cx = Number(row[4].match(/cx="([\d.]+)"/)[1]);
    const bar = row[4].match(/class="sig-bar" d="M([\d.]+) [\d.]+H([\d.]+)/);
    assert.ok(Math.abs(cx - xOf(value)) <= 0.051);
    assert.ok(Math.abs(Number(bar[1]) - xOf(value - error)) <= 0.051);
    assert.ok(Math.abs(Number(bar[2]) - xOf(value + error)) <= 0.051);
  });
});

test("the paper's own number is quoted as in its abstract", function () {
  assert.match(html, /σ<sub>πN<\/sub> = 53\.0\(7\.4\)\(1\.6\) MeV/);
});
