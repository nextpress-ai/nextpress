import type { BlockConfig, BlockContent } from "../types/domain.js";
import {
	BLOCK_DEFINITIONS,
	BLOCK_NAMES,
	type BlockDefinitionMeta,
	type BlockName,
	isBlockName,
} from "./block-definitions.js";
import { createBlockId } from "./create-block-id.js";

export { createBlockId } from "./create-block-id.js";

type BaseBlockParams = {
	id?: string;
	parentId?: string | null;
	label?: string;
	styles?: Record<string, string | number | null | undefined>;
	settings?: Record<string, unknown>;
	children?: BlockConfig[];
};

/**
 * Block builder aligned with every block in the dashboard page builder registry.
 * Blocks are persisted on pages, posts, and templates — not via a separate API.
 */
export function createBlocksBuilder() {
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
		(params: BaseBlockParams & Record<string, unknown> = {}): BlockConfig => {
			const { content, data, ...rest } = params;
			return fromName(name, {
				...rest,
				content: content as BlockContent | undefined,
				data: data as Record<string, unknown> | undefined,
			});
		};

	return {
		names: BLOCK_NAMES,
		isBlockName,
		fromName,
		heading: (params: BaseBlockParams & { text: string; level?: number }): BlockConfig =>
			fromName("core/heading", {
				...params,
				content: { kind: "text", value: params.text, level: params.level ?? 2 },
			}),
		paragraph: (params: BaseBlockParams & { text: string }): BlockConfig =>
			fromName("core/paragraph", {
				...params,
				content: { kind: "text", value: params.text },
			}),
		markdown: (params: BaseBlockParams & { value: string }): BlockConfig =>
			fromName("core/markdown", {
				...params,
				content: { kind: "markdown", value: params.value },
			}),
		image: (
			params: BaseBlockParams & { url: string; alt?: string; caption?: string },
		): BlockConfig =>
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
		html: (params: BaseBlockParams & { value: string; sanitized?: boolean }): BlockConfig =>
			fromName("core/html", {
				...params,
				content: {
					kind: "html",
					value: params.value,
					sanitized: params.sanitized ?? true,
				},
			}),
		button: helper("core/button"),
		buttons: helper("core/buttons"),
		gallery: helper("core/gallery"),
		video: helper("core/video"),
		audio: helper("core/audio"),
		spacer: helper("core/spacer"),
		separator: helper("core/separator"),
		columns: helper("core/columns"),
		container: helper("core/container"),
		group: helper("core/group"),
		quote: helper("core/quote"),
		list: helper("core/list"),
		mediaText: helper("core/media-text"),
		cover: helper("core/cover"),
		file: helper("core/file"),
		code: helper("core/code"),
		pullquote: helper("core/pullquote"),
		preformatted: helper("core/preformatted"),
		table: helper("core/table"),
		icon: helper("core/icon"),
		divider: helper("core/divider"),
		postTitle: helper("post/title"),
		postExcerpt: helper("post/excerpt"),
		postFeaturedImage: helper("post/featured-image"),
		postList: helper("post/list"),
		postToc: helper("post/toc"),
		postAuthorBox: helper("post/author-box"),
		postComments: helper("post/comments"),
		postNavigation: helper("post/navigation"),
		postInfo: helper("post/info"),
		postProgress: helper("post/progress"),
		custom: ({
			name,
			type = "block",
			content,
			category = "basic",
			label,
			...params
		}: BaseBlockParams & {
			name: string;
			type?: "block" | "container";
			content: BlockContent;
			category?: BlockConfig["category"];
			label?: string;
		}): BlockConfig => {
			if (isBlockName(name)) {
				return fromName(name, { ...params, content, label });
			}
			return baseBlock({ name, type, content, category, params: { ...params, label } });
		},
	};
}

export type BlocksBuilder = ReturnType<typeof createBlocksBuilder>;

export type { BlockDefinitionMeta, BlockName };
