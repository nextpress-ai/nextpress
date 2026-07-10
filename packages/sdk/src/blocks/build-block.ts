import type { BlockConfig, BlockContent, IconReference } from "../types/domain.js";
import {
	BLOCK_DEFINITIONS,
	BLOCK_NAMES,
	type BlockDefinitionMeta,
	type BlockName,
	isBlockName,
} from "./block-definitions.js";
import type { BlocksBuilder } from "./blocks-builder.types.js";
import type {
	AudioBlockParams,
	ButtonBlockParams,
	CodeBlockParams,
	CustomBlockParams,
	HeadingBlockParams,
	HtmlBlockParams,
	IconBlockParams,
	ImageBlockParams,
	InputBlockParams,
	MarkdownBlockParams,
	PostCommentsBlockParams,
	PostExcerptBlockParams,
	PullquoteBlockParams,
	QuoteBlockParams,
	PreformattedBlockParams,
	SelectBlockParams,
	TextBlockParams,
	TextareaBlockParams,
	VideoBlockParams,
	BlockShellParams,
	BlockEditorSettings,
} from "./block-params.js";
import { applyEditorSettings } from "./apply-editor-settings.js";
import { normalizeBlockSubtree } from "./normalize-block-tree.js";
import { applySanitizedBlockOverrides } from "../sanitize/apply-block-overrides.js";
import { createBlockId } from "./create-block-id.js";

export { createBlockId } from "./create-block-id.js";
export type { BlocksBuilder } from "./blocks-builder.types.js";
export type {
	BlockShellParams,
	BlockEditorSettings,
	BlockSettings,
	BlockStyles,
	ButtonBlockParams,
	ContainerBlockParams,
	CustomBlockParams,
	GroupBlockParams,
	HeadingBlockParams,
	HtmlBlockParams,
	IconBlockParams,
	IconReference,
	ImageBlockParams,
	MarkdownBlockParams,
	TextBlockParams,
} from "./block-params.js";
export type * from "./block-content-types.js";
export { applyEditorSettings } from "./apply-editor-settings.js";
export { normalizeBlockTree, normalizeBlockSubtree } from "./normalize-block-tree.js";

type BuilderFromNameParams = BlockShellParams & {
	settings?: BlockEditorSettings;
	content?: BlockContent;
	label?: string;
};

const mergeSettings = (
	base: BlockEditorSettings | undefined,
	override: BlockEditorSettings,
): BlockEditorSettings => ({
	content: { ...base?.content, ...override.content },
	styles: { ...base?.styles, ...override.styles },
	advanced: { ...base?.advanced, ...override.advanced },
});

const buildFromSettings = (
	name: BlockName,
	params: BlockShellParams & { settings: BlockEditorSettings; label?: string },
): BlockConfig => {
	const block = applyEditorSettings({ name, ...params });
	return params.children?.length ? normalizeBlockSubtree(block) : block;
};

const structured =
	<TContent extends Record<string, unknown>>(name: BlockName) =>
	(
		params: BlockShellParams & {
			settings?: BlockEditorSettings<TContent>;
			content?: Partial<TContent>;
			styles?: BlockEditorSettings["styles"];
			advanced?: BlockEditorSettings["advanced"];
		} = {},
	): BlockConfig => {
		const { content, styles, advanced, settings: nested, ...shell } = params;
		const settings = mergeSettings(nested, {
			content: content as Partial<TContent> | undefined,
			styles,
			advanced,
		});
		return buildFromSettings(name, { ...shell, settings });
	};

const resolveIconSettings = (params: IconBlockParams): BlockEditorSettings => {
	const icon: IconReference = {
		iconSet: params.settings?.content?.icon?.iconSet ?? params.iconSet ?? "lucide",
		iconName: params.settings?.content?.icon?.iconName ?? params.iconName ?? "star",
		size: params.settings?.content?.icon?.size ?? params.size ?? 24,
		color: params.settings?.content?.icon?.color ?? params.color ?? "currentColor",
		strokeWidth: params.settings?.content?.icon?.strokeWidth ?? params.strokeWidth ?? 2,
	};

	return mergeSettings(params.settings, {
		content: {
			...params.settings?.content,
			icon,
			link: params.settings?.content?.link ?? params.link ?? "",
			linkTarget: params.settings?.content?.linkTarget ?? params.linkTarget ?? "_self",
			label: params.settings?.content?.label ?? params.label ?? icon.iconName,
		},
		styles: {
			...(params.color ? { color: params.color } : {}),
			...(params.size ? { width: `${params.size}px`, height: `${params.size}px` } : {}),
			...params.settings?.styles,
		},
	});
};

