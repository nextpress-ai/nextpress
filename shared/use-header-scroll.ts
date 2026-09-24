import { useEffect, type RefObject } from "react";
import { observeFloatingHeader } from "./header-scroll-observer.js";

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
