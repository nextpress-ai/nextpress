import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderLayoutHarness } from "./render-layout-harness";
import { flexColumnGroup, heading, oldBlockGroup } from "./fixtures";
import { BuilderInspectorPanel } from "@/components/PageBuilder/BuilderInspectorPanel";

describe("layout.a11y", () => {
	it("Layout region is named Auto layout", () => {
		const { getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("region", { name: "Auto layout" })).toBeInTheDocument();
	});

	it("Direction group is a radiogroup with labelled options", () => {
		const { getByRole } = renderLayoutHarness(flexColumnGroup);
		const group = getByRole("radiogroup", { name: "Direction" });
		expect(group).toBeInTheDocument();
		expect(getByRole("radio", { name: "Horizontal" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Vertical" })).toBeInTheDocument();
	});

	it("arrow keys move direction selection", async () => {
		const { user, getByRole } = renderLayoutHarness(flexColumnGroup);
		const vertical = getByRole("radio", { name: "Vertical" });
		vertical.focus();
		await user.keyboard("{ArrowRight}");
		expect(getByRole("radio", { name: "Horizontal" })).toHaveAttribute("aria-pressed", "true");
	});

	it("selected option is aria-pressed true, others false", () => {
		const { getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("radio", { name: "Vertical" })).toHaveAttribute("aria-pressed", "true");
		expect(getByRole("radio", { name: "Horizontal" })).toHaveAttribute("aria-pressed", "false");
	});

	it("9-point cells have Align names, not empty buttons", () => {
		const { getByRole } = renderLayoutHarness(flexColumnGroup);
		expect(getByRole("radio", { name: "Align top left" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Align middle center" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Align bottom right" })).toBeInTheDocument();
	});

	it("pin card uses Left Center Right, not alignSelf", () => {
		const { getByRole, queryByText } = renderLayoutHarness(heading("h", "Hi"), {
			parentBlock: flexColumnGroup,
		});
		expect(getByRole("radio", { name: "Left" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Center" })).toBeInTheDocument();
		expect(getByRole("radio", { name: "Right" })).toBeInTheDocument();
		expect(queryByText(/alignSelf/i)).not.toBeInTheDocument();
	});

	it("no-selection inspector still shows the empty status", () => {
		render(
			<BuilderInspectorPanel
				selectedBlock={null}
				updateBlock={() => {}}
				setHoverHighlight={() => {}}
			/>,
		);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Select a block to edit its settings",
		);
	});

	it("hides pin when parent is block", () => {
		const { queryByText } = renderLayoutHarness(heading("h", "Hi"), {
			parentBlock: oldBlockGroup,
		});
		expect(queryByText("Pin in parent")).not.toBeInTheDocument();
	});
});
