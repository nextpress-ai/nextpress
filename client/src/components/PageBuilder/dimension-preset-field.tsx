import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SettingsChipGroup } from "./settings-chip-group";
import type { DimensionPreset } from "@shared/dimension-presets";
import { isPresetValue } from "@shared/dimension-presets";

type DimensionPresetFieldProps = {
	label: string;
	value: string | undefined;
	presets: readonly DimensionPreset[];
	onChange: (value: string | undefined) => void;
	customPlaceholder?: string;
	/** Sentinel values mapped to CSS unset (e.g. __auto__, __none__). */
	unsetValues?: readonly string[];
};

/**
 * Preset chips first, custom CSS length as escape hatch — matches container/page sizing UX.
 */
export function DimensionPresetField({
	label,
	value,
	presets,
	onChange,
	customPlaceholder = "Custom value (e.g. 24rem, 80dvh)",
	unsetValues = ["__auto__", "__none__"],
}: DimensionPresetFieldProps) {
	const normalized = value?.trim() || "";
	const matchedPreset = presets.find((preset) => preset.value === normalized);
	const chipValue = matchedPreset?.value ?? (normalized ? "__custom__" : presets[0]?.value ?? "__custom__");

	return (
		<div className="space-y-2">
			<Label className="text-sm font-semibold npb-settings-label">{label}</Label>
			<SettingsChipGroup
				label=""
				options={[
					...presets.map((preset) => ({ value: preset.value, label: preset.label })),
					{ value: "__custom__", label: "Custom" },
				]}
				value={chipValue}
				onChange={(next) => {
					if (next === "__custom__") {
						if (!normalized || isPresetValue(normalized, presets)) {
							onChange("1rem");
						}
						return;
					}
					if (unsetValues.includes(next)) {
						onChange(undefined);
						return;
					}
					onChange(next);
				}}
			/>
			{chipValue === "__custom__" && (
				<Input
					value={normalized}
					onChange={(e) => onChange(e.target.value || undefined)}
					placeholder={customPlaceholder}
					className="h-8 rounded-none text-sm focus-visible:outline-none"
				/>
			)}
		</div>
	);
}
