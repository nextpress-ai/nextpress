import { createContext, useContext, useMemo, type JSX, type ReactNode } from "react";
import type { BlockConfig } from "@shared/schema-types";
import {
	collectCanvasColors,
	colorSwatchKey,
	normalizeSwatchColor,
	type ColorSwatchItem,
} from "@shared/collect-canvas-colors";
import { fillToBackgroundStyles, type GradientFill } from "@shared/fill-model";
import { rememberRecentColor, useRecentColors } from "@/lib/recent-color-store";
import { cn } from "@/lib/utils";

const CanvasColorsContext = createContext<ColorSwatchItem[]>([]);

/**
 * Walks the current canvas once so every colour control can offer "On this page".
 */
export function EditorColorMemoryProvider({
	blocks,
	children,
}: {
	blocks: readonly BlockConfig[];
	children: ReactNode;
}): JSX.Element {
	const canvas = useMemo(() => collectCanvasColors(blocks), [blocks]);
	return <CanvasColorsContext.Provider value={canvas}>{children}</CanvasColorsContext.Provider>;
}

/** Name a swatch so two gradients are not both just "Gradient". */
export function describeColorSwatch(item: ColorSwatchItem): string {
	if (item.kind === "solid") return item.color;
	const stops = item.fill.stops.map((stop) => stop.color).join(" to ");
	return `${item.fill.shape} gradient ${stops}`;
}

function MemorySwatch({
	item,
	selected,
	onPick,
}: {
	item: ColorSwatchItem;
	selected: boolean;
	onPick: (item: ColorSwatchItem) => void;
}): JSX.Element {
	const label = describeColorSwatch(item);
	const clear =
		item.kind === "solid" && (item.color === "transparent" || item.color === "currentcolor");
	const style = clear
		? {
				backgroundImage:
					"conic-gradient(var(--npb-border-strong) 0 25%, var(--npb-surface-base) 0 50%, var(--npb-border-strong) 0 75%, var(--npb-surface-base) 0)",
				backgroundSize: "8px 8px",
			}
		: item.kind === "solid"
			? { backgroundColor: item.color }
			: fillToBackgroundStyles(item.fill);
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={selected}
			onClick={() => onPick(item)}
			className={cn(
				"h-6 w-6 shrink-0 border border-npb-border-default",
				"transition-[transform,border-color,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
				"active:scale-[0.97]",
				selected
					? "z-10 ring-2 ring-npb-focus ring-offset-1"
					: "[@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.04] [@media(hover:hover)_and_(pointer:fine)]:hover:border-npb-border-strong",
			)}
			style={style}
		/>
	);
}

function MemoryRow({
	label,
	items,
	currentKey,
	onPick,
}: {
	label: string;
	items: readonly ColorSwatchItem[];
	currentKey: string | undefined;
	onPick: (item: ColorSwatchItem) => void;
}): JSX.Element | null {
	if (items.length === 0) return null;
	return (
		<div className="space-y-1.5">
			<p className="text-sm font-medium text-npb-text-secondary">{label}</p>
			<div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
				{items.map((item) => (
					<MemorySwatch
						key={colorSwatchKey(item)}
						item={item}
						selected={currentKey === colorSwatchKey(item)}
						onPick={onPick}
					/>
				))}
			</div>
		</div>
	);
}

type ColorMemorySwatchesProps = {
	onPickSolid: (color: string) => void;
	onPickGradient?: (fill: GradientFill) => void;
	currentSolid?: string;
	currentFill?: GradientFill;
};

/**
 * Recent picks plus unique colours already on the canvas. Gradients only show
 * when this control can apply them (Color / Gradient / Image).
 */
export function ColorMemorySwatches({
	onPickSolid,
	onPickGradient,
	currentSolid,
	currentFill,
}: ColorMemorySwatchesProps): JSX.Element | null {
	const recent = useRecentColors();
	const canvas = useContext(CanvasColorsContext);
	const allowGradient = onPickGradient !== undefined;

	const visible = (items: readonly ColorSwatchItem[]): ColorSwatchItem[] =>
		allowGradient ? [...items] : items.filter((item) => item.kind === "solid");

	const recentVisible = visible(recent);
	const recentKeys = new Set(recentVisible.map(colorSwatchKey));
	const canvasVisible = visible(canvas).filter((item) => !recentKeys.has(colorSwatchKey(item)));

	if (recentVisible.length === 0 && canvasVisible.length === 0) return null;

	const currentKey = currentFill
		? colorSwatchKey({ kind: "gradient", fill: currentFill })
		: currentSolid
			? colorSwatchKey({ kind: "solid", color: normalizeSwatchColor(currentSolid) })
			: undefined;

	const pick = (item: ColorSwatchItem): void => {
		rememberRecentColor(item);
		if (item.kind === "solid") {
			onPickSolid(item.color);
			return;
		}
		onPickGradient?.(item.fill);
	};

	return (
		<div className="space-y-2">
			<MemoryRow label="Recent" items={recentVisible} currentKey={currentKey} onPick={pick} />
			<MemoryRow label="On this page" items={canvasVisible} currentKey={currentKey} onPick={pick} />
		</div>
	);
}
