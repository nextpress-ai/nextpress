import { describe, expect, it } from "vitest";
import { within } from "@testing-library/react";
import { expandSizeAdvanced, renderLayoutHarness } from "./render-layout-harness";
import {
	containerWithColumns,
	flexColumnGroup,
	flexRowGroup,
	heading,
	oldBlockGroup,
	oldRowUnsetChildren,
} from "./fixtures";
import { getDefaultBlock } from "@/components/PageBuilder/blocks";
import type { BlockConfig } from "@shared/schema-types";
import { buildFlexRowColumnStyle } from "@shared/columns-flex-style";
import { SPACING_PRESETS } from "@shared/dimension-presets";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";

function stackEl(): HTMLElement {
	return document.querySelector("[data-container-children]") as HTMLElement;
}

function wrapperFor(blockId: string): HTMLElement {
	const inner = document.querySelector(`[data-block-id="${blockId}"]`);
	if (!inner) {
		throw new Error(`missing block ${blockId}`);
	}
	let node = inner.parentElement;
	while (node) {
		if (node.parentElement?.getAttribute("data-container-children") === "true") {
			return node;
		}
		node = node.parentElement;
	}
	throw new Error(`wrapper not found for ${blockId}`);
}

function expectFlex(el: HTMLElement, grow: string, shrink: string, basis: string): void {
	expect(el.style.flexGrow).toBe(grow);
	expect(el.style.flexShrink).toBe(shrink);
	expect(el.style.flexBasis).toBe(basis);
}

