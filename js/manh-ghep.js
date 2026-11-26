/* Mảnh ghép — tile-assembly reveal for the Lumia 909 photo gallery.
 * Pure vanilla JS, no dependencies. Applies ONLY to .gallery-item photos
 * (11 images in "KHOẢNH KHẮC 909"); videos (notte / clipfull) are untouched.
 *
 * How it works: when a gallery photo first enters the viewport
 * (IntersectionObserver, rootMargin 80px), an overlay of tiles is built
 * over it — each tile shows the matching slice of the same photo — and
 * the tiles fly in from small random offsets + fade in, staggered ~38ms
 * (desktop 5x4 = 20 tiles, ~1.0s total; mobile 4x3 = 12 tiles).
 * When assembled, the overlay is removed and the real <img> (with its
 * .flycam drift, if any) is revealed — the swap is seamless because the
 * tiles reproduce the photo's object-fit:cover crop exactly.
 *
 * Degradation: no IntersectionObserver or prefers-reduced-motion → the
 * effect never arms and photos show normally. A photo whose image fails
 * to load is never armed either.
 */
(function () {
  "use strict";

  var DESKTOP_COLS = 5, DESKTOP_ROWS = 4;   /* 20 tiles */
  var MOBILE_COLS = 4, MOBILE_ROWS = 3;     /* 12 tiles, small screens */
  var STAGGER_MS = 38;
  var ROOT_MARGIN = "80px";

  function init() {
    if (!("IntersectionObserver" in window)) return; /* show photos normally */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var items = document.querySelectorAll(".gallery-item");
    if (!items.length) return;

    var small = window.matchMedia("(max-width: 767px)").matches;
    var cols = small ? MOBILE_COLS : DESKTOP_COLS;
    var rows = small ? MOBILE_ROWS : DESKTOP_ROWS;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var item = entry.target;
        observer.unobserve(item);
        reveal(item, cols, rows);
      });
    }, { rootMargin: ROOT_MARGIN });

    Array.prototype.forEach.call(items, function (item) {
      observer.observe(item);
    });
  }

  /* Wait until the photo itself has loaded so tiles never assemble blank. */
  function reveal(item, cols, rows) {
    if (item.dataset.mgDone) return;
    var img = item.querySelector("img");
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      play(item, img, cols, rows);
    } else {
      img.addEventListener("load", function onLoad() {
        img.removeEventListener("load", onLoad);
        play(item, img, cols, rows);
      });
      img.addEventListener("error", function onErr() {
        img.removeEventListener("error", onErr);
        /* Leave the photo as-is (broken image icon is the browser's own). */
      });
    }
  }

  function play(item, img, cols, rows) {
    if (item.dataset.mgDone) return;
    item.dataset.mgDone = "1";

    /* Arm first: hides the base <img> and pauses its .flycam drift. */
    item.classList.add("mg-armed");

    var overlay = document.createElement("div");
    overlay.className = "mg-tiles";
    overlay.setAttribute("aria-hidden", "true");

    var total = cols * rows;
    var lastDelay = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var tile = document.createElement("div");
        tile.className = "mg-tile";
        var dx = (Math.random() * 28 - 14).toFixed(1) + "px";
        var dy = (Math.random() * 20 - 10).toFixed(1) + "px";
        var delay = idx * STAGGER_MS + Math.floor(Math.random() * 12);
        if (delay > lastDelay) lastDelay = delay;
        tile.style.setProperty("--col", c);
        tile.style.setProperty("--row", r);
        tile.style.setProperty("--cols", cols);
        tile.style.setProperty("--rows", rows);
        tile.style.setProperty("--dx", dx);
        tile.style.setProperty("--dy", dy);
        tile.style.setProperty("--d", delay + "ms");
        var clone = document.createElement("img");
        clone.src = img.currentSrc || img.src;
        clone.alt = "";
        clone.setAttribute("aria-hidden", "true");
        tile.appendChild(clone);
        overlay.appendChild(tile);
      }
    }
    item.appendChild(overlay);

    /* Two frames so the initial (hidden/offset) state paints before .mg-play. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("mg-play");
      });
    });

    /* Assembled: drop the overlay, un-arm the item — the real <img> takes
     * over seamlessly and its .flycam drift resumes from scale(1). */
    var cleanupMs = lastDelay + 380;
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      item.classList.remove("mg-armed");
    }, cleanupMs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
