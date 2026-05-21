import { describe, it, expect } from "vitest";
import {
	readContainerLayoutFromBlock,
	getContainerChildrenStackStyle,
	getContainerOuterShellStyle,
	getContainerSiblingStackDirection,
	stripContainerLayoutFromOuterStyles,
	getBlockSiblingFlexItemStyles,
} from "@shared/block-container-placement";

describe("readContainerLayoutFromBlock", () => {
	it("reads display and flex props from styles (container Style tab)", () => {
		const layout = readContainerLayoutFromBlock({
			styles: {
				display: "flex",
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "flex-end",
				gap: "24px",
			},
			content: { tagName: "div" },
		});
		expect(layout.display).toBe("flex");
		expect(layout.flexDirection).toBe("row");
		expect(layout.justifyContent).toBe("center");
		expect(layout.alignItems).toBe("flex-end");
		expect(layout.gap).toBe("24px");
	});

	it("falls back to content for legacy group presets", () => {
		const layout = readContainerLayoutFromBlock({
			styles: {},
			content: { display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" },
		});
		expect(layout.display).toBe("grid");
		expect(layout.gap).toBe("16px");
		expect(layout.gridTemplateColumns).toBe("1fr 1fr");
	});
});

describe("getContainerChildrenStackStyle", () => {
	it("applies justify and align on the children stack", () => {
		const layout = readContainerLayoutFromBlock({
			styles: { display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" },
		});
		const stack = getContainerChildrenStackStyle(layout);
		expect(stack.display).toBe("flex");
		expect(stack.justifyContent).toBe("space-between");
		expect(stack.alignItems).toBe("center");
	});

	it("uses row stack direction for sibling placement", () => {
		const layout = readContainerLayoutFromBlock({
			styles: { display: "flex", flexDirection: "row" },
		});
		expect(getContainerSiblingStackDirection(layout)).toBe("row");
	});
});

describe("stripContainerLayoutFromOuterStyles", () => {
	it("removes layout keys from outer shell styles", () => {
		const stripped = stripContainerLayoutFromOuterStyles({
			display: "flex",
			padding: "1rem",
			gap: "16px",
		});
		expect(stripped).toEqual({ padding: "1rem" });
	});
});

describe("getBlockSiblingFlexItemStyles", () => {
	it("centers a child horizontally in a column stack", () => {
		const item = getBlockSiblingFlexItemStyles(
			{ contentAlignHorizontal: "center" },
			"column",
		);
		expect(item.alignSelf).toBe("center");
	});

	it("pushes a child to the bottom in a column stack", () => {
		const item = getBlockSiblingFlexItemStyles(
			{ contentAlignVertical: "bottom" },
			"column",
		);
		expect(item.marginTop).toBe("auto");
	});

	it("uses inner flex column for vertical placement in a row stack", () => {
		const item = getBlockSiblingFlexItemStyles(
			{ contentAlignVertical: "bottom" },
			"row",
		);
		expect(item.display).toBe("flex");
		expect(item.flexDirection).toBe("column");
		expect(item.justifyContent).toBe("flex-end");
		expect(item.alignSelf).toBe("stretch");
	});
});

describe("getContainerOuterShellStyle", () => {
	it("applies height on the outer shell and uses flex column layout", () => {
		const outer = getContainerOuterShellStyle(
			{ minHeight: "20rem", padding: "1rem", display: "flex", gap: "8px" },
			{ children: [{ styles: { contentAlignVertical: "bottom" } }] },
		);
		expect(outer.minHeight).toBe("20rem");
		expect(outer.display).toBe("flex");
		expect(outer.flexDirection).toBe("column");
		expect(outer.padding).toBe("1rem");
		expect(outer.gap).toBeUndefined();
	});

	it("fills inner stack when shell has height", () => {
		const layout = readContainerLayoutFromBlock({ styles: { display: "block" } });
		const stack = getContainerChildrenStackStyle(layout, {
			shellStyles: { height: "400px" },
			children: [{ styles: { contentAlignVertical: "bottom" } }],
		});
		expect(stack.flex).toBe(1);
		expect(stack.minHeight).toBe(0);
		expect(stack.height).toBeUndefined();
	});
});
