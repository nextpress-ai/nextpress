import { readCalloutType } from "../blocks/callout-model.js";
import { readDiagramContent } from "../blocks/diagram-model.js";
import { readUpdateContent, UPDATE_BLOCK_NAME } from "../blocks/update-model.js";
import { readDocsListContent } from "../blocks/docs-list-model.js";
import { readDocsTextContent } from "../blocks/docs-text-model.js";
import { readParamsContent, shownParams } from "../blocks/params-model.js";
import { docsListToMarkdown } from "./docs-list-markdown.js";
import { collectHeadingsFromBlocks } from "../page-headings.js";
import { readBlockContentData } from "../read-block-content.js";
import type { BlockConfig } from "../schema-types.js";
import { type BlockData, inlineMarkdown, listItemsAsMarkdown, readList, readString, stripHtml } from "./html-text.js";

/** Blocks with nothing to say in a text version of the page. */
const SKIPPED_BLOCKS = new Set(["core/html", "core/spacer", "core/icon", "core/header", "core/popup", "core/form", "core/template-part", "core/search", "core/video", "core/audio"]);
const RULE_BLOCKS = new Set(["core/separator", "core/divider"]);
/** Containers whose children each have a title worth printing above their content. */
const TITLED_CHILDREN = new Set(["core/accordion-item", "core/tab", "core/step", "core/card"]);

const fenceAround = ({ code, language, title }: { code: string; language: string; title: string }): string => {
	const longestRun = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
	const fence = "`".repeat(Math.max(3, longestRun + 1));
	const info = [language, title ? `title="${title.replace(/"/g, "'")}"` : ""].filter(Boolean).join(" ");
	return `${fence}${info}\n${code.replace(/\n+$/, "")}\n${fence}`;
};

const tableAsMarkdown = (data: BlockData): string => {
	const cells = (rows: BlockData[]): string[][] =>
		rows.map((row) => readList(row.cells).map((cell) => stripHtml(readString(cell.content)).replace(/\|/g, "\\|")));
	const head = cells(readList(data.head));
	const body = [...cells(readList(data.body)), ...cells(readList(data.foot))];
	const header = head[0] ?? body.shift();
	if (!header) return "";
	const line = (row: string[]): string => `| ${header.map((_, index) => row[index] ?? "").join(" | ")} |`;
	return [line(header), `| ${header.map(() => "---").join(" | ")} |`, ...[...head.slice(1), ...body].map(line)].join("\n");
};

const quoteAsMarkdown = (data: BlockData): string => {
	const lines = inlineMarkdown(readString(data.value)).split("\n");
	const citation = stripHtml(readString(data.citation));
	return [...lines, ...(citation ? [`— ${citation}`] : [])].map((line) => `> ${line}`).join("\n");
};

const buttonAsMarkdown = (data: BlockData): string => {
	const label = stripHtml(readString(data.value));
	const url = readString(data.url).trim();
	if (!label) return "";
	return url && url !== "#" ? `[${label}](${url})` : label;
};

const imageAsMarkdown = (data: BlockData): string => {
	const url = readString(data.url);
	if (!url) return "";
	const caption = stripHtml(readString(data.caption));
	const image = `![${stripHtml(readString(data.alt))}](${url})`;
	return caption ? `${image}\n\n*${caption}*` : image;
};

const listAsMarkdown = (data: BlockData): string =>
	listItemsAsMarkdown(readString(data.values))
		.map((item, index) => `${data.ordered === true ? `${index + 1}.` : "-"} ${item.replace(/\n/g, " ")}`)
		.join("\n");

/** A block's own text, for kinds this converter has no special form for. */
const plainFallback = (data: BlockData): string =>
	[readString(data.value), readString(data.content), readString(data.text)]
		.map(inlineMarkdown)
		.filter(Boolean)
		.join("\n\n");

/** A parameter list as plain markdown: one line per field, with its type, default and use. */
const paramsAsMarkdown = (block: BlockConfig): string =>
	shownParams(readParamsContent(block.content).items)
		.map((item) => {
			const type = item.type ? ` (${item.type})` : "";
			const status = item.required ? ", required" : item.default ? `, default \`${item.default}\`` : "";
			const description = item.description.replace(/\s*\n\s*/g, " ");
			return `- \`${item.name}\`${type}${status}${description ? `: ${description}` : ""}`;
		})
		.join("\n");

