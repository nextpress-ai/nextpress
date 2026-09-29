import { useEffect, type RefObject } from "react";
import { observeFloatingHeader, observeReadingProgress } from "./header-scroll-observer.js";

/**
 * Watches the header inside `containerRef` while `enabled`, so its scrolled look switches on and
 * off as the page moves. `refreshKey` should change whenever the header re-renders with new
 * settings, so the class is put back if React rewrote it. Inside the editor the scrolling area
 * is the canvas, found through its `data-npb-canvas-scroller` marker.
 */
export function useHeaderScroll({
	containerRef,
	enabled,
	refreshKey,
}: {
	containerRef: RefObject<HTMLElement | null>;
	enabled: boolean;
	refreshKey?: unknown;
}): void {
	useEffect(() => {
		const header = containerRef.current?.querySelector<HTMLElement>(".wp-block-header");
		if (!enabled || !header) return undefined;
		return observeFloatingHeader({ header, root: header.closest("[data-npb-canvas-scroller]") });
	}, [containerRef, enabled, refreshKey]);
}

/**
 * Keeps the header's reading-progress bar filled (see `observeReadingProgress`). `enabled` is the
 * header's "Show reading progress" setting; in the editor the canvas is the scrolling area.
 */
export function useReadingProgress({
	containerRef,
	enabled,
	refreshKey,
}: {
	containerRef: RefObject<HTMLElement | null>;
	enabled: boolean;
	refreshKey?: unknown;
}): void {
	useEffect(() => {
		const bar = containerRef.current?.querySelector<HTMLElement>(".wp-block-header__progress");
		if (!enabled || !bar) return undefined;
		return observeReadingProgress({ bar, root: bar.closest("[data-npb-canvas-scroller]") });
	}, [containerRef, enabled, refreshKey]);
}
