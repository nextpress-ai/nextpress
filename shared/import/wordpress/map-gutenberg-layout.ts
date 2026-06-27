import { randomUUID } from "node:crypto";
import { HTMLElement, type Node } from "node-html-parser";
import type { BlockConfig } from "../../schema-types";
import type { ColumnLayout } from "../../columns-layout";
import { attachImportElementMeta } from "./extract-import-element-meta";
import { parseImportInlineStyle } from "./extract-import-element-meta";

export type LayoutBlockFactory = (
	name: string,
	label: string,
	category: BlockConfig["category"],
	content: BlockConfig["content"],
) => BlockConfig;

const isElement = (node: Node): node is HTMLElement =>
	node instanceof HTMLElement && !!node.rawTagName;

const filterElements = (nodes: Node[]): HTMLElement[] =>
	nodes.filter(isElement);

const hasToken = (el: HTMLElement, token: string): boolean =>
	(el.getAttribute("class") ?? "").split(/\s+/).includes(token);

const readFlexBasis = (el: HTMLElement): string | undefined => {
	const style = parseImportInlineStyle(el.getAttribute("style") ?? undefined);
	if (style.flexBasis && typeof style.flexBasis === "string") return style.flexBasis;
	const raw = el.getAttribute("style") ?? "";
	const match = raw.match(/flex-basis\s*:\s*([^;]+)/i);
	return match?.[1]?.trim();
};

/** True for Gutenberg column wrapper divs inside a columns block. */
export const isGutenbergColumn = (el: HTMLElement): boolean =>
	hasToken(el, "wp-block-column");

/** True for Gutenberg columns container. */
export const isGutenbergColumns = (el: HTMLElement): boolean =>
	hasToken(el, "wp-block-columns");

/** True for Gutenberg buttons container. */
export const isGutenbergButtons = (el: HTMLElement): boolean =>
	hasToken(el, "wp-block-buttons");

/** True for Gutenberg gallery (figure or ul). */
export const isGutenbergGallery = (el: HTMLElement): boolean =>
	hasToken(el, "wp-block-gallery");

/**
 * Group/flow wrappers that only exist for layout — safe to unwrap and map children
 * at the parent level instead of preserving as core/html.
 */
export const isUnwrappableGroup = (el: HTMLElement): boolean => {
	if (isGutenbergColumns(el) || isGutenbergButtons(el) || isGutenbergGallery(el)) {
		return false;
	}
	const tag = el.rawTagName?.toLowerCase();
	if (tag !== "div" && tag !== "section") return false;
	const cls = el.getAttribute("class") ?? "";
	if (/\bwp-block-(group|cover|media-text)\b/.test(cls)) return true;
	if (/\bis-layout-(flow|constrained|flex|grid)\b/.test(cls) && !/\bwp-block-/.test(cls)) {
		return true;
	}
	return false;
};

const columnElements = (el: HTMLElement): HTMLElement[] => {
	const tagged = el.querySelectorAll(".wp-block-column") as unknown as HTMLElement[];
	if (tagged.length > 0) return [...tagged];
	return filterElements(el.childNodes);
};

/**
 * Builds a native `core/columns` container with nested children and columnLayout.
 */
export const buildColumnsBlock = (params: {
	el: HTMLElement;
	factory: LayoutBlockFactory;
	mapElements: (elements: HTMLElement[]) => BlockConfig[];
}): BlockConfig => {
	const { el, factory, mapElements } = params;
	const columns = columnElements(el);
	const columnLayout: ColumnLayout[] = [];
	const children: BlockConfig[] = [];
	const columnsId = randomUUID();

	columns.forEach((columnEl, index) => {
		const columnId = `col-${randomUUID()}`;
		const innerElements = filterElements(columnEl.childNodes);
		const columnBlocks = mapElements(innerElements).map((block) => ({
			...block,
			parentId: columnsId,
		}));
		const blockIds = columnBlocks.map((b) => b.id);
		columnBlocks.forEach((b) => children.push(b));
		columnLayout.push({
			columnId,
			width: readFlexBasis(columnEl) ?? `${(100 / Math.max(columns.length, 1)).toFixed(2)}%`,
			blockIds,
		});
	});

	const block = factory(
		"core/columns",
		"Columns",
		"layout",
		{
			kind: "structured",
			data: {
				layoutMode: "flex",
				gap: "20px",
				direction: "row",
				columnVerticalAlignment: "top",
				columnHorizontalAlignment: "stretch",
			},
		},
	);

	return attachImportElementMeta({
		block: {
			...block,
			id: columnsId,
			type: "container",
			parentId: null,
			settings: { columnLayout },
			children,
		},
		el,
	});
};

