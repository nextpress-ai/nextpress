import type { TokenEntry } from "./schema-types.js";
import { safeCssColor } from "./css-safe.js";

export const HEADER_SHADOW_OPTIONS = [
	{ value: "none", label: "None" },
	{ value: "soft", label: "Soft" },
	{ value: "medium", label: "Medium" },
	{ value: "strong", label: "Strong" },
] as const;

export type HeaderScrollShadow = (typeof HEADER_SHADOW_OPTIONS)[number]["value"];

export const HEADER_BLUR_MAX_PX = 24;
export const HEADER_OPACITY_MIN = 20;

/**
 * How a floating header looks once the page has scrolled under it. Each part is optional; a part
 * left out keeps the header's normal look. All colour values are read back through the safe-CSS
 * checks, so nothing saved here can reach a page as anything but a colour.
 */
export type HeaderScrollLook = {
	/** The bar's colour once scrolled. Leave out to keep the normal one. */
	background?: TokenEntry;
	/** How solid that colour is, in percent (lower lets the page show through). */
	opacity?: number;
	/** Blur of whatever passes behind the bar, in pixels. */
	blur?: number;
	shadow?: HeaderScrollShadow;
	textColor?: TokenEntry;
	/** A thin line along the bottom edge. */
	line?: boolean;
};

const SHADOW_CSS: Record<Exclude<HeaderScrollShadow, "none">, string> = {
	soft: "0 1px 3px rgb(0 0 0 / 10%)",
	medium: "0 4px 12px rgb(0 0 0 / 12%)",
	strong: "0 8px 24px rgb(0 0 0 / 18%)",
};

/** The bar's usual background, so "less solid" works even when no new colour is chosen. */
const NORMAL_BACKGROUND = "var(--npb-canvas-page, Canvas)";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readEntry = (value: unknown): TokenEntry | undefined => {
	if (!isRecord(value)) return undefined;
	if (typeof value.property !== "string" || typeof value.alias !== "string") return undefined;
	return safeCssColor(value.style) ? (value as unknown as TokenEntry) : undefined;
};

const readInt = (value: unknown, min: number, max: number): number | undefined =>
	typeof value === "number" && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: undefined;

/** Reads saved on-scroll settings. Nothing usable saved means nothing (`undefined`). */
export function readHeaderScrollLook(raw: unknown): HeaderScrollLook | undefined {
	if (!isRecord(raw)) return undefined;
	const look: HeaderScrollLook = {
		background: readEntry(raw.background),
		opacity: readInt(raw.opacity, HEADER_OPACITY_MIN, 100),
		blur: readInt(raw.blur, 0, HEADER_BLUR_MAX_PX),
		shadow: HEADER_SHADOW_OPTIONS.find((option) => option.value === raw.shadow)?.value,
		textColor: readEntry(raw.textColor),
		line: raw.line === true ? true : undefined,
	};
	return Object.values(look).some((value) => value !== undefined) ? look : undefined;
}

/**
 * CSS for one header's scrolled look, ready for a `<style>` block. Every value is written out in
 * full (no CSS variables in the blur line, where Safari's prefixed form needs plain values), and
 * the change eases in unless the visitor has asked for less motion.
 */
export function buildHeaderScrollCss({ blockId, look }: { blockId: string; look: HeaderScrollLook | undefined }): string {
	if (!look) return "";
	const bar = `.block-${blockId} .wp-block-header`;
	const rules: string[] = [];

	const colour = safeCssColor(look.background?.style);
	const opacity = look.opacity ?? 100;
	if (colour || opacity < 100) {
		const base = colour ?? NORMAL_BACKGROUND;
		rules.push(`background-color:${opacity < 100 ? `color-mix(in srgb, ${base} ${opacity}%, transparent)` : base}`);
	}

	if (look.blur !== undefined) {
		const blur = look.blur === 0 ? "none" : `blur(${look.blur}px)`;
		rules.push(`-webkit-backdrop-filter:${blur}`, `backdrop-filter:${blur}`);
	}

	const shadows = [
		look.shadow && look.shadow !== "none" ? SHADOW_CSS[look.shadow] : "",
		look.line ? "inset 0 -1px 0 color-mix(in srgb, currentColor 14%, transparent)" : "",
	].filter(Boolean);
	if (shadows.length > 0) rules.push(`box-shadow:${shadows.join(", ")}`);
	else if (look.shadow === "none") rules.push("box-shadow:none");

	const text = safeCssColor(look.textColor?.style);
	if (text) rules.push(`color:${text}`);

	if (rules.length === 0) return "";
	return [
		`${bar}{transition:background-color .25s ease,box-shadow .25s ease,color .25s ease,backdrop-filter .25s ease}`,
		`${bar}.is-scrolled{${rules.join(";")}}`,
		`@media (prefers-reduced-motion:reduce){${bar}{transition:none}}`,
	].join("\n");
}
