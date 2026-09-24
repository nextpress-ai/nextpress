import type { CSSProperties } from "react";
import { safeCssColor } from "./css-safe.js";

/**
 * A fill is what paints a block's background, or its text: a gradient or a picture. Plain colours
 * are not fills — they stay ordinary colour settings — so there is one way to do each thing.
 *
 * Everything read from saved data goes through `readFill`, so nothing unsafe reaches the CSS.
 */

export const GRADIENT_SHAPES = ["linear", "radial", "conic"] as const;
export type GradientShape = (typeof GRADIENT_SHAPES)[number];

export const FILL_POSITIONS = [
	"top left",
	"top",
	"top right",
	"left",
	"center",
	"right",
	"bottom left",
	"bottom",
	"bottom right",
] as const;
export type FillPosition = (typeof FILL_POSITIONS)[number];

export const IMAGE_FILL_SIZES = ["cover", "contain", "auto"] as const;
export type ImageFillSize = (typeof IMAGE_FILL_SIZES)[number];

export const IMAGE_TINT_TONES = ["dark", "light"] as const;

/** One colour on the gradient line, `position` in percent (0 = start, 100 = end). */
export type GradientStop = { color: string; position: number };

export type GradientFill = {
	kind: "gradient";
	shape: GradientShape;
	/** Degrees. Linear: 90 points right, 180 points down. Conic: where the sweep starts. */
	angle: number;
	stops: GradientStop[];
};

/** A darker or lighter wash over the picture so text on top stays readable. `strength` is percent. */
export type ImageTint = { tone: (typeof IMAGE_TINT_TONES)[number]; strength: number };

export type ImageFill = {
	kind: "image";
	url: string;
	size: ImageFillSize;
	position: FillPosition;
	repeat: boolean;
	tint?: ImageTint;
};

export type Fill = GradientFill | ImageFill;

/** The fills a block can carry. Text fills paint through the block's own background. */
export type BlockFills = { background?: Fill; text?: Fill };

export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const readNumber = (value: unknown, fallback: number, min: number, max: number): number =>
	typeof value === "number" && Number.isFinite(value) ? clamp(Math.round(value), min, max) : fallback;

const pickOption = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
	options.find((option) => option === value) ?? fallback;

/**
 * A picture address that is safe to put inside `url("...")`: a path on this site, or an https
 * address. Anything with quotes, brackets, spaces or backslashes is refused.
 */
export function safeImageUrl(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const url = value.trim();
	if (url === "" || /[\s"'()<>\\]/.test(url)) return undefined;
	const isSitePath = url.startsWith("/") && !url.startsWith("//");
	return isSitePath || /^https:\/\/[^/]/i.test(url) ? url : undefined;
}

function readStops(raw: unknown): GradientStop[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.flatMap((item): GradientStop[] => {
			if (!isRecord(item)) return [];
			const color = safeCssColor(item.color);
			return color ? [{ color, position: readNumber(item.position, 0, 0, 100) }] : [];
		})
		.slice(0, MAX_GRADIENT_STOPS)
		.sort((a, b) => a.position - b.position);
}

function readTint(raw: unknown): ImageTint | undefined {
	if (!isRecord(raw)) return undefined;
	const strength = readNumber(raw.strength, 0, 0, 90);
	return strength > 0 ? { tone: pickOption(IMAGE_TINT_TONES, raw.tone, "dark"), strength } : undefined;
}

/** Reads one saved fill, or nothing when it is missing or unusable (too few colours, bad picture). */
export function readFill(raw: unknown): Fill | undefined {
	if (!isRecord(raw)) return undefined;
	if (raw.kind === "gradient") {
		const stops = readStops(raw.stops);
		if (stops.length < MIN_GRADIENT_STOPS) return undefined;
		return {
			kind: "gradient",
			shape: pickOption(GRADIENT_SHAPES, raw.shape, "linear"),
			angle: readNumber(raw.angle, 180, 0, 360),
			stops,
		};
	}
	if (raw.kind === "image") {
		const url = safeImageUrl(raw.url);
		if (!url) return undefined;
		return {
			kind: "image",
			url,
			size: pickOption(IMAGE_FILL_SIZES, raw.size, "cover"),
			position: pickOption(FILL_POSITIONS, raw.position, "center"),
			repeat: raw.repeat === true,
			tint: readTint(raw.tint),
		};
	}
	return undefined;
}

/** Reads a block's saved `other.fills`, keeping only what is usable. */
export function readBlockFills(raw: unknown): BlockFills {
	if (!isRecord(raw)) return {};
	const background = readFill(raw.background);
	const text = readFill(raw.text);
	return { ...(background ? { background } : {}), ...(text ? { text } : {}) };
}

const stopList = (stops: readonly GradientStop[]): string =>
	stops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

/** The CSS `background-image` value for a fill: a gradient, or a picture under its tint. */
export function fillToImageValue(fill: Fill): string {
	if (fill.kind === "gradient") {
		if (fill.shape === "radial") return `radial-gradient(circle at center, ${stopList(fill.stops)})`;
		if (fill.shape === "conic") return `conic-gradient(from ${fill.angle}deg at center, ${stopList(fill.stops)})`;
		return `linear-gradient(${fill.angle}deg, ${stopList(fill.stops)})`;
	}
	const picture = `url("${fill.url}")`;
	if (!fill.tint) return picture;
	const rgb = fill.tint.tone === "dark" ? "0 0 0" : "255 255 255";
	const wash = `rgb(${rgb} / ${fill.tint.strength}%)`;
	return `linear-gradient(${wash}, ${wash}), ${picture}`;
}

/** Inline styles that paint a fill as a background. */
export function fillToBackgroundStyles(fill: Fill): CSSProperties {
	if (fill.kind === "gradient") {
		return { backgroundImage: fillToImageValue(fill), backgroundRepeat: "no-repeat" };
	}
	return {
		backgroundImage: fillToImageValue(fill),
		backgroundSize: fill.size,
		backgroundPosition: fill.position,
		backgroundRepeat: fill.repeat ? "repeat" : "no-repeat",
	};
}

const toKebab = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const toDeclarations = (styles: CSSProperties): string =>
	Object.entries(styles)
		.map(([name, value]) => `${toKebab(name)}:${String(value)}`)
		.join(";");

/**
 * CSS for a text fill: the text is cut out of the fill. It only applies where the browser can do
 * that (so text never turns invisible), and it steps aside in high-contrast mode, where people
 * need their own text colours.
 */
export function buildTextFillCss({ selector, fill }: { selector: string; fill: Fill | undefined }): string {
	if (!fill) return "";
	const paint = toDeclarations(fillToBackgroundStyles(fill));
	return [
		"@supports (background-clip:text) or (-webkit-background-clip:text){",
		`${selector}{${paint};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}`,
		"}",
		"@media (forced-colors:active){",
		`${selector}{background:none;-webkit-text-fill-color:currentColor;color:CanvasText}`,
		"}",
	].join("\n");
}

/**
 * What a block's fills add on top of its other styles. A text fill uses the block's own
 * background to paint the letters, so when there is one the background fill is left out.
 */
export function resolveBlockFills({ blockId, fills }: { blockId: string; fills: unknown }): {
	styles: CSSProperties;
	css: string;
} {
	const { background, text } = readBlockFills(fills);
	if (text) return { styles: {}, css: buildTextFillCss({ selector: `.block-${blockId}`, fill: text }) };
	return { styles: background ? fillToBackgroundStyles(background) : {}, css: "" };
}
