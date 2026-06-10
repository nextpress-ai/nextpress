import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { CSSProperties } from "react";
import * as React from "react";
import { getEntryAnimationAttributes } from "@shared/animation-utils";
import { resolveTokenMapForSSR, collectBlockModifierCSS } from "@shared/token-resolution";
import { BLOCK_COMPONENTS } from "./block-components";

// Re-export for backward compatibility
export { collectBlockModifierCSS } from "@shared/token-resolution";

// ─── Content Parsers ─────────────────────────────────────────────────────────

/** Unwrap text content: { kind: "text", value, ...rest } → { value, ...rest } */
export function parseTextContent(content: BlockContent | undefined): Record<string, unknown> {
	if (!content || content.kind !== "text") return { value: "" };
	const { kind, ...rest } = content;
	return rest;
}

/** Unwrap media content: { kind: "media", url, alt, ...rest } → { url, alt, ...rest } */
export function parseMediaContent(content: BlockContent | undefined): Record<string, unknown> {
	if (!content || content.kind !== "media") return {};
	const { kind, ...rest } = content;
	return rest;
}

/** Unwrap structured content: { kind: "structured", data } → data */
export function parseStructuredContent(content: BlockContent | undefined): Record<string, unknown> {
	if (!content || content.kind !== "structured") return {};
	return content.data || {};
}

/** Unwrap HTML content: { kind: "html", value, sanitized } → { content, sanitized } */
export function parseHtmlContent(content: BlockContent | undefined): { content: string; sanitized: boolean } {
	if (!content) return { content: "", sanitized: false };
	if (content.kind === "html") {
		return { content: content.value || "", sanitized: content.sanitized || false };
	}
	// Fallback for legacy format
	return { content: (content as Record<string, unknown>).content as string || "", sanitized: false };
}

/** Unwrap markdown content: { kind: "markdown", value, textAlign } → { content, textAlign } */
export function parseMarkdownContent(content: BlockContent | undefined): { content: string; textAlign?: string } {
	if (!content) return { content: "" };
	if (content.kind === "markdown") {
		return { content: content.value || "", textAlign: content.textAlign };
	}
	// Fallback for legacy format
	return { content: (content as Record<string, unknown>).value as string || "", textAlign: (content as Record<string, unknown>).textAlign as string | undefined };
}

// ─── Render Props ────────────────────────────────────────────────────────────

export interface RenderProps {
	style: CSSProperties;
	className: string;
	attributes: Record<string, unknown>;
	children: React.ReactNode;
	tokenStyles: Record<string, string>;
}

/**
 * Common transformation for all renderer components.
 * Handles: token resolution, style merging, className building, animation attrs, children rendering.
 */
export function getRenderProps(block: BlockConfig): RenderProps {
	// Resolve tokenMap values for SSR
	const tokenResult = block.other?.tokenMap
		? resolveTokenMapForSSR(block.id, block.other.tokenMap, block.other?.units || {})
		: { style: {}, modifierCSS: "" };

	// Merge styles: block.styles + token custom values
	const mergedStyles: CSSProperties = {
		...block.styles,
		...tokenResult.style,
	};

	// Merge classNames
	const mergedClassName = [
		`block-${block.id}`,
		block.other?.classNames,
	].filter(Boolean).join(" ");

	// Merge attributes: other.attributes + animation entry attrs
	const attributes: Record<string, unknown> = {
		...block.other?.attributes,
		...(block.other?.animation?.entry ? getEntryAnimationAttributes(block.other.animation.entry) : {}),
	};

	// Render children recursively
	const children = renderChildBlocks(block.children || []);

	return {
		style: mergedStyles,
		className: mergedClassName,
		attributes,
		children,
		tokenStyles: tokenResult.style,
	};
}

/**
 * Recursively render child BlockConfig[] using the component registry.
 * Replaces the adapter's recursive adaptBlockConfigToBlockData + passing adapted children.
 */
export function renderChildBlocks(children: BlockConfig[]): React.ReactNode {
	if (!children || children.length === 0) return null;

	return (
		<>
			{children.map((child) => {
				const ChildComponent = BLOCK_COMPONENTS[child.name];
				if (!ChildComponent) return null;
				return <ChildComponent key={child.id} {...child} />;
			})}
		</>
	);
}