import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Brackets, LayoutTemplate } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { type GroupSemanticContent, DEFAULT_SEMANTIC_CONTENT, LAYOUT_PRESETS } from "./group-model";
import { FLEX_STARTER_STYLES, matchFlexStarterKey } from "@shared/auto-layout-model";
import { SettingsChipGroup } from "../../settings-chip-group";

export interface GroupSettingsProps {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}

const HTML_TAG_OPTIONS = [
	{ value: "div", label: "div" },
	{ value: "section", label: "section" },
	{ value: "article", label: "article" },
	{ value: "main", label: "main" },
	{ value: "header", label: "header" },
	{ value: "footer", label: "footer" },
	{ value: "aside", label: "aside" },
	{ value: "nav", label: "nav" },
] as const;

const STARTER_OPTIONS = [
	{ value: "column", label: "Stack", accessibleName: "Vertical stack" },
	{ value: "row", label: "Row", accessibleName: "Horizontal" },
	{ value: "grid2", label: "Grid 2", accessibleName: "Grid 2 columns" },
	{ value: "grid3", label: "Grid 3", accessibleName: "Grid 3 columns" },
] as const;

/**
 * Group Content tab: semantic tag + style starters. Fine-tune lives on Style → Layout.
 */
export function GroupSettings({ block, onUpdate }: GroupSettingsProps) {
	const { content, updateContent, updateStyles } = useSettingsState<GroupSemanticContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_SEMANTIC_CONTENT,
	});

	const currentTag = content?.tagName || "div";
	const matchedStarter = matchFlexStarterKey(block.styles);
	const presetLabel = content?.layoutPreset ?? "";
	const starterDrift = presetLabel !== "" && presetLabel !== matchedStarter;

	const applyStarter = (key: string) => {
		const styles = FLEX_STARTER_STYLES[key as keyof typeof FLEX_STARTER_STYLES];
		if (!styles) return;
		updateContent({ layoutPreset: key });
		updateStyles(styles);
	};

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Apply starter" icon={LayoutTemplate} defaultOpen={true}>
				<SettingsChipGroup
					label="Starter"
					ariaLabel="Starter"
					options={STARTER_OPTIONS.map((item) => ({
						value: item.value,
						label: item.label,
						accessibleName: item.accessibleName,
					}))}
					value={matchedStarter}
					onChange={applyStarter}
				/>
				<p className="npb-settings-hint-muted mt-2 text-xs">
					Writes layout styles. Fine-tune on the Style tab.{" "}
					{LAYOUT_PRESETS.default?.description}
				</p>
				{starterDrift ? (
					<p className="npb-settings-hint mt-2 text-xs">
						Styles changed on the Style tab — pick a starter again to replace them.
					</p>
				) : null}
			</CollapsibleCard>

			<CollapsibleCard title="Structure" icon={Brackets} defaultOpen={true}>
				<SettingsChipGroup
					label="HTML tag"
					ariaLabel="HTML tag"
					options={HTML_TAG_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
					}))}
					value={currentTag}
					onChange={(value) => updateContent({ tagName: value })}
				/>
			</CollapsibleCard>
		</div>
	);
}
