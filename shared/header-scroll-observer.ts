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

/** True when the browser can fill the progress bar from page scrolling with CSS alone. */
export function supportsScrollTimeline(): boolean {
	return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: scroll()");
}

/**
 * Fills a header's reading-progress bar by setting `--np-read-progress` (0–1) as the page (or,
 * in the editor, the canvas `root`) scrolls. Skipped for the page itself where CSS already does
 * it. Updates at most once per frame. Returns a function that stops.
 */
export function observeReadingProgress({ bar, root }: { bar: HTMLElement; root?: Element | null }): () => void {
	if (!root && supportsScrollTimeline()) return () => undefined;
	const scroller = root ?? document.scrollingElement ?? document.documentElement;
	const target: Element | Window = root ?? window;
	let frame = 0;
	const update = () => {
		frame = 0;
		const max = scroller.scrollHeight - scroller.clientHeight;
		const progress = max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
		bar.style.setProperty("--np-read-progress", progress.toFixed(4));
	};
	const onScroll = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};
	target.addEventListener("scroll", onScroll, { passive: true });
	update();
	return () => {
		target.removeEventListener("scroll", onScroll);
		if (frame) cancelAnimationFrame(frame);
	};
}
