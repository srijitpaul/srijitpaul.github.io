"use strict";

// Live estimate of the energy used while a visitor browses this site in one tab.
// Measured in the visitor's browser: bytes received over the network (Resource Timing
// transferSize) and the time pages were visible (Page Visibility API).
// Nothing is sent anywhere: totals for the tab stay in sessionStorage, and the pages'
// Content Security Policy forbids network requests from scripts.
var VisitEnergy = (function () {
  // Sustainable Web Design Model v4, operational energy intensities in kWh per GB, an
  // attributional (average) model: https://sustainablewebdesign.org/estimating-digital-emissions/
  var KWH_PER_GB = { dataCentres: 0.055, networks: 0.059 };
  var JOULES_PER_KWH = 3.6e6;
  var BYTES_PER_GB = 1e9;
  // Whole-device power presets in watts, from the measured examples cited on the energy
  // page (an OLED phone, 1.0-1.4 W; laptops, 8-14 W). The visitor can change it.
  var DEVICE_PRESETS = { phone: 1.4, laptop: 10 };

  function estimate(bytes, visibleSeconds, deviceWatts) {
    var gigabytes = bytes / BYTES_PER_GB;
    var dataCentres = gigabytes * KWH_PER_GB.dataCentres * JOULES_PER_KWH;
    var networks = gigabytes * KWH_PER_GB.networks * JOULES_PER_KWH;
    var device = visibleSeconds * deviceWatts;
    return { dataCentres: dataCentres, networks: networks, device: device, total: dataCentres + networks + device };
  }

  function formatEnergy(joules) {
    if (joules >= 1000) return (joules / 1000).toPrecision(3) + " kJ";
    if (joules >= 1) return joules.toPrecision(3) + " J";
    return (joules * 1000).toPrecision(3) + " mJ";
  }

  function formatBytes(bytes) {
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
    return (bytes / 1e3).toFixed(1) + " kB";
  }

  function formatDuration(seconds) {
    var whole = Math.floor(seconds);
    var minutes = Math.floor(whole / 60);
    var rest = whole % 60;
    return minutes > 0 ? minutes + " min " + rest + " s" : rest + " s";
  }

  return {
    KWH_PER_GB: KWH_PER_GB,
    DEVICE_PRESETS: DEVICE_PRESETS,
    estimate: estimate,
    formatEnergy: formatEnergy,
    formatBytes: formatBytes,
    formatDuration: formatDuration
  };
}());

if (typeof module !== "undefined" && module.exports) module.exports = VisitEnergy;

