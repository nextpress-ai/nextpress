/* Floating header "scrolled" look and reading-progress bar for published pages. Same logic as shared/header-scroll-observer.ts. */
(function () {
  var SCROLLED = "is-scrolled";

  function findStickyWrapper(header) {
    for (var el = header.parentElement; el; el = el.parentElement) {
      if (getComputedStyle(el).position === "sticky") return el;
    }
    return null;
  }

  function observeHeader(header) {
    var wrapper = findStickyWrapper(header);
    if (!wrapper || !wrapper.parentElement || typeof IntersectionObserver === "undefined") return;

    var marker = document.createElement("div");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = "height:1px;margin:0 0 -1px;pointer-events:none;visibility:hidden;flex:none";
    wrapper.parentElement.insertBefore(marker, wrapper);

    new IntersectionObserver(
      function (entries) {
        var latest = entries[entries.length - 1];
        if (!latest) return;
        var top = latest.rootBounds ? latest.rootBounds.top : 0;
        header.classList.toggle(SCROLLED, !latest.isIntersecting && latest.boundingClientRect.top < top);
      },
      { threshold: 0 }
    ).observe(marker);
  }

  // Reading progress: CSS fills the bar where browsers tie animations to scrolling; elsewhere
  // this sets --np-read-progress (0-1), at most once per frame. Same as observeReadingProgress.
  function fillProgressBars() {
    if (window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()")) return;
    var bars = document.querySelectorAll(".wp-block-header__progress");
    if (!bars.length) return;
    var scroller = document.scrollingElement || document.documentElement;
    var frame = 0;
    function update() {
      frame = 0;
      var max = scroller.scrollHeight - scroller.clientHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
      for (var i = 0; i < bars.length; i += 1) bars[i].style.setProperty("--np-read-progress", progress.toFixed(4));
    }
    window.addEventListener("scroll", function () {
      if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function init() {
    var headers = document.querySelectorAll(".wp-block-header.is-sticky");
    for (var i = 0; i < headers.length; i += 1) observeHeader(headers[i]);
    fillProgressBars();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
