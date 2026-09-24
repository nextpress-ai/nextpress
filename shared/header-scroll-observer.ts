/**
 * Marks a floating header as "scrolled" once the page has moved under it, by adding the
 * `is-scrolled` class. Uses a 1px marker placed just before the header's sticky wrapper: when
 * the marker scrolls off the top, the header is stuck. No scroll listeners, so it costs almost
 * nothing while scrolling.
 *
 * `client/public/vendor/header-scroll.js` is the same logic as a plain script for published pages
 * that do not run the app; keep the two in step (a test runs both).
 */

export const HEADER_SCROLLED_CLASS = "is-scrolled";

/** The wrapper that actually sticks: the nearest ancestor with `position: sticky`. */
function findStickyWrapper(header: Element): HTMLElement | null {
	for (let el = header.parentElement; el; el = el.parentElement) {
		if (getComputedStyle(el).position === "sticky") return el;
	}
	return null;
}

/**
 * Starts watching one header. `root` is the scrolling area (the page itself when left out).
 * Returns a function that stops watching and clears the class.
 */
export function observeFloatingHeader({
	header,
	root,
}: {
	header: HTMLElement;
	root?: Element | null;
}): () => void {
	const wrapper = findStickyWrapper(header);
	if (!wrapper?.parentElement || typeof IntersectionObserver === "undefined") return () => undefined;

	const marker = document.createElement("div");
	marker.setAttribute("aria-hidden", "true");
	marker.style.cssText = "height:1px;margin:0 0 -1px;pointer-events:none;visibility:hidden;flex:none";
	wrapper.parentElement.insertBefore(marker, wrapper);

	const observer = new IntersectionObserver(
		(entries) => {
			const latest = entries[entries.length - 1];
			if (!latest) return;
			const top = latest.rootBounds?.top ?? 0;
			header.classList.toggle(HEADER_SCROLLED_CLASS, !latest.isIntersecting && latest.boundingClientRect.top < top);
		},
		{ root: root ?? null, threshold: 0 },
	);
	observer.observe(marker);

	return () => {
		observer.disconnect();
		marker.remove();
		header.classList.remove(HEADER_SCROLLED_CLASS);
	};
}
