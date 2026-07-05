import type { CSSProperties } from "react";

/** Block name for single-button blocks (WordPress `core/button`). */
export const BUTTON_BLOCK_NAME = "core/button";

/**
 * Visual and interactive styles that belong on `.wp-block-button__link` (`<a>` / `<button>`),
 * not on the outer `.wp-block-button` shell.
 */
const BUTTON_ANCHOR_STYLE_KEYS = new Set([
	"backgroundColor",
	"color",
	"padding",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"border",
	"borderTop",
	"borderRight",
	"borderBottom",
	"borderLeft",
	"borderRadius",
	"borderWidth",
	"borderStyle",
	"borderColor",
	"fontSize",
	"fontWeight",
	"fontFamily",
	"lineHeight",
	"letterSpacing",
	"textDecoration",
	"textTransform",
	"cursor",
	"boxShadow",
	"opacity",
	"justifyContent",
	"alignItems",
	"gap",
]);

/**
 * Layout styles for the `.wp-block-button` wrapper (sibling alignment, margins, width).
 * `textAlign` on the shell positions the button link inside the block row/column.
 */
const BUTTON_SHELL_STYLE_KEYS = new Set([
	"textAlign",
	"width",
	"maxWidth",
	"minWidth",
	"margin",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"display",
]);

/**
 * Splits persisted block styles between the WordPress button shell (`div.wp-block-button`)
 * and the interactive link (`a.wp-block-button__link`).
 *
 * WHY: Background, padding, and border must paint on the link. Putting them on the shell
 * fills the full-width wrapper behind the button instead of the clickable surface.
 */
export function splitButtonBlockStyles(styles: CSSProperties | undefined): {
	shellStyles: CSSProperties;
	anchorStyles: CSSProperties;
} {
	if (!styles) {
		return { shellStyles: {}, anchorStyles: {} };
	}

	const shellStyles: CSSProperties = {};
	const anchorStyles: CSSProperties = {};

	for (const [rawKey, value] of Object.entries(styles)) {
		if (value === undefined || value === null || value === "") {
			continue;
		}
		if (BUTTON_ANCHOR_STYLE_KEYS.has(rawKey)) {
			(anchorStyles as Record<string, unknown>)[rawKey] = value;
		} else if (BUTTON_SHELL_STYLE_KEYS.has(rawKey)) {
			(shellStyles as Record<string, unknown>)[rawKey] = value;
		}
	}

	return { shellStyles, anchorStyles };
}

/**
 * Modifier/hover CSS must target the link, not the full-width `.block-{id}` canvas wrapper.
 */
export function getButtonModifierCssSelector(blockId: string): string {
	return `.block-${blockId}.wp-block-button__link`;
}

/** Returns a button-specific modifier selector when the block is `core/button`. */
export function resolveButtonBlockModifierSelector(block: {
	name: string;
	id: string;
}): string | undefined {
	if (block.name === BUTTON_BLOCK_NAME) {
		return getButtonModifierCssSelector(block.id);
	}
	return undefined;
}

export function mapButtonTextAlignToJustifyContent(
	textAlign: CSSProperties["textAlign"] | undefined,
): CSSProperties["justifyContent"] | undefined {
	if (!textAlign) return undefined;
	if (textAlign === "left") return "flex-start";
	if (textAlign === "center") return "center";
	if (textAlign === "right") return "flex-end";
	return undefined;
}
