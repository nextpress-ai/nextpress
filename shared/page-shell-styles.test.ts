import { describe, expect, it } from "vitest";
import type { BlockConfig, PageDesignSettings } from "./schema-types";
import {
	DEFAULT_PAGE_SHELL_CONTENT,
	ensureRootPageShell,
	PAGE_SHELL_BLOCK_NAME,
	prepareVisitorPageBlocks,
	readPageDesign,
	readPageShellContent,
} from "./page-shell-model";
import { collectFontFamiliesFromBlocks } from "./font-catalog";
import { readShellPaddingAxes, resolveShellPadding, splitCssValueList } from "./page-shell-padding";
import { buildPageShellOuterStyle, getPageShellChildItemStyle } from "./page-shell-styles";

const heading = (id: string): BlockConfig => ({
	id,
	name: "core/heading",
	type: "block",
	parentId: null,
	content: { kind: "text", value: "Hello" },
	styles: {},
	settings: {},
});

const leftover: PageDesignSettings = {
	fontFamily: "Georgia, serif",
	containerWidth: "960px",
	padding: "1rem",
};

describe("readPageDesign", () => {
	it("reads design from the root shell only and ignores page.other leftover", () => {
		const { blocks } = ensureRootPageShell({
			blocks: [heading("h1")],
			leftoverDesign: leftover,
			shellId: "shell-1",
		});
		const design = readPageDesign({ blocks });
		expect(design.fontFamily).toBe("Georgia, serif");
		expect(design.containerWidth).toBe("960px");
		expect(readPageDesign({ blocks: [heading("h1")] }).fontFamily).toBe(
			DEFAULT_PAGE_SHELL_CONTENT.fontFamily,
		);
	});
});

describe("ensureRootPageShell", () => {
	it("wraps a flat tree and seeds leftover design", () => {
		const { blocks, didWrap } = ensureRootPageShell({
			blocks: [heading("h1"), heading("h2")],
			leftoverDesign: leftover,
			shellId: "shell-1",
		});
		expect(didWrap).toBe(true);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.name).toBe(PAGE_SHELL_BLOCK_NAME);
		expect(blocks[0]?.children).toHaveLength(2);
		expect(blocks[0]?.children?.[0]?.parentId).toBe("shell-1");
		expect(readPageShellContent(blocks[0]?.content).padding).toBe("1rem");
	});

	it("visitor prepare wraps leftover pages in memory with a stable id", () => {
		const blocks = prepareVisitorPageBlocks({
			blocks: [heading("h1")],
			leftoverDesign: leftover,
		});
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.name).toBe(PAGE_SHELL_BLOCK_NAME);
		expect(blocks[0]?.id).toBe("page-shell-root");
		expect(readPageDesign({ blocks }).padding).toBe("1rem");
	});

	it("leaves a single root shell alone", () => {
		const wrapped = ensureRootPageShell({
			blocks: [heading("h1")],
			shellId: "shell-1",
		});
		const again = ensureRootPageShell({
			blocks: wrapped.blocks,
			shellId: "shell-2",
		});
		expect(again.didWrap).toBe(false);
		expect(again.blocks[0]?.id).toBe("shell-1");
	});
});

