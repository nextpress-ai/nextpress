import type { CSSProperties } from "react";

/** The bits of a child block the overlay stack needs to decide how wide its column is. */
export type OverlayChildInfo = {
	name?: string;
	styles?: CSSProperties | Record<string, unknown>;
	content?: unknown;
};

/** How the overlay column sits in the stack. `hugs` = the column is exactly as wide as the image. */
export type OverlayFit = {
	hugs: boolean;
	justifyContent?: CSSProperties["justifyContent"];
};

const IMAGE_BLOCK_NAME = "core/image";

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const isPercentWidth = (value: unknown): boolean =>
	typeof value === "string" && value.trim().endsWith("%");

/** True when the image is meant to fill the stack (wide / full, or a percentage width). */
const anchorFillsStack = ({ styles, content }: { styles: Record<string, unknown>; content: Record<string, unknown> }): boolean =>
	content.align === "wide" ||
	content.align === "full" ||
	isPercentWidth(styles.width) ||
	isPercentWidth(content.width);

/** Where the image sits: its own left/center/right pin, then the image's align setting, else the left. */
const readAnchorJustify = ({
	styles,
	content,
}: {
	styles: Record<string, unknown>;
	content: Record<string, unknown>;
}): CSSProperties["justifyContent"] => {
	const pin = styles.contentAlignHorizontal ?? content.align;
	if (pin === "center") return "center";
	if (pin === "right") return "end";
	return "start";
};

/**
 * Decides how wide an overlay (AB) stack's column is. The first child is the base layer. When it is
 * a fixed-size image, the column hugs it and the other layers (usually text) are held to that same
 * width, so text never spills past the picture — at any screen width. Anything else (no image
 * first, or an image that fills the stack) keeps the old "fill the whole stack" behavior.
 */
export function readOverlayFit(children: readonly OverlayChildInfo[] | undefined): OverlayFit {
	const anchor = children?.[0];
	if (!anchor || anchor.name !== IMAGE_BLOCK_NAME) return { hugs: false };
	const parts = { styles: asRecord(anchor.styles), content: asRecord(anchor.content) };
	if (anchorFillsStack(parts)) return { hugs: false };
	return { hugs: true, justifyContent: readAnchorJustify(parts) };
}
