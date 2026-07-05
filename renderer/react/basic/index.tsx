import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { sanitizeHtml } from "@shared/sanitize-html";
import { splitButtonBlockStyles, mapButtonTextAlignToJustifyContent } from "@shared/button-block-styles";
import { getRenderProps, parseTextContent, parseStructuredContent } from "../render-helpers";

// ─── SSR Icon Placeholder ──────────────────────────────────────────────────
// Renders a lightweight inline SVG placeholder with data attributes for
// client-side hydration. Mirrors the pattern in advanced/IconBlock.

type IconData = Record<string, unknown> | undefined;

function renderSsrIcon(icon: IconData, overrides?: { size?: number; color?: string }): React.ReactNode {
	if (!icon || typeof icon !== "object") return null;
	const iconSet = (icon.iconSet as string) || "lucide";
	const iconName = (icon.iconName as string) || "";
	if (!iconName) return null;

	const baseSize = (icon.size as number) || 24;
	const sizeUnit = typeof icon.sizeUnit === "string" ? (icon.sizeUnit as string) : undefined;
	const baseColor = (icon.color as string) || "currentColor";
	const baseStroke = (icon.strokeWidth as number) || 2;
	const strokeUnit = typeof icon.strokeWidthUnit === "string" ? (icon.strokeWidthUnit as string) : undefined;

	const resolvedSize = overrides?.size ?? baseSize;
	const resolvedColor = overrides?.color ?? baseColor;
	const unit = sizeUnit || "px";
	const svgW = unit === "px" ? resolvedSize : "100%";
	const svgH = svgW;
	const strokeU = strokeUnit || "px";
	const strokeVal = strokeU === "px" ? String(baseStroke) : `${baseStroke}${strokeU}`;

	return (
		<svg
			width={svgW}
			height={svgH}
			viewBox="0 0 24 24"
			fill="none"
			stroke={resolvedColor}
			strokeWidth={strokeVal}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flexShrink: 0 }}
			data-icon-set={iconSet}
			data-icon-name={iconName}
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" opacity="0.15" />
			<circle cx="12" cy="12" r="3" opacity="0.3" />
		</svg>
	);
}

const HEADING_FONT_SIZES: Record<number, string> = {
	1: "2.5rem",
	2: "2rem",
	3: "1.75rem",
	4: "1.5rem",
	5: "1.25rem",
	6: "1rem",
};

const HEADING_FONT_WEIGHTS: Record<number, string> = {
	1: "800",
	2: "700",
	3: "700",
	4: "600",
	5: "600",
	6: "600",
};

/**
 * Heading Block Component
 * Renders heading elements (h1-h6) with optional styling
 */
export function HeadingBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseTextContent(block.content);
	const level = (content.level as number) || 2;
	const text = (content.value as string) || "";
	const anchor = content.anchor as string | undefined;
	const textAlign = content.textAlign as string | undefined;

	const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
	const mergedClassName = ["wp-block-heading", className]
		.filter(Boolean)
		.join(" ");

	const mergedStyle: React.CSSProperties = {
		fontSize: HEADING_FONT_SIZES[level],
		fontWeight: HEADING_FONT_WEIGHTS[level],
		...style,
		...(textAlign
			? { textAlign: textAlign as React.CSSProperties["textAlign"] }
			: {}),
	};

	const attrs = { ...attributes, ...(anchor ? { id: anchor } : {}) };

	// `format: "html"` carries sanitized inline markup (e.g. imported headings with links).
	if (content.format === "html") {
		return (
			<Tag
				className={mergedClassName || undefined}
				style={mergedStyle}
				{...attrs}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
			/>
		);
	}

	return (
		<Tag className={mergedClassName || undefined} style={mergedStyle} {...attrs}>
			{text}
		</Tag>
	);
}

/**
 * Paragraph Block Component
 * Renders paragraph text with optional styling and drop cap
 */
export function ParagraphBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const textAlign = content.textAlign as string | undefined;
	const dropCap = content.dropCap as boolean | undefined;

	const effectiveTextAlign =
		(style?.textAlign as React.CSSProperties["textAlign"] | undefined) ??
		textAlign;

	const mergedClassName = [
		"wp-block-paragraph",
		effectiveTextAlign ? `has-text-align-${effectiveTextAlign}` : "",
		dropCap ? "has-drop-cap" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const mergedStyle: React.CSSProperties = {
		...style,
		...(effectiveTextAlign
			? { textAlign: effectiveTextAlign as React.CSSProperties["textAlign"] }
			: {}),
	};

	// `format: "html"` carries sanitized inline markup (e.g. imported paragraphs with links/bold).
	if (content.format === "html") {
		return (
			<p
				className={mergedClassName || undefined}
				style={mergedStyle}
				{...attributes}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
			/>
		);
	}

	return (
		<p
			className={mergedClassName || undefined}
			style={mergedStyle}
			{...attributes}
		>
			{text}
		</p>
	);
}

