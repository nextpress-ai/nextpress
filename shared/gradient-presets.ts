import { THEME_ACCENT_COLOR } from "./css-safe.js";
import type { GradientFill, ImageFill } from "./fill-model.js";

type GradientPreset = { id: string; label: string; fill: GradientFill };

const linear = (angle: number, from: string, to: string): GradientFill => ({
	kind: "gradient",
	shape: "linear",
	angle,
	stops: [
		{ color: from, position: 0 },
		{ color: to, position: 100 },
	],
});

/**
 * Ready-made gradients built from the Tailwind palette. "Theme" starts from the page theme's
 * accent colour, so it follows the site's look.
 */
export const GRADIENT_PRESETS: readonly GradientPreset[] = [
	{ id: "theme", label: "Theme", fill: linear(135, THEME_ACCENT_COLOR, "#111827") },
	{ id: "sunset", label: "Sunset", fill: linear(135, "#f97316", "#ec4899") },
	{ id: "ocean", label: "Ocean", fill: linear(135, "#0ea5e9", "#6366f1") },
	{ id: "forest", label: "Forest", fill: linear(135, "#22c55e", "#0d9488") },
	{ id: "berry", label: "Berry", fill: linear(135, "#a855f7", "#ec4899") },
	{ id: "flame", label: "Flame", fill: linear(135, "#ef4444", "#f59e0b") },
	{ id: "mint", label: "Mint", fill: linear(135, "#14b8a6", "#84cc16") },
	{ id: "peach", label: "Peach", fill: linear(135, "#fdba74", "#fda4af") },
	{ id: "sky", label: "Sky", fill: linear(180, "#7dd3fc", "#a5b4fc") },
	{ id: "slate", label: "Slate", fill: linear(180, "#334155", "#0f172a") },
	{ id: "midnight", label: "Midnight", fill: linear(160, "#1e1b4b", "#4f46e5") },
	{
		id: "glow",
		label: "Glow",
		fill: {
			kind: "gradient",
			shape: "radial",
			angle: 0,
			stops: [
				{ color: "#fef3c7", position: 0 },
				{ color: "#f59e0b", position: 100 },
			],
		},
	},
];

/** What "Gradient" starts as when picked for the first time. */
export const DEFAULT_GRADIENT_FILL: GradientFill = GRADIENT_PRESETS[2]!.fill;

/** What "Image" becomes once a picture is chosen. */
export const imageFillFromUrl = (url: string): ImageFill => ({
	kind: "image",
	url,
	size: "cover",
	position: "center",
	repeat: false,
});
