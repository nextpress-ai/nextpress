import type { BlockName } from "./block-definitions.js";
import { BLOCK_NAMES, isBlockName } from "./block-definitions.js";
import type {
	BaseBlockParams,
	ButtonBlockParams,
	CustomBlockParams,
	HeadingBlockParams,
	HtmlBlockParams,
	IconBlockParams,
	ImageBlockParams,
	MarkdownBlockParams,
	StructuredBlockParams,
	TextBlockParams,
} from "./block-params.js";
import type { BlockConfig, BlockContent } from "../types/domain.js";

/** Type-safe block tree builder matching the dashboard registry. */
export type BlocksBuilder = {
	/** All canonical block names for validation and dynamic UIs. */
	names: typeof BLOCK_NAMES;
	/** Narrow arbitrary strings to known block names before building. */
	isBlockName: typeof isBlockName;
	/** Build from registry defaults when a named helper is not enough. */
	fromName: (
		name: BlockName,
		params?: BaseBlockParams & {
			content?: BlockContent;
			data?: Record<string, unknown>;
		},
	) => BlockConfig;
	heading: (params: HeadingBlockParams) => BlockConfig;
	paragraph: (params: TextBlockParams) => BlockConfig;
	markdown: (params: MarkdownBlockParams) => BlockConfig;
	image: (params: ImageBlockParams) => BlockConfig;
	html: (params: HtmlBlockParams) => BlockConfig;
	button: (params: ButtonBlockParams) => BlockConfig;
	buttons: (params?: StructuredBlockParams) => BlockConfig;
	gallery: (params?: StructuredBlockParams) => BlockConfig;
	video: (params?: StructuredBlockParams) => BlockConfig;
	audio: (params?: StructuredBlockParams) => BlockConfig;
	spacer: (params?: StructuredBlockParams) => BlockConfig;
	separator: (params?: StructuredBlockParams) => BlockConfig;
	columns: (params?: StructuredBlockParams) => BlockConfig;
	container: (params?: StructuredBlockParams) => BlockConfig;
	group: (params?: StructuredBlockParams) => BlockConfig;
	quote: (params?: StructuredBlockParams) => BlockConfig;
	list: (params?: StructuredBlockParams) => BlockConfig;
	mediaText: (params?: StructuredBlockParams) => BlockConfig;
	cover: (params?: StructuredBlockParams) => BlockConfig;
	file: (params?: StructuredBlockParams) => BlockConfig;
	code: (params?: StructuredBlockParams) => BlockConfig;
	pullquote: (params?: StructuredBlockParams) => BlockConfig;
	preformatted: (params?: StructuredBlockParams) => BlockConfig;
	table: (params?: StructuredBlockParams) => BlockConfig;
	icon: (params: IconBlockParams) => BlockConfig;
	divider: (params?: StructuredBlockParams) => BlockConfig;
	postTitle: (params?: StructuredBlockParams) => BlockConfig;
	postExcerpt: (params?: StructuredBlockParams) => BlockConfig;
	postFeaturedImage: (params?: StructuredBlockParams) => BlockConfig;
	postList: (params?: StructuredBlockParams) => BlockConfig;
	postToc: (params?: StructuredBlockParams) => BlockConfig;
	postAuthorBox: (params?: StructuredBlockParams) => BlockConfig;
	postComments: (params?: StructuredBlockParams) => BlockConfig;
	postNavigation: (params?: StructuredBlockParams) => BlockConfig;
	postInfo: (params?: StructuredBlockParams) => BlockConfig;
	postProgress: (params?: StructuredBlockParams) => BlockConfig;
	custom: (params: CustomBlockParams) => BlockConfig;
	/** Quick-start empty pages with a sensible heading and body placeholder. */
	starterLayout: () => BlockConfig[];
};
