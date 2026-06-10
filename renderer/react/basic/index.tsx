import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseTextContent, parseStructuredContent } from "../render-helpers";

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
		...(textAlign ? { textAlign } : {}),
	};

	const attrs = { ...attributes, ...(anchor ? { id: anchor } : {}) };

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
		...(effectiveTextAlign ? { textAlign: effectiveTextAlign } : {}),
	};

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
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const link = (content.link as string) || (content.url as string) || "";
	const target = (content.target as string) || (content.linkTarget as string) || undefined;
	const variant = content.variant as string | undefined;
	const icon = content.icon as Record<string, unknown> | undefined;
	const iconPosition = (content.iconPosition as string) || "left";
	const iconOnly = content.iconOnly as boolean | undefined;

	const buttonClassName = [
		"wp-block-button__link",
		variant ? `is-style-${variant}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	if (link && link !== "#" && link.trim() !== "") {
		return (
			<a
				href={link}
				target={target}
				rel={target === "_blank" ? "noopener noreferrer" : undefined}
				className={buttonClassName || undefined}
				style={style}
				{...attributes}
			>
				{text}
			</a>
		);
	}

	return (
		<button
			type="button"
			className={buttonClassName || undefined}
			style={style}
			{...attributes}
		>
			{text}
		</button>
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
	const buttons = (data.buttons as Array<Record<string, string>>) || [];
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
				const buttonText = button.text || "";
				const buttonUrl = button.url || "";
				const buttonTarget = button.linkTarget || button.target;
				const hasLink =
					buttonUrl && buttonUrl !== "#" && buttonUrl.trim() !== "";
				const buttonKey = button.id || `${buttonText}-${index}`;

				return (
					<div key={buttonKey} className="wp-block-button">
						{hasLink ? (
							<a
								href={buttonUrl}
								target={buttonTarget}
								rel={
									buttonTarget === "_blank"
										? button.rel || "noopener noreferrer"
										: button.rel
								}
								title={button.title}
								className={`wp-block-button__link ${
									button.className || ""
								}`.trim()}
							>
								{buttonText}
							</a>
						) : (
							<button
								type="button"
								title={button.title}
								className={`wp-block-button__link ${
									button.className || ""
								}`.trim()}
							>
								{buttonText}
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}