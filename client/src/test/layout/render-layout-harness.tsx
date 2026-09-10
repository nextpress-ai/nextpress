import { useState, type ReactElement } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockConfig } from "@shared/schema-types";
import { AutoLayoutPanel } from "@/components/PageBuilder/auto-layout-panel";
import { ChildPinCard } from "@/components/PageBuilder/child-pin-card";
import { parentAllowsChildPin } from "@shared/auto-layout-model";
import { ContainerChildren } from "@/components/PageBuilder/BlockRenderer";
import {
	BlockActionsProvider,
	type BlockActionsContextValue,
} from "@/components/PageBuilder/BlockActionsContext";
import { GroupSettings } from "@/components/PageBuilder/blocks/group/group-settings";

const stubActions: BlockActionsContextValue = {
	selectedBlockId: null,
	editingBlockId: null,
	hoveredBlockId: null,
	onSelect: () => {},
	onStartEditing: () => {},
	onStopEditing: () => {},
	onHoverBlock: () => {},
	onDuplicate: () => {},
	onDelete: () => {},
	hoverHighlight: null,
};

export type LayoutHarnessOptions = {
	parentBlock?: BlockConfig | null;
	/** Canvas tree when the inspector is on a child (pin journeys). */
	canvasBlock?: BlockConfig;
	showGroupStarters?: boolean;
	hideDisplay?: boolean;
	isPreview?: boolean;
};

function withSelectedChild(canvas: BlockConfig, selected: BlockConfig): BlockConfig {
	if (canvas.id === selected.id) return selected;
	if (!canvas.children?.length) return canvas;
	return {
		...canvas,
		children: canvas.children.map((child) => withSelectedChild(child, selected)),
	};
}

function LayoutHarnessRoot({
	initial,
	parentBlock = null,
	canvasBlock,
	showGroupStarters = false,
	hideDisplay = false,
	isPreview = true,
}: LayoutHarnessOptions & { initial: BlockConfig }): ReactElement {
	const [block, setBlock] = useState(initial);
	const patchStyles = (next: Record<string, unknown>) => {
		setBlock((prev) => ({
			...prev,
			styles: { ...prev.styles, ...next } as BlockConfig["styles"],
		}));
	};

	const horizontal =
		((block.styles as Record<string, unknown> | undefined)?.contentAlignHorizontal as
			| string
			| undefined) ?? "__unset";
	const vertical =
		((block.styles as Record<string, unknown> | undefined)?.contentAlignVertical as
			| string
			| undefined) ?? "__unset";

	return (
		<BlockActionsProvider value={stubActions}>
			<div data-testid="layout-harness">
				{showGroupStarters ? (
					<GroupSettings
						block={block}
						onUpdate={(updates) => setBlock((prev) => ({ ...prev, ...updates }))}
					/>
				) : null}
				<AutoLayoutPanel
					block={block}
					hideDisplay={hideDisplay}
					onStylesChange={patchStyles}
				/>
				{parentAllowsChildPin(parentBlock) ? (
					<ChildPinCard
						horizontal={horizontal}
						vertical={vertical}
						onChange={(patch) => patchStyles(patch)}
					/>
				) : null}
				<ContainerChildren
					block={canvasBlock ? withSelectedChild(canvasBlock, block) : block}
					isPreview={isPreview}
				/>
			</div>
		</BlockActionsProvider>
	);
}

/** Opens collapsed width/height/overflow controls in the layout inspector. */
export async function expandSizeAdvanced(
	user: ReturnType<typeof userEvent.setup>,
	getByRole: (role: string, options?: { name: string | RegExp }) => HTMLElement,
) {
	await user.click(getByRole("button", { name: "Size & advanced" }));
}

/** Real Auto Layout panel + inner stack. No FakePageBuilder. */
export function renderLayoutHarness(
	initial: BlockConfig,
	options: LayoutHarnessOptions = {},
) {
	const user = userEvent.setup();
	const view = render(<LayoutHarnessRoot initial={initial} {...options} />);
	return { user, ...view };
}
