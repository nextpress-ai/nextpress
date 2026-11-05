import { createDefaultBlock } from "../../../../shared/block-catalog/create-default-block.js";
import { DOCS_PROSE_STYLES, fitToDocsColumn } from "../../../../shared/docs/docs-column-spacing.js";
import { nodesToHtml } from "../../../../shared/markdown/inline-html.js";
import { parseMarkdown, type MarkdownNode } from "../../../../shared/markdown/parse-markdown.js";
import { nodeText } from "../../../../shared/markdown/plain-text.js";
import type { BlockConfig } from "../../../../shared/schema-types.js";

/**
 * One-off converter used by the public docs import: plain Markdown (headings, paragraphs, lists,
 * tables, fenced code, Mermaid, quotes) into the blocks every NextPress page uses. NextPress itself
 * no longer reads Markdown as a way to write docs; this only runs when the docs are loaded.
 */

type Node = MarkdownNode & { lang?: string | null; meta?: string | null; align?: (string | null)[] };
type Content = BlockConfig["content"];

const inline = (nodes: Node[] | undefined): string => nodesToHtml(nodes ?? []);

const structuredOf = (data: Record<string, unknown>): Content => ({ kind: "structured", data }) as Content;

const make = ({ name, content, newId }: { name: string; content: Content; newId: () => string }): BlockConfig => {
	const block = createDefaultBlock({ name, id: newId(), newId });
	if (!block) throw new Error(`The block catalog has no "${name}".`);
	const fitted = fitToDocsColumn(block);
	return { ...fitted, styles: { ...fitted.styles, ...DOCS_PROSE_STYLES[name] }, content };
};

const withParent = ({ block, parentId }: { block: BlockConfig; parentId: string | null }): BlockConfig => ({
	...block,
	parentId,
	...(block.children ? { children: block.children.map((child) => withParent({ block: child, parentId: block.id })) } : {}),
});

const textContent = (value: string, extra: Record<string, unknown> = {}): Content =>
	({ kind: "text", value, format: "html", dropCap: false, anchor: "", className: "", ...extra }) as Content;

const isCodeLike = (node: Node): boolean => node.type === "code" || node.type === "table";

/** `title="app.ts"` or `title=app.ts` in a code fence's info string. */
const readFenceTitle = (meta: string | null | undefined): string => /title=(?:"([^"]*)"|(\S+))/.exec(meta ?? "")?.[1] ?? /title=(\S+)/.exec(meta ?? "")?.[1] ?? "";

const itemsToLi = ({ items }: { items: Node[] }): string =>
	items
		.map((item) => {
			const parts = (item.children ?? []).map((child) => {
				if (child.type === "paragraph") return inline(child.children);
				if (child.type === "list") {
					const tag = child.ordered ? "ol" : "ul";
					return `<${tag}>${itemsToLi({ items: child.children ?? [] })}</${tag}>`;
				}
				return "";
			});
			return `<li>${parts.join("")}</li>`;
		})
		.join("");

/** Whether an item holds anything a list cannot (a code block or a table), which makes the list steps. */
const holdsBlocks = (list: Node): boolean => (list.children ?? []).some((item) => (item.children ?? []).some(isCodeLike));

/** What a conversion made, and what it had to leave out (so nothing is lost without being said). */
export type ConvertedMarkdown = { blocks: BlockConfig[]; warnings: string[] };

export function markdownToBlocks({ markdown, newId }: { markdown: string; newId: () => string }): ConvertedMarkdown {
	const warnings: string[] = [];
	const parsed = parseMarkdown({ text: markdown });
	if (!parsed.ok) throw new Error(`This markdown could not be read: ${parsed.message}`);

	const convert = (nodes: Node[]): BlockConfig[] => nodes.flatMap((node) => convertNode(node));

	const convertList = (list: Node): BlockConfig[] => {
		if (list.ordered === true && holdsBlocks(list)) {
			const steps = make({ name: "core/steps", content: structuredOf({ layout: "vertical", marker: "number" }), newId });
			const children = (list.children ?? []).map((item) => {
				const [first, ...rest] = item.children ?? [];
				const title = first?.type === "paragraph" ? nodeText(first).replace(/[:.]\s*$/, "").trim() : "Step";
				const step = make({ name: "core/step", content: structuredOf({ title }), newId });
				return { ...step, children: [...(first?.type === "paragraph" ? [] : first ? convert([first]) : []), ...convert(rest)] };
			});
			return [{ ...steps, children }];
		}
		if (holdsBlocks(list)) warnings.push("A bullet list holds a code block or table; only its text was kept.");
		const ordered = list.ordered === true;
		const html = itemsToLi({ items: list.children ?? [] });
		const block = make({ name: "core/list", content: structuredOf({ ordered, values: html, marker: "default", anchor: "", className: "" }), newId });
		return [block];
	};

	const convertTable = (table: Node): BlockConfig => {
		const rows = (table.children ?? []).map((row, rowIndex) => ({
			cells: (row.children ?? []).map((cell) => ({ content: inline(cell.children), tag: rowIndex === 0 ? "th" : "td" })),
		}));
		const [head, ...body] = rows;
		return make({
			name: "core/table",
			content: structuredOf({ head: head ? [head] : [], body, foot: [], hasFixedLayout: false, striped: false, bordered: true, compact: false, caption: "", className: "" }),
			newId,
		});
	};

	function convertNode(node: Node): BlockConfig[] {
		switch (node.type) {
			case "heading": {
				if (node.depth === 1) return [];
				const level = Math.min(Math.max(node.depth ?? 2, 2), 4);
				return [make({ name: "core/heading", content: textContent(inline(node.children), { level }), newId })];
			}
			case "paragraph":
				return [make({ name: "core/paragraph", content: textContent(inline(node.children)), newId })];
			case "list":
				return convertList(node);
			case "code": {
				if (node.lang === "mermaid") return [make({ name: "docs/diagram", content: structuredOf({ code: node.value ?? "", caption: readFenceTitle(node.meta) }), newId })];
				return [make({ name: "core/code", content: structuredOf({ content: node.value ?? "", language: node.lang || "text", title: readFenceTitle(node.meta), highlightLines: "", className: "", showLineNumbers: false, wrapLines: true, showCopyButton: true }), newId })];
			}
			case "table":
				return [convertTable(node)];
			case "blockquote": {
				const html = (node.children ?? []).map((child) => `<p>${inline(child.children)}</p>`).join("");
				return [make({ name: "core/quote", content: structuredOf({ value: html, citation: "" }), newId })];
			}
			case "thematicBreak":
				return [make({ name: "core/separator", content: structuredOf({ className: "", lineStyle: "solid" }), newId })];
			default:
				warnings.push(`Left out a "${node.type}" the blocks have no place for.`);
				return [];
		}
	}

	const blocks = convert((parsed.tree.children ?? []) as Node[]).map((block) => withParent({ block, parentId: null }));
	return { blocks, warnings };
}
