import { describe, expect, it } from "vitest";
import type { BlockConfig } from "../schema-types.js";
import { convertLegacyProse, hasLegacyProse, inlineMarkdownToHtml } from "./legacy-prose.js";

const block = (name: string, data: Record<string, unknown>, children?: BlockConfig[]): BlockConfig =>
	({ id: `${name}-1`, name, content: { kind: "structured", data }, styles: { margin: "0 0 16px" }, children } as BlockConfig);

describe("legacy prose conversion", () => {
	it("turns inline markdown into safe HTML", () => {
		expect(inlineMarkdownToHtml("Use **bold**, *italic*, `a<b` and [docs](https://example.com).")).toBe(
			'Use <strong>bold</strong>, <em>italic</em>, <code>a&lt;b</code> and <a href="https://example.com">docs</a>.',
		);
		expect(inlineMarkdownToHtml("[bad](javascript:alert(1))")).not.toContain("javascript");
	});

	it("converts text, heading and list blocks and keeps id and styles", () => {
		const [text, heading, list] = convertLegacyProse([
			block("docs/text", { text: "Hello **there**" }),
			block("docs/heading", { level: 3, text: "Setup", anchor: "setup" }),
			block("docs/list", { style: "number", items: [{ text: "One", checked: false, children: [{ text: "Sub", checked: false }] }, { text: "Two", checked: false, children: [] }] }),
		]);
		expect(text).toMatchObject({ id: "docs/text-1", name: "core/paragraph", styles: { margin: "0 0 16px" }, content: { kind: "text", value: "Hello <strong>there</strong>" } });
		expect(heading).toMatchObject({ name: "core/heading", content: { kind: "text", value: "Setup", level: 3, anchor: "setup" } });
		expect(list).toMatchObject({ name: "core/list", content: { kind: "structured", data: { ordered: true, values: "<li>One<ol><li>Sub</li></ol></li><li>Two</li>" } } });
	});

	it("reaches blocks inside containers and leaves other pages untouched", () => {
		const page = [block("core/group", {}, [block("docs/text", { text: "Deep" })])];
		const converted = convertLegacyProse(page);
		expect(converted[0].children?.[0].name).toBe("core/paragraph");
		const plain = [block("core/paragraph", { value: "x" })];
		expect(hasLegacyProse(plain)).toBe(false);
		expect(convertLegacyProse(plain)).toBe(plain);
	});
});
