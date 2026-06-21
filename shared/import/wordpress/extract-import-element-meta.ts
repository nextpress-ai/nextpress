import type { CSSProperties } from "react";
import type { HTMLElement } from "node-html-parser";
import type { BlockConfig } from "../../schema-types";

/** Parsed class tokens and leftover custom classes from a WP/Gutenberg `class` attr. */
export type ParsedClassTokens = {
	textAlign?: "left" | "center" | "right" | "justify";
	dropCap?: boolean;
	align?: "left" | "center" | "right" | "wide" | "full";
	sizeSlug?: "thumbnail" | "medium" | "large" | "full";
	className?: string;
};

export type ImportElementMeta = {
	contentPatch: Record<string, unknown>;
	styles: CSSProperties;
	attributes: Record<string, unknown>;
};

const TEXT_ALIGN_CLASS = /^has-text-align-(left|center|right|justify)$/;
const SIZE_CLASS = /^size-(thumbnail|medium|large|full)$/;

/** WP block / layout classes that NextPress already applies or that carry no import value. */
const REDUNDANT_CLASS = /^(wp-block(?:-[a-z0-9-]+)?|wp-element(?:-[a-z0-9-]+)?|is-layout-[a-z0-9-]+)$/;

const ALLOWED_INLINE_STYLES = new Set([
	"margin",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"padding",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"color",
	"backgroundColor",
	"background",
	"textAlign",
	"width",
	"height",
	"maxWidth",
	"minWidth",
	"maxHeight",
	"minHeight",
	"fontSize",
	"fontWeight",
	"lineHeight",
	"fontStyle",
	"border",
	"borderTop",
	"borderRight",
	"borderBottom",
	"borderLeft",
	"borderRadius",
	"opacity",
	"display",
	"float",
]);

const RESERVED_ATTRS = new Set([
	"class",
	"style",
	"id",
	"src",
	"alt",
	"href",
	"start",
	"reversed",
	"type",
	"width",
	"height",
]);

