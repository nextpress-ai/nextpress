import type { CSSProperties } from "react";
import type { BlockContent } from "./schema-types";
import {
	getContainerChildrenStackStyle,
	getContainerOuterShellStyle,
	getContainerParentDisplayMode,
	getContainerSiblingStackDirection,
	readContainerLayoutFromBlock,
} from "./block-container-placement";

export type GroupShellContent = {
	tagName?: string;
	className?: string;
	display?: string;
	flexDirection?: string;
	flexWrap?: string;
	alignItems?: string;
	justifyContent?: string;
	gap?: string;
	gridTemplateColumns?: string;
	gridTemplateRows?: string;
	overflow?: string;
	minWidth?: string;
	maxWidth?: string;
	minHeight?: string;
	maxHeight?: string;
	width?: string;
	height?: string;
};

/** Parses group block structured content for shell sizing. */
export function readGroupShellContent(content: BlockContent | undefined): GroupShellContent {
	if (!content || typeof content !== "object") {
		return {};
	}
	if ("kind" in content && content.kind === "structured") {
		return (content.data ?? {}) as GroupShellContent;
	}
	return content as unknown as GroupShellContent;
}

/** Merges legacy group content dimensions onto resolved shell styles (styles win). */
export function mergeGroupDimensionStyles(
	base: CSSProperties,
	content: GroupShellContent,
): CSSProperties {
	const pick = (styleKey: keyof CSSProperties, contentKey: keyof GroupShellContent): string | undefined => {
		const fromStyle = base[styleKey];
		if (fromStyle != null && fromStyle !== "") {
			return String(fromStyle);
		}
		const fromContent = content[contentKey];
		if (fromContent != null && fromContent !== "") {
			return String(fromContent);
		}
		return undefined;
	};

	return {
		...base,
		boxSizing: "border-box",
		width: pick("width", "width"),
		minWidth: pick("minWidth", "minWidth"),
		maxWidth: pick("maxWidth", "maxWidth"),
		height: pick("height", "height"),
		minHeight: pick("minHeight", "minHeight"),
		maxHeight: pick("maxHeight", "maxHeight"),
		overflow: (pick("overflow", "overflow") as CSSProperties["overflow"]) ?? base.overflow,
	};
}

type BuildGroupShellParams = {
	styles?: CSSProperties;
	content: GroupShellContent;
	children?: { styles?: CSSProperties }[];
};

type GroupShellResult = {
	outerStyle: CSSProperties;
	innerStackStyle: CSSProperties;
	stackDirection: ReturnType<typeof getContainerSiblingStackDirection>;
	isHorizontal: boolean;
};

/** Shared group shell layout for editor preview and public renderer. */
export function buildGroupShellStyles({
	styles,
	content,
	children,
}: BuildGroupShellParams): GroupShellResult {
	const containerLayout = readContainerLayoutFromBlock({
		styles,
		content: content as Record<string, unknown>,
	});
	const parentDisplay = getContainerParentDisplayMode(containerLayout);
	const stackDirection = getContainerSiblingStackDirection(containerLayout);
	const isHorizontal = parentDisplay === "flex" && containerLayout.flexDirection === "row";

	const outerStyle = mergeGroupDimensionStyles(
		getContainerOuterShellStyle(styles, { children }),
		content,
	);

	const innerStackStyle = getContainerChildrenStackStyle(containerLayout, {
		shellStyles: styles,
		children,
	});

	return { outerStyle, innerStackStyle, stackDirection, isHorizontal };
}
