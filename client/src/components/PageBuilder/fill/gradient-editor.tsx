import { useState, type JSX } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { normalizeHexColor } from "@/lib/resolve-tailwind-color-token";
import { isSafeCssColor } from "@shared/css-safe";
import {
	GRADIENT_SHAPES,
	MAX_GRADIENT_STOPS,
	MIN_GRADIENT_STOPS,
	fillToImageValue,
	type GradientFill,
	type GradientShape,
	type GradientStop,
} from "@shared/fill-model";
import { GRADIENT_PRESETS } from "@shared/gradient-presets";
import { SettingsChipGroup } from "../settings-chip-group";
import { SettingsLabel } from "../shared";

type GradientEditorProps = {
	value: GradientFill;
	onChange: (fill: GradientFill) => void;
	ariaLabel: string;
};

const SHAPE_LABELS: Record<GradientShape, string> = { linear: "Linear", radial: "Radial", conic: "Conic" };
const SHAPE_OPTIONS = GRADIENT_SHAPES.map((shape) => ({ value: shape, label: SHAPE_LABELS[shape] }));
const DIRECTION_CHIPS = [
	{ value: "0", label: "Up" },
	{ value: "90", label: "Right" },
	{ value: "180", label: "Down" },
	{ value: "270", label: "Left" },
];

/** `#rrggbb` for the browser's colour picker, which cannot show anything else. */
const toPickerHex = (color: string): string => {
	const hex = normalizeHexColor(color);
	return hex && hex.length === 7 ? hex : "#000000";
};

const sameFill = (a: GradientFill, b: GradientFill): boolean => JSON.stringify(a) === JSON.stringify(b);

function StopRow({
	stop,
	index,
	canRemove,
	onChange,
	onRemove,
}: {
	stop: GradientStop;
	index: number;
	canRemove: boolean;
	onChange: (next: GradientStop) => void;
	onRemove: () => void;
}): JSX.Element {
	const [draft, setDraft] = useState<string | null>(null);
	const number = index + 1;
	const invalid = draft !== null && draft.trim() !== "" && !isSafeCssColor(draft);

	return (
		<div className="flex items-center gap-2" role="group" aria-label={`Color ${number}`}>
			<label
				className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-[var(--npb-chip-border)]"
				title="Pick a color"
			>
				<span className="h-5 w-5 border border-npb-border-strong" style={{ backgroundColor: stop.color }} aria-hidden />
				<input
					type="color"
					value={toPickerHex(stop.color)}
					onChange={(event) => onChange({ ...stop, color: event.target.value })}
					aria-label={`Color ${number} picker`}
					className="absolute inset-0 cursor-pointer opacity-0"
				/>
			</label>
			<Input
				value={draft ?? stop.color}
				onChange={(event) => {
					setDraft(event.target.value);
					if (isSafeCssColor(event.target.value)) onChange({ ...stop, color: event.target.value.trim() });
				}}
				onBlur={() => setDraft(null)}
				spellCheck={false}
				autoComplete="off"
				aria-label={`Color ${number} value`}
				aria-invalid={invalid || undefined}
				className={cn("h-9 min-w-0 flex-1 rounded-none text-sm", invalid && "border-destructive")}
			/>
			<div className="flex shrink-0 items-center gap-1">
				<Input
					type="number"
					min={0}
					max={100}
					value={stop.position}
					onChange={(event) => onChange({ ...stop, position: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
					aria-label={`Color ${number} position`}
					className="h-9 w-16 rounded-none px-2 text-sm"
				/>
				<span className="text-xs text-npb-text-muted" aria-hidden>%</span>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0"
				disabled={!canRemove}
				title={canRemove ? undefined : `A gradient needs at least ${MIN_GRADIENT_STOPS} colors`}
				aria-label={`Remove color ${number}`}
				onClick={onRemove}
			>
				<X className="h-4 w-4" aria-hidden />
			</Button>
		</div>
	);
}

/**
 * Builds a gradient: ready-made ones to start from, then type, angle and 2–4 colors with their
 * positions. Every edit hands back a whole new gradient.
 */
export function GradientEditor({ value, onChange, ariaLabel }: GradientEditorProps): JSX.Element {
	const hasAngle = value.shape !== "radial";
	const setStop = (index: number, next: GradientStop): void =>
		onChange({ ...value, stops: value.stops.map((stop, at) => (at === index ? next : stop)) });

	return (
		<div className="space-y-3" role="group" aria-label={ariaLabel}>
			<div
				role="img"
				aria-label="Gradient preview"
				className="h-10 border border-npb-border-strong"
				style={{ backgroundImage: fillToImageValue(value) }}
			/>

			<div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Ready-made gradients">
				{GRADIENT_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						title={preset.label}
						aria-label={preset.label}
						aria-pressed={sameFill(preset.fill, value)}
						onClick={() => onChange(preset.fill)}
						className={cn(
							"h-6 w-full border border-npb-border-default transition-all",
							sameFill(preset.fill, value)
								? "z-10 ring-2 ring-npb-focus ring-offset-1"
								: "hover:scale-110 hover:border-npb-border-strong",
						)}
						style={{ backgroundImage: fillToImageValue(preset.fill) }}
					/>
				))}
			</div>

			<SettingsChipGroup
				label="Type"
				options={SHAPE_OPTIONS}
				value={value.shape}
				onChange={(shape) => onChange({ ...value, shape: shape as GradientShape })}
			/>

			{hasAngle ? (
				<div className="space-y-2">
					<SettingsChipGroup
						label="Direction"
						options={DIRECTION_CHIPS}
						value={String(value.angle)}
						onChange={(angle) => onChange({ ...value, angle: Number(angle) })}
					/>
					<div className="flex items-center gap-3">
						<SettingsLabel htmlFor="gradient-angle">Angle</SettingsLabel>
						<Slider
							id="gradient-angle"
							aria-label="Angle"
							min={0}
							max={360}
							step={5}
							value={[value.angle]}
							onValueChange={([angle]) => onChange({ ...value, angle: angle ?? value.angle })}
							className="flex-1"
						/>
						<span className="w-10 shrink-0 text-right text-xs tabular-nums text-npb-text-muted">{value.angle}°</span>
					</div>
				</div>
			) : null}

			<div className="space-y-2">
				<SettingsLabel>Colors</SettingsLabel>
				{value.stops.map((stop, index) => (
					<StopRow
						key={index}
						stop={stop}
						index={index}
						canRemove={value.stops.length > MIN_GRADIENT_STOPS}
						onChange={(next) => setStop(index, next)}
						onRemove={() => onChange({ ...value, stops: value.stops.filter((_, at) => at !== index) })}
					/>
				))}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs"
					disabled={value.stops.length >= MAX_GRADIENT_STOPS}
					title={value.stops.length >= MAX_GRADIENT_STOPS ? `Up to ${MAX_GRADIENT_STOPS} colors` : undefined}
					onClick={() => {
						const last = value.stops[value.stops.length - 1];
						onChange({ ...value, stops: [...value.stops, { color: last?.color ?? "#ffffff", position: 50 }] });
					}}
				>
					<Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
					Add color
				</Button>
			</div>
		</div>
	);
}
