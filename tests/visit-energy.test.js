"use strict";

// Checks the visit-energy estimate: model constants, arithmetic, and that every page
// loads the recorder with a Content Security Policy that allows it but blocks network requests.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const energy = require("../assets/js/visit-energy.js");

const root = path.join(__dirname, "..");
const pages = ["index.html", "404.html", "energy/index.html", "hadronicle/index.html",
  "hadronicle/what-is-a-hadron/index.html", "mogojastro/index.html", "mogojastro/hadron/index.html"];

test("uses the Sustainable Web Design Model v4 operational intensities", function () {
  assert.deepEqual(energy.KWH_PER_GB, { dataCentres: 0.055, networks: 0.059 });
});

test("estimates energy from bytes, visible time and device power", function () {
  const oneGigabyte = energy.estimate(1e9, 0, 10);
  assert.ok(Math.abs(oneGigabyte.dataCentres - 0.055 * 3.6e6) < 1e-6);
  assert.ok(Math.abs(oneGigabyte.networks - 0.059 * 3.6e6) < 1e-6);
  assert.equal(oneGigabyte.device, 0);
  const oneMinute = energy.estimate(0, 60, 10);
  assert.equal(oneMinute.device, 600);
  assert.equal(oneMinute.total, 600);
  const both = energy.estimate(250e3, 30, 1.4);
  assert.ok(Math.abs(both.total - (both.dataCentres + both.networks + both.device)) < 1e-9);
});

test("formats energies, sizes and durations", function () {
  assert.equal(energy.formatEnergy(1234), "1.23 kJ");
  assert.equal(energy.formatEnergy(56.78), "56.8 J");
  assert.equal(energy.formatEnergy(0.0123), "12.3 mJ");
  assert.equal(energy.formatBytes(123456), "123.5 kB");
  assert.equal(energy.formatBytes(2345678), "2.35 MB");
  assert.equal(energy.formatDuration(125.9), "2 min 5 s");
  assert.equal(energy.formatDuration(9.2), "9 s");
});

test("every page records the visit and cannot send data anywhere", function () {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /<script defer src="\/assets\/js\/visit-energy\.js\?v=\d+"><\/script>/, page);
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /default-src 'none'/, page);
    assert.match(csp, /script-src 'self'/, page);
    assert.doesNotMatch(csp, /connect-src/, page);
  }
});

test("presets match the measured examples cited on the energy page", function () {
  const html = fs.readFileSync(path.join(root, "energy/index.html"), "utf8");
  for (const [preset, watts] of Object.entries(energy.DEVICE_PRESETS)) {
    assert.match(html, new RegExp(`value="${watts}" data-preset="${preset}"`));
  }
});
