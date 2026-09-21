import type { TokenEntry } from "./schema-types.js";

/**
 * The button block's Look / Size controls, matching the header's buttons. Everything is written
 * to ordinary styles (and the colour token map), so publish and preview need no changes.
 */

export type ButtonLook = "solid" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export const BUTTON_SIZE_PRESETS = [
	{ value: "sm", label: "SM" },
	{ value: "md", label: "MD" },
	{ value: "lg", label: "LG" },
	{ value: "xl", label: "XL" },
] as const;

/** LG is the size every new button already has (16px text, 12px 24px padding). */
export const BUTTON_SIZE_STYLES: Record<ButtonSize, { fontSize: string; padding: string }> = {
	sm: { fontSize: "0.75rem", padding: "0.35rem 0.85rem" },
	md: { fontSize: "0.875rem", padding: "0.5rem 1.1rem" },
	lg: { fontSize: "1rem", padding: "0.75rem 1.5rem" },
	xl: { fontSize: "1.125rem", padding: "0.9rem 1.8rem" },
};

/** The padding a custom text size gets, in `em` so it grows and shrinks with the text (LG proportions). */
export const CUSTOM_BUTTON_PADDING = "0.75em 1.5em";

/** Colour a solid button paints when none was chosen. */
export const DEFAULT_BUTTON_COLOR = "#007cba";

/**
 * The page theme's colours. A theme sets `--npb-accent` (and `--npb-accent-foreground`, the text that
 * reads on it) on every published page; the old blue is the fallback for a page with no theme.
 */
export const THEME_BUTTON_FILL = `var(--npb-accent, ${DEFAULT_BUTTON_COLOR})`;
export const THEME_BUTTON_TEXT = "var(--npb-accent-foreground, #ffffff)";

type StyleBag = Record<string, unknown> | undefined;
type TokenBag = Record<string, TokenEntry | null | undefined> | undefined;

const PX_PER_REM = 16;

/** `16px` and `1rem` are the same size; compare them as rems. */
function toRem(value: string): number | null {
	const match = /^(-?\d*\.?\d+)(px|rem)$/i.exec(value.trim());
	if (!match) return null;
	const amount = Number(match[1]);
	return match[2]!.toLowerCase() === "px" ? amount / PX_PER_REM : amount;
}

function sameLength(a: unknown, b: string): boolean {
	if (typeof a !== "string") return false;
	const left = toRem(a);
	const right = toRem(b);
	return left !== null && right !== null && Math.abs(left - right) < 0.001;
}

function samePadding(a: unknown, b: string): boolean {
	if (typeof a !== "string") return false;
	const left = a.trim().split(/\s+/);
	const right = b.trim().split(/\s+/);
	return left.length === right.length && left.every((part, index) => sameLength(part, right[index]!));
}

/** Which size preset the button's text size and padding add up to, or `custom`. */
export function readButtonSize(styles: StyleBag): ButtonSize | "custom" {
	for (const { value } of BUTTON_SIZE_PRESETS) {
		const look = BUTTON_SIZE_STYLES[value];
		if (sameLength(styles?.fontSize, look.fontSize) && samePadding(styles?.padding, look.padding)) return value;
	}
	return "custom";
}

export function buttonSizeStyles(size: ButtonSize): { fontSize: string; padding: string } {
	return { ...BUTTON_SIZE_STYLES[size] };
}

/** A custom text size: the text size you typed, with padding that scales from it. */
export function customButtonSizeStyles(fontSize: string): { fontSize: string; padding: string } {
	return { fontSize, padding: CUSTOM_BUTTON_PADDING };
}

const isClear = (color: unknown): boolean => {
	if (typeof color !== "string") return false;
	const text = color.trim().toLowerCase();
	return text === "transparent" || text === "none" || text === "#0000" || text === "#00000000";
};

/** A button with a clear background is ghost; anything else (including nothing set) is solid. */
export function readButtonLook({ styles, tokenMap }: { styles: StyleBag; tokenMap: TokenBag }): ButtonLook {
	const background = tokenMap?.backgroundColor?.style ?? styles?.backgroundColor;
	return isClear(background) ? "ghost" : "solid";
}

export type ButtonLookChange = {
	/** Style keys to set. `undefined` means clear. */
	styles: Record<string, string | undefined>;
	/** Token entries to set; `null` removes one. */
	tokens: Record<string, TokenEntry | null>;
};

const moveToken = (entry: TokenEntry | null | undefined, property: string, alias: string): TokenEntry | null =>
	entry ? { ...entry, property, alias } : null;

/**
 * Switches between solid and ghost while keeping the button's colour:
 * - solid: the colour is the background, the text is white, no border.
 * - ghost: the background is clear and the colour moves to the text and a matching border.
 * The colour may live in a token or a plain style; both are carried over, and the token that would
 * otherwise win over the new style is removed.
 */
export function buildButtonLookChange({
	look,
	styles,
	tokenMap,
}: {
	look: ButtonLook;
	styles: StyleBag;
	tokenMap: TokenBag;
}): ButtonLookChange {
	if (look === "ghost") {
		const entry = tokenMap?.backgroundColor;
		const accent = entry?.style ?? (isClear(styles?.backgroundColor) ? undefined : (styles?.backgroundColor as string | undefined));
		return {
			styles: {
				backgroundColor: "transparent",
				color: accent ?? DEFAULT_BUTTON_COLOR,
				border: "1px solid currentColor",
			},
			tokens: { backgroundColor: null, color: moveToken(entry, "color", "text") },
		};
	}
	const entry = tokenMap?.color;
	const accent = entry?.style ?? (styles?.color as string | undefined);
	const usable = accent && accent.trim().toLowerCase() !== "#ffffff" ? accent : undefined;
	return {
		styles: {
			backgroundColor: usable ?? DEFAULT_BUTTON_COLOR,
			// A theme fill keeps the theme's matching text, so the pair stays readable if the theme changes.
			color: usable === THEME_BUTTON_FILL ? THEME_BUTTON_TEXT : "#ffffff",
			border: "none",
		},
		tokens: { color: null, backgroundColor: entry && usable ? moveToken(entry, "backgroundColor", "bg") : null },
	};
}

export type ButtonColorProperty = "backgroundColor" | "color";

/** What "follow the page theme" means for one of a button's two colours. */
function themeValueFor({ property, look }: { property: ButtonColorProperty; look: ButtonLook }): string {
	if (property === "backgroundColor") return THEME_BUTTON_FILL;
	return look === "ghost" ? THEME_BUTTON_FILL : THEME_BUTTON_TEXT;
}

/**
 * Hands a button colour to the page theme: the fill (or a ghost's text) becomes the theme accent, a
 * solid button's text becomes the accent's matching foreground. Any token that would win is removed.
 */
export function buildButtonThemeChange({
	property,
	look,
}: {
	property: ButtonColorProperty;
	look: ButtonLook;
}): ButtonLookChange {
	return { styles: { [property]: themeValueFor({ property, look }) }, tokens: { [property]: null } };
}

/** True while a button colour is the theme's (and no token overrides it). */
export function buttonFollowsTheme({
	property,
	look,
	styles,
	tokenMap,
}: {
	property: ButtonColorProperty;
	look: ButtonLook;
	styles: StyleBag;
	tokenMap: TokenBag;
}): boolean {
	if (tokenMap?.[property]) return false;
	return styles?.[property] === themeValueFor({ property, look });
}
