/**
 * Sends Form blocks without leaving the page, on the in-app visitor view and preview. Published
 * pages load `vendor/form.js`, which is the same logic in plain JS — keep the two in step.
 */

const SENDING_ATTR = "data-np-form-sending";
const OFFLINE_MESSAGE = "Your message couldn't be sent. Check your connection and try again.";

type SendAnswer = { ok: boolean; message?: string; field?: string };

const setStatus = (form: HTMLFormElement, text: string, tone: "success" | "error"): void => {
	const status = form.querySelector<HTMLElement>(".wp-block-form__status");
	if (!status) return;
	status.textContent = text;
	status.classList.toggle("is-success", tone === "success");
	status.classList.toggle("is-error", tone === "error");
};

const CHECK_ICON =
	'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

/** The "sent" popup for a form, made once and reused. Null where the browser has no <dialog>. */
const getSentDialog = (form: HTMLFormElement): HTMLDialogElement | null => {
	const formId = form.getAttribute("data-np-form") ?? "";
	const existing = document.querySelector<HTMLDialogElement>(`dialog[data-np-form-sent="${CSS.escape(formId)}"]`);
	if (existing) return existing;
	const dialog = document.createElement("dialog");
	if (typeof dialog.showModal !== "function") return null;
	const messageId = `np-form-sent-${formId}`;
	dialog.className = "np-form-sent";
	dialog.setAttribute("data-np-form-sent", formId);
	dialog.setAttribute("aria-labelledby", messageId);
	dialog.innerHTML = `<form method="dialog" class="np-form-sent__panel"><span class="np-form-sent__icon">${CHECK_ICON}</span><p class="np-form-sent__message" id="${messageId}"></p><button type="submit" class="np-form-sent__done">Done</button></form>`;
	// A click on the backdrop lands on the dialog itself; clicks inside land on the panel.
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});
	// Next to the form (not in <body>) so it inherits the page font; a closed dialog takes no space.
	form.after(dialog);
	return dialog;
};

/** Clears the form and confirms in a popup; falls back to the message in place of the form. */
const showSent = (form: HTMLFormElement, message: string): void => {
	const dialog = getSentDialog(form);
	if (!dialog) {
		form.classList.add("is-sent");
		setStatus(form, message, "success");
		return;
	}
	form.reset();
	setStatus(form, "", "success");
	const text = dialog.querySelector<HTMLElement>(".np-form-sent__message");
	if (text) text.textContent = message;
	dialog.showModal();
	dialog.querySelector<HTMLButtonElement>(".np-form-sent__done")?.focus();
};

const readValues = (form: HTMLFormElement): Record<string, string> => {
	const values: Record<string, string> = {};
	new FormData(form).forEach((value, key) => {
		if (key !== "np_form" && typeof value === "string") values[key] = value;
	});
	return values;
};

const setBusy = (form: HTMLFormElement, busy: boolean): void => {
	if (busy) form.setAttribute(SENDING_ATTR, "");
	else form.removeAttribute(SENDING_ATTR);
	form.setAttribute("aria-busy", busy ? "true" : "false");
	form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => {
		button.disabled = busy;
	});
};

async function sendForm(form: HTMLFormElement): Promise<void> {
	const formId = form.getAttribute("data-np-form");
	if (!formId || form.hasAttribute(SENDING_ATTR)) return;
	setBusy(form, true);
	const answer = await fetch("/api/forms/submit", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ formId, values: readValues(form) }),
	})
		.then(async (response) => ({ ...((await response.json()) as SendAnswer), ok: response.ok }))
		.catch((error: Error): SendAnswer => {
			console.error("[forms] Send failed", { atFunction: "sendForm", formId, error });
			return { ok: false, message: OFFLINE_MESSAGE };
		});
	setBusy(form, false);

	if (answer.ok) {
		showSent(form, answer.message ?? "Thanks!");
		return;
	}
	setStatus(form, answer.message ?? OFFLINE_MESSAGE, "error");
	if (answer.field) form.querySelector<HTMLElement>(`[name="${CSS.escape(answer.field)}"]`)?.focus();
}

const handleSubmit = (event: Event): void => {
	const form = event.target;
	if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-np-form")) return;
	event.preventDefault();
	void sendForm(form);
};

/** Starts listening; returns a function that stops. Safe to call again after the page changes. */
export function initForms(): () => void {
	if (typeof document === "undefined") return () => {};
	document.addEventListener("submit", handleSubmit);
	return () => document.removeEventListener("submit", handleSubmit);
}
