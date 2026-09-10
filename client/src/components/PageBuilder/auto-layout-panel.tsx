import type { BlockConfig } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Columns2, Layout, Rows2 } from "lucide-react";
import { SettingsChipGroup } from "./settings-chip-group";
import { AutoLayoutAlignMatrix } from "./auto-layout-align-matrix";
import { LayoutSettingsSection } from "./layout-settings-section";
import { DimensionPresetField } from "./dimension-preset-field";
import {
	HEIGHT_PRESETS,
	WIDTH_PRESETS,
	SPACING_PRESETS,
} from "@shared/dimension-presets";
import { readContainerLayoutFromBlock } from "@shared/block-container-placement";
import {
	AUTO_LAYOUT_GAP_PRESETS,
	GRID_TRACK_STARTERS,
	alignPointToFlexStyles,
	distributionToJustify,
	flexStylesToAlignPoint,
	readDistribution,
	readResizeFromHeight,
	readResizeFromLength,
	resizeToHeight,
	resizeToWidth,
	type AutoLayoutAlignPoint,
	type AutoLayoutDistribution,
	type AutoLayoutResize,
} from "@shared/auto-layout-model";

export type AutoLayoutPanelProps = {
	block: BlockConfig;
	onStylesChange: (styles: Record<string, unknown>) => void;
	/** Columns keep track count in Content — hide display mode chips. */
	hideDisplay?: boolean;
};

const DISPLAY_OPTIONS = [
	{ value: "flex", label: "Flex" },
	{ value: "grid", label: "Grid" },
	{ value: "block", label: "Block" },
];

const DIRECTION_OPTIONS = [
	{ value: "row", label: "Row", accessibleName: "Horizontal", icon: Rows2 },
	{ value: "column", label: "Col", accessibleName: "Vertical", icon: Columns2 },
];

const WRAP_OPTIONS = [
	{ value: "nowrap", label: "No wrap" },
	{ value: "wrap", label: "Wrap" },
];

const DISTRIBUTION_OPTIONS: { value: AutoLayoutDistribution; label: string }[] = [
	{ value: "packed", label: "Packed" },
	{ value: "space-between", label: "Between" },
	{ value: "space-around", label: "Around" },
	{ value: "space-evenly", label: "Evenly" },
];

const RESIZE_OPTIONS: { value: AutoLayoutResize; label: string }[] = [
	{ value: "hug", label: "Hug" },
	{ value: "fill", label: "Fill" },
	{ value: "fixed", label: "Fixed" },
];

const OVERFLOW_OPTIONS = [
	{ value: "visible", label: "Visible" },
	{ value: "hidden", label: "Hidden" },
	{ value: "auto", label: "Auto" },
	{ value: "scroll", label: "Scroll" },
];

const AXIS_OPTIONS = [
	{ value: "forward", label: "Forward", accessibleName: "Forward main axis" },
	{ value: "reverse", label: "Reverse", accessibleName: "Reverse main axis" },
];

/**
 * Shared Auto Layout controls for Group, Container, and Columns.
 * Writes the same `styles` keys the old CSS chips used.
 */
