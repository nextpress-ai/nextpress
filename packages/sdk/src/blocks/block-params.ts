import type { BlockConfig, BlockContent, IconReference } from "../types/domain.js";

/** Shared optional fields for every block helper. */
export type BaseBlockParams = {
	id?: string;
	parentId?: string | null;
	label?: string;
	styles?: Record<string, string | number | null | undefined>;
	settings?: Record<string, unknown>;
	children?: BlockConfig[];
};

/** Params for registry blocks that store settings in structured `data`. */
export type StructuredBlockParams = BaseBlockParams & {
	content?: BlockContent;
	data?: Record<string, unknown>;
};

export type HeadingBlockParams = BaseBlockParams & {
	text: string;
	level?: number;
};

export type TextBlockParams = BaseBlockParams & {
	text: string;
};

export type MarkdownBlockParams = BaseBlockParams & {
	value: string;
};

export type ImageBlockParams = BaseBlockParams & {
	url: string;
	alt?: string;
	caption?: string;
};

export type HtmlBlockParams = BaseBlockParams & {
	value: string;
	sanitized?: boolean;
};

/** Lucide (or other set) icon reference stored on icon and button blocks. */
export type { IconReference } from "../types/domain.js";

export type IconBlockParams = BaseBlockParams & {
	iconName: string;
	iconSet?: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
	link?: string;
	linkTarget?: "_self" | "_blank";
	label?: string;
};

export type ButtonBlockParams = BaseBlockParams & {
	text: string;
	url?: string;
	linkTarget?: "_self" | "_blank";
	icon?: IconReference;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
};

export type CustomBlockParams = BaseBlockParams & {
	name: string;
	type?: "block" | "container";
	content: BlockContent;
	category?: BlockConfig["category"];
	label?: string;
};