describe("layout.ux journeys", () => {
	it("UX-01 Insert new Group is a flex column with gap, not block", () => {
		const group = getDefaultBlock("core/group", "new-group") as BlockConfig;
		expect(group.styles?.display).toBe("flex");
		expect(group.styles?.flexDirection).toBe("column");
		expect(group.styles?.gap).toBe("1rem");
		renderLayoutHarness(group, { isPreview: false });
		expect(stackEl().style.flexDirection).toBe("column");
		expect(stackEl().style.gap).toBe("1rem");
		expect(stackEl().style.display).toBe("flex");
	});

	it("UX-02 Children stack vertically with gap", () => {
		renderLayoutHarness(flexColumnGroup);
		const stack = stackEl();
		expect(stack.style.flexDirection).toBe("column");
		expect(stack.style.gap).toBe("16px");
		expect(stack.children.length).toBeGreaterThanOrEqual(2);
	});

	it("UX-03 Switch to row", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await user.click(getByRole("radio", { name: "Horizontal" }));
		expect(stackEl().style.flexDirection).toBe("row");
	});

	it("UX-04 9-point center", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await user.click(getByRole("radio", { name: "Align middle center" }));
		expect(stackEl().style.justifyContent).toBe("center");
		expect(stackEl().style.alignItems).toBe("center");
	});

	it("UX-05 Packed vs space-between", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("radio", { name: "Packed" })).toHaveAttribute("aria-pressed", "true");
		await user.click(getByRole("radio", { name: "Between" }));
		expect(stackEl().style.justifyContent).toBe("space-between");
	});

	it("UX-06 Gap MD preset", async () => {
		const md = SPACING_PRESETS.find((preset) => preset.label === "MD")?.value;
		expect(md).toBe("1rem");
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		const gapGroup = getByRole("radiogroup", { name: "Gap" });
		await user.click(within(gapGroup).getByRole("radio", { name: "MD" }));
		expect(stackEl().style.gap).toBe("1rem");
	});

	it("UX-07 Child Hug in a row", () => {
		renderLayoutHarness(flexRowGroup);
		const hug = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "fit-content" },
		});
		expect(hug.flexGrow).toBe("0");
		expect(hug.flexShrink).toBe("0");
		expect(hug.flexBasis).toBe("auto");
		expectFlex(wrapperFor("fr-h"), "0", "0", "auto");
	});

	it("UX-08 Child Fill in a row", () => {
		renderLayoutHarness(flexRowGroup);
		expectFlex(wrapperFor("fr-p"), "1", "1", "auto");
	});

	it("UX-09 Child pin right writes placement and wrapper styles", async () => {
		const child = heading("pin-me", "Pin", {});
		const parent: BlockConfig = {
			...flexColumnGroup,
			children: [child],
		};
		const { user, getByRole } = renderLayoutHarness(child, {
			parentBlock: parent,
			canvasBlock: parent,
		});
		await user.click(getByRole("radio", { name: "Right" }));
		expect(getByRole("radio", { name: "Right" })).toHaveAttribute("aria-pressed", "true");
		expect(wrapperFor("pin-me").style.alignSelf).toBe("flex-end");
	});

	it("UX-10 Pin hidden when parent is display block", () => {
		const child = heading("c", "Hi");
		const { queryByText } = renderLayoutHarness(child, { parentBlock: oldBlockGroup });
		expect(queryByText("Pin in parent")).not.toBeInTheDocument();
	});

	it("UX-11 Grid starter 2-col", async () => {
		const empty = getDefaultBlock("core/group", "grid-g") as BlockConfig;
		const { user, getByTitle } = renderLayoutHarness(empty, { showGroupStarters: true });
		await user.click(getByTitle("Grid 2 columns"));
		expect(stackEl().style.display).toBe("grid");
		expect(stackEl().style.gridTemplateColumns).toBe("repeat(2, 1fr)");
	});

	it("UX-12 Columns gap-aware percent widths still hold", () => {
		const style = buildFlexRowColumnStyle("50%", "220px", {
			columnCount: 2,
			gap: "20px",
		});
		expect(style.width).toContain("calc");
		expect(style.width).toContain("20px");
		renderLayoutHarness(containerWithColumns.children![0]);
		expect(stackEl()).toBeTruthy();
	});

	it("UX-13 Nested Group in Container keeps outer max-width", () => {
		const nested: BlockConfig = {
			...containerWithColumns,
			children: [
				{
					...flexColumnGroup,
					id: "inner-group",
					parentId: containerWithColumns.id,
				},
			],
		};
		renderLayoutHarness(nested);
		expect(nested.styles?.maxWidth).toBe("100%");
		expect(stackEl().style.flexDirection).toBe("column");
	});

	it("UX-14 Wrap on", async () => {
		const { user, getByRole } = renderLayoutHarness(flexRowGroup);
		await user.click(getByRole("radio", { name: "Wrap" }));
		expect(stackEl().style.flexWrap).toBe("wrap");
	});

	it("UX-15 Old saved Group stays block and does not gain gap", () => {
		renderLayoutHarness(oldBlockGroup);
		expect(oldBlockGroup.styles?.display).toBeUndefined();
		expect(stackEl().style.gap).toBe("");
	});

	it("unset-width row children still Fill so old rows do not collapse", () => {
		renderLayoutHarness(oldRowUnsetChildren);
		expectFlex(wrapperFor("or-h"), "1", "1", "auto");
		expectFlex(wrapperFor("or-p"), "1", "1", "auto");
	});

	it("Gap None is selected when a flex stack has no gap, not MD", () => {
		const noGap: BlockConfig = {
			...flexColumnGroup,
			styles: { ...flexColumnGroup.styles, gap: undefined },
		};
		const { getByRole } = renderLayoutHarness(noGap);
		const gapGroup = getByRole("radiogroup", { name: "Gap" });
		expect(within(gapGroup).getByRole("radio", { name: "None" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(within(gapGroup).getByRole("radio", { name: "MD" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(stackEl().style.gap).toBe("");
	});

	it("Height Fill then Hug stays Hug", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await expandSizeAdvanced(user, getByRole);
		const heightGroup = getByRole("radiogroup", { name: "Height" });
		await user.click(within(heightGroup).getByRole("radio", { name: "Fill" }));
		await user.click(within(heightGroup).getByRole("radio", { name: "Hug" }));
		expect(within(heightGroup).getByRole("radio", { name: "Hug" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("row-reverse Hug/Fill matches row", () => {
		const reverseRow: BlockConfig = {
			...flexRowGroup,
			id: "rev-row",
			styles: { ...flexRowGroup.styles, flexDirection: "row-reverse" },
		};
		renderLayoutHarness(reverseRow);
		expect(stackEl().style.flexDirection).toBe("row-reverse");
		expectFlex(wrapperFor("fr-h"), "0", "0", "auto");
		expectFlex(wrapperFor("fr-p"), "1", "1", "auto");
	});

	it("Direction Vertical keeps reverse as column-reverse", async () => {
		const reverseRow: BlockConfig = {
			...flexRowGroup,
			id: "rev-axis",
			styles: { ...flexRowGroup.styles, flexDirection: "row-reverse" },
		};
		const { user, getByRole } = renderLayoutHarness(reverseRow);
		await user.click(getByRole("radio", { name: "Vertical" }));
		expect(stackEl().style.flexDirection).toBe("column-reverse");
	});
});