/** A diagram as a ```` ```mermaid ```` fence, so the copy carries the Mermaid text itself. */
const diagramAsMarkdown = (block: BlockConfig): string => {
	const { code, caption } = readDiagramContent(block.content);
	return fenceAround({ code, language: "mermaid", title: caption.trim() });
};

/** A changelog entry as its heading (the label, as "On this page" lists it), its description, then its blocks. */
const updateAsMarkdown = ({ block }: { block: BlockConfig }): string[] =>
	[headingAsMarkdown(block), readUpdateContent(block.content).description.trim(), ...render({ blocks: block.children ?? [] })].filter(Boolean);

const CALLOUT_LABELS: Record<string, string> = { note: "Note", tip: "Tip", warning: "Warning", danger: "Danger", success: "Success" };

const headingAsMarkdown = (block: BlockConfig): string => {
	const heading = collectHeadingsFromBlocks([{ ...block, children: [] }])[0];
	return heading ? `${"#".repeat(heading.level)} ${heading.text}` : "";
};

const ownMarkdown = ({ block, data }: { block: BlockConfig; data: BlockData }): string => {
	const handlers: Record<string, () => string> = {
		"core/heading": () => headingAsMarkdown(block),
		"post/title": () => headingAsMarkdown(block),
		"docs/heading": () => headingAsMarkdown(block),
		"docs/diagram": () => diagramAsMarkdown(block),
		"core/paragraph": () => inlineMarkdown(readString(data.value)),
		"core/list": () => listAsMarkdown(data),
		"core/quote": () => quoteAsMarkdown(data),
		"core/pullquote": () => quoteAsMarkdown(data),
		"core/button": () => buttonAsMarkdown(data),
		"core/image": () => imageAsMarkdown(data),
		"core/table": () => tableAsMarkdown(data),
		"core/markdown": () => (readString(data.content) || readString(data.value)).trim(),
		"core/code": () => fenceAround({ code: readString(data.content), language: readString(data.language), title: readString(data.title) }),
		"core/preformatted": () => fenceAround({ code: readString(data.content), language: "", title: "" }),
		"docs/file-tree": () => fenceAround({ code: readString(data.tree), language: "", title: "" }),
		"docs/params": () => paramsAsMarkdown(block),
		"docs/text": () => readDocsTextContent(block.content).text.trim(),
		"docs/list": () => docsListToMarkdown(readDocsListContent(block.content)),
	};
	return (handlers[block.name] ?? (() => plainFallback(data)))();
};

/** A callout as a quote that starts with its kind ("**Tip:** …"), so it reads the same in plain markdown. */
const calloutAsMarkdown = ({ data, children }: { data: BlockData; children: BlockConfig[] }): string => {
	const title = stripHtml(readString(data.title));
	const lead = `**${CALLOUT_LABELS[readCalloutType(data.type)]}:**${title ? ` ${title}` : ""}`;
	return [lead, ...render({ blocks: children })]
		.join("\n\n")
		.split("\n")
		.map((line) => (line ? `> ${line}` : ">"))
		.join("\n");
};

const render = ({ blocks }: { blocks: BlockConfig[] }): string[] =>
	blocks.flatMap((block, index) => {
		if (SKIPPED_BLOCKS.has(block.name)) return [];
		if (RULE_BLOCKS.has(block.name)) return ["---"];
		const data = readBlockContentData(block.content) as BlockData;
		if (block.name === "docs/callout") return [calloutAsMarkdown({ data, children: block.children ?? [] })];
		if (block.name === UPDATE_BLOCK_NAME) return updateAsMarkdown({ block });
		const title = TITLED_CHILDREN.has(block.name) ? stripHtml(readString(data.title)) : "";
		const label = title && block.name === "core/step" ? `**${index + 1}. ${title}**` : title ? `**${title}**` : "";
		const own = TITLED_CHILDREN.has(block.name) ? "" : ownMarkdown({ block, data });
		return [label, own, ...render({ blocks: block.children ?? [] })].filter(Boolean);
	});

/**
 * A page as readable markdown, for agents (`/<page>.md`) and "Copy page": headings, text, lists,
 * code fences with their language, tables, images and links stay as markdown. Blocks it has no
 * special form for fall back to their text. Layout and styling are dropped on purpose.
 */
export const blocksToMarkdown = (blocks: BlockConfig[]): string => `${render({ blocks }).join("\n\n")}\n`.replace(/^\n$/, "");
