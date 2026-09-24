import { useRef, useState, type JSX } from "react";
import type { TokenEntry } from "@shared/schema-types";
import type { Fill, GradientFill, ImageFill } from "@shared/fill-model";
import { DEFAULT_GRADIENT_FILL } from "@shared/gradient-presets";
import ColorField, { type ColorTarget } from "../ColorField";
import { SettingsChipGroup } from "../settings-chip-group";
import { GradientEditor } from "./gradient-editor";
import { ImageFillEditor } from "./image-fill-editor";

type FillKind = "color" | "gradient" | "image";

/** One thing the field paints (a block's background, or its text) and the fill it holds now. */
export type FillTarget = ColorTarget & {
	fill?: Fill;
	/** Fill types this target accepts besides a plain colour. Leave out for both; `[]` for colour only. */
	fillKinds?: readonly ("gradient" | "image")[];
};

type FillFieldProps = {
	targets: readonly FillTarget[];
	onColorChange: (entry: TokenEntry) => void;
	/** `undefined` puts the plain colour back. */
	onFillChange: (target: FillTarget, fill: Fill | undefined) => void;
	onTheme?: (target: ColorTarget) => void;
	defaultProperty?: string;
	ariaLabel?: string;
};

const ALL_KINDS = ["gradient", "image"] as const;
const KIND_LABELS: Record<FillKind, string> = { color: "Color", gradient: "Gradient", image: "Image" };

const targetKey = (target: ColorTarget): string =>
	target.modifier ? `${target.property}:${target.modifier}` : target.property;

/**
 * `ColorField` with a Color / Gradient / Image choice on top. Color is exactly the colour picker
 * (swatches, Custom, Theme). Gradient and Image open their own editors. Switching back to Color
 * clears the fill, and switching forward again brings back what you had.
 */
export function FillField({
	targets,
	onColorChange,
	onFillChange,
	onTheme,
	defaultProperty,
	ariaLabel = "Fill",
}: FillFieldProps): JSX.Element {
	const [activeKey, setActiveKey] = useState(() => targetKey(targets.find((t) => t.property === defaultProperty) ?? targets[0]!));
	const [pendingImage, setPendingImage] = useState<string | null>(null);
	const remembered = useRef<Record<string, { gradient?: GradientFill; image?: ImageFill }>>({});

	const active = targets.find((target) => targetKey(target) === activeKey) ?? targets[0]!;
	const kinds = active.fillKinds ?? ALL_KINDS;
	const memory = (remembered.current[activeKey] ??= {});
	if (active.fill?.kind === "gradient") memory.gradient = active.fill;
	if (active.fill?.kind === "image") memory.image = active.fill;

	const kind: FillKind = active.fill?.kind ?? (pendingImage === activeKey ? "image" : "color");

	const chooseKind = (next: FillKind): void => {
		if (next === kind) return;
		setPendingImage(null);
		if (next === "color") return onFillChange(active, undefined);
		if (next === "gradient") return onFillChange(active, memory.gradient ?? DEFAULT_GRADIENT_FILL);
		if (memory.image) return onFillChange(active, memory.image);
		onFillChange(active, undefined);
		setPendingImage(activeKey);
	};

	const options = (["color", ...kinds] as FillKind[]).map((value) => ({ value, label: KIND_LABELS[value] }));

	return (
		<div className="space-y-3" role="group" aria-label={ariaLabel}>
			{targets.length > 1 ? (
				<div className="flex items-stretch" role="group" aria-label={`${ariaLabel} target`}>
					{targets.map((target, index) => {
						const on = targetKey(target) === activeKey;
						return (
							<button
								key={targetKey(target)}
								type="button"
								aria-pressed={on}
								onClick={() => {
									setActiveKey(targetKey(target));
									setPendingImage(null);
								}}
								className={`npb-settings-chip flex items-center px-3 focus:outline-none ${index > 0 ? "-ml-px" : ""} ${on ? "npb-settings-chip--active" : ""}`}
							>
								{target.label}
							</button>
						);
					})}
				</div>
			) : null}

			{options.length > 1 ? (
				<SettingsChipGroup
					label=""
					ariaLabel={`${active.label} fill type`}
					options={options}
					value={kind}
					onChange={(next) => chooseKind(next as FillKind)}
				/>
			) : null}

			{kind === "gradient" && active.fill?.kind === "gradient" ? (
				<GradientEditor
					ariaLabel={`${active.label} gradient`}
					value={active.fill}
					onChange={(fill) => onFillChange(active, fill)}
				/>
			) : null}

			{kind === "image" ? (
				<ImageFillEditor
					ariaLabel={`${active.label} picture`}
					value={active.fill?.kind === "image" ? active.fill : undefined}
					onChange={(fill) => {
						setPendingImage(null);
						onFillChange(active, fill);
					}}
				/>
			) : null}

			{kind === "color" ? (
				<ColorField
					key={activeKey}
					ariaLabel={ariaLabel}
					targets={[active]}
					onChange={onColorChange}
					onTheme={onTheme}
				/>
			) : null}

			{kind !== "color" && active.property === "color" ? (
				<p className="text-xs text-npb-text-muted">
					Letters are cut out of this fill, so a very light or see-through fill can make text hard to read. It replaces this
					block&apos;s background.
				</p>
			) : null}
		</div>
	);
}
