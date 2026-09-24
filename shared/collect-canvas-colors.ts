import type { BlockConfig } from "./schema-types.js";
import { safeCssColor } from "./css-safe.js";
import { fillToImageValue, readFill, type GradientFill } from "./fill-model.js";

/** A colour or gradient the editor can offer as a one-click pick. */
export type ColorSwatchItem =
	| { kind: "solid"; color: string }
	| { kind: "gradient"; fill: GradientFill };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Keys that can hold a hex by accident (ids, URLs, custom CSS) and are not paint. */
const SKIP_KEYS = new Set([
	"id",
	"name",
	"parentId",
	"label",
	"category",
	"type",
	"href",
	"url",
	"logoUrl",
	"customCss",
	"js",
	"html",
	"css",
	"classNames",
	"requires",
]);

/** Same hex written two ways (`#FFF` / `#fff`) is one colour. */
export function normalizeSwatchColor(color: string): string {
	const trimmed = color.trim();
	return trimmed.startsWith("#") ? trimmed.toLowerCase() : trimmed;
}

/** Stable id so Recent and On this page can drop repeats. */
export function colorSwatchKey(item: ColorSwatchItem): string {
	return item.kind === "solid" ? `s:${item.color}` : `g:${fillToImageValue(item.fill)}`;
}

function addSolid(color: string, solids: Map<string, string>): void {
	const safe = safeCssColor(color);
	if (!safe) return;
	const key = normalizeSwatchColor(safe);
	if (!solids.has(key)) solids.set(key, key);
}

function addFill(value: unknown, solids: Map<string, string>, gradients: Map<string, GradientFill>): void {
	const fill = readFill(value);
	if (!fill) return;
	if (fill.kind === "image") return;
	const key = fillToImageValue(fill);
	if (!gradients.has(key)) gradients.set(key, fill);
	for (const stop of fill.stops) addSolid(stop.color, solids);
}

/**
 * Walks a saved value for colours: plain strings, token `style` fields, and gradient fills.
 * Pictures are skipped — they are not colours.
 */
function collectFromValue(
	value: unknown,
	solids: Map<string, string>,
	gradients: Map<string, GradientFill>,
): void {
	if (typeof value === "string") {
		addSolid(value, solids);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectFromValue(item, solids, gradients);
		return;
	}
	if (!isRecord(value)) return;
	if (value.kind === "gradient" || value.kind === "image") {
		addFill(value, solids, gradients);
		return;
	}
	if (typeof value.style === "string") addSolid(value.style, solids);
	for (const [key, nested] of Object.entries(value)) {
		if (SKIP_KEYS.has(key)) continue;
		collectFromValue(nested, solids, gradients);
	}
}

/**
 * Unique colours and gradients already on the canvas, in the order they first appear.
 * Used so the colour control can offer "On this page" picks.
 */
export function collectCanvasColors(blocks: readonly BlockConfig[]): ColorSwatchItem[] {
	const solids = new Map<string, string>();
	const gradients = new Map<string, GradientFill>();
	for (const block of blocks) collectFromValue(block, solids, gradients);
	return [
		...[...solids.values()].map((color): ColorSwatchItem => ({ kind: "solid", color })),
		...[...gradients.values()].map((fill): ColorSwatchItem => ({ kind: "gradient", fill })),
	];
}
