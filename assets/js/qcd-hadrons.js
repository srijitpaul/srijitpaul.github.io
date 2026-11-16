"use strict";

const QCDHadrons = (function () {
  const flavors = {
    u: "up", d: "down", s: "strange",
    c: "charm", b: "bottom", t: "top"
  };
  const colors = [
    { key: "r", name: "red" },
    { key: "g", name: "green" },
    { key: "b", name: "blue" }
  ];
  const permutations = [
    { colors: ["r", "g", "b"], sign: 1 },
    { colors: ["g", "b", "r"], sign: 1 },
    { colors: ["b", "r", "g"], sign: 1 },
    { colors: ["r", "b", "g"], sign: -1 },
    { colors: ["b", "g", "r"], sign: -1 },
    { colors: ["g", "r", "b"], sign: -1 }
  ];
  const hadrons = {
    "pion-plus": { label: "π⁺", kind: "meson", components: [{ flavors: ["u", "d"], sign: 1 }] },
    "pion-minus": { label: "π⁻", kind: "meson", components: [{ flavors: ["d", "u"], sign: 1 }] },
    "pion-zero": { label: "π⁰", kind: "meson", components: [{ flavors: ["u", "u"], sign: 1 }, { flavors: ["d", "d"], sign: -1 }] },
    "rho-plus": { label: "ρ⁺", kind: "meson", components: [{ flavors: ["u", "d"], sign: 1 }] },
    "rho-zero": { label: "ρ⁰", kind: "meson", components: [{ flavors: ["u", "u"], sign: 1 }, { flavors: ["d", "d"], sign: -1 }] },
    proton: { label: "p", kind: "baryon", flavors: ["u", "u", "d"] },
    "delta-plus-plus": { label: "Δ⁺⁺", kind: "baryon", flavors: ["u", "u", "u"] }
  };

  function quark(flavor, color, antiquark) {
    if (!Object.hasOwn(flavors, flavor) || !colors.some(function (item) { return item.key === color; }) || typeof antiquark !== "boolean") {
      throw new Error("Unknown quark flavor, color or antiquark flag: " + flavor + ", " + color + ", " + antiquark);
    }
    return { flavor: flavor, color: color, antiquark: antiquark };
  }

  function termsFor(id) {
    if (!Object.hasOwn(hadrons, id)) throw new Error("Unknown hadron: " + id);
    const hadron = hadrons[id];
    if (hadron.kind === "baryon") {
      return permutations.map(function (permutation) {
        return {
          sign: permutation.sign,
          quarks: hadron.flavors.map(function (flavor, index) {
            return quark(flavor, permutation.colors[index], false);
          })
        };
      });
    }
    return hadron.components.flatMap(function (component) {
      return colors.map(function (color) {
        return {
          sign: component.sign,
          quarks: [quark(component.flavors[0], color.key, false), quark(component.flavors[1], color.key, true)]
        };
      });
    });
  }

  function renderQuark(part) {
    const color = colors.find(function (item) { return item.key === part.color; });
    const element = document.createElement("span");
    element.className = "qcd-quark qcd-" + part.color;
    element.dataset.flavor = part.flavor;
    element.dataset.color = part.color;
    element.dataset.antiquark = String(part.antiquark);
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", flavors[part.flavor] + (part.antiquark ? " antiquark, anti-" : " quark, ") + color.name);
    const flavor = document.createElement("span");
    flavor.className = part.antiquark ? "qcd-antiquark" : "";
    flavor.textContent = part.flavor;
    const subscript = document.createElement("sub");
    subscript.className = part.antiquark ? "qcd-antiquark" : "";
    subscript.textContent = part.color;
    element.append(flavor, subscript);
    return element;
  }

  function renderGluonField() {
    const namespace = "http://www.w3.org/2000/svg";
    const field = document.createElementNS(namespace, "svg");
    field.setAttribute("class", "qcd-gluon-field");
    field.setAttribute("viewBox", "0 0 100 80");
    field.setAttribute("aria-hidden", "true");
    field.setAttribute("focusable", "false");
    const waves = document.createElementNS(namespace, "path");
    waves.setAttribute("d", "M12 41 C22 17 34 61 46 35 S67 15 84 41 M18 21 C33 33 38 11 51 24 S70 36 83 21 M17 57 C31 43 41 70 52 54 S69 44 83 59");
    field.append(waves);
    return field;
  }

  function renderScatteringHadron(group) {
    const id = group.dataset.scatterHadron;
    const terms = termsFor(id);
    const term = group.dataset.scatterColor
      ? terms.find(function (item) { return item.quarks[0].color === group.dataset.scatterColor; })
      : terms[0];
    if (!term) throw new Error("Unknown scattering color for " + id + ": " + group.dataset.scatterColor);
    const parts = term.quarks;
    const circle = group.querySelector("circle");
    if (!circle) throw new Error("Missing scattering position for " + id);
    const namespace = "http://www.w3.org/2000/svg";
    function svg(tag, attributes) {
      const element = document.createElementNS(namespace, tag);
      Object.entries(attributes).forEach(function (entry) {
        element.setAttribute(entry[0], entry[1]);
      });
      return element;
    }
    const visual = svg("g", { transform: "translate(" + circle.getAttribute("cx") + " " + circle.getAttribute("cy") + ")" });
    visual.append(svg("circle", { r: "23", class: "scatter-hadron-outline" }));
    const field = renderGluonField();
    field.setAttribute("class", "scatter-field");
    field.setAttribute("x", "-21");
    field.setAttribute("y", "-8");
    field.setAttribute("width", "42");
    field.setAttribute("height", "30");
    visual.append(field);
    const name = svg("text", { x: "0", y: "-13", class: "scatter-hadron-name" });
    name.textContent = hadrons[id].label;
    visual.append(name);
    const positions = parts.length === 2 ? [[-8, 7], [8, 7]] : [[0, 0], [-9, 12], [9, 12]];
    parts.forEach(function (part, index) {
      const mark = svg("g", {
        class: "scatter-quark qcd-" + part.color,
        "data-flavor": part.flavor,
        "data-color": part.color,
        "data-antiquark": String(part.antiquark),
        transform: "translate(" + positions[index][0] + " " + positions[index][1] + ")"
      });
      const contents = svg("g", { class: "scatter-quark-contents" });
      contents.append(svg("circle", { r: "6" }));
      const label = svg("text", { x: "0", y: "0", class: "scatter-quark-label" });
      label.textContent = part.flavor + (part.antiquark ? "\u0305" : "");
      contents.append(label);
      mark.append(contents);
      visual.append(mark);
    });
    group.replaceChildren(visual);
  }

  function render(id) {
    const terms = termsFor(id);
    const result = document.createElement("div");
    result.className = "qcd-hadron";
    result.dataset.hadron = id;
    const heading = document.createElement("h4");
    heading.textContent = hadrons[id].label;
    const expression = document.createElement("div");
    expression.className = "qcd-expression";
    const prefix = document.createElement("span");
    prefix.textContent = "1/√" + terms.length + " (";
    expression.append(prefix);
    terms.forEach(function (term, index) {
      const item = document.createElement("span");
      item.className = "qcd-term";
      item.dataset.sign = String(term.sign);
      if (index > 0 || term.sign < 0) {
        const sign = document.createElement("span");
        sign.textContent = term.sign < 0 ? "−" : "+";
        item.append(sign);
      }
      const openKet = document.createElement("span");
      openKet.textContent = "|";
      item.append(openKet);
      const component = document.createElement("span");
      component.className = "qcd-component qcd-" + hadrons[id].kind;
      term.quarks.forEach(function (part) { component.append(renderQuark(part)); });
      component.append(renderGluonField());
      item.append(component);
      const closeKet = document.createElement("span");
      closeKet.textContent = "⟩";
      item.append(closeKet);
      expression.append(item);
    });
    const end = document.createElement("span");
    end.textContent = ")";
    expression.append(end);
    result.append(heading, expression);
    return result;
  }

  return { quark: quark, termsFor: termsFor, render: render, renderScatteringHadron: renderScatteringHadron };
}());

if (typeof module !== "undefined" && module.exports) module.exports = QCDHadrons;

if (typeof document !== "undefined") {
  document.querySelectorAll("[data-scatter-hadron]").forEach(QCDHadrons.renderScatteringHadron);
  document.querySelectorAll("[data-qcd-hadrons]").forEach(function (container) {
    const ids = container.dataset.qcdHadrons.split(" ");
    const diagrams = ids.map(QCDHadrons.render);
    container.replaceChildren.apply(container, diagrams);
  });
}