if (typeof document !== "undefined") (function () {
  var KEY = "visit-energy-v1";
  var store = null;
  try {
    store = window.sessionStorage;
    store.getItem(KEY);
  } catch (error) {
    store = null;
  }

  function emptyTotals() {
    return { pages: 0, bytes: 0, visibleMs: 0, bytesUnknown: false };
  }

  function readTotals() {
    if (!store) return emptyTotals();
    try {
      var saved = JSON.parse(store.getItem(KEY));
      return saved && typeof saved.bytes === "number" && typeof saved.visibleMs === "number" ? saved : emptyTotals();
    } catch (error) {
      return emptyTotals();
    }
  }

  function writeTotals(totals) {
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify(totals));
    } catch (error) {
      // Storage full or blocked: the estimate then covers only the current page.
    }
  }

  // This page's measurements, and how much of them is already in the tab totals.
  var page = { bytes: 0, visibleMs: 0, bytesUnknown: false };
  var saved = { counted: false, bytes: 0, visibleMs: 0 };
  var visibleSince = document.visibilityState === "visible" ? performance.now() : null;

  function addEntry(entry) {
    if (typeof entry.transferSize === "number") page.bytes += entry.transferSize;
    else page.bytesUnknown = true;
  }

  if ("PerformanceObserver" in window) {
    ["navigation", "resource"].forEach(function (type) {
      try {
        new PerformanceObserver(function (list) { list.getEntries().forEach(addEntry); })
          .observe({ type: type, buffered: true });
      } catch (error) {
        page.bytesUnknown = true;
      }
    });
  } else {
    page.bytesUnknown = true;
  }

  function pageVisibleMs() {
    return page.visibleMs + (visibleSince === null ? 0 : performance.now() - visibleSince);
  }

  function stopClock() {
    if (visibleSince !== null) {
      page.visibleMs += performance.now() - visibleSince;
      visibleSince = null;
    }
  }

  function save() {
    var totals = readTotals();
    var visibleMs = pageVisibleMs();
    if (!saved.counted) {
      totals.pages += 1;
      saved.counted = true;
    }
    totals.bytes += page.bytes - saved.bytes;
    totals.visibleMs += visibleMs - saved.visibleMs;
    totals.bytesUnknown = totals.bytesUnknown || page.bytesUnknown;
    saved.bytes = page.bytes;
    saved.visibleMs = visibleMs;
    writeTotals(totals);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      stopClock();
      save();
    } else if (visibleSince === null) {
      visibleSince = performance.now();
    }
  });
  window.addEventListener("pagehide", function () {
    stopClock();
    save();
  });
  window.addEventListener("pageshow", function (event) {
    // Restored from the back/forward cache: nothing new is downloaded, but time counts again.
    if (event.persisted && document.visibilityState === "visible" && visibleSince === null) {
      visibleSince = performance.now();
    }
  });

  var panel = document.getElementById("visit-energy");
  if (!panel) return;

  function liveTotals() {
    var totals = readTotals();
    return {
      pages: totals.pages + (saved.counted ? 0 : 1),
      bytes: totals.bytes + page.bytes - saved.bytes,
      visibleMs: totals.visibleMs + pageVisibleMs() - saved.visibleMs,
      bytesUnknown: totals.bytesUnknown || page.bytesUnknown
    };
  }

  var fields = {};
  ["pages", "bytes", "time", "data-centres", "networks", "device", "total", "total-wh", "power-note"].forEach(function (name) {
    fields[name] = document.getElementById("ve-" + name);
  });
  var presets = panel.querySelectorAll('input[name="device-power"]');
  var custom = document.getElementById("ve-custom-watts");

  function deviceWatts() {
    var checked = panel.querySelector('input[name="device-power"]:checked');
    if (!checked) return VisitEnergy.DEVICE_PRESETS.laptop;
    if (checked.value === "custom") {
      var value = Number(custom.value);
      return isFinite(value) && value >= 0 ? value : 0;
    }
    return Number(checked.value);
  }

  // Default guess: a phone or tablet if the main pointer is a finger, otherwise a laptop.
  var touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var guess = panel.querySelector('input[name="device-power"][data-preset="' + (touch ? "phone" : "laptop") + '"]');
  if (guess) guess.checked = true;
  fields["power-note"].textContent = "Guessed from your screen’s pointer; change it to match your device.";
  presets.forEach(function (input) {
    input.addEventListener("change", function () {
      fields["power-note"].textContent = "";
      render();
    });
  });
  custom.addEventListener("input", function () {
    panel.querySelector('input[name="device-power"][value="custom"]').checked = true;
    fields["power-note"].textContent = "";
    render();
  });

  function render() {
    var totals = liveTotals();
    var seconds = totals.visibleMs / 1000;
    var bytes = totals.bytesUnknown ? 0 : totals.bytes;
    var energy = VisitEnergy.estimate(bytes, seconds, deviceWatts());
    fields.pages.textContent = String(totals.pages);
    fields.time.textContent = VisitEnergy.formatDuration(seconds);
    if (totals.bytesUnknown) {
      fields.bytes.textContent = "not reported by this browser";
      fields["data-centres"].textContent = "—";
      fields.networks.textContent = "—";
    } else {
      fields.bytes.textContent = VisitEnergy.formatBytes(totals.bytes);
      fields["data-centres"].textContent = VisitEnergy.formatEnergy(energy.dataCentres);
      fields.networks.textContent = VisitEnergy.formatEnergy(energy.networks);
    }
    fields.device.textContent = VisitEnergy.formatEnergy(energy.device);
    fields.total.textContent = "≈ " + VisitEnergy.formatEnergy(energy.total);
    fields["total-wh"].textContent = "(" + (energy.total / 3600).toPrecision(2) + " Wh)";
  }

  var timer = null;
  function startUpdates() {
    if (timer === null) timer = setInterval(render, 1000);
  }
  function stopUpdates() {
    clearInterval(timer);
    timer = null;
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      render();
      startUpdates();
    } else {
      stopUpdates();
    }
  });
  panel.hidden = false;
  render();
  if (document.visibilityState === "visible") startUpdates();
}());
