"use strict";

renderMathInElement(document.querySelector(".article-body"), {
  delimiters: [
    { left: "$$", right: "$$", display: true },
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false }
  ],
  throwOnError: false,
  trust: false
});
