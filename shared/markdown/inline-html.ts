import { parseInlineMarkdown } from "./inline-text.js";
import type { MarkdownNode } from "./parse-markdown.js";
import { safeHref } from "./safe-href.js";

export const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nodesToHtml = (nodes: MarkdownNode[]): string =>
	nodes
		.map((node): string => {
			const inner = nodesToHtml(node.children ?? []);
			switch (node.type) {
				case "text":
					return escapeHtml(node.value ?? "");
				case "strong":
					return `<strong>${inner}</strong>`;
				case "emphasis":
					return `<em>${inner}</em>`;
				case "delete":
					return `<s>${inner}</s>`;
				case "inlineCode":
					return `<code>${escapeHtml(node.value ?? "")}</code>`;
				case "break":
					return "<br>";
				case "link": {
					const href = safeHref(node.url);
					return href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner;
				}
				default:
					return inner || escapeHtml(node.value ?? "");
			}
		})
		.join("");

/** Inline markdown (`**bold**`, `` `code` ``, `[label](url)`) as the HTML the rich-text blocks keep. */
export const inlineMarkdownToHtml = (source: string): string => nodesToHtml(parseInlineMarkdown(source));

