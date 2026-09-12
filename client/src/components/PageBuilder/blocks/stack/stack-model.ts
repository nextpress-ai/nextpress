import type { CSSProperties } from "react";
import type { StackType } from "@shared/stack-model";

/**
 * Mode switch styles for the Stack Content tab — same spirit as the Group
 * starters: applying a mode writes layout defaults onto `styles`, and the
 * Auto Layout panel fine-tunes from there. Overlay needs no styles (the
 * shared shell forces the grid; leftover flex keys are inert).
 */
export const STACK_MODE_STARTER_STYLES: Record<StackType, Partial<CSSProperties>> = {
	vertical: {
		display: "flex",
		flexDirection: "column",
		flexWrap: "nowrap",
		alignItems: "flex-start",
		justifyContent: "flex-start",
	},
	horizontal: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "flex-start",
	},
	overlay: {},
};

/** True when the persisted styles no longer match the selected mode's direction. */
export function stackModeDrifted(stackType: StackType, styles?: CSSProperties): boolean {
	if (stackType === "overlay") return false;
	const direction = (styles as Record<string, unknown> | undefined)?.flexDirection;
	if (typeof direction !== "string" || direction === "") return false;
	const stylesAreRow = direction.startsWith("row");
	const modeIsRow = stackType === "horizontal";
	return stylesAreRow !== modeIsRow;
}
