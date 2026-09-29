import type { EntryAnimation, BlockAnimation, HoverAnimation, LoopAnimation } from "./schema-types";
import { safeCssLength } from "./css-safe";

/** Class added when a scroll entry animation has been triggered. */
export const ENTRY_ANIMATION_PLAYED_CLASS = "np-entry-played";

/**
 * Nextpress's own moves, next to the Animate.css presets. They only move with `transform`
 * (cheap for the browser) and stop for people who ask their device for less motion.
 */
export const NP_LOOP_NAMES = ["np-orbit", "np-float", "np-spin"] as const;
export const NP_HOVER_NAMES = ["np-lift", "np-grow"] as const;

const NP_LOOP_DEFAULT_MS: Record<(typeof NP_LOOP_NAMES)[number], number> = {
	"np-orbit": 24_000,
	"np-float": 4_000,
	"np-spin": 12_000,
};

const LOOP_MIN_MS = 200;
const LOOP_MAX_MS = 120_000;
const DEFAULT_ORBIT_RADIUS = "140px";

const NP_KEYFRAMES: Record<(typeof NP_LOOP_NAMES)[number], string> = {
	// Turn around the parent's centre, turning back the other way so the block stays upright.
	"np-orbit":
		"@keyframes np-orbit{from{transform:rotate(0deg) translateX(var(--np-orbit-radius," +
		DEFAULT_ORBIT_RADIUS +
		")) rotate(0deg)}to{transform:rotate(360deg) translateX(var(--np-orbit-radius," +
		DEFAULT_ORBIT_RADIUS +
		")) rotate(-360deg)}}",
	"np-float": "@keyframes np-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}",
	"np-spin": "@keyframes np-spin{to{transform:rotate(360deg)}}",
};

const isNpLoop = (name: string): name is (typeof NP_LOOP_NAMES)[number] =>
	(NP_LOOP_NAMES as readonly string[]).includes(name);

/**
 * An orbit radius: a plain length, or `min(<length>, <length>)` so a ring can shrink on phones
 * (`min(220px, 40vw)`). Anything else falls back to the default.
 */
function readOrbitRadius(value: string | undefined): string {
	if (!value) return DEFAULT_ORBIT_RADIUS;
	const plain = safeCssLength(value);
	if (plain) return plain;
	const pair = /^min\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)$/.exec(value.trim());
	if (pair && safeCssLength(pair[1]) && safeCssLength(pair[2])) return `min(${pair[1]}, ${pair[2]})`;
	return DEFAULT_ORBIT_RADIUS;
}

/** Animation names become CSS; only letters, digits and dashes may pass. */
const safeName = (name: string): string | undefined => (/^[A-Za-z][A-Za-z0-9-]*$/.test(name) ? name : undefined);

const clampMs = (value: number | undefined, fallback: number): number =>
	typeof value === "number" && Number.isFinite(value)
		? Math.min(LOOP_MAX_MS, Math.max(LOOP_MIN_MS, Math.round(value)))
		: fallback;

/** Wraps rules so they only run when the visitor has not asked for less motion. */
const motionAllowed = (rules: string): string => `@media (prefers-reduced-motion: no-preference){${rules}}`;

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

/**
 * Hides entry-animated blocks until the scroll observer triggers them. People who asked for less
 * motion never wait for a scroll: their blocks simply show.
 */
export function getEntryAnimationBaseCSS(): string {
	return motionAllowed(`[data-np-entry]:not(.${ENTRY_ANIMATION_PLAYED_CLASS}){opacity:0;}`);
}

/**
 * CSS for a hover animation: Animate.css keyframes, or a Nextpress look (Lift / Grow) that eases
 * in and out. Hover looks only apply on devices with a real pointer, so a tap never sticks.
 */
export function generateHoverAnimationCSS(blockId: string, hover: HoverAnimation): string {
	const selector = `.block-${blockId}`;
	if (hover.name === "np-lift" || hover.name === "np-grow") {
		const moved =
			hover.name === "np-lift"
				? "transform:translateY(-3px);box-shadow:0 12px 28px -14px rgba(15,23,42,.35)"
				: "transform:scale(1.03)";
		return motionAllowed(
			`${selector}{transition:transform 180ms cubic-bezier(0.23,1,0.32,1),box-shadow 180ms cubic-bezier(0.23,1,0.32,1)}` +
				`@media (hover:hover) and (pointer:fine){${selector}:hover{${moved}}}`,
		);
	}
	const name = safeName(hover.name);
	return name ? motionAllowed(`${selector}:hover{animation:${name} 1s both}`) : "";
}

/**
 * CSS for a looping animation. Animate.css presets keep their 1s default unless a speed is set.
 * Orbit reads its radius from `--np-orbit-radius`; its start angle becomes a negative delay, so
 * several blocks on one ring can start spread around it and all keep moving together.
 * If the block also has an entry animation, the loop starts once the entry has played.
 */
export function generateLoopAnimationCSS(blockId: string, loop: LoopAnimation, hasEntry: boolean): string {
	const name = safeName(loop.name);
	if (!name) return "";
	const selector = hasEntry ? `.block-${blockId}.${ENTRY_ANIMATION_PLAYED_CLASS}` : `.block-${blockId}`;
	const npMove = isNpLoop(name);
	const duration = clampMs(loop.durationMs, npMove ? NP_LOOP_DEFAULT_MS[name] : 1000);
	const timing = name === "np-float" ? "ease-in-out" : npMove ? "linear" : "ease";
	const direction = loop.reverse ? "reverse" : "normal";

	const declarations = [`animation:${name} ${duration}ms ${timing} infinite ${direction} both`];
	if (name === "np-orbit") {
		const radius = readOrbitRadius(loop.orbitRadius);
		const start = typeof loop.orbitStart === "number" && Number.isFinite(loop.orbitStart) ? loop.orbitStart : 0;
		declarations.push(`--np-orbit-radius:${radius}`);
		declarations.push(`animation-delay:${-Math.round(((((start % 360) + 360) % 360) / 360) * duration)}ms`);
	}

	const keyframes = npMove ? NP_KEYFRAMES[name] : "";
	return motionAllowed(`${keyframes}${selector}{${declarations.join(";")}}`);
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
	return rules.filter(Boolean).join("\n");
}

/** True when a block uses Animate.css (its presets need the Animate.css stylesheet). */
export function usesAnimateCss(animation: BlockAnimation | null | undefined): boolean {
	if (!animation) return false;
	if (animation.entry) return true;
	if (animation.hover && !(NP_HOVER_NAMES as readonly string[]).includes(animation.hover.name)) return true;
	return Boolean(animation.loop && !isNpLoop(animation.loop.name));
}

/** Default scroll observer options for entry animations. */
export const ENTRY_ANIMATION_DEFAULTS = {
	offset: 120,
	duration: 1000,
	once: true,
} as const;
