import resolveConfig from "tailwindcss/resolveConfig";
import type { TokenEntry } from "./schema-types.js";
import { tailwindThemeExtend } from "./tailwind-theme.js";

const fullConfig = resolveConfig({
	content: [],
	theme: { extend: tailwindThemeExtend },
});

/** Resolved Tailwind screens for SSR + client modifier @media rules. */
export const resolvedTokenScreens = fullConfig.theme.screens as Record<string, string>;

/**
 * Resolves a theme token entry (value + variant) to a concrete CSS value.
 * Mirrors client tailwind-tokens resolveTokenValue for SSR parity.
 */
export function resolveThemeTokenEntry(entry: TokenEntry): string | null {
	if (!entry.value) return null;

	const { property, value, variant } = entry;

	if (property === "backgroundColor" || property === "color" || property === "borderColor") {
		const colorGroup = (fullConfig.theme.colors as Record<string, string | Record<string, string>>)[
			value
		];
		if (typeof colorGroup === "string") return colorGroup;
		if (colorGroup && variant) return colorGroup[variant] ?? null;
		return null;
	}

	if (entry.unitCategory === "spacing") {
		return (fullConfig.theme.spacing as Record<string, string>)[value] ?? null;
	}

	if (property === "fontSize") {
		const fs = (fullConfig.theme.fontSize as Record<string, string | [string, string]>)[value];
		if (typeof fs === "string") return fs;
		if (Array.isArray(fs)) return fs[0];
		return null;
	}

	if (property === "fontWeight") {
		return (fullConfig.theme.fontWeight as Record<string, string>)[value] ?? null;
	}

	if (property === "borderRadius") {
		return (fullConfig.theme.borderRadius as Record<string, string>)[value] ?? null;
	}

	return null;
}

/** Composes a custom token entry style string, appending units when numeric. */
export function composeCustomTokenEntry(
	entry: TokenEntry,
	units: Record<string, string>,
): string | null {
	if (!entry.style) return null;

	const isNumeric = /^\d*\.?\d+$/.test(entry.style);
	if (isNumeric && entry.unitCategory && units[entry.unitCategory]) {
		return `${entry.style}${units[entry.unitCategory]}`;
	}

	if (entry.unitCategory && units[entry.unitCategory]) {
		return `${entry.style}${units[entry.unitCategory]}`;
	}

	return entry.style;
}

/** Resolves any token entry — theme value or custom style — to a CSS value. */
export function resolveTokenEntryValue(
	entry: TokenEntry,
	units: Record<string, string>,
): string | null {
	return entry.value
		? resolveThemeTokenEntry(entry)
		: composeCustomTokenEntry(entry, units);
}
