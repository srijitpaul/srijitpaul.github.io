"use strict";

// Structural checks for the leading-order HVP diagram on the home page.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "scholar.css"), "utf8");
const figure = html.match(/<figure class="research-figure hvp-figure"[\s\S]*?<\/figure>/)[0];
const base = figure.match(/<g class="hvp-base">[\s\S]*?<\/svg>/)[0];

function endpoints(cls) {
  const d = base.match(new RegExp(`class="[^"]*${cls}[^"]*"[^>]* d="([^"]+)"`))[1];
  const nums = [...d.matchAll(/-?[\d.]+/g)].map(Number);
  return { start: [nums[0], nums[1]], end: [nums.at(-2), nums.at(-1)] };
}

test("diagram has the g-2 vertex topology", function () {
  const vertex = cls => {
    const m = base.match(new RegExp(`class="hvp-vertex ${cls}" cx="([\\d.]+)" cy="([\\d.]+)"`));
    return [Number(m[1]), Number(m[2])];
  };
  const a = vertex("hvp-v-a"), c = vertex("hvp-v-c"), b = vertex("hvp-v-b");
  // External-field photon attaches to the muon line between the two virtual-photon vertices.
  assert.ok(a[0] < c[0] && c[0] < b[0]);
  assert.deepEqual(endpoints("hvp-seg-ext").end, c);
  // One virtual photon leaves the muon at A, the other returns to it at B.
  assert.deepEqual(endpoints("hvp-seg-up").start, a);
  assert.deepEqual(endpoints("hvp-seg-down").end, b);
  // Both photon lines attach to the hadronic blob, not to the muon line.
  assert.ok(endpoints("hvp-seg-up").end[1] < a[1] - 50);
  assert.ok(endpoints("hvp-seg-down").start[1] < b[1] - 50);
});

test("animation timing in CSS matches the button's stop timer", function () {
  const duration = Number(figure.match(/data-duration="(\d+)"/)[1]);
  const hvpRules = [...css.matchAll(/\.is-playing [^{]*hvp[^{]*\{[^}]*animation: [\w-]+ ([\d.]+)s/g)];
  assert.ok(hvpRules.length >= 10);
  for (const rule of hvpRules) assert.equal(Number(rule[1]) * 1000, duration, rule[0]);
});

test("caption keeps the interpretation caveats", function () {
  assert.match(figure, /reading order for one Feynman diagram, not a history in time/);
  assert.match(figure, /not observed particles/);
  assert.match(figure, /symbolic, not a single quark pair/);
  assert.match(figure, /sum over all hadronic states/);
});
