import React, { Suspense } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent } from "../../../../../renderer/react/render-helpers";

// Lazy-load IconRenderer — only fetched when an icon block renders
const IconRendererLazy = React.lazy(() =>
	import("./shared/IconRenderer").then((m) => ({ default: m.IconRenderer })),
);

/**
 * Client-side Icon Block that renders actual icons from supported icon sets.
 * Lazy-loads IconRenderer so heavy icon libraries are only fetched when needed.
 */
export function ClientIconBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const icon = (data.icon as Record<string, unknown>) || {};

	const iconRef = {
		iconSet: (icon.iconSet as string) || "lucide",
		iconName: typeof icon.iconName === "string" ? icon.iconName : "star",
		size: typeof icon.size === "number" ? icon.size : 24,
		color: typeof icon.color === "string" ? icon.color : "currentColor",
		strokeWidth: typeof icon.strokeWidth === "number" ? icon.strokeWidth : 2,
	};

	const link = typeof data.link === "string" ? data.link : "";
	const linkTarget = data.linkTarget === "_blank" ? "_blank" : "_self";
	const label = typeof data.label === "string" ? data.label : "";

	const wrapperStyle: React.CSSProperties = {
		...style,
		alignItems: "center",
		display: "inline-flex",
		justifyContent: "center",
	};

	const inner = (
		<span className="wp-block-icon" style={wrapperStyle}>
			<Suspense
				fallback={
					<svg
						width={iconRef.size}
						height={iconRef.size}
						viewBox="0 0 24 24"
						fill="none"
						stroke={iconRef.color}
						strokeWidth={iconRef.strokeWidth}
					>
						<rect x="3" y="3" width="18" height="18" rx="2" opacity="0.15" />
						<circle cx="12" cy="12" r="3" opacity="0.3" />
					</svg>
				}
			>
				<IconRendererLazy
					icon={iconRef}
					className="wp-block-icon__glyph"
					aria-label={label || undefined}
				/>
			</Suspense>
		</span>
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
