import type { CSSProperties } from "react";
import { INLINE_FLEX_BLOCK_NAMES } from "./icon-block-visuals";
import { readResizeFromLength } from "./auto-layout-model";

function flexItem(
	grow: number,
	shrink: number,
	basis: string,
	extra: CSSProperties = {},
): CSSProperties {
	return {
		minWidth: 0,
		flexGrow: String(grow),
		flexShrink: String(shrink),
		flexBasis: basis,
		...extra,
	};
}

/**
 * Flex item grow/shrink for a child inside a horizontal stack.
 * Unset width and 100% stay Fill (`1 1 auto`) so existing rows do not collapse.
 * Hug (`fit-content` / auto / max-content) and Fixed lengths actually hug or lock.
 * Longhands only — jsdom drops the `flex` shorthand for Fill (`1 1 auto`) and
 * would wipe grow/shrink/basis if we set both.
 */
export function getHorizontalFlexChildStyles(params: {
	isHorizontal: boolean;
	childStyles?: CSSProperties | Record<string, unknown>;
	blockName?: string;
	/** Pancake behavior: fixed width that may shrink when the row runs out of room (`flex: 0 1 <w>`). */
	shrink?: boolean;
}): CSSProperties {
	if (!params.isHorizontal) {
		return { minWidth: 0 };
	}

	if (params.blockName && INLINE_FLEX_BLOCK_NAMES.has(params.blockName)) {
		return flexItem(0, 0, "auto");
	}

	const width = (params.childStyles as CSSProperties | undefined)?.width;
	const resize = readResizeFromLength(width);

	if (resize === "hug") {
		return flexItem(0, 0, "auto", { width: "fit-content" });
	}

	if (resize === "fixed") {
		const w = String(width).trim();
		// Percent widths used to sit inside flex:1 wrappers. Locking them to
		// `flex-basis: 50%` would shrink old 50/50 rows. Keep Fill on `%`.
		if (w.endsWith("%")) {
			return flexItem(1, 1, "auto");
		}
		return flexItem(0, params.shrink ? 1 : 0, w, { width: w, maxWidth: "100%" });
	}

	return flexItem(1, 1, "auto");
}
