"use strict";

// The Research section: a lead, a closed "how lattice QCD works" card, then seven research
// pillars. Each pillar is a card with a big question, a teaser and a <details> section holding
// the physics, the approach and key works linked to their sources. Statements of fact are
// pinned to the sources linked on the page.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const research = html.match(/<section class="content-section" id="research">[\s\S]*?<\/section>/)[0];
const pillars = [...research.matchAll(/<article class="pillar" id="pillar-([\w-]+)"[\s\S]*?<\/article>/g)];
const pillar = key => pillars.find(p => p[1] === key)[0];

test("lead, tool card, then seven pillars in order", function () {
  assert.ok(research.split(/\s+/).length > 0);
  assert.ok(research.indexOf('class="research-lead"') < research.indexOf('<details class="tool-card">'));
  assert.ok(research.indexOf('<details class="tool-card">') < research.indexOf('<article class="pillar"'));
  assert.deepEqual(pillars.map(p => p[1]), ["dark-matter", "g2", "flavour", "delta", "exotic", "resonances", "ml"]);
  assert.match(research, /<details class="tool-card">[\s\S]*<figure class="research-figure lattice-figure[\s\S]*?<\/details>/);
});

test("each pillar shows a question and a visual, with details behind a distinct summary", function () {
  const summaries = new Set();
  for (const [card, key] of pillars) {
    assert.match(card, /<svg class="pillar-icon"[^>]*aria-hidden="true" focusable="false">/, key);
    assert.match(card, /<p class="pillar-question"><strong>The big question:<\/strong> [^<]+\?<\/p>/, key);
    const beforeDetails = card.split('<details class="pillar-more">')[0];
    assert.match(beforeDetails, /<figure class="(pillar-visual|research-figure[^"]*)"/, `${key}: visual on the card`);
    assert.doesNotMatch(card, /<p class="pillar-teaser">/, `${key}: no teaser paragraph`);
    const summary = card.match(/<details class="pillar-more">\s*<summary>([^<]+)<\/summary>/)[1];
    assert.ok(summary.startsWith("Read more: ") && !summaries.has(summary), summary);
    summaries.add(summary);
    for (const heading of ["The physics", "My approach", "Key works"]) assert.ok(card.includes(`<h4>${heading}</h4>`), `${key}: ${heading}`);
    const works = [...card.matchAll(/<li><a href="(https:\/\/(?:arxiv\.org\/abs|doi\.org)\/[^"]+)">[^<]/g)];
    assert.ok(works.length >= 2, key);
  }
});

test("figures sit in the pillars their captions belong to", function () {
  assert.match(pillar("dark-matter"), /class="research-figure sigma-figure"/);
  assert.match(pillar("g2"), /class="research-figure hvp-figure"[\s\S]*class="research-figure window-figure[\s\S]*class="research-figure result-figure"/);
  assert.match(pillar("delta"), /class="research-figure delta-figure"[\s\S]*class="qcd-intro"/);
  assert.match(pillar("resonances"), /caption-rho[\s\S]*class="qcd-intro"[\s\S]*caption-transition/);
  // The illustration note now sits in each scattering figure's collapsed notes.
  for (const id of ["caption-delta", "caption-rho"]) {
    assert.match(research, new RegExp(`id="${id}">[^<]+<details class="fig-notes"><summary>About this figure</summary><p class="qcd-intro">`), id);
  }
});

test("claims are scoped to their sources", function () {
  // Corrections to common overstatements.
  assert.match(research, /Dark matter is about 85% of the matter in the Universe/);
  assert.match(research, /More than 99\.9% of the mass of ordinary matter/);
  assert.match(research, /Most of my research computes this physics from first principles with lattice QCD/);
  assert.match(research, /live only a few trillionths of a trillionth of a second/);
  assert.match(research, /generally believed too small to explain the matter–antimatter asymmetry/);
  assert.match(research, /electromagnetic and axial nucleon-to-Δ transition form factors at a pion mass of about 255 MeV/);
  // Yang-Mills: pure gauge theory only, unpublished, mass gap open. Anomaly: Ginsparg-Wilson only.
  assert.match(research, /existence of pure Yang–Mills theory, gauge fields without quarks/);
  assert.match(research, /It is not yet published, and the mass gap remains open/);
  assert.match(research, /With Ginsparg–Wilson fermions it keeps an exact form of chiral symmetry/);
  assert.match(research, /recovered as the lattice spacing goes to zero/);
  // Preprints are labelled.
  for (const id of ["2608.30737", "2610.20362", "2611.14103", "2512.07800"]) {
    assert.match(research, new RegExp(`arXiv:${id.replace(".", "\\.")} \\(20\\d\\d\\), preprint`), id);
  }
  for (const link of ["arxiv.org/abs/2505.21476", "doi.org/10.1140/epjc/s10052-024-12964-7", "arxiv.org/abs/1104.5152",
    "arxiv.org/abs/1506.04142", "arxiv.org/abs/2105.12095", "arxiv.org/abs/hep-lat/9802011", "scientificamerican.com",
    "doi.org/10.22323/1.518.0067"]) {
    assert.ok(research.includes(link), link);
  }
});

test("no overstatements from the draft text survive", function () {
  for (const phrase of ["85% of the cosmos", "super-particle", "neutron star", "background noise", "nuclear astrophysics",
    "vital benchmark", "critical theoretical input", "less than a trillionth"]) {
    assert.ok(!research.includes(phrase), phrase);
  }
});

test("no duplicate ids on the page", function () {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test("long captions keep their full text in a collapsed note", function () {
  for (const id of ["caption-hvp", "caption-delta", "caption-rho", "caption-transition"]) {
    const caption = research.match(new RegExp(`<figcaption id="${id}">([\\s\\S]*?)</figcaption>`))[1];
    const shown = caption.split('<details class="fig-notes">')[0].replace(/<[^>]+>/g, "").trim();
    assert.ok(shown.split(/\s+/).length <= 16, `${id}: ${shown}`);
    assert.match(caption, /<details class="fig-notes"><summary>About this figure<\/summary>/);
  }
});
