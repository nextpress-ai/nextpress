import type { EntryAnimation, BlockAnimation, HoverAnimation, LoopAnimation } from "./schema-types";

/** Class added when a scroll entry animation has been triggered. */
export const ENTRY_ANIMATION_PLAYED_CLASS = "np-entry-played";

/**
 * Translates entry animation config to HTML attributes for the scroll observer.
 * Uses custom data-np-entry* attrs — AOS does not support Animate.css class names.
 */
export function getEntryAnimationAttributes(entry: EntryAnimation): Record<string, string> {
	const attrs: Record<string, string> = {
		"data-np-entry": entry.name,
		"data-np-entry-duration": String(entry.duration ?? 1000),
		"data-np-entry-once": String(entry.once ?? true),
	};
	if (entry.delay && entry.delay > 0) {
		attrs["data-np-entry-delay"] = String(entry.delay);
	}
	return attrs;
}

/** Hides entry-animated blocks until the scroll observer triggers them. */
export function getEntryAnimationBaseCSS(): string {
	return `[data-np-entry]:not(.${ENTRY_ANIMATION_PLAYED_CLASS}){opacity:0;}`;
}

/**
 * Generates CSS rule for a hover animation using Animate.css keyframe names.
 */
export function generateHoverAnimationCSS(blockId: string, hover: HoverAnimation): string {
	return `.block-${blockId}:hover { animation: ${hover.name} 1s both; }`;
}

/**
 * Generates CSS rule for a loop/continuous animation.
 * If block also has entry animation, scopes loop to post-entry state.
 */
export function generateLoopAnimationCSS(blockId: string, loop: LoopAnimation, hasEntry: boolean): string {
	const selector = hasEntry
		? `.block-${blockId}.${ENTRY_ANIMATION_PLAYED_CLASS}`
		: `.block-${blockId}`;
	return `${selector} { animation: ${loop.name} 1s infinite both; }`;
}

/**
 * Generates all animation CSS rules for a single block.
 * Returns empty string if no hover/loop animations configured.
 */
export function generateBlockAnimationCSS(
	blockId: string,
	animation: BlockAnimation,
	options?: { scopeLoopAfterEntry?: boolean },
): string {
	const rules: string[] = [];
	const scopeLoopAfterEntry = options?.scopeLoopAfterEntry ?? !!animation.entry;
	if (animation.hover) {
		rules.push(generateHoverAnimationCSS(blockId, animation.hover));
	}
	if (animation.loop) {
		rules.push(generateLoopAnimationCSS(blockId, animation.loop, scopeLoopAfterEntry));
	}
	return rules.join("\n");
}

/** Default scroll observer options for entry animations. */
export const ENTRY_ANIMATION_DEFAULTS = {
	offset: 120,
	duration: 1000,
	once: true,
} as const;
