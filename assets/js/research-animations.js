"use strict";

var motionControls = document.querySelectorAll(".motion-control");
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
var activeControl = null;
var animationTimer;

function stopAnimation() {
  clearTimeout(animationTimer);
  if (activeControl) {
    activeControl.closest(".research-figure").classList.remove("is-playing");
    activeControl.textContent = "Play animation";
    activeControl = null;
  }
}

function updateMotionControls() {
  if (reducedMotion.matches) stopAnimation();
  motionControls.forEach(function (control) {
    control.hidden = reducedMotion.matches;
  });
}

motionControls.forEach(function (control) {
  control.addEventListener("click", function () {
    var wasPlaying = activeControl === control;
    stopAnimation();
    if (!wasPlaying) {
      activeControl = control;
      control.closest(".research-figure").classList.add("is-playing");
      control.textContent = "Stop animation";
      animationTimer = setTimeout(stopAnimation, Number(control.dataset.duration) || 6000);
    }
  });
});

document.addEventListener("visibilitychange", function () {
  if (document.hidden) stopAnimation();
});
reducedMotion.addEventListener("change", updateMotionControls);
updateMotionControls();

// Stepped infographics (the lattice and window figures): the steps switch between exactly
// defined pictures. Nothing is drawn or swept along Euclidean time.
document.querySelectorAll(".stepped-figure").forEach(function (figure) {
  var controls = figure.querySelector(".step-controls");
  var stepButtons = figure.querySelectorAll("[data-step-to]");
  var playButton = figure.querySelector(".step-play");
  var lastStep = stepButtons.length;
  var playTimer = null;

  function showStep(step) {
    figure.dataset.step = String(step);
    stepButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.stepTo === String(step)));
    });
  }

  function stopPlaying() {
    clearTimeout(playTimer);
    playTimer = null;
    playButton.textContent = "Play steps";
  }

  function playFrom(step) {
    showStep(step);
    if (step < lastStep) {
      playTimer = setTimeout(function () { playFrom(step + 1); }, 5000);
    } else {
      stopPlaying();
    }
  }

  stepButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      stopPlaying();
      showStep(Number(button.dataset.stepTo));
    });
  });

  playButton.addEventListener("click", function () {
    if (playTimer) {
      stopPlaying();
      return;
    }
    playButton.textContent = "Stop";
    playFrom(1);
  });

  function updatePlayButton() {
    if (reducedMotion.matches) stopPlaying();
    playButton.hidden = reducedMotion.matches;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopPlaying();
  });
  reducedMotion.addEventListener("change", updatePlayButton);
  updatePlayButton();
  showStep(Number(figure.dataset.defaultStep) || 1);
  controls.hidden = false;
});
