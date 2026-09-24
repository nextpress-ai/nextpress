import { useState } from "react";
import { SettingsChipGroup } from "./settings-chip-group";
import { SettingsLabel } from "./shared";
import { SPACING_PRESETS } from "@shared/dimension-presets";
import { DimensionPresetField } from "./dimension-preset-field";
import { FreeformSpacingSideRow } from "./freeform-spacing-side-row";
import {
	spacingSideKeys,
	spacingSidesMatch,
	type SpacingKind,
	type SpacingSideKey,
	type SpacingSideQuad,
} from "./spacing-styles";

type SpacingSidesFieldProps = {
	label: string;
	kind: SpacingKind;
	sides: SpacingSideQuad;
	onHoverArea?: (area: SpacingKind | null) => void;
	/** Writes one value (or `null` to clear) to every listed side in a single update. */
	onCommit: (cssKeys: readonly SpacingSideKey[], value: string | null) => void;
};

const SIDE_ROWS = [
	["Top", "top"],
	["Right", "right"],
	["Bottom", "bottom"],
	["Left", "left"],
] as const;

type SidesMode = "all" | "axes" | "each";

const MODE_OPTIONS = [
	{ value: "all", label: "All sides" },
	{ value: "axes", label: "Horiz. & vert." },
	{ value: "each", label: "Each side" },
];

/** Starts in the simplest mode that can show every side exactly, so mixed values are never hidden. */
const startingMode = (sides: SpacingSideQuad): SidesMode => {
	if (spacingSidesMatch(sides)) return "all";
	return sides.top === sides.bottom && sides.left === sides.right ? "axes" : "each";
};

/**
 * Padding or margin: presets + one Custom box for all sides, a left-and-right / top-and-bottom
 * pair, or a box per side. Every mode writes the same four physical side keys.
 */
export function SpacingSidesField({
	label,
	kind,
	sides,
	onHoverArea,
	onCommit,
}: SpacingSidesFieldProps) {
	const [mode, setMode] = useState<SidesMode>(() => startingMode(sides));
	const allKeys = spacingSideKeys(kind);
	const keyOf = (suffix: string) => `${kind}${suffix}` as SpacingSideKey;
	const sameOrUndefined = (a: string, b: string) => (a && a === b ? a : undefined);

	return (
		<div
			className="space-y-3"
			onMouseEnter={() => onHoverArea?.(kind)}
			onMouseLeave={() => onHoverArea?.(null)}
		>
			<SettingsChipGroup
				label=""
				ariaLabel={`${label} sides`}
				options={MODE_OPTIONS}
				value={mode}
				onChange={(next) => setMode(next as SidesMode)}
			/>
			{mode === "all" ? (
				<DimensionPresetField
					label={label}
					presets={SPACING_PRESETS}
					value={spacingSidesMatch(sides) && sides.top ? sides.top : undefined}
					onChange={(next) => onCommit(allKeys, next ?? null)}
					customPlaceholder="e.g. 24px, 2rem, auto"
				/>
			) : mode === "axes" ? (
				<div className="space-y-3">
					<DimensionPresetField
						label={`${label} left and right`}
						presets={SPACING_PRESETS}
						value={sameOrUndefined(sides.left, sides.right)}
						onChange={(next) => onCommit([keyOf("Left"), keyOf("Right")], next ?? null)}
						customPlaceholder="e.g. 24px, 2rem, auto"
					/>
					<DimensionPresetField
						label={`${label} top and bottom`}
						presets={SPACING_PRESETS}
						value={sameOrUndefined(sides.top, sides.bottom)}
						onChange={(next) => onCommit([keyOf("Top"), keyOf("Bottom")], next ?? null)}
						customPlaceholder="e.g. 24px, 2rem, auto"
					/>
				</div>
			) : (
				<div className="space-y-3">
					<SettingsLabel>{label}</SettingsLabel>
					<div className="grid grid-cols-2 gap-3">
						{SIDE_ROWS.map(([suffix, side]) => {
							const key = keyOf(suffix);
							return (
								<FreeformSpacingSideRow
									key={key}
									label={suffix}
									value={sides[side]}
									hoverArea={kind}
									onHoverArea={onHoverArea}
									onCommit={(full) => onCommit([key], full)}
								/>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
