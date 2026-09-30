/**
 * Styled dropdowns on the in-app visitor view and preview. Published pages load
 * `vendor/select.js`, which is the same logic in plain JS — keep the two in step.
 * The real `<select>` underneath always holds the value, so forms post and validate as usual.
 */

const READY = "is-ready";
const OPEN = "is-open";

type Parts = { root: HTMLElement; native: HTMLSelectElement; trigger: HTMLButtonElement; list: HTMLElement; value: HTMLElement };

const partsOf = (root: HTMLElement): Parts | null => {
	const native = root.querySelector<HTMLSelectElement>("select");
	const trigger = root.querySelector<HTMLButtonElement>(".np-select__trigger");
	const list = root.querySelector<HTMLElement>(".np-select__list");
	const value = root.querySelector<HTMLElement>(".np-select__value");
	return native && trigger && list && value ? { root, native, trigger, list, value } : null;
};

const optionsOf = (list: HTMLElement): HTMLElement[] => [...list.querySelectorAll<HTMLElement>('[role="option"]')];

function setActive(parts: Parts, option: HTMLElement | undefined): void {
	optionsOf(parts.list).forEach((item) => item.classList.toggle("is-active", item === option));
	if (!option) return;
	parts.list.setAttribute("aria-activedescendant", option.id);
	option.scrollIntoView?.({ block: "nearest" });
}

function open(parts: Parts): void {
	if (parts.native.disabled) return;
	parts.root.classList.add(OPEN);
	parts.list.hidden = false;
	parts.trigger.setAttribute("aria-expanded", "true");
	const selected = optionsOf(parts.list).find((item) => item.getAttribute("aria-selected") === "true");
	setActive(parts, selected ?? optionsOf(parts.list)[0]);
	parts.list.focus();
}

function close(parts: Parts, { refocus }: { refocus: boolean }): void {
	parts.root.classList.remove(OPEN);
	parts.list.hidden = true;
	parts.trigger.setAttribute("aria-expanded", "false");
	parts.list.removeAttribute("aria-activedescendant");
	if (refocus) parts.trigger.focus();
}

function choose(parts: Parts, option: HTMLElement): void {
	const value = option.getAttribute("data-value") ?? "";
	parts.native.value = value;
	parts.native.dispatchEvent(new Event("change", { bubbles: true }));
	optionsOf(parts.list).forEach((item) => item.setAttribute("aria-selected", item === option ? "true" : "false"));
	parts.value.textContent = option.textContent ?? "";
	parts.value.classList.remove("is-placeholder");
	close(parts, { refocus: true });
}

/** Keys on the open list: arrows, Home/End, Enter or Space to pick, Escape or Tab to leave, letters to jump. */
function onListKey(parts: Parts, event: KeyboardEvent): void {
	const items = optionsOf(parts.list);
	const current = items.findIndex((item) => item.classList.contains("is-active"));
	const move = (index: number) => {
		event.preventDefault();
		setActive(parts, items[Math.max(0, Math.min(items.length - 1, index))]);
	};
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
		close(parts, { refocus: true });
		return;
	}
	if (event.key === "Tab") {
		close(parts, { refocus: false });
		return;
	}
	if (event.key.length === 1 && /\S/.test(event.key)) {
		const letter = event.key.toLowerCase();
		const after = [...items.slice(current + 1), ...items.slice(0, current + 1)];
		const match = after.find((item) => (item.textContent ?? "").trim().toLowerCase().startsWith(letter));
		if (match) setActive(parts, match);
	}
}

function enhance(root: HTMLElement): (() => void) | null {
	const parts = partsOf(root);
	if (!parts || root.dataset.npSelectReady === "true") return null;
	root.dataset.npSelectReady = "true";
	root.classList.add(READY);

	const onTrigger = () => (root.classList.contains(OPEN) ? close(parts, { refocus: true }) : open(parts));
	const onTriggerKey = (event: KeyboardEvent) => {
		if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
			event.preventDefault();
			open(parts);
		}
	};
	const onPick = (event: MouseEvent) => {
		const option = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="option"]');
		if (option) choose(parts, option);
	};
	const onHover = (event: MouseEvent) => {
		const option = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="option"]');
		if (option) setActive(parts, option);
	};
	const onKey = (event: KeyboardEvent) => onListKey(parts, event);
	const onOutside = (event: MouseEvent) => {
		if (root.classList.contains(OPEN) && !root.contains(event.target as Node)) close(parts, { refocus: false });
	};
	// The label points at the hidden select; send its click to the visible button instead.
	const label = root.querySelector<HTMLLabelElement>("label");
	const onLabel = (event: MouseEvent) => {
		event.preventDefault();
		parts.trigger.focus();
	};

	parts.trigger.addEventListener("click", onTrigger);
	parts.trigger.addEventListener("keydown", onTriggerKey);
	parts.list.addEventListener("click", onPick);
	parts.list.addEventListener("mousemove", onHover);
	parts.list.addEventListener("keydown", onKey);
	label?.addEventListener("click", onLabel);
	document.addEventListener("mousedown", onOutside);

	return () => {
		parts.trigger.removeEventListener("click", onTrigger);
		parts.trigger.removeEventListener("keydown", onTriggerKey);
		parts.list.removeEventListener("click", onPick);
		parts.list.removeEventListener("mousemove", onHover);
		parts.list.removeEventListener("keydown", onKey);
		label?.removeEventListener("click", onLabel);
		document.removeEventListener("mousedown", onOutside);
		delete root.dataset.npSelectReady;
	};
}

/** Turns every dropdown on the page into the styled one; returns a function that undoes it. */
export function initSelects(): () => void {
	if (typeof document === "undefined") return () => {};
	const cleanups = [...document.querySelectorAll<HTMLElement>("[data-np-select]")]
		.map(enhance)
		.filter((cleanup): cleanup is () => void => cleanup !== null);
	return () => cleanups.forEach((cleanup) => cleanup());
}
