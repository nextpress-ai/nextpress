import { describe, expect, it } from "vitest";
import { buildLayoutSignature } from "@shared/layout-signature";
import { getDefaultBlock } from "@/components/PageBuilder/blocks";
import {
	childPinnedRight,
	containerWithColumns,
	flexColumnGroup,
	flexRowGroup,
	oldBlockGroup,
	oldRowUnsetChildren,
} from "./fixtures";
import { layoutStressFixture } from "@shared/test/fixtures/responsive/fixtures";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";
import type { BlockConfig } from "@shared/schema-types";

describe("layout.golden", () => {
	it("old block Group stays block with no gap on the inner stack", () => {
		const now = buildLayoutSignature(oldBlockGroup);
		expect(now.display).toBe("block");
		expect(now.stackStyle.gap).toBeUndefined();
		expect(now.flexDirection).toBe("column");
	});

	it("flex column Group keeps saved direction and gap", () => {
		const now = buildLayoutSignature(flexColumnGroup);
		expect(now.flexDirection).toBe("column");
		expect(now.gap).toBe("16px");
		expect(now.justifyContent).toBe("flex-start");
		expect(now.alignItems).toBe("flex-start");
	});

	it("flex row Hug/Fill/Fixed wrappers stay distinct", () => {
		const now = buildLayoutSignature(flexRowGroup);
		expect(now.flexDirection).toBe("row");
		expect(now.children[0]?.wrapper.flexGrow).toBe("0");
		expect(now.children[1]?.wrapper.flexGrow).toBe("1");
		expect(now.children[2]?.wrapper.flexBasis).toBe("320px");
	});

	it("old row unset-width children still Fill", () => {
		const now = buildLayoutSignature(oldRowUnsetChildren);
		expect(now.children.every((child) => child.wrapper.flexGrow === "1")).toBe(true);
	});

	it("child pin right is in the sibling wrapper", () => {
		const now = buildLayoutSignature(childPinnedRight);
		expect(now.children[0]?.wrapper.alignSelf).toBe("flex-end");
	});

	it("columns keep gap-aware row display", () => {
		const now = buildLayoutSignature(containerWithColumns.children![0]);
		expect(now.display).toBe("flex");
		expect(now.flexDirection).toBe("row");
		expect(now.gap).toBe("20px");
	});

	it("new Group default is flex column; persisted block Group is not rewritten", () => {
		const inserted = getDefaultBlock("core/group", "fresh") as BlockConfig;
		expect(inserted.styles?.display).toBe("flex");
		expect(inserted.styles?.flexDirection).toBe("column");
		expect(inserted.styles?.gap).toBe("1rem");
		expect(oldBlockGroup.styles?.display).toBeUndefined();
		expect(oldBlockGroup.styles?.gap).toBeUndefined();
	});

	it("new Container default stacks; existing max-width boxes keep saved styles", () => {
		const inserted = getDefaultBlock("core/container", "fresh-c") as BlockConfig;
		expect(inserted.styles?.display).toBe("flex");
		expect(inserted.styles?.flexDirection).toBe("column");
		expect(containerWithColumns.styles?.maxWidth).toBe("100%");
	});

	it("canvas and publish classNames match on golden trees", () => {
		for (const block of [
			oldBlockGroup,
			flexColumnGroup,
			flexRowGroup,
			childPinnedRight,
			containerWithColumns,
		]) {
			const sig = buildLayoutSignature(block);
			expect(sig.canvasClassNames).toEqual(sig.publishClassNames);
		}
	});

	it("layout stress fixture top-level signatures keep canvas/publish class parity", () => {
		for (const block of layoutStressFixture) {
			const sig = buildLayoutSignature(block);
			expect(sig.canvasClassNames).toEqual(sig.publishClassNames);
		}
	});

	it("row matrix: auto / 100% / fit-content / 320px / 50%", () => {
		const cases: Array<[unknown, { grow: string; shrink: string; basis: string }]> = [
			[undefined, { grow: "1", shrink: "1", basis: "auto" }],
			["100%", { grow: "1", shrink: "1", basis: "auto" }],
			["fit-content", { grow: "0", shrink: "0", basis: "auto" }],
			["320px", { grow: "0", shrink: "0", basis: "320px" }],
			["50%", { grow: "1", shrink: "1", basis: "auto" }],
		];
		for (const [width, expected] of cases) {
			const style = getHorizontalFlexChildStyles({
				isHorizontal: true,
				childStyles: width === undefined ? {} : { width: String(width) },
			});
			expect(style.flexGrow).toBe(expected.grow);
			expect(style.flexShrink).toBe(expected.shrink);
			expect(style.flexBasis).toBe(expected.basis);
		}
	});
});
