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
          form.classList.add("is-sent");
          setStatus(form, answer.message || "Thanks!", "success");
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
