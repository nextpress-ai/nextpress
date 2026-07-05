import type { BlockConfig, TokenEntry } from "./schema-types";

// ─── Shared Constants ────────────────────────────────────────────────────────

/** Maps modifier names to CSS pseudo-selectors */
export const STATE_MODIFIER_MAP: Record<string, string> = {
	hover: ":hover",
	focus: ":focus",
	active: ":active",
	"focus-within": ":focus-within",
	"focus-visible": ":focus-visible",
	disabled: ":disabled",
	first: ":first-child",
	last: ":last-child",
};

/** Maps responsive modifier names to min-width breakpoint values */
export const BREAKPOINT_MAP: Record<string, string> = {
	sm: "640px",
	md: "768px",
	lg: "1024px",
	xl: "1280px",
	"2xl": "1536px",
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────

/** Converts camelCase CSS property to kebab-case for CSS rules. */
export function camelToKebab(str: string): string {
	return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

// ─── SSR Token Resolution ────────────────────────────────────────────────────

/**
 * Resolves tokenMap entries to inline styles for SSR.
 * All entries store their resolved CSS value in entry.style.
 * For custom entries with unitCategory, the unit is appended if the style is purely numeric.
 */
export function resolveTokenMapForSSR(
	blockId: string,
	tokenMap: Record<string, TokenEntry>,
	units: Record<string, string>,
	options?: { modifierSelector?: string },
): { style: Record<string, string>; modifierCSS: string } {
	const style: Record<string, string> = {};
	const modifierEntries: Array<{ entry: TokenEntry; resolvedValue: string }> = [];

	for (const entry of Object.values(tokenMap)) {
		let resolvedValue: string | null = null;

		if (entry.style) {
			const isNumeric = /^\d*\.?\d+$/.test(entry.style);
			if (isNumeric && entry.unitCategory && units[entry.unitCategory]) {
				resolvedValue = `${entry.style}${units[entry.unitCategory]}`;
			} else {
				resolvedValue = entry.style;
			}
		}

		if (!resolvedValue) continue;

		if (entry.modifier) {
			modifierEntries.push({ entry, resolvedValue });
		} else {
			style[entry.property] = resolvedValue;
		}
	}

	const modifierSelector = options?.modifierSelector ?? `.block-${blockId}`;
	const modifierCSS = modifierEntries
		.map(({ entry, resolvedValue }) => {
			if (!entry.modifier) return "";
			const cssProp = camelToKebab(entry.property);
			const selector = modifierSelector;

			if (STATE_MODIFIER_MAP[entry.modifier]) {
				return `${selector}${STATE_MODIFIER_MAP[entry.modifier]} { ${cssProp}: ${resolvedValue}; }`;
			}

			if (BREAKPOINT_MAP[entry.modifier]) {
				return `@media (min-width: ${BREAKPOINT_MAP[entry.modifier]}) { ${selector} { ${cssProp}: ${resolvedValue}; } }`;
			}

			return "";
		})
		.filter(Boolean)
		.join("\n");

	return { style, modifierCSS };
}

/**
 * Collects modifier CSS rules for a block's tokenMap entries for SSR injection.
 */
export function collectBlockModifierCSS(
	block: BlockConfig,
	options?: { modifierSelector?: string },
): string {
	if (!block.other?.tokenMap) return "";
	const { modifierCSS } = resolveTokenMapForSSR(
		block.id,
		block.other.tokenMap,
		block.other?.units || {},
		options,
	);
	return modifierCSS;
}