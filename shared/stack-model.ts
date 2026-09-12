import type { BlockContent } from "./schema-types";

/**
 * Stack block modes. `overlay` is the AB stack: children share one grid cell,
 * child order is paint order (first child at the bottom).
 */
export type StackType = "vertical" | "horizontal" | "overlay";

/** Stack block content — layout CSS itself lives on `block.styles` (Auto Layout panel). */
export type StackContent = {
	stackType?: StackType;
};

export const DEFAULT_STACK_CONTENT: StackContent = {
	stackType: "vertical",
};

/** Reads the stack mode from structured content; unknown/missing values fall back to vertical. */
export function readStackTypeFromContent(content: BlockContent | undefined): StackType {
	if (!content || typeof content !== "object") return "vertical";
	const data =
		"kind" in content && content.kind === "structured"
			? ((content.data ?? {}) as Record<string, unknown>)
			: (content as Record<string, unknown>);
	const raw = data.stackType;
	return raw === "horizontal" || raw === "overlay" ? raw : "vertical";
}

/** Content-tab mode labels in stacking order (vertical, horizontal, AB overlay). */
export const STACK_TYPE_OPTIONS: readonly { value: StackType; label: string; accessibleName: string }[] = [
	{ value: "vertical", label: "Vertical", accessibleName: "Vertical stack" },
	{ value: "horizontal", label: "Row", accessibleName: "Horizontal stack" },
	{ value: "overlay", label: "AB", accessibleName: "AB stack, B on top of A" },
] as const;
