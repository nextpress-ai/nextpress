/*
 * Styled dropdowns on published pages. Same logic as shared/select-runtime.ts (used by the in-app
 * view) — keep the two in step. Without this script the plain dropdown underneath shows and works.
 */
(function () {
  var READY = "is-ready";
  var OPEN = "is-open";

  function optionsOf(list) {
    return Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));
  }

  function setActive(parts, option) {
    optionsOf(parts.list).forEach(function (item) {
      item.classList.toggle("is-active", item === option);
    });
    if (!option) return;
    parts.list.setAttribute("aria-activedescendant", option.id);
    if (option.scrollIntoView) option.scrollIntoView({ block: "nearest" });
  }

  function open(parts) {
    if (parts.native.disabled) return;
    parts.root.classList.add(OPEN);
    parts.list.hidden = false;
    parts.trigger.setAttribute("aria-expanded", "true");
    var items = optionsOf(parts.list);
    var selected = items.filter(function (item) {
      return item.getAttribute("aria-selected") === "true";
    })[0];
    setActive(parts, selected || items[0]);
    parts.list.focus();
  }

  function close(parts, refocus) {
    parts.root.classList.remove(OPEN);
    parts.list.hidden = true;
    parts.trigger.setAttribute("aria-expanded", "false");
    parts.list.removeAttribute("aria-activedescendant");
    if (refocus) parts.trigger.focus();
  }

  function choose(parts, option) {
    parts.native.value = option.getAttribute("data-value") || "";
    parts.native.dispatchEvent(new Event("change", { bubbles: true }));
    optionsOf(parts.list).forEach(function (item) {
      item.setAttribute("aria-selected", item === option ? "true" : "false");
    });
    parts.value.textContent = option.textContent || "";
    parts.value.classList.remove("is-placeholder");
    close(parts, true);
  }

  function onListKey(parts, event) {
    var items = optionsOf(parts.list);
    var current = -1;
    items.forEach(function (item, index) {
      if (item.classList.contains("is-active")) current = index;
    });
    function move(index) {
      event.preventDefault();
      setActive(parts, items[Math.max(0, Math.min(items.length - 1, index))]);
    }
    if (event.key === "ArrowDown") return move(current + 1);
    if (event.key === "ArrowUp") return move(current - 1);
    if (event.key === "Home") return move(0);
    if (event.key === "End") return move(items.length - 1);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (items[current]) choose(parts, items[current]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close(parts, true);
      return;
    }
    if (event.key === "Tab") {
      close(parts, false);
      return;
    }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      var letter = event.key.toLowerCase();
      var after = items.slice(current + 1).concat(items.slice(0, current + 1));
      var match = after.filter(function (item) {
        return (item.textContent || "").trim().toLowerCase().indexOf(letter) === 0;
      })[0];
      if (match) setActive(parts, match);
    }
  }

  function enhance(root) {
    var parts = {
      root: root,
      native: root.querySelector("select"),
      trigger: root.querySelector(".np-select__trigger"),
      list: root.querySelector(".np-select__list"),
      value: root.querySelector(".np-select__value"),
    };
    if (!parts.native || !parts.trigger || !parts.list || !parts.value) return;
    if (root.getAttribute("data-np-select-ready") === "true") return;
    root.setAttribute("data-np-select-ready", "true");
    root.classList.add(READY);

    parts.trigger.addEventListener("click", function () {
      if (root.classList.contains(OPEN)) close(parts, true);
      else open(parts);
    });
    parts.trigger.addEventListener("keydown", function (event) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].indexOf(event.key) !== -1) {
        event.preventDefault();
        open(parts);
      }
    });
    parts.list.addEventListener("click", function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) choose(parts, option);
    });
    parts.list.addEventListener("mousemove", function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) setActive(parts, option);
    });
    parts.list.addEventListener("keydown", function (event) {
      onListKey(parts, event);
    });
    var label = root.querySelector("label");
    if (label) {
      label.addEventListener("click", function (event) {
        event.preventDefault();
        parts.trigger.focus();
      });
    }
    document.addEventListener("mousedown", function (event) {
      if (root.classList.contains(OPEN) && !root.contains(event.target)) close(parts, false);
    });
  }

  function start() {
    document.querySelectorAll("[data-np-select]").forEach(enhance);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
