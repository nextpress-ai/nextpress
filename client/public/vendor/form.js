/*
 * Form blocks on published pages: send in the background and show the answer in place. Same logic
 * as shared/form-runtime.ts (used by the in-app view) — keep the two in step. Without this script
 * the browser posts the form normally and the server answers with a small page.
 */
(function () {
  var SENDING_ATTR = "data-np-form-sending";
  var OFFLINE_MESSAGE = "Your message couldn't be sent. Check your connection and try again.";

  function setStatus(form, text, tone) {
    var status = form.querySelector(".wp-block-form__status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-success", tone === "success");
    status.classList.toggle("is-error", tone === "error");
  }

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  // The "sent" popup for a form, made once and reused. Null where the browser has no <dialog>.
  function getSentDialog(form) {
    var formId = form.getAttribute("data-np-form") || "";
    var existing = document.querySelector('dialog[data-np-form-sent="' + CSS.escape(formId) + '"]');
    if (existing) return existing;
    var dialog = document.createElement("dialog");
    if (typeof dialog.showModal !== "function") return null;
    var messageId = "np-form-sent-" + formId;
    dialog.className = "np-form-sent";
    dialog.setAttribute("data-np-form-sent", formId);
    dialog.setAttribute("aria-labelledby", messageId);
    dialog.innerHTML =
      '<form method="dialog" class="np-form-sent__panel"><span class="np-form-sent__icon">' +
      CHECK_ICON +
      '</span><p class="np-form-sent__message" id="' +
      messageId +
      '"></p><button type="submit" class="np-form-sent__done">Done</button></form>';
    // A click on the backdrop lands on the dialog itself; clicks inside land on the panel.
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    // Next to the form (not in <body>) so it inherits the page font; a closed dialog takes no space.
    form.after(dialog);
    return dialog;
  }

  // Clears the form and confirms in a popup; falls back to the message in place of the form.
  function showSent(form, message) {
    var dialog = getSentDialog(form);
    if (!dialog) {
      form.classList.add("is-sent");
      setStatus(form, message, "success");
      return;
    }
    form.reset();
    setStatus(form, "", "success");
    var text = dialog.querySelector(".np-form-sent__message");
    if (text) text.textContent = message;
    dialog.showModal();
    var done = dialog.querySelector(".np-form-sent__done");
    if (done) done.focus();
  }

  function readValues(form) {
    var values = {};
    new FormData(form).forEach(function (value, key) {
      if (key !== "np_form" && typeof value === "string") values[key] = value;
    });
    return values;
  }

  function setBusy(form, busy) {
    if (busy) form.setAttribute(SENDING_ATTR, "");
    else form.removeAttribute(SENDING_ATTR);
    form.setAttribute("aria-busy", busy ? "true" : "false");
    form.querySelectorAll('button[type="submit"]').forEach(function (button) {
      button.disabled = busy;
    });
  }

  function sendForm(form) {
    var formId = form.getAttribute("data-np-form");
    if (!formId || form.hasAttribute(SENDING_ATTR)) return;
    setBusy(form, true);
    fetch("/api/forms/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId: formId, values: readValues(form) }),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          body.ok = response.ok;
          return body;
        });
      })
      .catch(function (error) {
        console.error("[forms] Send failed", { formId: formId, error: error });
        return { ok: false, message: OFFLINE_MESSAGE };
      })
      .then(function (answer) {
        setBusy(form, false);
        if (answer.ok) {
          showSent(form, answer.message || "Thanks!");
          return;
        }
        setStatus(form, answer.message || OFFLINE_MESSAGE, "error");
        if (answer.field) {
          var field = form.querySelector('[name="' + CSS.escape(answer.field) + '"]');
          if (field) field.focus();
        }
      });
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-np-form")) return;
    event.preventDefault();
    sendForm(form);
  });
})();
