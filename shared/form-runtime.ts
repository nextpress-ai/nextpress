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
		form.classList.add("is-sent");
		setStatus(form, answer.message ?? "Thanks!", "success");
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
