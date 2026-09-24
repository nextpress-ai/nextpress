/* Floating header "scrolled" look for published pages. Same logic as shared/header-scroll-observer.ts. */
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

  function init() {
    var headers = document.querySelectorAll(".wp-block-header.is-sticky");
    for (var i = 0; i < headers.length; i += 1) observeHeader(headers[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