describe("page shell styles", () => {
	it("paints the outer canvas and constrains non-header children", () => {
		const content = {
			...DEFAULT_PAGE_SHELL_CONTENT,
			fontFamily: "Inter, sans-serif",
			containerWidth: "1200px",
			padding: "2rem 1rem",
		};
		expect(buildPageShellOuterStyle({ content }).fontFamily).toBe("Inter, sans-serif");
		const inset = buildPageShellOuterStyle({
			content: {
				...content,
				paddingInline: "3rem",
				containerWidth: "960px",
				contentAlign: "left",
			},
		});
		expect(inset["--np-page-pad-left" as keyof typeof inset]).toBe("3rem");
		expect(inset.paddingLeft).toBeUndefined();
		expect(inset["--np-page-max-width" as keyof typeof inset]).toBe("100%");
		expect(inset["--np-page-margin-left" as keyof typeof inset]).toBe("0");
		expect(inset["--np-page-margin-right" as keyof typeof inset]).toBe("0");
		const header: BlockConfig = {
			id: "hdr",
			name: "core/header",
			type: "block",
			parentId: "shell",
			content: { kind: "structured", data: {} },
		};
		expect(getPageShellChildItemStyle({ child: header, content }).maxWidth).toBe("100%");
		expect(getPageShellChildItemStyle({ child: header, content }).marginLeft).toBe("1rem");
		const item = getPageShellChildItemStyle({ child: heading("h1"), content });
		expect(item.maxWidth).toBe("100%");
		expect(item.marginLeft).toBe("1rem");
		expect(item.marginRight).toBe("1rem");
		expect(item.paddingTop).toBe("2rem");
		expect(item.paddingBottom).toBe("2rem");
		expect(item.paddingLeft).toBeUndefined();
	});

	it("side and top-and-bottom padding win over the one-box value, per axis", () => {
		const content = { ...DEFAULT_PAGE_SHELL_CONTENT, paddingInline: "4rem" };
		const item = getPageShellChildItemStyle({ child: heading("h1"), content });
		expect(item.maxWidth).toBe("100%");
		expect(item.marginLeft).toBe("4rem");
		expect(item.marginRight).toBe("4rem");
		expect(item.paddingLeft).toBeUndefined();
		expect([item.paddingTop, item.paddingBottom]).toEqual(["2rem", "2rem"]);
		const both = getPageShellChildItemStyle({
			child: heading("h1"),
			content: { ...content, paddingBlock: "1rem 3rem" },
		});
		expect([both.paddingTop, both.paddingBottom]).toEqual(["1rem", "3rem"]);
	});

	it("puts the content column left, center (default) or right", () => {
		const at = (contentAlign?: "left" | "center" | "right") =>
			getPageShellChildItemStyle({
				child: heading("h1"),
				content: { ...DEFAULT_PAGE_SHELL_CONTENT, contentAlign },
			});
		expect([at().marginLeft, at().marginRight, at().alignSelf]).toEqual(["1rem", "1rem", "stretch"]);
		expect([at("left").marginLeft, at("left").marginRight]).toEqual(["1rem", "1rem"]);
		expect([at("right").marginLeft, at("right").marginRight]).toEqual(["1rem", "1rem"]);
	});

	it("uses side padding as the space from the page edge even when a content width is set", () => {
		const at = (paddingInline: string) =>
			getPageShellChildItemStyle({
				child: heading("h1"),
				content: { ...DEFAULT_PAGE_SHELL_CONTENT, containerWidth: "1024px", paddingInline },
			});
		expect(at("0.75rem").marginLeft).toBe("0.75rem");
		expect(at("0.75rem").marginRight).toBe("0.75rem");
		expect(at("3rem").marginLeft).toBe("3rem");
		expect(at("3rem").maxWidth).toBe("100%");
	});

	it("puts top and bottom padding on the column once, not between every block", () => {
		const content = { ...DEFAULT_PAGE_SHELL_CONTENT, paddingBlock: "3rem", paddingInline: "0.75rem" };
		const top = heading("h");
		const middle = heading("p");
		const bottom = heading("c");
		const siblings = [top, middle, bottom];
		const styleOf = (child: BlockConfig) => getPageShellChildItemStyle({ child, content, siblings });
		expect(styleOf(top).paddingTop).toBe("3rem");
		expect(styleOf(top).paddingBottom).toBeUndefined();
		expect(styleOf(middle).paddingTop).toBeUndefined();
		expect(styleOf(middle).paddingBottom).toBeUndefined();
		expect(styleOf(middle).paddingLeft).toBeUndefined();
		expect(styleOf(middle).marginLeft).toBe("0.75rem");
		expect(styleOf(middle).maxWidth).toBe("100%");
		expect(styleOf(bottom).paddingBottom).toBe("3rem");
		expect(styleOf(bottom).paddingTop).toBeUndefined();
	});

	it("gives the header the same side padding as the rest of the page", () => {
		const header: BlockConfig = {
			id: "hdr",
			name: "core/header",
			type: "block",
			parentId: "shell",
			content: { kind: "structured", data: {} },
		};
		const item = getPageShellChildItemStyle({
			child: header,
			content: { ...DEFAULT_PAGE_SHELL_CONTENT, paddingInline: "8rem" },
		});
		expect(item.paddingLeft).toBeUndefined();
		expect(item.paddingTop).toBeUndefined();
		expect(item.maxWidth).toBe("100%");
		expect(item.marginLeft).toBe("8rem");
		expect(item.marginRight).toBe("8rem");
	});
});

describe("shell padding from saved content", () => {
	it("reads the new fields and ignores blanks and unknown positions", () => {
		const content = readPageShellContent({
			kind: "structured",
			data: { paddingInline: "3rem", paddingBlock: " ", contentAlign: "diagonal" },
		} as never);
		expect(content.paddingInline).toBe("3rem");
		expect(content.paddingBlock).toBeUndefined();
		expect(content.contentAlign).toBeUndefined();
	});

	it("carries them through readPageDesign", () => {
		const shell = {
			...heading("shell"),
			name: PAGE_SHELL_BLOCK_NAME,
			content: { kind: "structured", data: { paddingInline: "3rem", contentAlign: "left" } },
		} as BlockConfig;
		const design = readPageDesign({ blocks: [shell] });
		expect(design.paddingInline).toBe("3rem");
		expect(design.contentAlign).toBe("left");
	});
});

describe("page shell fonts", () => {
	it("collects fontFamily from shell content", () => {
		const { blocks } = ensureRootPageShell({
			blocks: [heading("h1")],
			leftoverDesign: leftover,
			shellId: "shell-1",
		});
		expect(collectFontFamiliesFromBlocks(blocks)).toContain("Georgia, serif");
	});
});

describe("resolveShellPadding", () => {
	it("expands 1, 2, 3 and 4 value shorthands like CSS", () => {
		const of = (padding: string) => {
			const { top, right, bottom, left } = resolveShellPadding({ padding });
			return [top, right, bottom, left];
		};
		expect(of("1rem")).toEqual(["1rem", "1rem", "1rem", "1rem"]);
		expect(of("2rem 1rem")).toEqual(["2rem", "1rem", "2rem", "1rem"]);
		expect(of("1px 2px 3px")).toEqual(["1px", "2px", "3px", "2px"]);
		expect(of("1px 2px 3px 4px")).toEqual(["1px", "2px", "3px", "4px"]);
	});

	it("keeps calc() and clamp() in one piece", () => {
		expect(splitCssValueList("calc(1rem + 2px) clamp(1rem, 4vw, 3rem)")).toEqual([
			"calc(1rem + 2px)",
			"clamp(1rem, 4vw, 3rem)",
		]);
	});

	it("reports the two axes the panel edits, joining unequal sides", () => {
		expect(readShellPaddingAxes({ padding: "2rem 1rem" })).toEqual({ inline: "1rem", block: "2rem" });
		expect(readShellPaddingAxes({ padding: "1rem 2rem 1rem 0" })).toEqual({ inline: "0 2rem", block: "1rem" });
		expect(readShellPaddingAxes({ padding: "2rem 1rem", paddingInline: "6rem" }).inline).toBe("6rem");
	});
});
