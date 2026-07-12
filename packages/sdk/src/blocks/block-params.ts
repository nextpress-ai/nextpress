import type { BlockConfig, BlockContent, IconReference } from "../types/domain.js";
import type { IconSetId } from "../types/page-other.js";
import type { BlockEditorSettings, BlockWithEditorSettings } from "./block-editor-settings.js";
import type {
	ButtonsContent,
	ColumnsContent,
	ContainerContent,
	CoverContent,
	DividerContent,
	FileContent,
	GalleryContent,
	GroupContent,
	IconContent,
	InputFieldContent,
	ListContent,
	MediaTextContent,
	PostAuthorBoxContent,
	PostFeaturedImageContent,
	PostInfoContent,
	PostListContent,
	PostNavigationContent,
	PostProgressContent,
	PostTitleContent,
	PostTocContent,
	SelectFieldContent,
	SeparatorContent,
	SpacerContent,
	TableContent,
	TextareaFieldContent,
} from "./block-content-types.js";
import type { IconReference as IconRefExport } from "../types/domain.js";

/** Tree placement and identity — shared by every block helper. */
export type BlockShellParams = {
	id?: string;
	parentId?: string | null;
	label?: string;
	children?: BlockConfig[];
	/** Raw HTML override → `other.html` (sanitized on build) */
	html?: string;
	/** Raw JS override → `other.js` (sanitized on build) */
	js?: string;
	/** Raw custom CSS → `customCss` + `other.css` (sanitized on build) */
	css?: string;
};

/** Style tab — inline CSS on the block wrapper. */
export type BlockStyles = Record<string, string | number | null | undefined>;

/** Advanced tab — sparse block options (display conditions, columnLayout, …). */
export type BlockSettings = Record<string, unknown>;

export type HeadingBlockParams = BlockWithEditorSettings<{ text: string; level?: number }> & {
	/** Shorthand for `settings.content.text` */
	text?: string;
	level?: number;
};

export type TextBlockParams = BlockWithEditorSettings<{ text: string }> & {
	text?: string;
};

export type MarkdownBlockParams = BlockWithEditorSettings<{ value: string }> & {
	value?: string;
};

export type ImageBlockParams = BlockWithEditorSettings<{
	url: string;
	alt?: string;
	caption?: string;
}> & {
	url?: string;
	alt?: string;
	caption?: string;
};

export type HtmlBlockParams = BlockWithEditorSettings<{ value: string; sanitized?: boolean }> & {
	value?: string;
	sanitized?: boolean;
};

export type ButtonBlockParams = BlockWithEditorSettings<{
	text: string;
	url?: string;
	linkTarget?: "_self" | "_blank";
	icon?: IconReference;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
}> & {
	text?: string;
	url?: string;
	linkTarget?: "_self" | "_blank";
	icon?: IconReference;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
};

export type IconBlockParams = BlockWithEditorSettings<
	Partial<Omit<IconContent, "icon">> & {
		icon?: Partial<IconReference> & Pick<IconReference, "iconName">;
	}
> & {
	iconSet?: IconSetId;
	iconName?: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
	link?: string;
	linkTarget?: "_self" | "_blank";
};

export type GroupBlockParams = BlockWithEditorSettings<Partial<GroupContent>>;
export type ContainerBlockParams = BlockWithEditorSettings<Partial<ContainerContent>>;
export type ButtonsBlockParams = BlockWithEditorSettings<Partial<ButtonsContent>>;
export type GalleryBlockParams = BlockWithEditorSettings<Partial<GalleryContent>>;
export type VideoBlockParams = BlockWithEditorSettings<{ url?: string }> & { url?: string };
export type AudioBlockParams = VideoBlockParams;
export type SpacerBlockParams = BlockWithEditorSettings<Partial<SpacerContent>>;
export type SeparatorBlockParams = BlockWithEditorSettings<Partial<SeparatorContent>>;
export type ColumnsBlockParams = BlockWithEditorSettings<Partial<ColumnsContent>> & {
	/** Column count when distributing flat `children` (default: 2). */
	columnCount?: number;
	/** One array of blocks per column — overrides `columnCount` + even distribution. */
	columnGroups?: BlockConfig[][];
};
export type QuoteBlockParams = BlockWithEditorSettings<{ text?: string }> & { text?: string };
export type ListBlockParams = BlockWithEditorSettings<Partial<ListContent>>;
export type MediaTextBlockParams = BlockWithEditorSettings<Partial<MediaTextContent>>;
export type CoverBlockParams = BlockWithEditorSettings<Partial<CoverContent>>;
export type FileBlockParams = BlockWithEditorSettings<Partial<FileContent>>;
export type CodeBlockParams = BlockWithEditorSettings<{ value?: string }> & { value?: string };
export type PullquoteBlockParams = QuoteBlockParams;
export type PreformattedBlockParams = QuoteBlockParams;
export type TableBlockParams = BlockWithEditorSettings<Partial<TableContent>>;
export type DividerBlockParams = BlockWithEditorSettings<Partial<DividerContent>>;
export type PostTitleBlockParams = BlockWithEditorSettings<Partial<PostTitleContent>>;
export type PostExcerptBlockParams = BlockWithEditorSettings<Record<string, never>>;
export type PostFeaturedImageBlockParams = BlockWithEditorSettings<Partial<PostFeaturedImageContent>>;
export type PostListBlockParams = BlockWithEditorSettings<Partial<PostListContent>>;
export type PostTocBlockParams = BlockWithEditorSettings<Partial<PostTocContent>>;
export type PostAuthorBoxBlockParams = BlockWithEditorSettings<Partial<PostAuthorBoxContent>>;
export type PostCommentsBlockParams = BlockWithEditorSettings<Record<string, never>>;
export type PostNavigationBlockParams = BlockWithEditorSettings<Partial<PostNavigationContent>>;
export type PostInfoBlockParams = BlockWithEditorSettings<Partial<PostInfoContent>>;
export type PostProgressBlockParams = BlockWithEditorSettings<Partial<PostProgressContent>>;
export type InputBlockParams = BlockWithEditorSettings<Partial<InputFieldContent>>;
export type TextareaBlockParams = BlockWithEditorSettings<Partial<TextareaFieldContent>>;
export type SelectBlockParams = BlockWithEditorSettings<Partial<SelectFieldContent>>;

export type CustomBlockParams = BlockShellParams & {
	name: string;
	type?: "block" | "container";
	content: BlockContent;
	category?: BlockConfig["category"];
	label?: string;
	settings?: BlockEditorSettings;
	html?: string;
	js?: string;
	css?: string;
};

export type { IconRefExport as IconReference, BlockEditorSettings, BlockWithEditorSettings };
