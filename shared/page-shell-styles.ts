import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types.js";
import { resolveShellPadding } from "./page-shell-padding.js";
import { fillToBackgroundStyles } from "./fill-model.js";
import {
	isFullBleedPageShellChild,
	readPageShellContent,
	type PageShellContent,
} from "./page-shell-model.js";

const tokenCss = (entry: PageShellContent["backgroundColor"]): string | undefined => {
	if (!entry) return undefined;
	if (typeof entry.style === "string" && entry.style) return entry.style;
	return undefined;
};

/** The content column a header can follow: width, position, and side padding. */
export type PageColumnInset = {
	maxWidth: string;
	marginLeft: string;
	marginRight: string;
	padLeft: string;
	padRight: string;
};

/**
 * The inset a header follows.
 * The column fills the page, so the header frame does too and the side padding
 * sits inside the bar. A content width must not shrink this box: that used to
 * leave a wide empty band the padding control could not close.
 */
export function readPageColumnInset(content: PageShellContent): PageColumnInset {
	const padding = resolveShellPadding(content);
	return {
		maxWidth: "100%",
		marginLeft: "0",
		marginRight: "0",
		padLeft: padding.left,
		padRight: padding.right,
	};
}

/** Full-bleed page canvas: font, colors and background fill, no inner padding. */
export function buildPageShellOuterStyle({
	content,
}: {
	content: PageShellContent;
}): CSSProperties {
	const backgroundColor = tokenCss(content.backgroundColor);
	const color = tokenCss(content.textColor);
	const inset = readPageColumnInset(content);
	return {
		width: "100%",
		minHeight: "100%",
		boxSizing: "border-box",
		display: "flex",
		flexDirection: "column",
		fontFamily: content.fontFamily,
		...(backgroundColor ? { backgroundColor } : {}),
		...(content.backgroundFill ? fillToBackgroundStyles(content.backgroundFill) : {}),
		...(color ? { color } : {}),
		["--np-page-pad-left" as string]: inset.padLeft,
		["--np-page-pad-right" as string]: inset.padRight,
		["--np-page-max-width" as string]: inset.maxWidth,
		["--np-page-margin-left" as string]: inset.marginLeft,
		["--np-page-margin-right" as string]: inset.marginRight,
	};
}

const contentSiblings = (siblings: BlockConfig[] | undefined, child: BlockConfig): BlockConfig[] =>
	(siblings ?? [child]).filter((item) => !isFullBleedPageShellChild(item));

/**
 * Space from the page edge. The margins are the side padding, and the column
 * stretches to fill what is left. A narrower content width is not applied here:
 * centering that width made the sides look stuck and much larger than the padding.
 */
const contentColumnSides = ({
	padding,
}: {
	padding: ReturnType<typeof resolveShellPadding>;
}): CSSProperties => ({
	alignSelf: "stretch",
	width: "auto",
	maxWidth: "100%",
	marginLeft: padding.left,
	marginRight: padding.right,
});

/**
 * Constrains each child to the content column.
 * A header sits on the page too, so it uses the same side padding. It does not
 * take the page's top or bottom padding (those stay on the first and last text blocks).
 */
export function getPageShellChildItemStyle({
	child,
	content,
	siblings,
}: {
	child: BlockConfig;
	content: PageShellContent;
	/** Shell children, so top and bottom padding are not repeated between blocks. */
	siblings?: BlockConfig[];
}): CSSProperties {
	const padding = resolveShellPadding(content);
	if (isFullBleedPageShellChild(child)) {
		return {
			...contentColumnSides({ padding }),
			boxSizing: "border-box",
			minWidth: 0,
		};
	}
	const column = contentSiblings(siblings, child);
	const isFirst = column[0]?.id === child.id;
	const isLast = column[column.length - 1]?.id === child.id;
	return {
		...contentColumnSides({ padding }),
		...(isFirst ? { paddingTop: padding.top } : {}),
		...(isLast ? { paddingBottom: padding.bottom } : {}),
		boxSizing: "border-box",
		minWidth: 0,
	};
}

export function readPageShellContentFromBlock(block: BlockConfig): PageShellContent {
	return readPageShellContent(block.content);
}
