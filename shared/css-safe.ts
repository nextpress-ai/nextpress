/**
 * Checks for values that get written straight into a `<style>` block (published head, editor
 * canvas). Anything that could close a rule or a tag is refused, so a saved colour or size can
 * never inject other CSS. Returns a clean value or nothing — never a partly-fixed one.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(\s*[0-9a-z.,%\s/+-]+\)$/i;
const WORD_COLOR = /^(?:transparent|currentcolor)$/i;
const THEME_COLOR_VAR = /^var\(\s*--npb-[a-z0-9-]+\s*(?:,\s*#[0-9a-f]{3,8}\s*)?\)$/i;
const PX_LENGTH = /^(?:\d{1,4})(?:\.\d{1,3})?px$/i;

/**
 * True for a colour we can safely save: hex (3, 4, 6, 8 digits), `rgb()`/`hsl()`-style functions,
 * `transparent`, or `currentColor`. Named colours are left out on purpose — the palette covers them
 * and a half-typed word like `re` must not be saved.
 */
export function isValidCssColor(text: string): boolean {
	const value = text.trim();
	if (value === "") return false;
	return HEX.test(value) || WORD_COLOR.test(value) || FUNCTION_COLOR.test(value);
}

/** A valid colour, or one of the page theme's own colours (`var(--npb-accent, #007cba)`). */
export function isSafeCssColor(text: string): boolean {
	return isValidCssColor(text) || THEME_COLOR_VAR.test(text.trim());
}

/** The colour ready to write into CSS, or nothing when it is missing or not safe. */
export function safeCssColor(value: unknown): string | undefined {
	return typeof value === "string" && isSafeCssColor(value) ? value.trim() : undefined;
}

/** A whole-pixel or decimal-pixel length such as `10px`, or nothing. */
export function safePxLength(value: unknown): string | undefined {
	return typeof value === "string" && PX_LENGTH.test(value.trim()) ? value.trim() : undefined;
}

/** The page theme's accent colour, with a fallback for pages that have no theme yet. */
export const THEME_ACCENT_COLOR = "var(--npb-accent, #007cba)";
