import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types.js";
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

/** Full-bleed page canvas: font and colors, no inner padding. */
export function buildPageShellOuterStyle({
	content,
}: {
	content: PageShellContent;
}): CSSProperties {
	const backgroundColor = tokenCss(content.backgroundColor);
	const color = tokenCss(content.textColor);
	return {
		width: "100%",
		minHeight: "100%",
		boxSizing: "border-box",
		display: "flex",
		flexDirection: "column",
		fontFamily: content.fontFamily,
		...(backgroundColor ? { backgroundColor } : {}),
		...(color ? { color } : {}),
	};
}

/** Constrains a non-header child to the shell's content column. */
export function getPageShellChildItemStyle({
	child,
	content,
}: {
	child: BlockConfig;
	content: PageShellContent;
}): CSSProperties {
	if (isFullBleedPageShellChild(child)) {
		return { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" };
	}
	return {
		width: "100%",
		maxWidth: content.containerWidth,
		marginLeft: "auto",
		marginRight: "auto",
		padding: content.padding,
		boxSizing: "border-box",
		minWidth: 0,
	};
}

export function readPageShellContentFromBlock(block: BlockConfig): PageShellContent {
	return readPageShellContent(block.content);
}
