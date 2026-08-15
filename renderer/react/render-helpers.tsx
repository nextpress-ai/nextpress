import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { CSSProperties } from "react";
import * as React from "react";
import { resolveBlockForSurface } from "@shared/resolve-block-for-surface";
import { BLOCK_COMPONENTS } from "./block-components";
import { headingLevelFromTag, readBlockContentData } from "@shared/read-block-content";

export { collectBlockModifierCSS } from "@shared/token-resolution";

let clientBlockComponents: Record<string, React.FC<BlockConfig>> = {};
let ssrBlockComponents: Record<string, React.FC<BlockConfig>> = {};

/**
 * Preview/SPA can register fetch-capable post blocks so nested column children
 * use the same client components as root blocks.
 */
export function registerClientBlockComponents(
	components: Record<string, React.FC<BlockConfig>>,
): void {
	clientBlockComponents = components;
}

/**
 * SSR-only overrides (sync markdown). Must not be imported from the SPA entry
 * or react-markdown lands in the visitor chunk.
 */
export function registerSsrBlockComponents(
	components: Record<string, React.FC<BlockConfig>>,
): void {
	ssrBlockComponents = { ...ssrBlockComponents, ...components };
}

/** Resolve a block renderer, preferring client overrides when registered. */
export function getBlockComponent(
	name: string,
): React.FC<BlockConfig> | undefined {
	return (
		clientBlockComponents[name] ||
		ssrBlockComponents[name] ||
		BLOCK_COMPONENTS[name]
	);
}

// ─── Content Parsers ─────────────────────────────────────────────────────────

/** Unwrap text content: `{ kind: "text" }` or structured `{ text, tag }`. */
export function parseTextContent(content: BlockContent | undefined): Record<string, unknown> {
	if (!content) return { value: "" };
	if (content.kind === "text") {
		const { kind: _kind, ...rest } = content;
		return rest;
	}
	const data = readBlockContentData(content);
	const value =
		(typeof data.value === "string" && data.value) ||
		(typeof data.text === "string" && data.text) ||
		(typeof data.content === "string" && data.content) ||
		"";
	const level = headingLevelFromTag(data.level ?? data.tag, 2);
	return { ...data, value, level };
}

/** Unwrap media content: `{ kind: "media" }` or structured `{ url, alt }`. */
export function parseMediaContent(content: BlockContent | undefined): Record<string, unknown> {
	if (!content) return {};
	if (content.kind === "media") {
		const { kind: _kind, ...rest } = content;
		return rest;
	}
	return readBlockContentData(content);
}

/** Unwrap structured content: `{ kind: "structured", data }` → data, with flat fallback. */
export function parseStructuredContent(content: BlockContent | undefined): Record<string, unknown> {
	return readBlockContentData(content);
}

/** Unwrap HTML content from structured, html, or legacy shapes. */
export function parseHtmlContent(content: BlockContent | undefined): { content: string; sanitized: boolean } {
	if (!content) return { content: "", sanitized: false };
	if (content.kind === "html") {
		return { content: content.value || "", sanitized: content.sanitized || false };
	}
	if (content.kind === "structured") {
		const data = content.data || {};
		return {
			content: typeof data.content === "string" ? data.content : "",
			sanitized: false,
		};
	}
	// Fallback for legacy format
	return { content: (content as Record<string, unknown>).content as string || "", sanitized: false };
}

/** Unwrap markdown content: `{ kind: "markdown" }` or structured `{ content }`. */
export function parseMarkdownContent(content: BlockContent | undefined): { content: string; textAlign?: string } {
	if (!content) return { content: "" };
	if (content.kind === "markdown") {
		return { content: content.value || "", textAlign: content.textAlign };
	}
	const data = readBlockContentData(content);
	const markdown =
		(typeof data.content === "string" && data.content) ||
		(typeof data.value === "string" && data.value) ||
		"";
	return {
		content: markdown,
		textAlign: typeof data.textAlign === "string" ? data.textAlign : undefined,
	};
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
	const resolved = resolveBlockForSurface({ block, surface: "publish" });

	const mergedClassName = resolved.classNames.join(" ");

	const attributes: Record<string, unknown> = { ...resolved.attributes };

	const children = renderChildBlocks(block.children || []);

	return {
		style: resolved.inlineStyles,
		className: mergedClassName,
		attributes,
		children,
		tokenStyles: resolved.tokenStyles,
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
				const ChildComponent = getBlockComponent(child.name);
				if (!ChildComponent) return null;
				return <ChildComponent key={child.id} {...child} />;
			})}
		</>
	);
}