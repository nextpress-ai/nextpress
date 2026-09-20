export type SpacingSideQuad = {
	top: string;
	right: string;
	bottom: string;
	left: string;
};

export type SpacingKind = "padding" | "margin";
export type SpacingSideKey = `${SpacingKind}${"Top" | "Right" | "Bottom" | "Left"}`;

const SIDES = ["Top", "Right", "Bottom", "Left"] as const;
const EMPTY_QUAD: SpacingSideQuad = { top: "", right: "", bottom: "", left: "" };

/** All four side keys for one kind, in CSS order (top, right, bottom, left). */
export function spacingSideKeys(kind: SpacingKind): SpacingSideKey[] {
	return SIDES.map((side) => `${kind}${side}` as SpacingSideKey);
}

/**
 * WHY: Matches CSS box shorthand expansion so sidebar sides align with serialized `padding` / `margin`.
 */
export function expandSpacingShorthand(raw: unknown): SpacingSideQuad {
	if (raw == null || raw === "") return { ...EMPTY_QUAD };
	const values = String(raw)
		.split(/\s+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (values.length === 0) return { ...EMPTY_QUAD };
	if (values.length === 1) {
		const [a] = values as [string];
		return { top: a, right: a, bottom: a, left: a };
	}
	if (values.length === 2) {
		const [a, b] = values as [string, string];
		return { top: a, right: b, bottom: a, left: b };
	}
	if (values.length === 3) {
		const [a, b, c] = values as [string, string, string];
		return { top: a, right: b, bottom: c, left: b };
	}
	const [a, b, c, d] = values as [string, string, string, string];
	return { top: a, right: b, bottom: c, left: d };
}

/**
 * WHY: Longhands win over shorthand in the UI when both appear after merges (accessor vs tree styles).
 */
export function overlaySpacingLonghands({
	styles,
	expanded,
	kind,
}: {
	styles: Record<string, unknown>;
	expanded: SpacingSideQuad;
	kind: SpacingKind;
}): SpacingSideQuad {
	const pick = (suffix: (typeof SIDES)[number], side: keyof SpacingSideQuad): string => {
		const value = styles[`${kind}${suffix}`];
		if (value != null && String(value).trim() !== "") return String(value);
		return expanded[side];
	};
	return {
		top: pick("Top", "top"),
		right: pick("Right", "right"),
		bottom: pick("Bottom", "bottom"),
		left: pick("Left", "left"),
	};
}

/** Current four sides for padding or margin, longhands over shorthand. */
export function readSpacingSides({
	styles,
	kind,
}: {
	styles: Record<string, unknown>;
	kind: SpacingKind;
}): SpacingSideQuad {
	return overlaySpacingLonghands({
		styles,
		expanded: expandSpacingShorthand(styles[kind]),
		kind,
	});
}

/** True when all four sides hold the same value (so one linked field can show it). */
export function spacingSidesMatch(sides: SpacingSideQuad): boolean {
	return sides.top === sides.right && sides.top === sides.bottom && sides.top === sides.left;
}

/**
 * Builds the next `styles` object for a spacing edit.
 *
 * WHY: `updateBlockDeep` deep-merges `styles`, so an omitted key keeps its old value — clearing
 * needs an explicit `null`. When a shorthand (`padding: 1rem 2rem`) exists, it is turned into
 * longhands first so editing one side does not silently wipe the other three.
 */
export function buildSpacingStyles({
	resolved,
	previous,
	cssKeys,
	value,
}: {
	/** Block styles merged with the live in-memory styles — where shorthands may hide. */
	resolved: Record<string, unknown>;
	/** The object the edit is applied on top of. */
	previous: Record<string, unknown>;
	cssKeys: readonly SpacingSideKey[];
	value: string | null;
}): Record<string, unknown> {
	const next = { ...previous };
	const kinds = new Set<SpacingKind>(cssKeys.map((key) => (key.startsWith("padding") ? "padding" : "margin")));

	kinds.forEach((kind) => {
		if (resolved[kind] == null) return;
		const expanded = expandSpacingShorthand(resolved[kind]);
		SIDES.forEach((suffix) => {
			const key = `${kind}${suffix}`;
			const alreadySet = next[key] != null && String(next[key]).trim() !== "";
			const fromShorthand = expanded[suffix.toLowerCase() as keyof SpacingSideQuad];
			if (!alreadySet && fromShorthand) next[key] = fromShorthand;
		});
		delete next[kind];
		next[kind] = null;
	});

	const cleared = value == null || value === "";
	cssKeys.forEach((key) => {
		next[key] = cleared ? null : value;
	});
	return next;
}