/**
 * Button Block Component
 * Renders a single button with link support
 * Uses semantic HTML: <a> for links, <button> for actions without links
 */
export function ButtonBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const { shellStyles, anchorStyles } = splitButtonBlockStyles(style);
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const link = (content.link as string) || (content.url as string) || "";
	const target = (content.target as string) || (content.linkTarget as string) || undefined;
	const variant = content.variant as string | undefined;
	const icon = content.icon as IconData;
	const iconPosition = (content.iconPosition as string) || "left";
	const iconOnly = content.iconOnly as boolean | undefined;

	const iconElement = renderSsrIcon(icon, { size: (icon?.size as number) || 16, color: "currentColor" });
	const hasIcon = iconElement !== null;

	const buttonClassName = [
		"wp-block-button__link",
		variant ? `is-style-${variant}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const justifyFromTextAlign = mapButtonTextAlignToJustifyContent(
		(shellStyles.textAlign ?? style.textAlign) as React.CSSProperties["textAlign"],
	);

	const buttonStyle: React.CSSProperties = {
		...anchorStyles,
		display: hasIcon ? "inline-flex" : (anchorStyles.display as React.CSSProperties["display"]) ?? "inline-block",
		alignItems: (anchorStyles.alignItems as React.CSSProperties["alignItems"]) ?? "center",
		justifyContent:
			(anchorStyles.justifyContent as React.CSSProperties["justifyContent"]) ??
			justifyFromTextAlign ??
			"center",
		...(hasIcon ? { gap: hasIcon && !iconOnly ? "6px" : undefined } : {}),
	};

	const buttonChildren = (
		<>
			{hasIcon && iconPosition === "left" && iconElement}
			{!iconOnly && text}
			{hasIcon && iconPosition === "right" && iconElement}
		</>
	);

	const shellClassName = "wp-block-button";

	if (link && link !== "#" && link.trim() !== "") {
		return (
			<div className={shellClassName} style={shellStyles}>
				<a
					href={link}
					target={target}
					rel={target === "_blank" ? "noopener noreferrer" : undefined}
					className={buttonClassName || undefined}
					style={buttonStyle}
					{...attributes}
				>
					{buttonChildren}
				</a>
			</div>
		);
	}

	return (
		<div className={shellClassName} style={shellStyles}>
			<button
				type="button"
				className={buttonClassName || undefined}
				style={buttonStyle}
				{...attributes}
			>
				{buttonChildren}
			</button>
		</div>
	);
}

/**
 * Buttons Block Component
 * Renders multiple buttons in a group
 * Uses semantic HTML: <a> for links, <button> for actions without links
 */
export function ButtonsBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const buttons = (data.buttons as Array<Record<string, unknown>>) || [];
	const layout = data.layout as string | undefined;
	const orientation = data.orientation as string | undefined;

	const mergedClassName = ["wp-block-buttons", className]
		.filter(Boolean)
		.join(" ");

	if (!buttons || buttons.length === 0) {
		return (
			<div
				className={mergedClassName || undefined}
				style={style}
				{...attributes}
			>
				{/* Empty buttons container */}
			</div>
		);
	}

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			{buttons.map((button, index) => {
				const buttonText = (button.text as string) || "";
				const buttonUrl = (button.url as string) || "";
				const buttonTarget = (button.linkTarget as string) || (button.target as string);
				const hasLink =
					buttonUrl && buttonUrl !== "#" && buttonUrl.trim() !== "";
				const buttonKey = (button.id as string) || `${buttonText}-${index}`;

				const btnIcon = button.icon as IconData;
				const btnIconPosition = (button.iconPosition as string) || "left";
				const btnIconOnly = button.iconOnly as boolean | undefined;
				const iconElement = renderSsrIcon(btnIcon, { size: (btnIcon?.size as number) || 16, color: "currentColor" });
				const hasIcon = iconElement !== null;

				const btnStyle: React.CSSProperties = {
					...(hasIcon ? { display: "inline-flex", alignItems: "center", gap: hasIcon && !btnIconOnly ? "6px" : undefined } : {}),
				};

				const btnChildren = (
					<>
						{hasIcon && btnIconPosition === "left" && iconElement}
						{!btnIconOnly && buttonText}
						{hasIcon && btnIconPosition === "right" && iconElement}
					</>
				);

				return (
					<div key={buttonKey} className="wp-block-button">
						{hasLink ? (
							<a
								href={buttonUrl}
								target={buttonTarget}
								rel={
									buttonTarget === "_blank"
										? (button.rel as string) || "noopener noreferrer"
										: (button.rel as string)
								}
								title={button.title as string}
								className={`wp-block-button__link ${
									(button.className as string) || ""
								}`.trim()}
								style={btnStyle}
							>
								{btnChildren}
							</a>
						) : (
							<button
								type="button"
								title={button.title as string}
								className={`wp-block-button__link ${
									(button.className as string) || ""
								}`.trim()}
								style={btnStyle}
							>
								{btnChildren}
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}