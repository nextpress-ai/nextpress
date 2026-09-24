import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useSettingsState } from "../useSettingsState";
import { DimensionPresetField } from "../../dimension-preset-field";
import { SettingsDisclosure, SettingsLabel, SettingsSection } from "../../shared";
import { FillField } from "../../fill/fill-field";
import { PAGE_FONT_CATALOG } from "@shared/font-catalog";
import { PAGE_SIDE_PADDING_PRESETS, PAGE_TOP_BOTTOM_PADDING_PRESETS } from "@shared/dimension-presets";
import { readShellPaddingAxes } from "@shared/page-shell-padding";
import { SettingsChipGroup } from "../../settings-chip-group";
import { PageShellScrollbarField } from "./page-shell-scrollbar-field";
import {
	DEFAULT_PAGE_SHELL_CONTENT,
	PAGE_CONTENT_ALIGN_OPTIONS,
	PAGE_SHELL_WIDTH_OPTIONS,
	readContentAlign,
	readPageShellContent,
	type PageShellContent,
} from "./page-shell-model";

/**
 * The page's look: font, width, padding, colors. One group, so no accordion — the block's name
 * ("Page shell") is already the title above the tabs.
 */
export function PageShellSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	const { content, updateContent } = useSettingsState<PageShellContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_PAGE_SHELL_CONTENT,
		parseContent: readPageShellContent,
	});

	const axes = readShellPaddingAxes(content);
	const defaultAxes = readShellPaddingAxes(DEFAULT_PAGE_SHELL_CONTENT);

	return (
		<SettingsSection>
			<div className="space-y-2">
				<SettingsLabel htmlFor="page-shell-font">Font</SettingsLabel>
				<Select
					value={content.fontFamily}
					onValueChange={(value) => updateContent({ fontFamily: value })}
				>
					<SelectTrigger id="page-shell-font" className="npb-settings-select-trigger">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_FONT_CATALOG.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<DimensionPresetField
				label="Content width"
				presets={PAGE_SHELL_WIDTH_OPTIONS}
				value={content.containerWidth}
				defaultValue={DEFAULT_PAGE_SHELL_CONTENT.containerWidth}
				customPlaceholder="e.g. 1100px or 80rem"
				onChange={(next) =>
					updateContent({ containerWidth: next ?? DEFAULT_PAGE_SHELL_CONTENT.containerWidth })
				}
			/>
			<p className="npb-settings-hint -mt-1 text-xs">
				The column fills the page. Side padding is the space at the edges.
			</p>
			{content.containerWidth.trim() !== "100%" ? (
				<SettingsChipGroup
					label="Content position"
					options={PAGE_CONTENT_ALIGN_OPTIONS.map((option) => ({ ...option }))}
					value={content.contentAlign ?? "center"}
					onChange={(next) => updateContent({ contentAlign: readContentAlign(next) })}
				/>
			) : null}
			<DimensionPresetField
				label="Side padding"
				presets={PAGE_SIDE_PADDING_PRESETS}
				value={axes.inline}
				defaultValue={defaultAxes.inline}
				customPlaceholder="e.g. 1.25rem or 20px"
				onChange={(next) => updateContent({ paddingInline: next })}
			/>
			<p className="npb-settings-hint -mt-1 text-xs">
				Space from the page edge. The column fills the rest of the page.
			</p>
			<DimensionPresetField
				label="Top and bottom padding"
				presets={PAGE_TOP_BOTTOM_PADDING_PRESETS}
				value={axes.block}
				defaultValue={defaultAxes.block}
				customPlaceholder="e.g. 3rem"
				onChange={(next) => updateContent({ paddingBlock: next })}
			/>
			<div className="space-y-2">
				<SettingsLabel>Colors</SettingsLabel>
				<FillField
					ariaLabel="Page color"
					defaultProperty="backgroundColor"
					targets={[
						{
							property: "backgroundColor",
							label: "Background",
							entry: content.backgroundColor,
							styleValue: content.backgroundColor?.style,
							fill: content.backgroundFill,
						},
						{
							property: "color",
							label: "Text",
							entry: content.textColor,
							styleValue: content.textColor?.style,
							// Text stays a plain colour: a page-wide text fill would paint every word as one huge gradient.
							fillKinds: [],
						},
					]}
					onColorChange={(entry: TokenEntry) =>
						updateContent(
							entry.property === "color" ? { textColor: entry } : { backgroundColor: entry },
						)
					}
					onFillChange={(_target, fill) => updateContent({ backgroundFill: fill })}
					onTheme={(target) =>
						updateContent(
							target.property === "color" ? { textColor: undefined } : { backgroundColor: undefined },
						)
					}
				/>
			</div>
			<SettingsDisclosure
				title="Scrollbar"
				defaultOpen={content.scrollbar?.look === "custom" || content.scrollbar?.look === "hidden"}
			>
				<PageShellScrollbarField
					value={content.scrollbar}
					onChange={(next) => updateContent({ scrollbar: next })}
				/>
			</SettingsDisclosure>
		</SettingsSection>
	);
}
