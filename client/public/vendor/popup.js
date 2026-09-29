/*
 * Popups on published pages: `#popup-<name>` links, the page address, the close button and the
 * backdrop open and close `<dialog data-np-popup>`. Same logic as shared/popup-runtime.ts (used
 * by the in-app view) — keep the two in step.
 */
(function () {
  var HASH_PREFIX = "#popup-";

  function findPopup(slug) {
    var safe = window.CSS && CSS.escape ? CSS.escape(slug) : slug.replace(/[^a-z0-9-]/g, "");
    return document.querySelector('dialog[data-np-popup="' + safe + '"]');
  }

  function openPopup(slug, trigger) {
    var dialog = findPopup(slug);
    if (!dialog || typeof dialog.showModal !== "function") return false;
    if (dialog.open) return true;
    var root = document.documentElement;
    var previousOverflow = root.style.overflow;
    dialog.showModal();
    root.style.overflow = "hidden";
    // Watch the open attribute, not the close event (it can arrive late or not at all).
    var watcher = new MutationObserver(function () {
      if (dialog.open) return;
      watcher.disconnect();
      root.style.overflow = previousOverflow;
      if (location.hash === HASH_PREFIX + slug) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
    });
    watcher.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return true;
  }

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var link = target.closest('a[href^="' + HASH_PREFIX + '"]');
    if (link) {
      var slug = (link.getAttribute("href") || "").slice(HASH_PREFIX.length);
      if (slug && openPopup(slug, link)) event.preventDefault();
      return;
    }

    var close = target.closest("[data-np-popup-close]");
    if (close) {
      var owner = close.closest("dialog");
      if (owner) owner.close();
      return;
    }

    // A click on the dialog itself (not its card) is a click on the backdrop.
    if (target.tagName === "DIALOG" && target.hasAttribute("data-np-popup")) {
      if (target.getAttribute("data-close-on-backdrop") === "true") target.close();
    }
  });

  function openFromAddress() {
    if (location.hash.indexOf(HASH_PREFIX) === 0) openPopup(location.hash.slice(HASH_PREFIX.length));
  }

  window.addEventListener("hashchange", openFromAddress);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openFromAddress, { once: true });
  } else {
    openFromAddress();
  }
})();
