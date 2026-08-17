import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseMarkdownContent } from "../render-helpers";

/**
 * Markdown output for preview and published SPA pages.
 * Uses a direct import so Vite/React never treat the module namespace as the lazy type.
 */
export function MarkdownBlock(block: BlockConfig) {
	const { style, className } = getRenderProps(block);
	const { content } = parseMarkdownContent(block.content);
	const blockClass = ["wp-block-markdown", className].filter(Boolean).join(" ");

	return (
		<div className={blockClass} style={{ color: "var(--npb-text-primary)", ...style }}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ""}</ReactMarkdown>
		</div>
	);
}
