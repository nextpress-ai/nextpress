import type { CSSProperties } from "react";

type IconLike = {
	size?: number;
	sizeUnit?: string;
	color?: string;
	strokeWidth?: number;
	strokeWidthUnit?: string;
};

/**
 * Icon blocks often store color on `block.styles`; content.icon.color is fallback.
 */
export function effectiveIconGlyphColor(
	styles: CSSProperties | undefined,
	icon: IconLike,
): string {
	const fromStyles = styles?.color;
	if (typeof fromStyles === "string" && fromStyles.length > 0) return fromStyles;
	return typeof icon.color === "string" && icon.color.length > 0 ? icon.color : "currentColor";
}

/** Parse pixel box from block styles when SDK/editor set width/height without icon.size. */
export function readIconBoxSizeFromStyles(
	styles: CSSProperties | undefined,
	fallback: number,
): number {
	const raw = styles?.width ?? styles?.height;
	if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
	if (typeof raw === "string") {
		const match = raw.trim().match(/^(\d+(?:\.\d+)?)px$/i);
		if (match) return Number.parseFloat(match[1] ?? "");
	}
	return fallback;
}

export function iconContentBoxCss(icon: IconLike): CSSProperties {
	const unit = icon.sizeUnit ?? "px";
	if (unit === "px") return {};
	const n = icon.size ?? 24;
	const box = `${n}${unit}`;
	return { width: box, height: box };
}

/** Blocks that should not grow inside horizontal flex rows (search bars, toolbars). */
export const INLINE_FLEX_BLOCK_NAMES = new Set([
	"core/icon",
	"core/button",
	"core/separator",
	"core/spacer",
]);

export function getInlineFlexChildStyles(blockName: string, isHorizontal: boolean): CSSProperties {
	if (!isHorizontal || !INLINE_FLEX_BLOCK_NAMES.has(blockName)) {
		return {};
	}
	return { flex: "0 0 auto", flexShrink: 0 };
}
