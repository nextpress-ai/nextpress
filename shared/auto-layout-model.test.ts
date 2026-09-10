import { describe, expect, it } from "vitest";
import {
	alignPointToFlexStyles,
	flexStylesToAlignPoint,
	readResizeFromLength,
	readResizeFromHeight,
	resizeToWidth,
	resizeToHeight,
	parentAllowsChildPin,
} from "@shared/auto-layout-model";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";

describe("auto-layout-model", () => {
	it("maps 9-point bottom-right on a column stack like Cover", () => {
		const flex = alignPointToFlexStyles("bottom-right", false);
		expect(flex.justifyContent).toBe("flex-end");
		expect(flex.alignItems).toBe("flex-end");
	});

	it("maps 9-point bottom-right on a row stack to end + end", () => {
		const flex = alignPointToFlexStyles("bottom-right", true);
		expect(flex.justifyContent).toBe("flex-end");
		expect(flex.alignItems).toBe("flex-end");
	});

	it("round-trips center align", () => {
		const flex = alignPointToFlexStyles("middle-center", false);
		expect(flexStylesToAlignPoint(flex.justifyContent, flex.alignItems, false)).toBe(
			"middle-center",
		);
	});

	it("maps Hug / Fill / Fixed widths", () => {
		expect(readResizeFromLength("fit-content")).toBe("hug");
		expect(readResizeFromLength("100%")).toBe("fill");
		expect(readResizeFromLength(undefined)).toBe("fill");
		expect(readResizeFromLength("320px")).toBe("fixed");
		expect(resizeToWidth("hug", "100%")).toBe("fit-content");
		expect(resizeToWidth("fill", "320px")).toBe("100%");
	});

	it("treats unset height as Hug and writes auto so merge can clear a length", () => {
		expect(readResizeFromHeight(undefined)).toBe("hug");
		expect(readResizeFromHeight("auto")).toBe("hug");
		expect(readResizeFromHeight("100%")).toBe("fill");
		expect(readResizeFromHeight("240px")).toBe("fixed");
		expect(resizeToHeight("hug", "100%")).toBe("auto");
		expect(resizeToHeight("fill", undefined)).toBe("100%");
	});

	it("does not treat stretch as the end 9-point cell", () => {
		expect(flexStylesToAlignPoint("flex-start", "stretch", false)).toBe("top-left");
		expect(flexStylesToAlignPoint("flex-start", "stretch", true)).toBe("top-left");
		expect(flexStylesToAlignPoint("flex-end", "flex-end", false)).toBe("bottom-right");
	});

	it("allows pin on flex parents and columns, not block", () => {
		expect(
			parentAllowsChildPin({
				name: "core/group",
				styles: { display: "block" },
			}),
		).toBe(false);
		expect(
			parentAllowsChildPin({
				name: "core/group",
				styles: { display: "flex" },
			}),
		).toBe(true);
		expect(parentAllowsChildPin({ name: "core/columns", styles: {} })).toBe(true);
		expect(parentAllowsChildPin(null)).toBe(false);
	});
});

describe("getHorizontalFlexChildStyles", () => {
	it("keeps Fill (unset and 100%) growing on the main axis", () => {
		const unset = getHorizontalFlexChildStyles({ isHorizontal: true, childStyles: {} });
		const fill = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "100%" },
		});
		expect(unset.flexGrow).toBe("1");
		expect(fill.flexGrow).toBe("1");
		expect(fill.flexShrink).toBe("1");
		expect(fill.flexBasis).toBe("auto");
	});

	it("hugs fit-content and auto", () => {
		expect(
			getHorizontalFlexChildStyles({
				isHorizontal: true,
				childStyles: { width: "fit-content" },
			}).flexGrow,
		).toBe("0");
	});

	it("locks fixed widths", () => {
		const style = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "320px" },
		});
		expect(style.flexGrow).toBe("0");
		expect(style.flexBasis).toBe("320px");
		expect(style.width).toBe("320px");
	});

	it("does not grow icons and buttons in a row", () => {
		expect(
			getHorizontalFlexChildStyles({
				isHorizontal: true,
				blockName: "core/button",
				childStyles: {},
			}).flexGrow,
		).toBe("0");
	});
});
