"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const qcd = require("../assets/js/qcd-hadrons.js");

test("quarks support every flavor and corresponding color and anticolor", function () {
  for (const flavor of ["u", "d", "s", "c", "b", "t"]) {
    for (const color of ["r", "g", "b"]) {
      for (const antiquark of [false, true]) {
        assert.deepEqual(qcd.quark(flavor, color, antiquark), { flavor, color, antiquark });
      }
    }
  }
  assert.throws(() => qcd.quark("x", "r", false), /Unknown quark/);
  assert.throws(() => qcd.quark("u", "x", false), /Unknown quark/);
  assert.throws(() => qcd.quark("u", "r", "false"), /Unknown quark/);
  assert.throws(() => qcd.termsFor("unknown"), /Unknown hadron/);
});

test("mesons pair each color with its anticolor and retain flavor phases", function () {
  const expected = {
    "pion-plus": [["u", "d", 1]],
    "pion-minus": [["d", "u", 1]],
    "rho-plus": [["u", "d", 1]],
    "pion-zero": [["u", "u", 1], ["d", "d", -1]],
    "rho-zero": [["u", "u", 1], ["d", "d", -1]]
  };
  for (const [id, components] of Object.entries(expected)) {
    const terms = qcd.termsFor(id);
    assert.equal(terms.length, components.length * 3);
    components.forEach(function ([flavor, antiflavor, sign], component) {
      ["r", "g", "b"].forEach(function (color, index) {
        assert.deepEqual(terms[component * 3 + index], {
          sign,
          quarks: [
            { flavor, color, antiquark: false },
            { flavor: antiflavor, color, antiquark: true }
          ]
        });
      });
    });
  }
});

test("baryon color terms have the six epsilon-tensor permutations", function () {
  const expected = { rgb: 1, gbr: 1, brg: 1, rbg: -1, bgr: -1, grb: -1 };
  for (const [id, flavors] of [["proton", ["u", "u", "d"]], ["delta-plus-plus", ["u", "u", "u"]]]) {
    const terms = qcd.termsFor(id);
    assert.equal(terms.length, 6);
    assert.deepEqual(Object.fromEntries(terms.map(term => [term.quarks.map(q => q.color).join(""), term.sign])), expected);
    for (const term of terms) {
      assert.deepEqual(term.quarks.map(q => q.flavor), flavors);
      assert.ok(term.quarks.every(q => q.antiquark === false));
    }
  }
});

test("each illustrated term contains a decorative gluon field behind its quarks", function () {
  function element(tag) {
    return {
      tag, className: "", dataset: {}, attributes: {}, children: [],
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...children) { this.children.push(...children); }
    };
  }
  const previousDocument = global.document;
  global.document = {
    createElement: element,
    createElementNS(namespace, tag) { return element(tag); }
  };
  try {
    for (const [id, count, quarks] of [["pion-plus", 3, 2], ["proton", 6, 3]]) {
      const expression = qcd.render(id).children[1];
      const terms = expression.children.filter(child => child.className === "qcd-term");
      assert.equal(terms.length, count);
      for (const term of terms) {
        const component = term.children.find(child => child.className.startsWith("qcd-component"));
        assert.equal(component.children.filter(child => child.className.startsWith("qcd-quark")).length, quarks);
        const field = component.children.find(child => child.tag === "svg");
        assert.equal(field.attributes["aria-hidden"], "true");
        assert.equal(field.children[0].tag, "path");
      }
    }
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});

test("scattering hadrons render one library term with a symbolic field", function () {
  function element(tag) {
    return {
      tag, attributes: {}, children: [],
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; }
    };
  }
  const previousDocument = global.document;
  global.document = { createElementNS(namespace, tag) { return element(tag); } };
  try {
    for (const id of ["pion-plus", "pion-minus", "pion-zero", "rho-plus", "rho-zero", "proton", "delta-plus-plus"]) {
      const circle = element("circle");
      circle.setAttribute("cx", "58");
      circle.setAttribute("cy", "52");
      const group = element("g");
      group.dataset = { scatterHadron: id };
      group.querySelector = () => circle;
      qcd.renderScatteringHadron(group);
      const visual = group.children[0];
      assert.equal(visual.attributes.transform, "translate(58 52)");
      const field = visual.children.find(child => child.attributes.class === "scatter-field");
      assert.equal(field.attributes["aria-hidden"], "true");
      assert.equal(field.children[0].tag, "path");
      const quarks = visual.children.filter(child => child.attributes.class?.startsWith("scatter-quark "));
      assert.deepEqual(quarks.map(child => ({
        flavor: child.attributes["data-flavor"],
        color: child.attributes["data-color"],
        antiquark: child.attributes["data-antiquark"] === "true"
      })), qcd.termsFor(id)[0].quarks);
    }
    const pion = element("g");
    pion.dataset = { scatterHadron: "pion-plus", scatterColor: "b" };
    pion.querySelector = () => {
      const circle = element("circle");
      circle.setAttribute("cx", "58");
      circle.setAttribute("cy", "52");
      return circle;
    };
    qcd.renderScatteringHadron(pion);
    const pionParts = pion.children[0].children.filter(child => child.attributes.class?.startsWith("scatter-quark ")).map(child => ({
      flavor: child.attributes["data-flavor"],
      color: child.attributes["data-color"],
      antiquark: child.attributes["data-antiquark"] === "true"
    }));
    const protonParts = qcd.termsFor("proton")[0].quarks;
    const deltaParts = qcd.termsFor("delta-plus-plus")[0].quarks;
    assert.deepEqual(pionParts, qcd.termsFor("pion-plus")[2].quarks);
    assert.deepEqual(protonParts[2], qcd.quark("d", pionParts[1].color, false));
    assert.deepEqual([...protonParts.slice(0, 2), pionParts[0]], deltaParts);
    assert.throws(() => qcd.renderScatteringHadron({ dataset: { scatterHadron: "pion-plus", scatterColor: "invalid" } }), /Unknown scattering color/);
    assert.throws(() => qcd.renderScatteringHadron({ dataset: { scatterHadron: "proton" }, querySelector: () => null }), /Missing scattering position/);
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
