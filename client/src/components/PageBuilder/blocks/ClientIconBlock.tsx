import React, { Suspense } from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { CSSProperties } from "react";
import {
	effectiveIconGlyphColor,
	iconContentBoxCss,
	readIconBoxSizeFromStyles,
} from "@shared/icon-block-visuals";
import { getRenderProps, parseStructuredContent } from "../../../../../renderer/react/render-helpers";
import { LucideGlyph } from "../../../../../renderer/react/shared/lucide-glyph";
import { BlockShell } from "./shared/block-shell";

const IconRendererLazy = React.lazy(() =>
	import("./shared/IconRenderer").then((m) => ({ default: m.IconRenderer })),
);

/**
 * Client-side Icon Block — mirrors editor `IconBlock.tsx` visual rules
 * (style color/size) so preview matches canvas, including SDK-built pages.
 */
export function ClientIconBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const icon = (data.icon as Record<string, unknown>) || {};

	const iconRef = {
		iconSet: (icon.iconSet as string) || "lucide",
		iconName: typeof icon.iconName === "string" ? icon.iconName : "star",
		size: typeof icon.size === "number" ? icon.size : readIconBoxSizeFromStyles(style, 24),
		sizeUnit: typeof icon.sizeUnit === "string" ? icon.sizeUnit : undefined,
		color: typeof icon.color === "string" ? icon.color : "currentColor",
		strokeWidth: typeof icon.strokeWidth === "number" ? icon.strokeWidth : 2,
		strokeWidthUnit: typeof icon.strokeWidthUnit === "string" ? icon.strokeWidthUnit : undefined,
	};

	const link = typeof data.link === "string" ? data.link : "";
	const linkTarget = data.linkTarget === "_blank" ? "_blank" : "_self";
	const label = typeof data.label === "string" ? data.label : "";

	const sizeUnit = iconRef.sizeUnit ?? "px";
	const strokeUnit = iconRef.strokeWidthUnit ?? "px";
	const glyphColor = effectiveIconGlyphColor(style, iconRef);
	const strokeWidthProp =
		strokeUnit === "px"
			? (iconRef.strokeWidth ?? 2)
			: `${iconRef.strokeWidth ?? 2}${strokeUnit}`;

	const wrapperStyle: CSSProperties = {
		...style,
		...iconContentBoxCss(iconRef),
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
	};

	const glyph =
		iconRef.iconSet === "lucide" ? (
			<LucideGlyph
				iconName={iconRef.iconName}
				size={sizeUnit === "px" ? iconRef.size : "100%"}
				color={glyphColor}
				strokeWidth={strokeWidthProp}
				className="wp-block-icon__glyph shrink-0"
				aria-label={label || undefined}
			/>
		) : (
			<Suspense
				fallback={
					<LucideGlyph
						iconName="loader-circle"
						size={iconRef.size}
						color={glyphColor}
						strokeWidth={strokeWidthProp}
						className="wp-block-icon__glyph shrink-0 animate-spin"
					/>
				}
			>
				<IconRendererLazy
					icon={{
						iconSet: iconRef.iconSet as "react-icons" | "svgl",
						iconName: iconRef.iconName,
						size: iconRef.size,
						color: glyphColor,
						strokeWidth: iconRef.strokeWidth,
					}}
					size={sizeUnit === "px" ? iconRef.size : "100%"}
					color={glyphColor}
					strokeWidth={strokeWidthProp}
					className="wp-block-icon__glyph shrink-0"
					aria-label={label || undefined}
				/>
			</Suspense>
		);

	const inner = (
		<BlockShell as="span" blockClass="wp-block-icon" className={className} style={wrapperStyle} {...attributes}>
			{glyph}
		</BlockShell>
	);

	if (link && link !== "#") {
		return (
			<a
				href={link}
				rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
				style={{ display: "inline-flex", textDecoration: "none" }}
				target={linkTarget}
				title={label || undefined}
			>
				{inner}
			</a>
		);
	}

	return inner;
}