export function AutoLayoutPanel({
	block,
	onStylesChange,
	hideDisplay = false,
}: AutoLayoutPanelProps) {
	const layout = readContainerLayoutFromBlock({
		styles: block.styles,
		content: block.content as Record<string, unknown>,
	});
	const display = layout.display === "inline-flex" ? "flex" : layout.display;
	const isFlex = display === "flex";
	const isGrid = display === "grid";
	const stackIsRow = isFlex && (layout.flexDirection === "row" || layout.flexDirection === "row-reverse");
	const directionValue =
		layout.flexDirection === "row-reverse" || layout.flexDirection === "row" ? "row" : "column";
	const wrapValue = layout.flexWrap === "wrap" || layout.flexWrap === "wrap-reverse" ? "wrap" : "nowrap";
	const distribution = readDistribution(layout.justifyContent);
	const alignPoint = flexStylesToAlignPoint(
		distribution === "packed" ? layout.justifyContent : "flex-start",
		layout.alignItems,
		stackIsRow,
	);
	const isReversed =
		layout.flexDirection === "row-reverse" || layout.flexDirection === "column-reverse";
	const widthResize = readResizeFromLength(block.styles?.width);
	const heightResize = readResizeFromHeight(block.styles?.height);
	const gapValue = layout.gap ?? "";
	const gapChip = AUTO_LAYOUT_GAP_PRESETS.some((preset) => preset.value === gapValue)
		? gapValue
		: gapValue
			? "__custom__"
			: "";

	const patch = (next: Record<string, unknown>) => onStylesChange(next);

	const applyAlign = (point: AutoLayoutAlignPoint) => {
		const flex = alignPointToFlexStyles(point, stackIsRow);
		patch({
			alignItems: flex.alignItems,
			justifyContent: distributionToJustify(distribution, flex.justifyContent),
		});
	};

	const applyDistribution = (next: AutoLayoutDistribution) => {
		const packed = alignPointToFlexStyles(alignPoint, stackIsRow).justifyContent;
		patch({ justifyContent: distributionToJustify(next, packed) });
	};

	const gapOptions = [
		{ value: "", label: "None" },
		...SPACING_PRESETS.map((preset) => ({
			value: preset.value,
			label: preset.label,
		})),
		{ value: "__custom__", label: "Custom" },
	];

	const gapControl = (
		<div>
			<SettingsChipGroup
				label="Gap"
				ariaLabel="Gap"
				layout="scroll"
				options={gapOptions}
				value={gapChip}
				onChange={(value) => {
					if (value === "__custom__") {
						patch({
							gap: gapValue && gapChip === "__custom__" ? gapValue : "1.25rem",
						});
						return;
					}
					if (value === "") {
						patch({ gap: null });
						return;
					}
					patch({ gap: value });
				}}
			/>
			{gapChip === "__custom__" ? (
				<Input
					value={gapValue}
					onChange={(e) => patch({ gap: e.target.value || undefined })}
					placeholder="e.g. 16px, 1rem"
					className="mt-2 h-8 rounded-none text-sm focus-visible:outline-none"
				/>
			) : null}
		</div>
	);

	return (
		<div role="region" aria-label="Auto layout">
			<CollapsibleCard title="Layout" icon={Layout} defaultOpen={true}>
				<div className="space-y-4">
					{!hideDisplay ? (
						<SettingsChipGroup
							label="Display"
							ariaLabel="Display"
							options={DISPLAY_OPTIONS}
							value={display === "inline" || display === "inline-block" ? "block" : display}
							onChange={(value) =>
								patch({
									display: value,
									...(value === "flex"
										? { flexDirection: layout.flexDirection || "column" }
										: {}),
								})
							}
						/>
					) : null}

					{(isFlex || hideDisplay) && (
						<LayoutSettingsSection title="Stack">
							<SettingsChipGroup
								label="Direction"
								ariaLabel="Direction"
								options={DIRECTION_OPTIONS}
								value={directionValue}
								onChange={(value) => {
									const reversed =
										layout.flexDirection === "row-reverse" ||
										layout.flexDirection === "column-reverse";
									patch({
										display: "flex",
										flexDirection:
											value === "row"
												? reversed
													? "row-reverse"
													: "row"
												: reversed
													? "column-reverse"
													: "column",
									});
								}}
							/>
							<SettingsChipGroup
								label="Wrap"
								ariaLabel="Wrap"
								options={WRAP_OPTIONS}
								value={wrapValue}
								onChange={(value) =>
									patch({
										display: "flex",
										flexWrap: value,
									})
								}
							/>
							<div>
								<Label className="npb-settings-label mb-2 block text-sm font-semibold">
									Align
								</Label>
								<AutoLayoutAlignMatrix
									value={alignPoint}
									stackIsRow={stackIsRow}
									onChange={applyAlign}
								/>
							</div>
							<SettingsChipGroup
								label="Distribution"
								ariaLabel="Distribution"
								options={DISTRIBUTION_OPTIONS}
								value={distribution}
								onChange={(value) => applyDistribution(value as AutoLayoutDistribution)}
							/>
							{gapControl}
						</LayoutSettingsSection>
					)}

					{isGrid && (
						<LayoutSettingsSection title="Grid">
							<SettingsChipGroup
								label="Tracks"
								ariaLabel="Grid tracks"
								options={GRID_TRACK_STARTERS.map((item) => ({
									value: item.value,
									label: item.label,
								}))}
								value={layout.gridTemplateColumns || ""}
								onChange={(value) =>
									patch({ display: "grid", gridTemplateColumns: value })
								}
							/>
							<div>
								<Label className="npb-settings-label text-sm font-semibold">
									Custom tracks
								</Label>
								<Input
									value={layout.gridTemplateColumns ?? ""}
									onChange={(e) =>
										patch({
											display: "grid",
											gridTemplateColumns: e.target.value || undefined,
										})
									}
									placeholder="e.g. repeat(2, 1fr)"
									className="mt-2 h-8 rounded-none text-sm focus-visible:outline-none"
								/>
							</div>
							{gapControl}
						</LayoutSettingsSection>
					)}

					<CollapsibleCard title="Size & advanced" defaultOpen={false}>
						<SettingsChipGroup
							label="Width"
							ariaLabel="Width"
							options={RESIZE_OPTIONS}
							value={widthResize}
							onChange={(value) =>
								patch({ width: resizeToWidth(value as AutoLayoutResize, block.styles?.width) })
							}
						/>
						{widthResize === "fixed" ? (
							<DimensionPresetField
								label="Fixed width"
								value={
									block.styles?.width != null && block.styles.width !== ""
										? String(block.styles.width)
										: undefined
								}
								presets={WIDTH_PRESETS}
								onChange={(next) => patch({ width: next ?? "320px" })}
								customPlaceholder="e.g. 320px, 50%"
							/>
						) : null}

						<SettingsChipGroup
							label="Height"
							ariaLabel="Height"
							options={RESIZE_OPTIONS}
							value={heightResize}
							onChange={(value) =>
								patch({
									height: resizeToHeight(value as AutoLayoutResize, block.styles?.height),
								})
							}
						/>
						{heightResize === "fixed" ? (
							<DimensionPresetField
								label="Fixed height"
								value={
									block.styles?.height != null && block.styles.height !== ""
										? String(block.styles.height)
										: undefined
								}
								presets={HEIGHT_PRESETS}
								onChange={(next) => patch({ height: next ?? "240px" })}
								customPlaceholder="e.g. 400px, 50dvh"
							/>
						) : null}

						<SettingsChipGroup
							label="Overflow"
							ariaLabel="Overflow"
							options={OVERFLOW_OPTIONS}
							value={(block.styles?.overflow as string) || "visible"}
							onChange={(value) => patch({ overflow: value })}
						/>

						{isFlex ? (
							<SettingsChipGroup
								label="Main axis"
								ariaLabel="Reverse main axis"
								options={AXIS_OPTIONS}
								value={isReversed ? "reverse" : "forward"}
								onChange={(value) => {
									const reversed = value === "reverse";
									const isRow = directionValue === "row";
									patch({
										display: "flex",
										flexDirection: isRow
											? reversed
												? "row-reverse"
												: "row"
											: reversed
												? "column-reverse"
												: "column",
									});
								}}
							/>
						) : null}
					</CollapsibleCard>
				</div>
			</CollapsibleCard>
		</div>
	);
}