type ButtonItem = {
	id: string;
	text: string;
	url: string;
	linkTarget?: "_self" | "_blank";
	rel?: string;
	title?: string;
	className?: string;
};

const parseButtonLink = (anchor: HTMLElement): ButtonItem | null => {
	const href = anchor.getAttribute("href") ?? "#";
	const text = anchor.text?.trim() || anchor.getAttribute("title")?.trim() || "Button";
	const target = anchor.getAttribute("target");
	return {
		id: randomUUID(),
		text,
		url: href,
		linkTarget: target === "_blank" ? "_blank" : "_self",
		rel: anchor.getAttribute("rel") ?? "",
		title: anchor.getAttribute("title") ?? "",
		className: (anchor.getAttribute("class") ?? "")
			.split(/\s+/)
			.filter((t) => t && !t.startsWith("wp-block-button"))
			.join(" "),
	};
};

/** Builds native `core/buttons` from a Gutenberg buttons wrapper. */
export const buildButtonsBlock = (params: {
	el: HTMLElement;
	factory: LayoutBlockFactory;
}): BlockConfig | null => {
	const { el, factory } = params;
	const buttons: ButtonItem[] = [];

	for (const buttonWrap of el.querySelectorAll(".wp-block-button")) {
		const anchor = buttonWrap.querySelector("a");
		if (!anchor) continue;
		const item = parseButtonLink(anchor);
		if (item) buttons.push(item);
	}

	if (buttons.length === 0) return null;

	const blockStyles = parseImportInlineStyle(
		el.querySelector(".wp-block-button__link")?.getAttribute("style") ?? undefined,
	);

	const block = factory("core/buttons", "Buttons", "basic", {
		kind: "structured",
		data: {
			buttons,
			layout: "flex-start",
			orientation: "horizontal",
		},
	});

	return attachImportElementMeta({
		block: {
			...block,
			styles: { ...blockStyles, ...block.styles },
		},
		el,
	});
};

/** Builds native `core/gallery` from a Gutenberg gallery figure. */
export const buildGalleryBlock = (params: {
	el: HTMLElement;
	factory: LayoutBlockFactory;
	resolveImageUrl?: (url: string) => string | null;
}): BlockConfig | null => {
	const { el, factory, resolveImageUrl } = params;
	const images: Array<{ id: string; url: string; alt: string; caption: string }> = [];

	for (const img of el.querySelectorAll("img")) {
		const rawSrc =
			img.getAttribute("src") ||
			img.getAttribute("data-src") ||
			img.getAttribute("data-orig-file") ||
			"";
		if (!rawSrc) continue;
		const url = resolveImageUrl?.(rawSrc) ?? rawSrc;
		const figure = img.closest("figure");
		const caption = figure?.querySelector("figcaption")?.text?.trim() ?? "";
		images.push({
			id: randomUUID(),
			url,
			alt: img.getAttribute("alt") ?? "",
			caption,
		});
	}

	if (images.length === 0) return null;

	const columnsMatch = (el.getAttribute("class") ?? "").match(/columns-(\d+)/);
	const columns = columnsMatch ? Number(columnsMatch[1]) : Math.min(images.length, 3);

	const block = factory("core/gallery", "Gallery", "media", {
		kind: "structured",
		data: {
			images,
			columns,
			imageCrop: true,
			linkTo: "none",
			sizeSlug: "large",
		},
	});

	return attachImportElementMeta({ block, el });
};

/** Native `core/separator` for `<hr>` or wp-block-separator. */
export const buildSeparatorBlock = (params: {
	el: HTMLElement;
	factory: LayoutBlockFactory;
}): BlockConfig =>
	attachImportElementMeta({
		block: params.factory("core/separator", "Separator", "layout", {
			kind: "structured",
			data: { className: "" },
		}),
		el: params.el,
	});
