import { Button } from "@/components/ui/button";
import { SettingsChipGroup } from "./settings-chip-group";
import { UnitValueField } from "./unit-value-field";
import { findPreset, type CustomValueKind, type DimensionPreset } from "@shared/dimension-presets";
import { SCREEN_SIZE_UNITS, SIZE_UNITS } from "@shared/unit-value";

/** Saved words that mean "nothing chosen" for fields that have an Auto / None preset. */
const UNSET_WORDS = ["auto", "none"];
const SCREEN_UNIT_VALUE = /(?:vh|vw|dvh|dvw|svh)$/i;

type DimensionPresetFieldProps = {
	label: string;
	value: string | undefined;
	presets: readonly DimensionPreset[];
	/** `undefined` means "clear it" — callers that write through a deep merge should send `null`. */
	onChange: (value: string | undefined) => void;
	/**
	 * `length`: number + unit dropdown. `number` and `text`: a plain box with no dropdown
	 * (line height, weight, aspect ratio, multi-part values like `2rem 1rem`).
	 */
	kind?: CustomValueKind;
	/** Units in the dropdown. Defaults to px / rem / em / %, plus screen units when a preset uses them. */
	units?: readonly string[];
	customPlaceholder?: string;
	/** Sentinel values mapped to CSS unset (e.g. __auto__, __none__). */
	unsetValues?: readonly string[];
	/** The value Reset returns to. Reset is hidden while the field already holds it. */
	defaultValue?: string;
	className?: string;
};

/**
 * Preset chips first, then the shared `[ Custom | value | unit ▾ ]` group (design system §19).
 * The group always shows the current value, so a preset reads as its number and a custom value is
 * never hidden. The Custom segment lights up only when the value is not one of the presets.
 */
export function DimensionPresetField({
	label,
	value,
	presets,
	onChange,
	kind = "length",
	units,
	customPlaceholder,
	unsetValues = ["__auto__", "__none__"],
	defaultValue,
	className,
}: DimensionPresetFieldProps) {
	const normalized = value?.trim() ?? "";
	const matchedPreset = findPreset(normalized, presets);
	const unsetPreset = presets.find((preset) => unsetValues.includes(preset.value));
	const isUnset =
		normalized === "" || (unsetPreset !== undefined && UNSET_WORDS.includes(normalized.toLowerCase()));
	const isCustom = !isUnset && !matchedPreset;

	const chipValue = matchedPreset?.value ?? (isUnset ? (unsetPreset?.value ?? "") : "");
	const canReset = !unsetPreset && normalized !== "" && normalized !== (defaultValue ?? "");

	const fieldUnits =
		kind === "length"
			? (units ?? (presets.some((preset) => SCREEN_UNIT_VALUE.test(preset.value)) ? SCREEN_SIZE_UNITS : SIZE_UNITS))
			: [];

	return (
		<div className={className}>
			<SettingsChipGroup
				label={label}
				options={presets.map((preset) => ({ value: preset.value, label: preset.label }))}
				value={chipValue}
				onChange={(next) => onChange(unsetValues.includes(next) ? undefined : next)}
				labelAction={
					canReset ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="-my-0.5 h-6 px-2 text-xs"
							aria-label={`Reset ${label}`}
							onClick={() => onChange(defaultValue)}
						>
							Reset
						</Button>
					) : undefined
				}
			/>
			<UnitValueField
				className="mt-2"
				ariaLabel={label}
				value={isUnset ? undefined : normalized}
				onChange={onChange}
				units={fieldUnits}
				placeholder={customPlaceholder}
				active={isCustom}
			/>
		</div>
	);
}
