import { randomUUID } from "node:crypto";
import { parse, HTMLElement, type Node } from "node-html-parser";
import type { BlockConfig } from "../../schema-types";
import { sanitizeHtml } from "../../sanitize-html";
import { attachImportElementMeta } from "./extract-import-element-meta";
import {
	buildButtonsBlock,
	buildColumnsBlock,
	buildGalleryBlock,
	buildSeparatorBlock,
	isGutenbergButtons,
	isGutenbergColumns,
	isGutenbergGallery,
	isUnwrappableGroup,
} from "./map-gutenberg-layout";

/**
 * Converts a WordPress `content.rendered` HTML string into native NextPress
 * blocks so imported posts are editable like any other content (instead of one
 * opaque HTML block). Gutenberg layout wrappers (columns, buttons, gallery)
 * map to native layout blocks; anything else unmappable is preserved as
 * `core/html`.
 */

export type HtmlToBlocksOptions = {
	/**
	 * Maps a remote image URL to a (possibly local/sideloaded) URL. Resolution
	 * happens before parsing; if omitted or it returns null, the original URL is
	 * kept (reference mode).
	 */
	resolveImageUrl?: (url: string) => string | null;
};

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const isElement = (node: Node): node is HTMLElement =>
	node instanceof HTMLElement && !!node.rawTagName;

const baseBlock = (
	name: string,
	label: string,
	category: BlockConfig["category"],
	content: BlockConfig["content"],
): BlockConfig => ({
	id: randomUUID(),
	name,
	type: "block",
	parentId: null,
	label,
	category,
	content,
	styles: {},
	other: {},
});

/** Heuristic: does this inline HTML carry formatting we must preserve as HTML? */
const hasInlineMarkup = (innerHtml: string, text: string): boolean =>
	innerHtml.trim() !== text.trim() && /<[a-z!/]/i.test(innerHtml);

const buildHtmlFallback = (html: string): BlockConfig =>
	baseBlock("core/html", "HTML", "advanced", {
		kind: "structured",
		data: { content: html, className: "wp-import-content" },
	});

const buildParagraph = (el: HTMLElement): BlockConfig | null => {
	const inner = el.innerHTML || "";
	const text = el.text || "";
	if (!text.trim() && !el.querySelector("img")) return null;
	const block = hasInlineMarkup(inner, text)
		? baseBlock("core/paragraph", "Paragraph", "basic", {
				kind: "text",
				value: sanitizeHtml(inner.trim()),
				format: "html",
			})
		: baseBlock("core/paragraph", "Paragraph", "basic", {
				kind: "text",
				value: text.trim(),
			});
	return attachImportElementMeta({ block, el });
};

const buildHeading = (el: HTMLElement, level: number): BlockConfig => {
	const inner = el.innerHTML || "";
	const text = el.text || "";
	const isHtml = hasInlineMarkup(inner, text);
	const block = baseBlock("core/heading", "Heading", "basic", {
		kind: "text",
		value: isHtml ? sanitizeHtml(inner.trim()) : text.trim(),
		level,
		...(isHtml ? { format: "html" as const } : {}),
	});
	return attachImportElementMeta({ block, el });
};

const buildImage = (
	img: HTMLElement,
	caption: string,
	opts: HtmlToBlocksOptions,
	wrapper?: HTMLElement,
): BlockConfig | null => {
	const rawSrc =
		img.getAttribute("src") ||
		img.getAttribute("data-src") ||
		img.getAttribute("data-orig-file") ||
		"";
	if (!rawSrc) return null;
	const resolved = opts.resolveImageUrl?.(rawSrc) ?? rawSrc;
	const block = baseBlock("core/image", "Image", "media", {
		kind: "media",
		url: resolved,
		alt: img.getAttribute("alt") || "",
		caption: caption || "",
		mediaType: "image",
	} as BlockConfig["content"]);
	return attachImportElementMeta({ block, el: img, wrapper });
};

const buildList = (el: HTMLElement): BlockConfig => {
	const ordered = el.rawTagName.toLowerCase() === "ol";
	const values = sanitizeHtml((el.innerHTML || "").trim());
	const listType = el.getAttribute("type");
	const content = {
		ordered,
		values,
		...(ordered && Number.isFinite(Number(el.getAttribute("start")))
			? { start: Number(el.getAttribute("start")) }
			: {}),
		...(ordered && el.hasAttribute("reversed") ? { reversed: true } : {}),
		...(ordered && listType ? { type: listType } : {}),
	};
	const block = baseBlock(
		"core/list",
		"List",
		"advanced",
		content as unknown as BlockConfig["content"],
	);
	return attachImportElementMeta({ block, el });
};

