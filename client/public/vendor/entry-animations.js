(function () {
  var PLAYED = "np-entry-played";
  var OFFSET = 120;

  function playEntry(el) {
    var name = el.getAttribute("data-np-entry");
    if (!name || el.classList.contains(PLAYED)) return;

    var duration = Number(el.getAttribute("data-np-entry-duration") || 1000);
    var delay = Number(el.getAttribute("data-np-entry-delay") || 0);

    el.style.setProperty("--animate-duration", duration + "ms");
    el.style.animationDelay = delay > 0 ? delay + "ms" : "";

    el.classList.add("animate__animated", "animate__" + name, PLAYED);
  }

  function observeEntryAnimations() {
    var elements = document.querySelectorAll("[data-np-entry]");
    if (!elements.length) return function () {};

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          playEntry(el);
          if (el.getAttribute("data-np-entry-once") !== "false") {
            observer.unobserve(el);
          }
        });
      },
      { rootMargin: "0px 0px -" + OFFSET + "px 0px", threshold: 0 }
    );

    elements.forEach(function (el) {
      if (!el.classList.contains(PLAYED)) observer.observe(el);
    });

    return function () {
      observer.disconnect();
    };
  }

  var activeDisconnect = null;

  function runWhenReady(fn) {
    function run() {
      requestAnimationFrame(function () {
        requestAnimationFrame(fn);
      });
    }
    if (document.readyState === "complete") {
      run();
      return;
    }
    window.addEventListener("load", run, { once: true });
  }

  window.initEntryAnimations = function () {
    runWhenReady(function () {
      if (activeDisconnect) activeDisconnect();
      activeDisconnect = observeEntryAnimations();
    });
  };
})();
