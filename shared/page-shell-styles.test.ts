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
		const header: BlockConfig = {
			id: "hdr",
			name: "core/header",
			type: "block",
			parentId: "shell",
			content: { kind: "structured", data: {} },
		};
		expect(getPageShellChildItemStyle({ child: header, content }).maxWidth).toBe("100%");
		expect(getPageShellChildItemStyle({ child: heading("h1"), content }).maxWidth).toBe("1200px");
		expect(getPageShellChildItemStyle({ child: heading("h1"), content }).padding).toBe("2rem 1rem");
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
