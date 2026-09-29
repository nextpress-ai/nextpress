import * as React from "react";
import { ICON_FILE_SETS, isCleanSvgMarkup, isLocalIconFileUrl } from "./icon-drawing.js";

/** The parts of an icon reference needed to paint a saved drawing or picture. */
export type IconDrawingSource = {
	iconSet: string;
	iconName: string;
	svg?: string;
	url?: string;
	label?: string;
	tint?: boolean;
};

type IconDrawingViewProps = {
	icon: IconDrawingSource;
	/** Pixels, or any CSS length (`100%`, `2rem`). */
	size: number | string;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
};

/** Saved icon JSON as it arrives from a page: every field may be missing or the wrong type. */
export type IconDrawingInput = {
	iconSet?: string | number | boolean | null;
	iconName?: string | number | boolean | null;
	svg?: string | number | boolean | null;
	url?: string | number | boolean | null;
	label?: string | number | boolean | null;
	tint?: string | number | boolean | null;
};

const text = (value: IconDrawingInput[keyof IconDrawingInput]): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

/** Picks the drawing fields out of a saved icon, keeping only values of the right type. */
export function readIconDrawingSource(raw: IconDrawingInput | null | undefined): IconDrawingSource {
	return {
		iconSet: text(raw?.iconSet) ?? "lucide",
		iconName: text(raw?.iconName) ?? "",
		svg: text(raw?.svg),
		url: text(raw?.url),
		label: text(raw?.label),
		tint: raw?.tint === true,
	};
}

const toLength = (size: number | string): string => (typeof size === "number" ? `${size}px` : size);

/** True when this reference carries something `IconDrawingView` can paint. */
export function hasIconDrawing(icon: IconDrawingSource): boolean {
	if (icon.url && ICON_FILE_SETS.has(icon.iconSet)) return isLocalIconFileUrl(icon.url);
	return Boolean(icon.svg);
}

/**
 * Paints an icon from its saved drawing (react-icons) or its picture file (brand logo / upload).
 * Used by the editor canvas and the published page so both look the same. Returns null when the
 * reference has neither, so callers can fall back to their placeholder.
 */
export function IconDrawingView({
	icon,
	size,
	color = "currentColor",
	className,
	style,
}: IconDrawingViewProps): React.ReactElement | null {
	const box = toLength(size);
	const label = icon.label?.trim() || undefined;
	const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

	if (icon.url && ICON_FILE_SETS.has(icon.iconSet) && isLocalIconFileUrl(icon.url)) {
		if (icon.tint) {
			// One-colour pictures take the icon colour: the file becomes a stencil over the colour.
			const stencil = `url("${icon.url}") center / contain no-repeat`;
			return (
				<span
					className={className}
					data-icon-set={icon.iconSet}
					data-icon-name={icon.iconName}
					{...a11y}
					style={{
						display: "inline-block",
						flexShrink: 0,
						width: box,
						height: box,
						backgroundColor: color,
						mask: stencil,
						WebkitMask: stencil,
						...style,
					}}
				/>
			);
		}
		return (
			<img
				src={icon.url}
				alt={label ?? ""}
				className={className}
				data-icon-set={icon.iconSet}
				data-icon-name={icon.iconName}
				loading="lazy"
				decoding="async"
				style={{ display: "block", flexShrink: 0, width: box, height: box, objectFit: "contain", ...style }}
			/>
		);
	}

	if (icon.svg && isCleanSvgMarkup(icon.svg)) {
		// Saved drawings fill their box (width/height 100%), so the box sets the icon size.
		return (
			<span
				className={className}
				data-icon-set={icon.iconSet}
				data-icon-name={icon.iconName}
				{...a11y}
				style={{
					display: "inline-flex",
					flexShrink: 0,
					alignItems: "center",
					justifyContent: "center",
					width: box,
					height: box,
					lineHeight: 0,
					color,
					...style,
				}}
				dangerouslySetInnerHTML={{ __html: icon.svg }}
			/>
		);
	}

	return null;
}
