import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { ChevronDown, ChevronUp, Layers, LayoutTemplate } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { useBlockActions } from "../../BlockActionsContext";
import { SettingsChipGroup } from "../../settings-chip-group";
import {
	DEFAULT_STACK_CONTENT,
	readStackTypeFromContent,
	STACK_TYPE_OPTIONS,
	type StackContent,
	type StackType,
} from "@shared/stack-model";
import { STACK_MODE_STARTER_STYLES, stackModeDrifted } from "./stack-model";

export interface StackSettingsProps {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/**
 * Stack Content tab: mode starter (vertical / row / AB overlay) plus a Layers
 * strip for overlay stacks, where canvas clicks only reach the topmost child.
 */
export function StackSettings({ block, onUpdate }: StackSettingsProps) {
	const { content, updateContent, updateStyles } = useSettingsState<StackContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_STACK_CONTENT,
	});
	const actions = useBlockActions();

	const stackType: StackType = content?.stackType ?? "vertical";
	const drifted = stackModeDrifted(stackType, block.styles);
	const isOverlay = stackType === "overlay";
	const children = Array.isArray(block.children) ? block.children : [];

	const applyMode = (value: string) => {
		const next = value as StackType;
		updateContent({ stackType: next });
		updateStyles(STACK_MODE_STARTER_STYLES[next]);
	};

	const moveChild = (index: number, delta: number) => {
		if (!onUpdate) return;
		const target = index + delta;
		if (target < 0 || target >= children.length) return;
		const next = [...children];
		const [moved] = next.splice(index, 1);
		next.splice(target, 0, moved);
		onUpdate({ children: next });
	};

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Stack mode" icon={LayoutTemplate} defaultOpen={true}>
				<SettingsChipGroup
					label="Mode"
					ariaLabel="Stack mode"
					options={STACK_TYPE_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
						accessibleName: option.accessibleName,
					}))}
					value={stackType}
					onChange={applyMode}
				/>
				<p className="npb-settings-hint-muted mt-2 text-xs">
					{isOverlay
						? "Children share one cell — later children draw on top. Fine-tune on the Style tab."
						: "Writes layout styles. Fine-tune on the Style tab."}
				</p>
				{drifted ? (
					<p className="npb-settings-hint mt-2 text-xs">
						Styles changed on the Style tab — pick a mode again to replace them.
					</p>
				) : null}
			</CollapsibleCard>

			{isOverlay ? (
				<CollapsibleCard title="Layers" icon={Layers} defaultOpen={children.length > 0}>
					<p className="npb-settings-hint-muted mb-2 text-xs">
						Bottom → top. Click to select, arrows to restack.
					</p>
					{children.length === 0 ? (
						<p className="npb-settings-hint-muted text-xs">
							Empty stack — drop blocks on the canvas to layer them.
						</p>
					) : (
						<ul className="space-y-1" aria-label="Stack layers, bottom to top">
							{children.map((child, index) => {
								const isSelected = actions?.selectedBlockId === child.id;
								return (
									<li key={child.id} className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => actions?.onSelect(child.id)}
											className={
												"flex h-8 min-w-0 flex-1 items-center rounded-md border px-2 text-left text-sm transition-colors " +
												(isSelected
													? "border-npb-border-strong bg-npb-surface-inset text-npb-text-primary"
													: "border-transparent text-npb-text-secondary hover:bg-npb-surface-inset")
											}
											title={`Select ${child.label ?? child.name} (layer ${index + 1})`}
										>
											<span className="truncate">
												{index + 1}. {child.label ?? child.name}
											</span>
										</button>
										<button
											type="button"
											onClick={() => moveChild(index, -1)}
											disabled={index === 0}
											className="text-npb-text-muted hover:text-npb-text-primary disabled:cursor-not-allowed disabled:opacity-40"
											aria-label={`Move ${child.label ?? child.name} down one layer`}
											title={index === 0 ? "Already the bottom layer" : "Move down one layer"}
										>
											<ChevronDown className="size-4" />
										</button>
										<button
											type="button"
											onClick={() => moveChild(index, 1)}
											disabled={index === children.length - 1}
											className="text-npb-text-muted hover:text-npb-text-primary disabled:cursor-not-allowed disabled:opacity-40"
											aria-label={`Move ${child.label ?? child.name} up one layer`}
											title={
												index === children.length - 1
													? "Already the top layer"
													: "Move up one layer"
											}
										>
											<ChevronUp className="size-4" />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</CollapsibleCard>
			) : null}
		</div>
	);
}
