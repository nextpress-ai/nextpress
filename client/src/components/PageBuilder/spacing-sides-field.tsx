import { useState } from "react";
import { Button } from "@/components/ui/button";
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

/**
 * Padding or margin: presets + one Custom box for all sides, and separate per-side boxes on
 * request. Starts linked only when all four sides already agree, so mixed values are never hidden.
 */
export function SpacingSidesField({
	label,
	kind,
	sides,
	onHoverArea,
	onCommit,
}: SpacingSidesFieldProps) {
	const allMatch = spacingSidesMatch(sides);
	const [linked, setLinked] = useState(allMatch);
	const allKeys = spacingSideKeys(kind);

	return (
		<div
			className="space-y-3"
			onMouseEnter={() => onHoverArea?.(kind)}
			onMouseLeave={() => onHoverArea?.(null)}
		>
			{linked ? (
				<DimensionPresetField
					label={label}
					presets={SPACING_PRESETS}
					value={allMatch && sides.top ? sides.top : undefined}
					onChange={(next) => onCommit(allKeys, next ?? null)}
					customPlaceholder="e.g. 24px, 2rem, auto"
				/>
			) : (
				<div className="space-y-3">
					<SettingsLabel>{label}</SettingsLabel>
					<div className="grid grid-cols-2 gap-3">
						{SIDE_ROWS.map(([suffix, side]) => {
							const key = `${kind}${suffix}` as SpacingSideKey;
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
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 px-2 text-xs"
				onClick={() => setLinked((current) => !current)}
			>
				{linked ? "Edit sides separately" : "Link all sides"}
			</Button>
		</div>
	);
}
