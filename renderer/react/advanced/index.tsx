import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseTextContent, parseStructuredContent, parseHtmlContent, parseMarkdownContent } from "../render-helpers";

export * from "./MarkdownBlock";

/**
 * Quote Block Component
 * Renders a blockquote with optional citation
 */
export function QuoteBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const citation = content.citation as string | undefined;

	const mergedClassName = ["wp-block-quote", className]
		.filter(Boolean)
		.join(" ");

	return (
		<blockquote
			className={mergedClassName || undefined}
			style={style}
			{...attributes}
		>
			<p>{text}</p>
			{citation && <cite>{citation}</cite>}
		</blockquote>
	);
}

/**
 * List Block Component
 * Renders an ordered or unordered list
 */
export function ListBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const ordered = content.ordered as boolean | undefined;
	const start = content.start as number | undefined;

	const mergedClassName = ["wp-block-list", className]
		.filter(Boolean)
		.join(" ");

	// Parse content into list items (simple line break splitting)
	const items = text
		? text
				.split("\n")
				.map((line: string) => line.trim())
				.filter((line: string) => line.length > 0)
		: [];

	if (ordered) {
		return (
			<ol
				className={mergedClassName || undefined}
				style={style}
				start={start}
				{...attributes}
			>
				{items.map((item: string, index: number) => {
					const itemKey = `${item}-${index}`;
					return <li key={itemKey}>{item}</li>;
				})}
			</ol>
		);
	}

	return (
		<ul className={mergedClassName || undefined} style={style} {...attributes}>
			{items.map((item: string, index: number) => {
				const itemKey = `${item}-${index}`;
				return <li key={itemKey}>{item}</li>;
			})}
		</ul>
	);
}

/**
 * Code Block Component
 * Renders code with optional language syntax highlighting class
 */
