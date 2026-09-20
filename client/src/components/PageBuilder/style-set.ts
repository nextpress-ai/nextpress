import type { TokenEntry } from "@shared/schema-types";

/**
 * True when a saved style value is a real choice. Empty, `auto`, `none`, and `initial` all
 * mean "nothing chosen" — except spacing, where `auto` centers a block (`keepAuto`).
 */
export function isStyleValueSet({
	value,
	keepAuto = false,
}: {
	value: unknown;
	keepAuto?: boolean;
}): boolean {
	if (value == null) return false;
	const text = String(value).trim().toLowerCase();
	if (text === "" || text === "none" || text === "initial") return false;
	if (text === "auto") return keepAuto;
	return true;
}

/** True when any of the listed style keys holds a real value. */
export function anyStyleSet({
	styles,
	keys,
	keepAuto = false,
}: {
	styles: Record<string, unknown>;
	keys: readonly string[];
	keepAuto?: boolean;
}): boolean {
	return keys.some((key) => isStyleValueSet({ value: styles[key], keepAuto }));
}

/** True when the token map holds a color for any listed property (or its hover variant). */
export function anyTokenSet({
	tokenMap,
	properties,
	modifier,
}: {
	tokenMap: Record<string, TokenEntry> | undefined;
	properties: readonly string[];
	modifier?: "hover";
}): boolean {
	if (!tokenMap) return false;
	return properties.some((property) => {
		const entry = tokenMap[modifier ? `${property}:${modifier}` : property];
		return Boolean(entry?.style || entry?.value);
	});
}
