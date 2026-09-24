import type { TokenEntry } from "@shared/schema-types";
import { THEME_ACCENT_COLOR } from "@shared/css-safe";
import {
	SCROLLBAR_DEFAULTS,
	SCROLLBAR_LOOK_OPTIONS,
	SCROLLBAR_WIDTH_PRESETS,
	type ScrollbarLook,
	type ScrollbarSettings,
} from "@shared/scrollbar-model";
import ColorField, { type ColorTarget } from "../../ColorField";
import { DimensionPresetField } from "../../dimension-preset-field";
import { SettingsChipGroup } from "../../settings-chip-group";

type ScrollbarPart = "thumb" | "track" | "hover";

const PART_FIELD = {
	thumb: "thumbColor",
	track: "trackColor",
	hover: "hoverColor",
} as const;

const CORNER_OPTIONS = [
	{ value: "round", label: "Round" },
	{ value: "square", label: "Square" },
];

type PageShellScrollbarFieldProps = {
	value: ScrollbarSettings | undefined;
	onChange: (next: ScrollbarSettings) => void;
};

const readPart = (modifier: string | undefined): ScrollbarPart =>
	modifier === "track" || modifier === "hover" ? modifier : "thumb";

/**
 * The page's scrollbar: Standard (a little smaller than a normal bar, square corners), Custom (size,
 * corners, colours) or Hidden. Colours ride on one Thumb / Track / Hover toggle so the panel stays short.
 */
export function PageShellScrollbarField({ value, onChange }: PageShellScrollbarFieldProps) {
	const look: ScrollbarLook = value?.look ?? "default";
	const update = (patch: Partial<ScrollbarSettings>): void =>
		onChange({ look: "custom", ...value, ...patch });

	const target = (part: ScrollbarPart, label: string): ColorTarget => {
		const entry = value?.[PART_FIELD[part]];
		return {
			property: "backgroundColor",
			modifier: part,
			label,
			entry,
			styleValue: entry?.style,
			followsTheme: part === "track" ? entry === undefined : entry?.style === THEME_ACCENT_COLOR,
		};
	};

	return (
		<div className="space-y-3">
			<SettingsChipGroup
				label="Look"
				options={SCROLLBAR_LOOK_OPTIONS.map((option) => ({ ...option }))}
				value={look}
				onChange={(next) =>
					onChange(
						next === "default"
							? { look: "default" }
							: { ...value, look: next as ScrollbarLook },
					)
				}
			/>
			{look === "custom" ? (
				<>
					<DimensionPresetField
						label="Scrollbar width"
						presets={SCROLLBAR_WIDTH_PRESETS}
						value={value?.width ?? SCROLLBAR_DEFAULTS.width}
						defaultValue={SCROLLBAR_DEFAULTS.width}
						units={["px"]}
						customPlaceholder="e.g. 12px"
						onChange={(next) => update({ width: next })}
					/>
					<SettingsChipGroup
						label="Scrollbar corners"
						options={CORNER_OPTIONS}
						value={value?.rounded === false ? "square" : "round"}
						onChange={(next) => update({ rounded: next === "round" })}
					/>
					<ColorField
						ariaLabel="Scrollbar color"
						defaultProperty="backgroundColor"
						targets={[target("thumb", "Thumb"), target("track", "Track"), target("hover", "Hover")]}
						onChange={(entry: TokenEntry) => update({ [PART_FIELD[readPart(entry.modifier)]]: entry })}
						onTheme={(active) =>
							update({
								[PART_FIELD[readPart(active.modifier)]]:
									readPart(active.modifier) === "track"
										? undefined
										: {
												property: "backgroundColor",
												value: "",
												variant: null,
												alias: "bg",
												modifier: active.modifier,
												style: THEME_ACCENT_COLOR,
											},
							})
						}
					/>
				</>
			) : null}
		</div>
	);
}
