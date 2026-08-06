import type { BlockConfig, TokenEntry } from "./schema-types";
import {
	resolveTokenEntryValue,
	resolvedTokenScreens,
} from "./resolve-token-entry.js";

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
 * Resolves tokenMap entries to inline styles for SSR and publish surfaces.
 * Theme tokens (entry.value) and custom values (entry.style) both resolve here.
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
		const resolvedValue = resolveTokenEntryValue(entry, units);
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

			const breakpoint = resolvedTokenScreens[entry.modifier] ?? BREAKPOINT_MAP[entry.modifier];
			if (breakpoint) {
				return `@media (min-width: ${breakpoint}) { ${selector} { ${cssProp}: ${resolvedValue}; } }`;
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