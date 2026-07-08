import type { BlockConfig, BlockContent } from "../types/domain.js";
import {
	BLOCK_DEFINITIONS,
	BLOCK_NAMES,
	type BlockDefinitionMeta,
	type BlockName,
	isBlockName,
} from "./block-definitions.js";
import type { BlocksBuilder } from "./blocks-builder.types.js";
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
import { createBlockId } from "./create-block-id.js";

export { createBlockId } from "./create-block-id.js";
export type { BlocksBuilder } from "./blocks-builder.types.js";
export type {
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
	IconReference,
} from "./block-params.js";

/**
 * Block builder aligned with every block in the dashboard page builder registry.
 * Blocks are persisted on pages, posts, and templates — not via a separate API.
 */
export function createBlocksBuilder(): BlocksBuilder {
	const baseBlock = ({
		name,
		type,
		content,
		category,
		params = {},
	}: {
		name: string;
		type: "block" | "container";
		content: BlockContent;
		category: BlockConfig["category"];
		params?: BaseBlockParams;
	}): BlockConfig => ({
		id: params.id ?? createBlockId(),
		name,
		type,
		parentId: params.parentId ?? null,
		label: params.label,
		category,
		content,
		styles: params.styles,
		settings: params.settings ?? {},
		children: params.children,
	});

	/** Creates a block using the same defaults as the dashboard `getDefaultBlock`. */
	const fromName = (
		name: BlockName,
		params: BaseBlockParams & {
			content?: BlockContent;
			data?: Record<string, unknown>;
		} = {},
	): BlockConfig => {
		const def = BLOCK_DEFINITIONS[name];
		const content =
			params.content ??
			(params.data
				? ({ kind: "structured", data: params.data } as BlockContent)
				: def.defaultContent());

		return baseBlock({
			name,
			type: def.type,
			category: def.category,
			content,
			params: {
				...params,
				label: params.label ?? def.label,
				styles: params.styles ?? def.defaultStyles,
			},
		});
	};

	const helper =
		(name: BlockName) =>
		(params: StructuredBlockParams = {}): BlockConfig => {
			const { content, data, ...rest } = params;
			return fromName(name, {
				...rest,
				content,
				data,
			});
		};

	return {
		/** Canonical block names matching the dashboard registry for type-safe builders. */
		names: BLOCK_NAMES,
		/** Guard dynamic names before calling fromName to avoid silent mismatches. */
		isBlockName,
		/** Creates a block using dashboard defaults so SDK trees match the editor registry. */
		fromName,
		/** Seed headings with correct level metadata for the page builder tree. */
		heading: (params: HeadingBlockParams): BlockConfig =>
			fromName("core/heading", {
				...params,
				content: { kind: "text", value: params.text, level: params.level ?? 2 },
			}),
		/** Seed body copy blocks without hand-assembling text content shapes. */
		paragraph: (params: TextBlockParams): BlockConfig =>
			fromName("core/paragraph", {
				...params,
				content: { kind: "text", value: params.text },
			}),
		/** Author rich text in markdown while persisting the structured content kind. */
		markdown: (params: MarkdownBlockParams): BlockConfig =>
			fromName("core/markdown", {
				...params,
				content: { kind: "markdown", value: params.value },
			}),
		/** Wire media blocks with url, alt, and caption in one call. */
		image: (params: ImageBlockParams): BlockConfig =>
			fromName("core/image", {
				...params,
				content: {
					kind: "media",
					url: params.url,
					alt: params.alt,
					caption: params.caption,
					mediaType: "image",
				},
			}),
		/** Embed raw HTML with sanitization defaults matching the dashboard block. */
		html: (params: HtmlBlockParams): BlockConfig =>
			fromName("core/html", {
				...params,
				content: {
					kind: "html",
					value: params.value,
					sanitized: params.sanitized ?? true,
				},
			}),
		/** CTA block with dashboard text/link content shape. */
		button: (params: ButtonBlockParams): BlockConfig =>
			fromName("core/button", {
				...params,
				content: {
					kind: "text",
					value: params.text,
					url: params.url ?? "#",
					linkTarget: params.linkTarget ?? "_self",
					...(params.icon ? { icon: params.icon } : {}),
					...(params.iconPosition ? { iconPosition: params.iconPosition } : {}),
					...(params.iconOnly ? { iconOnly: params.iconOnly } : {}),
				},
			}),
		/** Button group wrapper preserving layout settings from the registry. */
		buttons: helper("core/buttons"),
		/** Image grid block for media-heavy layouts. */
		gallery: helper("core/gallery"),
		/** Hosted or embedded video with registry content shape. */
		video: helper("core/video"),
		/** Audio embed block for podcasts and media posts. */
		audio: helper("core/audio"),
		/** Vertical rhythm spacer matching theme spacing tokens. */
		spacer: helper("core/spacer"),
		/** Visual break between sections on long pages. */
		separator: helper("core/separator"),
		/** Multi-column layout container for side-by-side content. */
		columns: helper("core/columns"),
		/** Generic layout wrapper for nested block trees. */
		container: helper("core/container"),
		/** Group related blocks with shared background or padding. */
		group: helper("core/group"),
		/** Pull-quote styling for editorial emphasis. */
		quote: helper("core/quote"),
		/** Ordered or bulleted lists with structured content. */
		list: helper("core/list"),
		/** Side-by-side media and text for feature sections. */
		mediaText: helper("core/media-text"),
		/** Hero overlay block for background image and headline. */
		cover: helper("core/cover"),
		/** Downloadable file attachment block. */
		file: helper("core/file"),
		/** Syntax-highlighted code snippet block. */
		code: helper("core/code"),
		/** Large inset quote for editorial layouts. */
		pullquote: helper("core/pullquote"),
		/** Monospace preformatted text preserving whitespace. */
		preformatted: helper("core/preformatted"),
		/** Tabular data block for structured content. */
		table: helper("core/table"),
		/** Icon block using built-in lucide (or other) icon sets. */
		icon: (params: IconBlockParams): BlockConfig =>
			fromName("core/icon", {
				...params,
				data: {
					icon: {
						iconSet: params.iconSet ?? "lucide",
						iconName: params.iconName,
						size: params.size ?? 24,
						color: params.color ?? "currentColor",
						strokeWidth: params.strokeWidth ?? 2,
					},
					link: params.link ?? "",
					linkTarget: params.linkTarget ?? "_self",
					label: params.label ?? params.iconName,
				},
			}),
		/** Themed horizontal rule alternative to separator. */
		divider: helper("core/divider"),
		/** Dynamic post title placeholder for single-post templates. */
		postTitle: helper("post/title"),
		/** Dynamic excerpt placeholder for archive cards. */
		postExcerpt: helper("post/excerpt"),
		/** Featured image slot bound to the current post. */
		postFeaturedImage: helper("post/featured-image"),
		/** Query loop listing recent posts on index templates. */
		postList: helper("post/list"),
		/** Auto-generated table of contents for long posts. */
		postToc: helper("post/toc"),
		/** Author bio section at the end of single posts. */
		postAuthorBox: helper("post/author-box"),
		/** Comments thread region for single-post templates. */
		postComments: helper("post/comments"),
		/** Previous/next links for post pagination. */
		postNavigation: helper("post/navigation"),
		/** Meta line for date, author, and categories. */
		postInfo: helper("post/info"),
		/** Reading progress indicator for long-form posts. */
		postProgress: helper("post/progress"),
		/** Fallback for plugin or custom blocks not in the built-in registry. */
		custom: ({
			name,
			type = "block",
			content,
			category = "basic",
			label,
			...params
		}: CustomBlockParams): BlockConfig => {
			if (isBlockName(name)) {
				return fromName(name, { ...params, content, label });
			}
			return baseBlock({ name, type, content, category, params: { ...params, label } });
		},
		/** Quick-start empty pages with a sensible heading and body placeholder. */
		starterLayout: (): BlockConfig[] => [
			fromName("core/heading", {
				content: { kind: "text", value: "Page title", level: 1 },
			}),
			fromName("core/paragraph", {
				content: { kind: "text", value: "Start writing your content…" },
			}),
		],
	};
}

export type { BlockDefinitionMeta, BlockName };
