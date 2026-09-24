import { useState, type JSX } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
	FILL_POSITIONS,
	IMAGE_FILL_SIZES,
	safeImageUrl,
	type FillPosition,
	type ImageFill,
	type ImageFillSize,
} from "@shared/fill-model";
import { imageFillFromUrl } from "@shared/gradient-presets";
import { MediaUrlField } from "../blocks/shared/media-url-field";
import { SettingsChipGroup } from "../settings-chip-group";
import { SettingsLabel } from "../shared";

type ImageFillEditorProps = {
	/** Missing until a picture is chosen. */
	value: ImageFill | undefined;
	onChange: (fill: ImageFill) => void;
	ariaLabel: string;
};

const SIZE_LABELS: Record<ImageFillSize, string> = { cover: "Cover", contain: "Fit", auto: "Original" };
const SIZE_OPTIONS = IMAGE_FILL_SIZES.map((size) => ({ value: size, label: SIZE_LABELS[size] }));
const TINT_OPTIONS = [
	{ value: "none", label: "None" },
	{ value: "dark", label: "Darken" },
	{ value: "light", label: "Lighten" },
];
const TILING_OPTIONS = [
	{ value: "off", label: "Off" },
	{ value: "on", label: "Tile" },
];

const positionLabel = (position: FillPosition): string => position.charAt(0).toUpperCase() + position.slice(1);

/**
 * A picture fill: pick the picture, then how it sits (size, position, tiling) and an optional
 * darker or lighter wash so text on top stays readable.
 */
export function ImageFillEditor({ value, onChange, ariaLabel }: ImageFillEditorProps): JSX.Element {
	const [draft, setDraft] = useState<string | null>(null);
	const shown = draft ?? value?.url ?? "";
	const invalid = draft !== null && draft.trim() !== "" && safeImageUrl(draft) === undefined;

	const setUrl = (url: string): void => {
		const safe = safeImageUrl(url);
		if (!safe) {
			setDraft(url);
			return;
		}
		setDraft(null);
		onChange(value ? { ...value, url: safe } : imageFillFromUrl(safe));
	};

	return (
		<div className="space-y-3" role="group" aria-label={ariaLabel}>
			<div>
				<MediaUrlField
					id="fill-image-url"
					label="Picture"
					value={shown}
					kind="image"
					libraryButtonLabel="Choose picture"
					placeholder="https://example.com/photo.jpg"
					onChange={({ url }) => setUrl(url)}
					onLibrarySelect={({ item }) => setUrl(item.url)}
				/>
				{invalid ? (
					<p role="alert" className="mt-1 text-xs text-destructive">
						Use a picture from your library, or an address that starts with https://
					</p>
				) : null}
			</div>

			{value ? (
				<>
					<SettingsChipGroup
						label="Size"
						options={SIZE_OPTIONS}
						value={value.size}
						onChange={(size) => onChange({ ...value, size: size as ImageFillSize })}
					/>

					<div className="space-y-1.5">
						<SettingsLabel>Position</SettingsLabel>
						<div className="grid w-28 grid-cols-3 gap-1" role="group" aria-label="Picture position">
							{FILL_POSITIONS.map((position) => (
								<button
									key={position}
									type="button"
									title={positionLabel(position)}
									aria-label={positionLabel(position)}
									aria-pressed={value.position === position}
									onClick={() => onChange({ ...value, position })}
									className={cn(
										"h-7 border border-npb-border-default transition-colors",
										value.position === position
											? "border-npb-focus bg-npb-interactive-bg-active"
											: "bg-npb-interactive-bg hover:bg-npb-interactive-bg-hover",
									)}
								/>
							))}
						</div>
					</div>

					{value.size !== "cover" ? (
						<SettingsChipGroup
							label="Tiling"
							options={TILING_OPTIONS}
							value={value.repeat ? "on" : "off"}
							onChange={(next) => onChange({ ...value, repeat: next === "on" })}
						/>
					) : null}

					<SettingsChipGroup
						label="Tint"
						options={TINT_OPTIONS}
						value={value.tint?.tone ?? "none"}
						onChange={(tone) =>
							onChange({
								...value,
								tint: tone === "none" ? undefined : { tone: tone as "dark" | "light", strength: value.tint?.strength ?? 40 },
							})
						}
					/>
					{value.tint ? (
						<div className="flex items-center gap-3">
							<SettingsLabel htmlFor="fill-tint-strength">Tint strength</SettingsLabel>
							<Slider
								id="fill-tint-strength"
								aria-label="Tint strength"
								min={10}
								max={80}
								step={5}
								value={[value.tint.strength]}
								onValueChange={([strength]) =>
									value.tint && onChange({ ...value, tint: { ...value.tint, strength: strength ?? value.tint.strength } })
								}
								className="flex-1"
							/>
							<span className="w-10 shrink-0 text-right text-xs tabular-nums text-npb-text-muted">{value.tint.strength}%</span>
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}
