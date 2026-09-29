/**
 * Opens and closes popups (`<dialog data-np-popup>`) from `#popup-<name>` links, the page
 * address, the close button and the backdrop. Used by the in-app visitor view and preview;
 * published pages load the same logic as plain JavaScript (`client/public/vendor/popup.js`).
 * Keep the two in step.
 */

const HASH_PREFIX = "#popup-";

const findPopup = (slug: string): HTMLDialogElement | null =>
	document.querySelector<HTMLDialogElement>(`dialog[data-np-popup="${CSS.escape(slug)}"]`);

/** Opens a popup by name. Returns false when the page has no such popup. */
export function openPopup(slug: string, trigger?: Element | null): boolean {
	const dialog = findPopup(slug);
	if (!dialog || typeof dialog.showModal !== "function") return false;
	if (dialog.open) return true;
	const root = document.documentElement;
	const previousOverflow = root.style.overflow;
	dialog.showModal();
	root.style.overflow = "hidden";
	// Watch the `open` attribute rather than the `close` event: some browsers deliver `close` late
	// (or not at all in background tabs), which left the page unable to scroll after closing.
	const watcher = new MutationObserver(() => {
		if (dialog.open) return;
		watcher.disconnect();
		root.style.overflow = previousOverflow;
		if (location.hash === `${HASH_PREFIX}${slug}`) {
			history.replaceState(null, "", location.pathname + location.search);
		}
		if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
	});
	watcher.observe(dialog, { attributes: true, attributeFilter: ["open"] });
	return true;
}

const handleClick = (event: MouseEvent): void => {
	const target = event.target instanceof Element ? event.target : null;
	if (!target) return;

	const link = target.closest<HTMLAnchorElement>(`a[href^="${HASH_PREFIX}"]`);
	if (link) {
		const slug = link.getAttribute("href")?.slice(HASH_PREFIX.length) ?? "";
		if (slug && openPopup(slug, link)) event.preventDefault();
		return;
	}

	const close = target.closest("[data-np-popup-close]");
	if (close) {
		close.closest("dialog")?.close();
		return;
	}

	// A click on the dialog itself (not its card) is a click on the backdrop.
	if (target instanceof HTMLDialogElement && target.matches("dialog[data-np-popup]")) {
		if (target.dataset.closeOnBackdrop === "true") target.close();
	}
};

const openFromAddress = (): void => {
	if (location.hash.startsWith(HASH_PREFIX)) openPopup(location.hash.slice(HASH_PREFIX.length));
};

/** Starts listening; returns a function that stops. Safe to call again after the page changes. */
export function initPopups(): () => void {
	if (typeof document === "undefined") return () => {};
	document.addEventListener("click", handleClick);
	window.addEventListener("hashchange", openFromAddress);
	openFromAddress();
	return () => {
		document.removeEventListener("click", handleClick);
		window.removeEventListener("hashchange", openFromAddress);
	};
}
