import type { BlockConfig, BlockContent } from "../types/domain.js";
import { BLOCK_NAMES, isBlockName } from "./block-definitions.js";
import type {
	AudioBlockParams,
	ButtonBlockParams,
	ButtonsBlockParams,
	CodeBlockParams,
	ColumnsBlockParams,
	ContainerBlockParams,
	CoverBlockParams,
	CustomBlockParams,
	DividerBlockParams,
	FileBlockParams,
	GalleryBlockParams,
	GroupBlockParams,
	HeadingBlockParams,
	HtmlBlockParams,
	IconBlockParams,
	ImageBlockParams,
	InputBlockParams,
	ListBlockParams,
	MarkdownBlockParams,
	MediaTextBlockParams,
	PostAuthorBoxBlockParams,
	PostCommentsBlockParams,
	PostExcerptBlockParams,
	PostFeaturedImageBlockParams,
	PostInfoBlockParams,
	PostListBlockParams,
	PostNavigationBlockParams,
	PostProgressBlockParams,
	PostTitleBlockParams,
	PostTocBlockParams,
	PullquoteBlockParams,
	QuoteBlockParams,
	PreformattedBlockParams,
	SeparatorBlockParams,
	SelectBlockParams,
	SpacerBlockParams,
	TableBlockParams,
	TextBlockParams,
	TextareaBlockParams,
	VideoBlockParams,
} from "./block-params.js";
import type { BlockEditorSettings } from "./block-editor-settings.js";
import type { BlockShellParams } from "./block-params.js";

/**
 * Type-safe block tree builder matching the dashboard page builder.
 *
 * Params use nested editor settings:
 * - `settings.content` — Content tab (semantics only)
 * - `settings.styles` — Style tab (inline CSS)
 * - `settings.advanced` — Advanced tab (display conditions, columnLayout, …)
 */
export type BlocksBuilder = {
	/** All canonical block names registered in the dashboard. */
	names: typeof BLOCK_NAMES;

	/** Narrow arbitrary strings to known block names before building. */
	isBlockName: typeof isBlockName;

	/**
	 * Build from registry defaults when a named helper is not enough.
	 * Prefer `settings.content` / `settings.styles` over raw `content`.
	 */
	fromName: (
		name: import("./block-definitions.js").BlockName,
		params?: BlockShellParams & {
			settings?: BlockEditorSettings;
			label?: string;
			content?: BlockContent;
		},
	) => BlockConfig;

	/** Heading — Content: text + level. Style: typography. */
	heading: (params: HeadingBlockParams) => BlockConfig;

	/** Paragraph — Content: text. */
	paragraph: (params: TextBlockParams) => BlockConfig;

	/** Markdown — Content: markdown source. */
	markdown: (params: MarkdownBlockParams) => BlockConfig;

	/** Image — Content: url, alt, caption. Style: width, radius. */
	image: (params: ImageBlockParams) => BlockConfig;

	/** HTML — Content: raw HTML string. */
	html: (params: HtmlBlockParams) => BlockConfig;

	/** Button — Content: label, url, linkTarget. Style: button chrome. */
	button: (params: ButtonBlockParams) => BlockConfig;

	/** Buttons row — Content: orientation/layout. Children: `core/button` blocks. */
	buttons: (params?: ButtonsBlockParams) => BlockConfig;

	/** Gallery — Content: images, columns, crop options. */
	gallery: (params?: GalleryBlockParams) => BlockConfig;

	/** Video — Content: media url. */
	video: (params?: VideoBlockParams) => BlockConfig;

	/** Audio — Content: media url. */
	audio: (params?: AudioBlockParams) => BlockConfig;

	/** Spacer — Content: height. */
	spacer: (params?: SpacerBlockParams) => BlockConfig;

	/** Separator — Content: line style. */
	separator: (params?: SeparatorBlockParams) => BlockConfig;

	/** Columns — Content: count, gap, alignment. */
	columns: (params?: ColumnsBlockParams) => BlockConfig;

	/** Container — Content: tagName. Style: maxWidth, padding, background. */
	container: (params?: ContainerBlockParams) => BlockConfig;

	/** Group — Content: tagName, layoutPreset. Style: flex/grid layout and sizing. */
	group: (params?: GroupBlockParams) => BlockConfig;

	/** Quote — Content: quote text. */
	quote: (params?: QuoteBlockParams) => BlockConfig;

	/** List — Content: ordered flag and items. */
	list: (params?: ListBlockParams) => BlockConfig;

	/** Media & text — Content: media side + copy. */
	mediaText: (params?: MediaTextBlockParams) => BlockConfig;

	/** Cover hero — Content: background, overlay, inner HTML. */
	cover: (params?: CoverBlockParams) => BlockConfig;

	/** File — Content: download url and filename. */
	file: (params?: FileBlockParams) => BlockConfig;

	/** Code — Content: source string. */
	code: (params?: CodeBlockParams) => BlockConfig;

	/** Pullquote — Content: emphasized quote. */
	pullquote: (params?: PullquoteBlockParams) => BlockConfig;

	/** Preformatted — Content: monospace text. */
	preformatted: (params?: PreformattedBlockParams) => BlockConfig;

	/** Table — Content: headers and rows. */
	table: (params?: TableBlockParams) => BlockConfig;

	/** Icon — Content: icon ref, link, label. Style: padding, colors. */
	icon: (params: IconBlockParams) => BlockConfig;

	/** Divider — Content: line style. */
	divider: (params?: DividerBlockParams) => BlockConfig;

	/** Text field — Content: name, placeholder, input type. */
	input: (params?: InputBlockParams) => BlockConfig;

	/** Text area — Content: name, placeholder, rows. */
	textarea: (params?: TextareaBlockParams) => BlockConfig;

	/** Dropdown — Content: options list. */
	select: (params?: SelectBlockParams) => BlockConfig;

	/** Post title — template dynamic block. */
	postTitle: (params?: PostTitleBlockParams) => BlockConfig;

	/** Post excerpt — template dynamic block. */
	postExcerpt: (params?: PostExcerptBlockParams) => BlockConfig;

	/** Featured image — Content: aspect ratio, object-fit. */
	postFeaturedImage: (params?: PostFeaturedImageBlockParams) => BlockConfig;

	/** Post list — Content: blogId, layout, postsPerPage. */
	postList: (params?: PostListBlockParams) => BlockConfig;

	/** Table of contents — Content: title, maxDepth. */
	postToc: (params?: PostTocBlockParams) => BlockConfig;

	/** Author box — Content: avatar/bio toggles. */
	postAuthorBox: (params?: PostAuthorBoxBlockParams) => BlockConfig;

	/** Comments — template dynamic block. */
	postComments: (params?: PostCommentsBlockParams) => BlockConfig;

	/** Post navigation — Content: prev/next toggles. */
	postNavigation: (params?: PostNavigationBlockParams) => BlockConfig;

	/** Post info — Content: date, author, categories toggles. */
	postInfo: (params?: PostInfoBlockParams) => BlockConfig;

	/** Reading progress — Content: bar position. */
	postProgress: (params?: PostProgressBlockParams) => BlockConfig;

	/** Plugin or custom block by name. */
	custom: (params: CustomBlockParams) => BlockConfig;

	/** Empty page starter: H1 + paragraph placeholder. */
	starterLayout: () => BlockConfig[];
};
