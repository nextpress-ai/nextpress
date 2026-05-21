import {
	ENTRY_ANIMATION_DEFAULTS,
	ENTRY_ANIMATION_PLAYED_CLASS,
} from "@shared/animation-utils";

type Disconnect = () => void;

let activeDisconnect: Disconnect | null = null;

function runWhenPageReady(callback: () => void): void {
	const run = () => {
		requestAnimationFrame(() => {
			requestAnimationFrame(callback);
		});
	};

	const start = () => {
		if (document.fonts?.ready) {
			void document.fonts.ready.then(run).catch(run);
			return;
		}
		run();
	};

	if (document.readyState === "complete") {
		start();
		return;
	}

	window.addEventListener("load", start, { once: true });
}

function playEntryAnimation(el: HTMLElement): void {
	const name = el.getAttribute("data-np-entry");
	if (!name || el.classList.contains(ENTRY_ANIMATION_PLAYED_CLASS)) return;

	const duration = Number(el.getAttribute("data-np-entry-duration") || ENTRY_ANIMATION_DEFAULTS.duration);
	const delay = Number(el.getAttribute("data-np-entry-delay") || 0);

	el.style.setProperty("--animate-duration", `${duration}ms`);
	el.style.animationDelay = delay > 0 ? `${delay}ms` : "";

	el.classList.add("animate__animated", `animate__${name}`, ENTRY_ANIMATION_PLAYED_CLASS);
}

function observeEntryAnimations(): Disconnect {
	const offset = ENTRY_ANIMATION_DEFAULTS.offset;
	const elements = document.querySelectorAll<HTMLElement>("[data-np-entry]");

	if (elements.length === 0) {
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;

				const el = entry.target as HTMLElement;
				playEntryAnimation(el);

				const once = el.getAttribute("data-np-entry-once") !== "false";
				if (once) {
					observer.unobserve(el);
				}
			});
		},
		{
			rootMargin: `0px 0px -${offset}px 0px`,
			threshold: 0,
		},
	);

	elements.forEach((el) => {
		if (!el.classList.contains(ENTRY_ANIMATION_PLAYED_CLASS)) {
			observer.observe(el);
		}
	});

	return () => observer.disconnect();
}

/**
 * Initializes scroll-triggered entry animations using Animate.css + IntersectionObserver.
 * Replaces AOS — stock AOS cannot apply animate.css class names from data-aos values.
 */
export function initEntryAnimations(): void {
	runWhenPageReady(() => {
		activeDisconnect?.();
		activeDisconnect = observeEntryAnimations();
	});
}

/** Resets runtime state — for tests only. */
export function resetEntryAnimationRuntimeForTests(): void {
	activeDisconnect?.();
	activeDisconnect = null;
}

/** @deprecated Use initEntryAnimations — kept for existing call sites. */
export const initBlockAnimations = initEntryAnimations;

/** @deprecated Use resetEntryAnimationRuntimeForTests */
export const resetBlockAnimationRuntimeForTests = resetEntryAnimationRuntimeForTests;

/** @deprecated AOS removed; entry animations use ENTRY_ANIMATION_DEFAULTS. */
export const BLOCK_ANIMATION_AOS_OPTIONS = {
	offset: ENTRY_ANIMATION_DEFAULTS.offset,
	duration: ENTRY_ANIMATION_DEFAULTS.duration,
	once: ENTRY_ANIMATION_DEFAULTS.once,
} as const;