const camelCaseCssProp = (prop: string): string =>
	prop.trim().toLowerCase().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const isSafeStyleValue = (value: string): boolean =>
	!/(expression|javascript:|vbscript:|url\s*\(\s*['"]?\s*javascript)/i.test(value);

/**
 * Parses a sanitized subset of inline `style=""` into React CSSProperties.
 * Unsafe values and unknown properties are dropped.
 */
export const parseImportInlineStyle = (raw: string | undefined): CSSProperties => {
	if (!raw?.trim()) return {};
	const out: CSSProperties = {};
	for (const decl of raw.split(";")) {
		const piece = decl.trim();
		if (!piece) continue;
		const colon = piece.indexOf(":");
		if (colon === -1) continue;
		const prop = camelCaseCssProp(piece.slice(0, colon));
		const value = piece.slice(colon + 1).trim();
		if (!value || !ALLOWED_INLINE_STYLES.has(prop) || !isSafeStyleValue(value)) continue;
		(out as Record<string, string>)[prop] = value;
	}
	return out;
};

const parseAlignClass = (token: string): ParsedClassTokens["align"] | undefined => {
	if (token === "alignwide") return "wide";
	if (token === "alignfull") return "full";
	if (token === "alignleft") return "left";
	if (token === "aligncenter") return "center";
	if (token === "alignright") return "right";
	return undefined;
};

/**
 * Maps Gutenberg/WP `class` tokens to typed block content fields; keeps the rest
 * as `className` for theme-specific hooks (e.g. `is-style-rounded`).
 */
export const parseImportClassTokens = (
	classAttr: string | undefined,
): ParsedClassTokens => {
	if (!classAttr?.trim()) return {};
	const remainder: string[] = [];
	const out: ParsedClassTokens = {};

	for (const token of classAttr.trim().split(/\s+/)) {
		if (!token) continue;
		const textAlign = token.match(TEXT_ALIGN_CLASS);
		if (textAlign) {
			out.textAlign = textAlign[1] as ParsedClassTokens["textAlign"];
			continue;
		}
		if (token === "has-drop-cap") {
			out.dropCap = true;
			continue;
		}
		const align = parseAlignClass(token);
		if (align) {
			out.align = align;
			continue;
		}
		const size = token.match(SIZE_CLASS);
		if (size) {
			out.sizeSlug = size[1] as ParsedClassTokens["sizeSlug"];
			continue;
		}
		if (REDUNDANT_CLASS.test(token)) continue;
		remainder.push(token);
	}

	if (remainder.length > 0) out.className = remainder.join(" ");
	return out;
};

const parseDimensionAttr = (value: string | undefined): string | undefined => {
	if (!value?.trim()) return undefined;
	const trimmed = value.trim();
	if (/^\d+$/.test(trimmed)) return `${trimmed}px`;
	return trimmed;
};

const readPassthroughAttributes = (el: HTMLElement): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	const attrs = el.attributes as Record<string, string> | undefined;
	if (!attrs) return out;

	for (const [key, value] of Object.entries(attrs)) {
		if (RESERVED_ATTRS.has(key)) continue;
		if (!key.startsWith("data-") && !key.startsWith("aria-") && key !== "role" && key !== "title") {
			continue;
		}
		if (value != null && value !== "") out[key] = value;
	}
	return out;
};

/**
 * Extracts id/class/style and safe passthrough attrs from a source HTML element
 * so imported native blocks carry WP presentation metadata in NextPress fields.
 */
export const extractImportElementMeta = (params: {
	el: HTMLElement;
}): ImportElementMeta => {
	const { el } = params;
	const contentPatch: Record<string, unknown> = {};
	const styles = parseImportInlineStyle(el.getAttribute("style") ?? undefined);

	Object.assign(contentPatch, parseImportClassTokens(el.getAttribute("class") ?? undefined));

	const id = el.getAttribute("id");
	if (id?.trim()) contentPatch.anchor = id.trim();

	const tag = el.rawTagName?.toLowerCase();
	if (tag === "img") {
		const width = parseDimensionAttr(el.getAttribute("width") ?? undefined);
		const height = parseDimensionAttr(el.getAttribute("height") ?? undefined);
		if (width && !styles.width) styles.width = width;
		if (height && !styles.height) styles.height = height;
		const title = el.getAttribute("title");
		if (title?.trim()) contentPatch.title = title.trim();
	}

	const attributes = readPassthroughAttributes(el);
	return { contentPatch, styles, attributes };
};

/** Merges wrapper (e.g. `<figure>`) meta under inner (e.g. `<img>`) meta. */
export const mergeImportElementMeta = (
	primary: ImportElementMeta,
	secondary?: ImportElementMeta,
): ImportElementMeta => {
	if (!secondary) return primary;

	const mergedClassName = [secondary.contentPatch.className, primary.contentPatch.className]
		.filter((v) => typeof v === "string" && v.trim())
		.join(" ")
		.trim();

	return {
		contentPatch: {
			...secondary.contentPatch,
			...primary.contentPatch,
			...(mergedClassName ? { className: mergedClassName } : {}),
			// Typed fields: prefer the element that explicitly set them; img beats figure for sizeSlug.
			...(primary.contentPatch.align == null && secondary.contentPatch.align != null
				? { align: secondary.contentPatch.align }
				: {}),
			...(primary.contentPatch.textAlign == null && secondary.contentPatch.textAlign != null
				? { textAlign: secondary.contentPatch.textAlign }
				: {}),
		},
		styles: { ...secondary.styles, ...primary.styles },
		attributes: { ...secondary.attributes, ...primary.attributes },
	};
};

/** Applies extracted metadata onto a freshly built native block. */
export const attachImportElementMeta = (params: {
	block: BlockConfig;
	el: HTMLElement;
	wrapper?: HTMLElement;
}): BlockConfig => {
	const meta = mergeImportElementMeta(
		extractImportElementMeta({ el: params.el }),
		params.wrapper ? extractImportElementMeta({ el: params.wrapper }) : undefined,
	);

	const hasContent = Object.keys(meta.contentPatch).length > 0;
	const hasStyles = Object.keys(meta.styles).length > 0;
	const hasAttrs = Object.keys(meta.attributes).length > 0;
	if (!hasContent && !hasStyles && !hasAttrs) return params.block;

	return {
		...params.block,
		content: hasContent
			? ({ ...params.block.content, ...meta.contentPatch } as BlockConfig["content"])
			: params.block.content,
		styles: hasStyles ? { ...meta.styles, ...params.block.styles } : params.block.styles,
		other: hasAttrs
			? {
					...params.block.other,
					attributes: { ...meta.attributes, ...params.block.other?.attributes },
				}
			: params.block.other,
	};
};
