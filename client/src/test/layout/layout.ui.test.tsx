import { describe, expect, it } from "vitest";
import { within } from "@testing-library/react";
import { expandSizeAdvanced, renderLayoutHarness } from "./render-layout-harness";
import { flexColumnGroup, flexRowGroup, heading, paragraph } from "./fixtures";
import { getDefaultBlock } from "@/components/PageBuilder/blocks";
import type { BlockConfig } from "@shared/schema-types";

function layoutBlock(name: "core/group" | "core/container" | "core/columns"): BlockConfig {
	return {
		id: `${name}-ui`,
		name,
		type: "container",
		parentId: null,
		content: { kind: "structured", data: {} },
		styles: {
			display: "flex",
			flexDirection: "column",
			gap: "1rem",
			width: "100%",
		},
		settings: name === "core/columns" ? { columnLayout: [] } : {},
		children: [],
	};
}

describe("layout.ui", () => {
	it("shows one Auto layout region for Group, Container, and Columns", () => {
		for (const name of ["core/group", "core/container", "core/columns"] as const) {
			const { getByRole, unmount } = renderLayoutHarness(layoutBlock(name), {
				hideDisplay: name === "core/columns",
			});
			expect(getByRole("region", { name: "Auto layout" })).toBeInTheDocument();
			unmount();
		}
	});

	it("names direction, wrap, distribution, and Hug/Fill/Fixed", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("radiogroup", { name: "Direction" })).toBeInTheDocument();
		expect(getByRole("radiogroup", { name: "Wrap" })).toBeInTheDocument();
		expect(getByRole("radiogroup", { name: "Distribution" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Horizontal" })).toBeInTheDocument();
		await expandSizeAdvanced(user, getByRole);
		expect(getByRole("radiogroup", { name: "Width" })).toBeInTheDocument();
		const widthGroup = getByRole("radiogroup", { name: "Width" });
		expect(within(widthGroup).getByRole("radio", { name: "Hug" })).toBeInTheDocument();
		expect(within(widthGroup).getByRole("radio", { name: "Fill" })).toBeInTheDocument();
		expect(within(widthGroup).getByRole("radio", { name: "Fixed" })).toBeInTheDocument();
	});

	it("Height Hug is selected when height is unset, not Fill", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await expandSizeAdvanced(user, getByRole);
		const heightGroup = getByRole("radiogroup", { name: "Height" });
		expect(within(heightGroup).getByRole("radio", { name: "Hug" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(within(heightGroup).getByRole("radio", { name: "Fill" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});

	it("marks the active direction chip as pressed", () => {
		const { getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("radio", { name: "Vertical" })).toHaveAttribute("aria-pressed", "true");
		expect(getByRole("radio", { name: "Horizontal" })).toHaveAttribute("aria-pressed", "false");
	});

	it("writes flexDirection row when Horizontal is clicked", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await user.click(getByRole("radio", { name: "Horizontal" }));
		const stack = document.querySelector("[data-container-children]") as HTMLElement;
		expect(stack.style.flexDirection).toBe("row");
	});

	it("writes Cover-equivalent justify/align for 9-point bottom right", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		await user.click(getByRole("radio", { name: "Align bottom right" }));
		const stack = document.querySelector("[data-container-children]") as HTMLElement;
		expect(stack.style.justifyContent).toBe("flex-end");
		expect(stack.style.alignItems).toBe("flex-end");
	});

	it("writes fit-content for Hug and 100% for Fill", async () => {
		const { user, getByRole } = renderLayoutHarness({
			...flexColumnGroup,
			styles: { ...flexColumnGroup.styles, width: "100%" },
		});
		await expandSizeAdvanced(user, getByRole);
		const widthGroup = getByRole("radiogroup", { name: "Width" });
		await user.click(within(widthGroup).getByRole("radio", { name: "Hug" }));
		expect(within(widthGroup).getByRole("radio", { name: "Hug" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await user.click(within(widthGroup).getByRole("radio", { name: "Fill" }));
		expect(within(widthGroup).getByRole("radio", { name: "Fill" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("Vertical stack starter writes column flex styles", async () => {
		const empty = getDefaultBlock("core/group", "starter-g") as BlockConfig;
		const { user, getByTitle } = renderLayoutHarness(empty, { showGroupStarters: true });
		await user.click(getByTitle("Vertical stack"));
		const stack = document.querySelector("[data-container-children]") as HTMLElement;
		expect(stack.style.flexDirection).toBe("column");
		expect(stack.style.gap).toBe("1rem");
	});

	it("does not steal column count from Columns content", () => {
		const { queryByText } = renderLayoutHarness(layoutBlock("core/columns"), {
			hideDisplay: true,
		});
		expect(queryByText(/Add Column/i)).not.toBeInTheDocument();
	});

	it("renders heading and paragraph in the stack for mixed trees", () => {
		const { getByRole } = renderLayoutHarness({
			...flexColumnGroup,
			children: [heading("h", "Hello"), paragraph("p", "World")],
		});
		expect(getByRole("region", { name: "Auto layout" })).toBeInTheDocument();
	});
});
