import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SettingsChipGroup } from "../../settings-chip-group";
import { SettingsLabel } from "../../shared";
import { Layout, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsState } from "../useSettingsState";
import { type GroupSemanticContent, DEFAULT_SEMANTIC_CONTENT, LAYOUT_PRESETS } from "./group-model";
import { readContainerLayoutFromBlock } from "@shared/block-container-placement";

export interface GroupSettingsProps {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}

const LAYOUT_STYLE_KEYS = [
	"display",
	"flexDirection",
	"flexWrap",
	"alignItems",
	"justifyContent",
	"gap",
	"rowGap",
	"columnGap",
	"gridTemplateColumns",
	"gridTemplateRows",
	"width",
	"maxWidth",
	"minWidth",
	"height",
	"maxHeight",
	"minHeight",
	"overflow",
] as const;

const FLEX_PRESET_KEYS = [
	"default",
	"flex-column",
	"flex-row",
	"flex-center",
	"flex-between",
	"hero-centered",
] as const;

const GRID_PRESET_KEYS = [
	"grid-2col",
	"grid-3col",
	"grid-auto",
	"sidebar-left",
	"sidebar-right",
] as const;

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

/** Applies a layout preset to styles (not content). */
const presetToStyles = (
	preset: (typeof LAYOUT_PRESETS)[string],
): Record<string, string> => {
	const { label: _l, description: _d, ...layout } = preset;
	return Object.fromEntries(
		Object.entries(layout).filter(([, v]) => v !== undefined && v !== null),
	) as Record<string, string>;
};

function settingsChipClass(selected: boolean): string {
	return cn(
		"npb-settings-chip flex min-h-10 w-full min-w-0 items-center justify-center px-2 text-xs font-medium focus:outline-none",
		selected && "npb-settings-chip--active",
	);
}

export function GroupSettings({ block, onUpdate }: GroupSettingsProps) {
	const { content, styles, updateContent, updateStyles } = useSettingsState<GroupSemanticContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_SEMANTIC_CONTENT,
	});

	const layout = readContainerLayoutFromBlock({ styles, content: block.content as Record<string, unknown> });
	const currentTag = content?.tagName || "div";
	const currentPreset = content?.layoutPreset ?? "default";

	const applyPreset = (key: string) => {
		const preset = LAYOUT_PRESETS[key];
		if (!preset) return;
		updateContent({ layoutPreset: key });
		updateStyles(presetToStyles(preset));
	};

	const presetOptions = (keys: readonly string[]) =>
		keys.map((key) => ({
			value: key,
			label: LAYOUT_PRESETS[key]?.label ?? key,
		}));

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Layout" icon={Layout} defaultOpen={true}>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label className="npb-settings-label text-sm font-semibold">Preset</Label>
						<Select value={currentPreset} onValueChange={applyPreset}>
							<SelectTrigger className="h-9 rounded-none border-[color:var(--npb-coll-header-divider)] bg-transparent text-sm focus:ring-1 focus:ring-npb-focus">
								<SelectValue placeholder="Choose layout" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
									<SelectItem key={key} value={key} title={preset.description}>
										{preset.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="npb-settings-hint-muted text-xs">
							{LAYOUT_PRESETS[currentPreset]?.description ?? "Applies flex/grid layout on the Style tab."}
						</p>
					</div>

					<SettingsChipGroup
						label="Flex"
						options={presetOptions(FLEX_PRESET_KEYS)}
						value={currentPreset}
						onChange={applyPreset}
					/>

					<SettingsChipGroup
						label="Grid"
						options={presetOptions(GRID_PRESET_KEYS)}
						value={currentPreset}
						onChange={applyPreset}
					/>

					<p className="npb-settings-hint-muted text-xs">
						Current: {layout.display ?? "block"}
						{layout.flexDirection ? ` · ${layout.flexDirection}` : ""}
						{layout.gap ? ` · gap ${layout.gap}` : ""}. Fine-tune in Style.
					</p>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Structure" icon={Settings} defaultOpen={true}>
				<div className="space-y-3">
					<SettingsLabel>HTML tag</SettingsLabel>
					<div className="grid grid-cols-2 gap-2">
						{HTML_TAG_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => updateContent({ tagName: option.value })}
								className={settingsChipClass(currentTag === option.value)}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
			</CollapsibleCard>
		</div>
	);
}

export { LAYOUT_STYLE_KEYS };
