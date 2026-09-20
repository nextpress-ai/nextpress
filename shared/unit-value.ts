/**
 * Pure helpers behind the `[ Custom | value | unit ▾ ]` field: split a saved CSS length into its
 * number and unit, and put them back together. Kept free of React so it is easy to test.
 */

/** Units offered for most sizes: widths, gaps, padding, radius. */
export const SIZE_UNITS = ["px", "rem", "em", "%"] as const;

/** Sizes that can also follow the screen (heights, hero areas). */
export const SCREEN_SIZE_UNITS = ["px", "rem", "em", "%", "vh", "vw", "dvh"] as const;

export type ParsedUnitValue =
	| { kind: "empty" }
	| { kind: "amount"; amount: string; unit: string }
	| { kind: "keyword"; keyword: string }
	| { kind: "raw"; raw: string };

const AMOUNT_WITH_UNIT = /^(-?(?:\d+\.?\d*|\.\d+))\s*([a-z%]*)$/i;
const COMPLETE_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;
const PARTIAL_NUMBER = /^-?\d*\.?\d*$/;

/** True while a number is still being typed (`-`, `1.`, `.5`, `12`). */
export function isPartialNumber(text: string): boolean {
	return PARTIAL_NUMBER.test(text.trim());
}

/** True for a finished number (`12`, `-0.5`, `.5`). */
export function isCompleteNumber(text: string): boolean {
	return COMPLETE_NUMBER.test(text.trim());
}

/**
 * Reads a saved value into the parts the field shows.
 * - `amount`: a number, and its unit when one is written (`24px`, `1.5rem`, `50%`, or a bare `0`).
 * - `keyword`: a word the field allows instead of a number (`auto`).
 * - `raw`: anything else (`calc(100% - 2rem)`, `2rem 1rem`) — shown as typed, never rewritten.
 */
export function parseUnitValue({
	value,
	units,
	keywords = [],
}: {
	value: string | undefined;
	units: readonly string[];
	keywords?: readonly string[];
}): ParsedUnitValue {
	const text = value?.trim() ?? "";
	if (text === "") return { kind: "empty" };

	const keyword = keywords.find((word) => word.toLowerCase() === text.toLowerCase());
	if (keyword) return { kind: "keyword", keyword };

	const match = AMOUNT_WITH_UNIT.exec(text);
	if (match) {
		const amount = match[1]!;
		const unit = match[2]!.toLowerCase();
		if (unit === "") return { kind: "amount", amount, unit: "" };
		if (units.some((known) => known.toLowerCase() === unit)) return { kind: "amount", amount, unit };
	}
	return { kind: "raw", raw: text };
}

/**
 * Joins a number and a unit. An empty or unfinished number gives `undefined` (nothing to save yet).
 * The number is tidied so the result is always valid CSS (`1.` becomes `1`, `.5` becomes `0.5`).
 * A unitless field (`unit` is empty) keeps the plain number.
 */
export function composeUnitValue({
	amount,
	unit,
}: {
	amount: string;
	unit: string;
}): string | undefined {
	const text = amount.trim();
	if (!isCompleteNumber(text)) return undefined;
	return `${Number(text)}${unit}`;
}

/**
 * True while the text is a number followed by the start of a known unit (`24p` on the way to
 * `24px`). The field waits instead of saving a half-typed unit.
 */
export function isUnitInProgress({
	text,
	units,
	keywords = [],
}: {
	text: string;
	units: readonly string[];
	keywords?: readonly string[];
}): boolean {
	const trimmed = text.trim();
	const match = AMOUNT_WITH_UNIT.exec(trimmed);
	if (match && match[2]) {
		const typedUnit = match[2].toLowerCase();
		return (
			!units.some((known) => known.toLowerCase() === typedUnit) &&
			units.some((known) => known.toLowerCase().startsWith(typedUnit))
		);
	}
	const lower = trimmed.toLowerCase();
	return lower !== "" && keywords.some((word) => word.toLowerCase() !== lower && word.toLowerCase().startsWith(lower));
}
