import type { DocsListContent, DocsListStyle } from "../blocks/docs-list-model.js";

const lineStart = ({ style, number, checked }: { style: DocsListStyle; number: number; checked: boolean }): string => {
	const marker = style === "number" ? `${number}.` : "-";
	return `${marker} ${style === "check" ? `[${checked ? "x" : " "}] ` : ""}`;
};

const oneLine = (text: string): string => text.trim().replace(/\s*\n\s*/g, " ");

/** A list of the old docs list block as markdown: `- item`, `1. item` or `- [ ] item`, nested items indented under their parent. */
export const docsListToMarkdown = ({ style, items }: DocsListContent): string =>
	items
		.filter((item) => item.text.trim() !== "")
		.flatMap((item, index) => {
			const start = lineStart({ style, number: index + 1, checked: item.checked });
			const indent = " ".repeat(style === "number" ? `${index + 1}. `.length : 2);
			const children = item.children
				.filter((child) => child.text.trim() !== "")
				.map((child, childIndex) => `${indent}${lineStart({ style, number: childIndex + 1, checked: child.checked })}${oneLine(child.text)}`);
			return [`${start}${oneLine(item.text)}`, ...children];
		})
		.join("\n");
