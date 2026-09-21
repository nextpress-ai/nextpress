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
import { SettingsLabel, SettingsSection } from "../../shared";
import ColorField from "../../ColorField";
import { PAGE_FONT_CATALOG } from "@shared/font-catalog";
import { PAGE_PADDING_PRESETS } from "@shared/dimension-presets";
import {
	DEFAULT_PAGE_SHELL_CONTENT,
	PAGE_SHELL_WIDTH_OPTIONS,
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
			<DimensionPresetField
				label="Padding"
				presets={PAGE_PADDING_PRESETS}
				value={content.padding}
				defaultValue={DEFAULT_PAGE_SHELL_CONTENT.padding}
				customPlaceholder="e.g. 3rem 1.5rem"
				onChange={(next) =>
					updateContent({ padding: next ?? DEFAULT_PAGE_SHELL_CONTENT.padding })
				}
			/>
			<div className="space-y-2">
				<SettingsLabel>Colors</SettingsLabel>
				<ColorField
					ariaLabel="Page color"
					defaultProperty="backgroundColor"
					targets={[
						{
							property: "backgroundColor",
							label: "Background",
							entry: content.backgroundColor,
							styleValue: content.backgroundColor?.style,
						},
						{
							property: "color",
							label: "Text",
							entry: content.textColor,
							styleValue: content.textColor?.style,
						},
					]}
					onChange={(entry: TokenEntry) =>
						updateContent(
							entry.property === "color" ? { textColor: entry } : { backgroundColor: entry },
						)
					}
					onTheme={(target) =>
						updateContent(
							target.property === "color" ? { textColor: undefined } : { backgroundColor: undefined },
						)
					}
				/>
			</div>
		</SettingsSection>
	);
}
