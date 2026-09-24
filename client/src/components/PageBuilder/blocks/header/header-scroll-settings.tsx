import type { JSX } from "react";
import type { TokenEntry } from "@shared/schema-types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	HEADER_BLUR_MAX_PX,
	HEADER_OPACITY_MIN,
	HEADER_SHADOW_OPTIONS,
	type HeaderScrollLook,
	type HeaderScrollShadow,
} from "@shared/header-scroll-model";
import ColorField from "../../ColorField";
import { SettingsChipGroup } from "../../settings-chip-group";
import { SettingsLabel } from "../../shared";

type HeaderScrollSettingsProps = {
	value: HeaderScrollLook | undefined;
	/** `undefined` puts the header's normal look back. */
	onChange: (next: HeaderScrollLook | undefined) => void;
};

const SHADOW_CHIPS = HEADER_SHADOW_OPTIONS.map((option) => ({ ...option }));

/** A labelled slider with its number beside it. */
function SliderRow({
	id,
	label,
	value,
	min,
	max,
	unit,
	onChange,
}: {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	unit: string;
	onChange: (next: number) => void;
}): JSX.Element {
	return (
		<div className="space-y-1.5">
			<SettingsLabel htmlFor={id}>{label}</SettingsLabel>
			<div className="flex items-center gap-3">
				<Slider
					id={id}
					aria-label={label}
					min={min}
					max={max}
					step={1}
					value={[value]}
					onValueChange={([next]) => onChange(next ?? value)}
					className="flex-1"
				/>
				<span className="w-12 shrink-0 text-right text-xs tabular-nums text-npb-text-muted">
					{value}
					{unit}
				</span>
			</div>
		</div>
	);
}

/**
 * How the floating header looks after the page has scrolled under it: its colour, how see-through
 * it is, blur behind it, a shadow or a line, and its text colour. Anything left alone keeps the
 * header's normal look.
 */
export function HeaderScrollSettings({ value, onChange }: HeaderScrollSettingsProps): JSX.Element {
	const update = (patch: Partial<HeaderScrollLook>): void => onChange({ ...value, ...patch });

	return (
		<div className="space-y-4">
			<ColorField
				ariaLabel="Header color when scrolled"
				defaultProperty="backgroundColor"
				targets={[
					{
						property: "backgroundColor",
						label: "Background",
						entry: value?.background,
						styleValue: value?.background?.style,
					},
					{
						property: "color",
						label: "Text",
						entry: value?.textColor,
						styleValue: value?.textColor?.style,
					},
				]}
				onChange={(entry: TokenEntry) => update(entry.property === "color" ? { textColor: entry } : { background: entry })}
				onTheme={(target) => update(target.property === "color" ? { textColor: undefined } : { background: undefined })}
			/>

			<SliderRow
				id="header-scroll-opacity"
				label="Background opacity"
				value={value?.opacity ?? 100}
				min={HEADER_OPACITY_MIN}
				max={100}
				unit="%"
				onChange={(opacity) => update({ opacity })}
			/>
			<SliderRow
				id="header-scroll-blur"
				label="Blur behind the header"
				value={value?.blur ?? 0}
				min={0}
				max={HEADER_BLUR_MAX_PX}
				unit="px"
				onChange={(blur) => update({ blur })}
			/>

			<SettingsChipGroup
				label="Shadow"
				options={SHADOW_CHIPS}
				value={value?.shadow ?? "none"}
				onChange={(shadow) => update({ shadow: shadow as HeaderScrollShadow })}
			/>

			<div className="flex items-center justify-between gap-3">
				<SettingsLabel htmlFor="header-scroll-line">Line along the bottom edge</SettingsLabel>
				<Switch
					id="header-scroll-line"
					checked={value?.line === true}
					onCheckedChange={(line) => update({ line })}
				/>
			</div>

			{value ? (
				<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(undefined)}>
					Reset scrolled look
				</Button>
			) : null}
		</div>
	);
}
