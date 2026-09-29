import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { ListCollapse, Palette, Plus, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import {
	ACCORDION_ITEM_BLOCK_NAME,
	readAccordionContent,
	type AccordionContent,
	type AccordionIconRef,
} from "@shared/accordion-model";
import {
	BORDER_RADIUS_PRESETS,
	FONT_SIZE_PRESETS,
	FONT_WEIGHT_PRESETS,
	SPACING_PRESETS,
} from "@shared/dimension-presets";
import type { IconReference } from "@/lib/icon-indexes";
import { SettingsLabel } from "../../shared";
import { SettingsChipGroup } from "../../settings-chip-group";
import { DimensionPresetField } from "../../dimension-preset-field";
import ColorField, { type ColorTarget } from "../../ColorField";
import { IconPickerButton } from "../../IconPicker/IconPickerButton";
import { IconRenderer } from "../shared/IconRenderer";
import { useSettingsState } from "../useSettingsState";
import { generateBlockId } from "../../utils";
import { buildAccordionItem } from "./accordion-factory";

const OPEN_MODE_OPTIONS = [
	{ value: "one", label: "One at a time" },
	{ value: "many", label: "Many at once" },
];
const LOOK_OPTIONS = [
	{ value: "cards", label: "Cards" },
	{ value: "lines", label: "Lines" },
	{ value: "plain", label: "Plain" },
];
const ICON_OPTIONS = [
	{ value: "plus-minus", label: "Plus / minus" },
	{ value: "chevron", label: "Chevron" },
	{ value: "arrow", label: "Arrow" },
	{ value: "custom", label: "Custom" },
];
const ICON_POSITION_OPTIONS = [
	{ value: "start", label: "Before title" },
	{ value: "end", label: "After title" },
];
const ICON_SIZE_PRESETS = [
	{ value: "14px", label: "SM" },
	{ value: "18px", label: "MD" },
	{ value: "22px", label: "LG" },
];

/** Colour keys an accordion keeps as plain CSS colours on its content. */
type ColorKey = "itemBackground" | "itemBorderColor" | "titleColor" | "iconColor";

type AccordionSettingsProps = {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
};

const toPickerIcon = (icon: AccordionIconRef | null | undefined): IconReference | undefined =>
	icon ? { ...icon, iconSet: icon.iconSet as IconReference["iconSet"], size: 24, color: "currentColor" } : undefined;

const toAccordionIcon = (icon: IconReference): AccordionIconRef => ({
	iconSet: icon.iconSet,
	iconName: icon.iconName,
	...(icon.svg ? { svg: icon.svg } : {}),
	...(icon.url ? { url: icon.url } : {}),
	...(icon.label ? { label: icon.label } : {}),
	...(icon.tint ? { tint: true } : {}),
});

/**
 * Accordion settings: items and how they open, the look of each item, and the icon.
 * Answers are edited on the canvas like any other blocks.
 */
export function AccordionSettings({ block, onUpdate }: AccordionSettingsProps) {
	const { content, updateContent } = useSettingsState<AccordionContent>({
		block,
		onUpdate,
		parseContent: readAccordionContent,
	});
	const items = (block.children ?? []).filter((child) => child.name === ACCORDION_ITEM_BLOCK_NAME);
	const updateIcon = (patch: Partial<AccordionContent["icon"]>) => updateContent({ icon: { ...content.icon, ...patch } });

	const addItem = () => {
		const item = buildAccordionItem({
			id: generateBlockId(),
			parentId: block.id,
			title: `Question ${items.length + 1}`,
			newId: generateBlockId,
		});
		onUpdate?.({ children: [...(block.children ?? []), item] });
	};

	const colorValue: Record<ColorKey, string | undefined> = {
		itemBackground: content.itemBackground,
		itemBorderColor: content.itemBorderColor,
		titleColor: content.titleColor,
		iconColor: content.icon.color ?? undefined,
	};
	const colorTargets: ColorTarget[] = [
		{ property: "itemBackground", label: "Item", styleValue: colorValue.itemBackground },
		{ property: "itemBorderColor", label: "Border", styleValue: colorValue.itemBorderColor },
		{ property: "titleColor", label: "Title", styleValue: colorValue.titleColor },
		{ property: "iconColor", label: "Icon", styleValue: colorValue.iconColor },
	];
	const setColor = (key: string, value: string | undefined) => {
		if (key === "iconColor") updateIcon({ color: value ?? null });
		else updateContent({ [key]: value } as Partial<AccordionContent>);
	};

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Items" icon={ListCollapse} defaultOpen>
				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm text-npb-text-secondary">
							{items.length} {items.length === 1 ? "item" : "items"}
						</p>
						<Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
							<Plus className="h-3.5 w-3.5" aria-hidden />
							Add item
						</Button>
					</div>
					<SettingsChipGroup
						label="Opening"
						options={OPEN_MODE_OPTIONS}
						value={content.openMode}
						onChange={(value) => updateContent({ openMode: value === "many" ? "many" : "one" })}
					/>
					<div className="flex items-center justify-between gap-3">
						<SettingsLabel htmlFor={`accordion-first-open-${block.id}`}>First item open</SettingsLabel>
						<Switch
							id={`accordion-first-open-${block.id}`}
							checked={content.firstOpen}
							onCheckedChange={(checked) => updateContent({ firstOpen: checked })}
						/>
					</div>
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<SettingsLabel htmlFor={`accordion-faq-${block.id}`}>Mark as FAQ for search engines</SettingsLabel>
							<p className="npb-settings-hint-muted text-xs">
								Search results can show these questions and answers.
							</p>
						</div>
						<Switch
							id={`accordion-faq-${block.id}`}
							checked={content.faqSchema}
							onCheckedChange={(checked) => updateContent({ faqSchema: checked })}
						/>
					</div>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Look" icon={Palette} defaultOpen={false}>
				<div className="space-y-4">
					<SettingsChipGroup
						label="Style"
						options={LOOK_OPTIONS}
						value={content.look}
						onChange={(value) => updateContent({ look: value as AccordionContent["look"] })}
					/>
					{content.look !== "lines" ? (
						<DimensionPresetField
							label="Space between items"
							presets={SPACING_PRESETS}
							value={content.gap}
							onChange={(next) => updateContent({ gap: next || "12px" })}
						/>
					) : null}
					<DimensionPresetField
						label="Inner padding"
						presets={SPACING_PRESETS}
						value={content.itemPadding}
						onChange={(next) => updateContent({ itemPadding: next || "20px 24px" })}
						customPlaceholder="e.g. 20px 24px"
					/>
					{content.look === "cards" ? (
						<DimensionPresetField
							label="Corners"
							presets={BORDER_RADIUS_PRESETS}
							value={content.itemRadius}
							onChange={(next) => updateContent({ itemRadius: next || "14px" })}
						/>
					) : null}
					<DimensionPresetField
						label="Title size"
						presets={FONT_SIZE_PRESETS}
						value={content.titleSize}
						onChange={(next) => updateContent({ titleSize: next || "16px" })}
					/>
					<DimensionPresetField
						label="Title weight"
						presets={FONT_WEIGHT_PRESETS}
						kind="text"
						value={content.titleWeight}
						onChange={(next) => updateContent({ titleWeight: next || "500" })}
					/>
					<div className="space-y-2">
						<SettingsLabel>Colors</SettingsLabel>
						<ColorField
							ariaLabel="Accordion colors"
							targets={colorTargets}
							onChange={(entry: TokenEntry) => setColor(entry.property, entry.style)}
							onTheme={(target) => setColor(target.property, undefined)}
						/>
					</div>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Icon" icon={Smile} defaultOpen={false}>
				<div className="space-y-4">
					<SettingsChipGroup
						label="Icon"
						options={ICON_OPTIONS}
						value={content.icon.preset}
						onChange={(value) => updateIcon({ preset: value as AccordionContent["icon"]["preset"] })}
					/>
					{content.icon.preset === "custom" ? (
						<div className="space-y-3">
							{(["closed", "open"] as const).map((slot) => {
								const current = toPickerIcon(content.icon[slot]);
								return (
									<div key={slot} className="flex min-w-0 items-center gap-3">
										<div className="npb-settings-well flex h-9 w-9 shrink-0 items-center justify-center border">
											{current ? <IconRenderer icon={current} size={18} /> : null}
										</div>
										<div className="min-w-0 flex-1">
											<SettingsLabel>{slot === "closed" ? "When closed" : "When open (optional)"}</SettingsLabel>
										</div>
										{slot === "open" && current ? (
											<Button type="button" variant="ghost" size="sm" onClick={() => updateIcon({ open: null })}>
												Clear
											</Button>
										) : null}
										<IconPickerButton
											className="shrink-0"
											currentIcon={current}
											onSelect={(icon) => updateIcon({ [slot]: toAccordionIcon(icon) })}
										/>
									</div>
								);
							})}
							<p className="npb-settings-hint-muted text-xs">
								{content.icon.closed
									? content.icon.open
										? "The icon swaps when an item opens."
										: "Without an open icon, the closed icon turns when an item opens."
									: "Pick the closed icon. Until then the plus / minus icons show."}
							</p>
						</div>
					) : null}
					<SettingsChipGroup
						label="Position"
						options={ICON_POSITION_OPTIONS}
						value={content.icon.position}
						onChange={(value) => updateIcon({ position: value === "end" ? "end" : "start" })}
					/>
					<DimensionPresetField
						label="Icon size"
						presets={ICON_SIZE_PRESETS}
						value={content.icon.size}
						onChange={(next) => updateIcon({ size: next || "18px" })}
					/>
				</div>
			</CollapsibleCard>
		</div>
	);
}