export function CodeBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const codeContent = (data.content as string) || "";
	const language = data.language as string | undefined;

	const mergedClassName = [
		"wp-block-code",
		language ? `language-${language}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<pre className={mergedClassName || undefined} style={style} {...attributes}>
			<code>{codeContent}</code>
		</pre>
	);
}

/**
 * HTML Block Component
 * Renders raw HTML content with basic sanitization.
 */
export function HtmlBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const { content: htmlContent } = parseHtmlContent(block.content);

	const mergedClassName = ["wp-block-html", className]
		.filter(Boolean)
		.join(" ");

	// Basic HTML sanitization — remove script tags and dangerous attributes
	const sanitized = htmlContent
		? htmlContent
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
				.replace(/on\w+="[^"]*"/gi, "")
				.replace(/javascript:/gi, "")
				.replace(/vbscript:/gi, "")
		: "";

	// HTML blocks intentionally use dangerouslySetInnerHTML to render raw HTML
	// eslint-disable-next-line react/no-danger
	return (
		<div
			className={mergedClassName || undefined}
			style={style}
			{...attributes}
			dangerouslySetInnerHTML={{ __html: sanitized }}
		/>
	);
}

/**
 * Pullquote Block Component
 * Renders a pullquote (highlighted quote) with optional citation
 */
export function PullquoteBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseTextContent(block.content);
	const text = (content.value as string) || "";
	const citation = content.citation as string | undefined;

	const mergedClassName = ["wp-block-pullquote", className]
		.filter(Boolean)
		.join(" ");

	return (
		<figure
			className={mergedClassName || undefined}
			style={style}
			{...attributes}
		>
			<blockquote>
				<p>{text}</p>
			</blockquote>
			{citation && <cite>{citation}</cite>}
		</figure>
	);
}

/**
 * Preformatted Block Component
 * Renders preformatted text (preserves whitespace)
 */
export function PreformattedBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const text = (data.content as string) || "";

	const mergedClassName = ["wp-block-preformatted", className]
		.filter(Boolean)
		.join(" ");

	return (
		<pre className={mergedClassName || undefined} style={style} {...attributes}>
			{text}
		</pre>
	);
}

/**
 * Table Block Component
 * Renders an HTML table with headers and rows
 */
export function TableBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const headers = data.headers as string[] | undefined;
	const rows = data.rows as string[][] | undefined;
	const hasFixedLayout = (data.hasFixedLayout as boolean) || false;

	const mergedClassName = [
		"wp-block-table",
		hasFixedLayout ? "is-style-fixed" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const tableStyle: React.CSSProperties = {
		...style,
		...(hasFixedLayout ? { tableLayout: "fixed" } : {}),
	};

	return (
		<figure
			className={mergedClassName || undefined}
			style={style}
			{...attributes}
		>
			<table style={tableStyle}>
				{headers && headers.length > 0 && (
					<thead>
						<tr>
							{headers.map((header, index) => {
								const headerKey = `${header}-${index}`;
								return <th key={headerKey}>{header}</th>;
							})}
						</tr>
					</thead>
				)}
				<tbody>
					{rows && rows.length > 0 ? (
						rows.map((row, rowIndex) => {
							const rowKey = `${row.join("-")}-${rowIndex}`;
							return (
								<tr key={rowKey}>
									{row.map((cell, cellIndex) => {
										const cellKey = `${cell}-${cellIndex}`;
										return <td key={cellKey}>{cell}</td>;
									})}
								</tr>
							);
						})
					) : (
						<tr>
							<td colSpan={headers?.length || 1}>No data</td>
						</tr>
					)}
				</tbody>
			</table>
		</figure>
	);
}

/**
 * Icon Block Component
 * Renders an icon from various icon sets as an SVG placeholder for SSR.
 * At SSR time, lucide icons render as inline SVGs; other sets render placeholders
 * that hydrate client-side.
 */
export function IconBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const icon = (data.icon as Record<string, unknown>) || {};

	const iconSet = (icon.iconSet as string) || "lucide";
	const iconName = (icon.iconName as string) || "star";
	const iconSize = (icon.size as number) || 24;
	const iconSizeUnit = typeof icon.sizeUnit === "string" ? icon.sizeUnit as string : undefined;
	const iconColor = (icon.color as string) || "currentColor";
	const iconStrokeWidth = (icon.strokeWidth as number) || 2;
	const iconStrokeWidthUnit = typeof icon.strokeWidthUnit === "string" ? icon.strokeWidthUnit as string : undefined;
	const link = data.link as string | undefined;
	const linkTarget = data.linkTarget as string | undefined;
	const label = data.label as string | undefined;

	const sizeUnit = iconSizeUnit || "px";
	const boxW = sizeUnit === "px" ? iconSize : `${iconSize}${sizeUnit}`;
	const boxH = boxW;
	const strokeU = iconStrokeWidthUnit || "px";
	const strokeWidthVal =
		strokeU === "px"
			? String(iconStrokeWidth)
			: `${iconStrokeWidth}${strokeU}`;
	const svgW = sizeUnit === "px" ? iconSize : "100%";
	const svgH = sizeUnit === "px" ? iconSize : "100%";

	const mergedClassName = ["wp-block-icon", className]
		.filter(Boolean)
		.join(" ");

	const iconStyle: React.CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: boxW,
		height: boxH,
		...style,
	};

	// Render inline SVG placeholder for SSR
	const svgContent = (
		<svg
			width={svgW}
			height={svgH}
			viewBox="0 0 24 24"
			fill="none"
			stroke={iconColor}
			strokeWidth={strokeWidthVal}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-label={label || undefined}
			role={label ? "img" : "presentation"}
			className={mergedClassName || undefined}
			style={iconStyle}
			data-icon-set={iconSet}
			data-icon-name={iconName}
			{...attributes}
		>
			<rect x="3" y="3" width="18" height="18" rx="2" opacity="0.15" />
			<circle cx="12" cy="12" r="3" opacity="0.3" />
		</svg>
	);

	if (link && link !== "#") {
		return (
			<a
				href={link}
				target={linkTarget}
				rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
				title={label || undefined}
				style={{ textDecoration: "none", display: "inline-flex" }}
			>
				{svgContent}
			</a>
		);
	}

	return svgContent;
}