/**
 * Block builder aligned with the dashboard page builder registry.
 * Params use nested `settings.content` / `settings.styles` / `settings.advanced`.
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
		params?: BlockShellParams & { label?: string; styles?: BlockEditorSettings["styles"] };
	}): BlockConfig => ({
		id: params.id ?? createBlockId(),
		name,
		type,
		parentId: params.parentId ?? null,
		label: params.label,
		category,
		content,
		styles: params.styles,
		settings: {},
		children: params.children,
	});

	/** Creates a block using registry defaults and nested editor settings. */
	const fromName = (name: BlockName, params: BuilderFromNameParams = {}): BlockConfig => {
		if (params.settings) {
			return buildFromSettings(name, {
				id: params.id,
				parentId: params.parentId,
				label: params.label,
				children: params.children,
				html: params.html,
				js: params.js,
				css: params.css,
				settings: params.settings,
			});
		}
		const def = BLOCK_DEFINITIONS[name];
		const { html, js, css, content: contentParam, ...shellRest } = params;
		const built = baseBlock({
			name,
			type: def.type,
			category: def.category,
			content: contentParam ?? def.defaultContent(),
			params: { ...shellRest, label: params.label ?? def.label, styles: undefined },
		});
		const withOverrides = applySanitizedBlockOverrides(built, { html, js, css });
		return params.children?.length ? normalizeBlockSubtree(withOverrides) : withOverrides;
	};

	return {
		names: BLOCK_NAMES,
		isBlockName,
		fromName,

		/** Heading — Content: text + level. Style: typography and spacing. */
		heading: (params: HeadingBlockParams): BlockConfig =>
			buildFromSettings("core/heading", {
				...params,
				settings: mergeSettings(params.settings, {
					content: {
						text: params.text ?? "Heading",
						level: params.level ?? 2,
						...params.settings?.content,
					},
					styles: params.settings?.styles,
					advanced: params.settings?.advanced,
				}),
			}),

		/** Paragraph — Content: text. Style: typography and spacing. */
		paragraph: (params: TextBlockParams): BlockConfig =>
			buildFromSettings("core/paragraph", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { text: params.text ?? "Paragraph", ...params.settings?.content },
				}),
			}),

		/** Markdown — Content: markdown source string. */
		markdown: (params: MarkdownBlockParams): BlockConfig =>
			buildFromSettings("core/markdown", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { value: params.value ?? "", ...params.settings?.content },
				}),
			}),

		/** Image — Content: url, alt, caption. Style: width, radius, etc. */
		image: (params: ImageBlockParams): BlockConfig =>
			buildFromSettings("core/image", {
				...params,
				settings: mergeSettings(params.settings, {
					content: {
						url: params.url ?? "",
						alt: params.alt,
						caption: params.caption,
						...params.settings?.content,
					},
				}),
			}),

		/** HTML — Content: raw HTML. Default `sanitized: true`. */
		html: (params: HtmlBlockParams): BlockConfig =>
			buildFromSettings("core/html", {
				...params,
				settings: mergeSettings(params.settings, {
					content: {
						value: params.value ?? "",
						sanitized: params.sanitized ?? true,
						...params.settings?.content,
					},
				}),
			}),

		/** Button — Content: label, url, linkTarget, optional icon. Style: button chrome. */
		button: (params: ButtonBlockParams): BlockConfig =>
			buildFromSettings("core/button", {
				...params,
				settings: mergeSettings(params.settings, {
					content: {
						text: params.text ?? "Button",
						url: params.url ?? "#",
						linkTarget: params.linkTarget ?? "_self",
						...(params.icon ? { icon: params.icon } : {}),
						...(params.iconPosition ? { iconPosition: params.iconPosition } : {}),
						...(params.iconOnly ? { iconOnly: params.iconOnly } : {}),
						...params.settings?.content,
					},
				}),
			}),

		buttons: structured<import("./block-content-types.js").ButtonsContent>("core/buttons"),
		gallery: structured<import("./block-content-types.js").GalleryContent>("core/gallery"),

		video: (params: VideoBlockParams = {}): BlockConfig =>
			buildFromSettings("core/video", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { url: params.url ?? "", ...params.settings?.content },
				}),
			}),

		audio: (params: AudioBlockParams = {}): BlockConfig =>
			buildFromSettings("core/audio", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { url: params.url ?? "", ...params.settings?.content },
				}),
			}),

		spacer: structured<import("./block-content-types.js").SpacerContent>("core/spacer"),
		separator: structured<import("./block-content-types.js").SeparatorContent>("core/separator"),
		columns: structured<import("./block-content-types.js").ColumnsContent>("core/columns"),
		container: structured<import("./block-content-types.js").ContainerContent>("core/container"),

		/**
		 * Group — Content: tagName, layoutPreset (semantics). Style: flex/grid layout and sizing.
		 */
		group: structured<import("./block-content-types.js").GroupContent>("core/group"),

		quote: (params: QuoteBlockParams = {}): BlockConfig =>
			buildFromSettings("core/quote", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { text: params.text ?? "Quote text", ...params.settings?.content },
				}),
			}),

		list: structured<import("./block-content-types.js").ListContent>("core/list"),
		mediaText: structured<import("./block-content-types.js").MediaTextContent>("core/media-text"),
		cover: structured<import("./block-content-types.js").CoverContent>("core/cover"),
		file: structured<import("./block-content-types.js").FileContent>("core/file"),

		code: (params: CodeBlockParams = {}): BlockConfig =>
			buildFromSettings("core/code", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { value: params.value ?? "// code", ...params.settings?.content },
				}),
			}),

		pullquote: (params: PullquoteBlockParams = {}): BlockConfig =>
			buildFromSettings("core/pullquote", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { text: params.text ?? "Pullquote", ...params.settings?.content },
				}),
			}),

		preformatted: (params: PreformattedBlockParams = {}): BlockConfig =>
			buildFromSettings("core/preformatted", {
				...params,
				settings: mergeSettings(params.settings, {
					content: { text: params.text ?? "Preformatted text", ...params.settings?.content },
				}),
			}),

		table: structured<import("./block-content-types.js").TableContent>("core/table"),

		/** Icon — Content: icon ref, link, label. Style: size (width/height), color. */
		icon: (params: IconBlockParams): BlockConfig =>
			buildFromSettings("core/icon", {
				...params,
				settings: resolveIconSettings(params),
			}),

		divider: structured<import("./block-content-types.js").DividerContent>("core/divider"),
		input: structured<import("./block-content-types.js").InputFieldContent>("core/input"),
		textarea: structured<import("./block-content-types.js").TextareaFieldContent>("core/textarea"),
		select: structured<import("./block-content-types.js").SelectFieldContent>("core/select"),
		postTitle: structured<import("./block-content-types.js").PostTitleContent>("post/title"),
		postExcerpt: (params: PostExcerptBlockParams = {}): BlockConfig =>
			structured<Record<string, never>>("post/excerpt")(params),
		postFeaturedImage: structured<import("./block-content-types.js").PostFeaturedImageContent>(
			"post/featured-image",
		),
		postList: structured<import("./block-content-types.js").PostListContent>("post/list"),
		postToc: structured<import("./block-content-types.js").PostTocContent>("post/toc"),
		postAuthorBox: structured<import("./block-content-types.js").PostAuthorBoxContent>("post/author-box"),
		postComments: (params: PostCommentsBlockParams = {}): BlockConfig =>
			structured<Record<string, never>>("post/comments")(params),
		postNavigation: structured<import("./block-content-types.js").PostNavigationContent>("post/navigation"),
		postInfo: structured<import("./block-content-types.js").PostInfoContent>("post/info"),
		postProgress: structured<import("./block-content-types.js").PostProgressContent>("post/progress"),

		custom: ({
			name,
			type = "block",
			content,
			category = "basic",
			label,
			html,
			js,
			css,
			settings,
			...params
		}: CustomBlockParams): BlockConfig => {
			if (isBlockName(name) && settings) {
				return buildFromSettings(name, {
					...params,
					label,
					html,
					js,
					css,
					settings,
				});
			}
			if (isBlockName(name)) {
				return fromName(name, { ...params, label, html, js, css, content });
			}
			const built = baseBlock({ name, type, content, category, params: { ...params, label } });
			const withOverrides = applySanitizedBlockOverrides(built, { html, js, css });
			return params.children?.length ? normalizeBlockSubtree(withOverrides) : withOverrides;
		},

		starterLayout: (): BlockConfig[] => [
			fromName("core/heading", {
				settings: { content: { text: "Page title", level: 1 } },
			}),
			fromName("core/paragraph", {
				settings: { content: { text: "Start writing your content…" } },
			}),
		],
	};
}

export type { BlockDefinitionMeta, BlockName };