const buildQuote = (el: HTMLElement): BlockConfig => {
	const value = sanitizeHtml((el.innerHTML || "").trim()) || "<p></p>";
	const block = baseBlock("core/quote", "Quote", "advanced", {
		value,
	} as unknown as BlockConfig["content"]);
	return attachImportElementMeta({ block, el });
};

const childElements = (el: HTMLElement): HTMLElement[] =>
	el.childNodes.filter(
		(n): n is HTMLElement => n instanceof HTMLElement && !!n.rawTagName,
	);

/** Maps leaf / simple elements (no Gutenberg layout wrappers). */
const mapLeafElement = (
	el: HTMLElement,
	opts: HtmlToBlocksOptions,
): BlockConfig | null => {
	const tag = el.rawTagName.toLowerCase();

	if (HEADING_TAGS.has(tag)) return buildHeading(el, Number(tag[1]));
	if (tag === "p") {
		const img = el.querySelector("img");
		if (img && !el.text.trim()) return buildImage(img, "", opts, el);
		return buildParagraph(el);
	}
	if (tag === "ul" || tag === "ol") return buildList(el);
	if (tag === "blockquote") return buildQuote(el);
	if (tag === "img") return buildImage(el, "", opts);
	if (tag === "hr") return buildSeparatorBlock({ el, factory: baseBlock });
	if (tag === "figure") {
		if (isGutenbergGallery(el)) {
			return buildGalleryBlock({ el, factory: baseBlock, resolveImageUrl: opts.resolveImageUrl }) ?? buildHtmlFallback(el.toString());
		}
		const img = el.querySelector("img");
		const hasEmbed = el.querySelector("iframe, video, audio, script, embed");
		if (img && !hasEmbed) {
			const caption = el.querySelector("figcaption")?.text?.trim() || "";
			return buildImage(img, caption, opts, el);
		}
		return buildHtmlFallback(el.toString());
	}

	return buildHtmlFallback(el.toString());
};

/** Maps one element — unwraps Gutenberg groups or builds layout blocks. */
const mapElement = (el: HTMLElement, opts: HtmlToBlocksOptions): BlockConfig[] => {
	if (isUnwrappableGroup(el)) {
		return mapElements(childElements(el), opts);
	}
	if (isGutenbergColumns(el)) {
		return [
			buildColumnsBlock({
				el,
				factory: baseBlock,
				mapElements: (elements) => mapElements(elements, opts),
			}),
		];
	}
	if (isGutenbergButtons(el)) {
		const block = buildButtonsBlock({ el, factory: baseBlock });
		return block ? [block] : [buildHtmlFallback(el.toString())];
	}
	if (isGutenbergGallery(el)) {
		const block = buildGalleryBlock({
			el,
			factory: baseBlock,
			resolveImageUrl: opts.resolveImageUrl,
		});
		return block ? [block] : [buildHtmlFallback(el.toString())];
	}

	const leaf = mapLeafElement(el, opts);
	return leaf ? [leaf] : [];
};

const mapElements = (elements: HTMLElement[], opts: HtmlToBlocksOptions): BlockConfig[] =>
	elements.flatMap((el) => mapElement(el, opts));

const mapNode = (node: Node, opts: HtmlToBlocksOptions): BlockConfig[] => {
	if (isElement(node)) return mapElement(node, opts);
	const text = (node.text || "").trim();
	if (!text) return [];
	return [
		baseBlock("core/paragraph", "Paragraph", "basic", {
			kind: "text",
			value: text,
		}),
	];
};

/**
 * Parse WP HTML into native NextPress blocks. Always returns at least one block
 * when there is content; falls back to a single HTML block if nothing maps.
 */
export const htmlToBlocks = (
	html: string,
	opts: HtmlToBlocksOptions = {},
): BlockConfig[] => {
	if (!html || !html.trim()) return [];

	const root = parse(html, { comment: false });
	const blocks = root.childNodes.flatMap((node) => mapNode(node, opts));

	if (blocks.length === 0) {
		return root.text.trim() ? [buildHtmlFallback(html)] : [];
	}
	return blocks;
};

/** Collects unique image source URLs from WP HTML (for pre-import sideloading). */
export const collectImageUrls = (html: string): string[] => {
	if (!html || !html.trim()) return [];
	const root = parse(html, { comment: false });
	const urls = new Set<string>();
	for (const img of root.querySelectorAll("img")) {
		const src =
			img.getAttribute("src") ||
			img.getAttribute("data-src") ||
			img.getAttribute("data-orig-file");
		if (src) urls.add(src);
	}
	return [...urls];
};
