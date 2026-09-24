/** The four padding sides as CSS lengths, always all present. */
export type PaddingSides = { top: string; right: string; bottom: string; left: string };

type ShellPaddingInput = {
	/** The original one-box padding, "2rem 1rem". Still the fallback for any axis not set below. */
	padding: string;
	/** Left and right. One value for both, or "left right". */
	paddingInline?: string;
	/** Top and bottom. One value for both, or "top bottom". */
	paddingBlock?: string;
};

/** Splits a CSS value list on spaces, keeping `calc(1rem + 2px)` and `clamp(...)` in one piece. */
export function splitCssValueList(value: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = "";
	for (const char of value.trim()) {
		if (char === "(") depth += 1;
		if (char === ")") depth = Math.max(0, depth - 1);
		if (/\s/.test(char) && depth === 0) {
			if (current) parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (current) parts.push(current);
	return parts;
}

/** Expands the one-box shorthand the way CSS does: 1, 2, 3 or 4 values. */
function expandShorthand(value: string): PaddingSides {
	const [a = "0", b, c, d] = splitCssValueList(value);
	if (d !== undefined) return { top: a, right: b ?? a, bottom: c ?? a, left: d };
	if (c !== undefined) return { top: a, right: b ?? a, bottom: c, left: b ?? a };
	if (b !== undefined) return { top: a, right: b, bottom: a, left: b };
	return { top: a, right: a, bottom: a, left: a };
}

const readPair = (value: string | undefined): [string, string] | null => {
	const [first, second] = splitCssValueList(value ?? "");
	return first === undefined ? null : [first, second ?? first];
};

/**
 * Works out the padding on each side of a page's content column. Side padding and top-and-bottom
 * padding each win over the original one-box value, so older pages keep looking the same until
 * someone sets one of the new fields.
 */
export function resolveShellPadding({ padding, paddingInline, paddingBlock }: ShellPaddingInput): PaddingSides {
	const sides = expandShorthand(padding);
	const inline = readPair(paddingInline);
	const block = readPair(paddingBlock);
	return {
		top: block?.[0] ?? sides.top,
		bottom: block?.[1] ?? sides.bottom,
		left: inline?.[0] ?? sides.left,
		right: inline?.[1] ?? sides.right,
	};
}

/** The two values the settings panel edits: side padding and top-and-bottom padding. */
export function readShellPaddingAxes(input: ShellPaddingInput): { inline: string; block: string } {
	const { top, right, bottom, left } = resolveShellPadding(input);
	return {
		inline: left === right ? left : `${left} ${right}`,
		block: top === bottom ? top : `${top} ${bottom}`,
	};
}
