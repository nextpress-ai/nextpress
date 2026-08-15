import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { sanitizeHtml } from "@shared/sanitize-html";
import { getRenderProps, parseTextContent, parseStructuredContent, parseHtmlContent, parseMarkdownContent } from "../render-helpers";
import {
	effectiveIconGlyphColor,
	iconContentBoxCss,
	readIconBoxSizeFromStyles,
} from "@shared/icon-block-visuals";
import { LucideGlyph } from "../shared/lucide-glyph";

export * from "./MarkdownBlock";

/**
 * Quote Block Component
 * Renders a blockquote with optional citation
 */
export function QuoteBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	// Quotes store inline HTML in `value` (matches the client block). Fall back to
	// the legacy `{ kind: "text", value }` shape so old quotes still render.
	const raw = (block.content || {}) as Record<string, unknown>;
	const legacy = parseTextContent(block.content);
	const valueHtml =
		typeof raw.value === "string" && raw.value.trim()
			? raw.value
			: legacy.value
				? `<p>${legacy.value as string}</p>`
				: "";
	const citation =
		(raw.citation as string) ||
		(raw.author as string) ||
		(legacy.citation as string | undefined);

	const mergedClassName = ["wp-block-quote", className]
		.filter(Boolean)
		.join(" ");

	// Inline styling must match the client QuoteRenderer so preview and publish
	// look identical (the public renderer has no editor stylesheet to fall back on).
	const quoteStyle: React.CSSProperties = {
		backgroundColor: "#f8fafc",
		borderLeft: "4px solid #e2e8f0",
		padding: "16px 20px",
		borderRadius: "6px",
		fontStyle: "italic",
		fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
		fontSize: "1.125rem",
		lineHeight: 1.7,
		...style,
	};

	return (
		<blockquote
			className={mergedClassName || undefined}
			style={quoteStyle}
			{...attributes}
		>
			<div
				style={{ whiteSpace: "pre-wrap" }}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(valueHtml) }}
			/>
			{citation && (
				<cite
					style={{
						display: "block",
						marginTop: "10px",
						fontSize: "0.95rem",
						color: "#64748b",
					}}
				>
					— {citation}
				</cite>
			)}
		</blockquote>
	);
}

/**
 * List Block Component
 * Renders an ordered or unordered list
 */
export function ListBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	// Lists store their `<li>` items as HTML in `values` (matches the client block).
	const raw = (block.content || {}) as Record<string, unknown>;
	const ordered = !!raw.ordered;
	const valuesHtml = typeof raw.values === "string" ? raw.values : "";

	const mergedClassName = ["wp-block-list", className]
		.filter(Boolean)
		.join(" ");

	// Restore default markers + indent (global CSS reset strips them). Kept in
	// sync with the client list renderer so preview and publish match.
	const listType = raw.type as string | undefined;
	const listStyle: React.CSSProperties = {
		listStyleType: ordered ? "decimal" : "disc",
		paddingLeft: "1.5em",
		...style,
		...(listType && !ordered
			? { listStyleType: listType as React.CSSProperties["listStyleType"] }
			: {}),
	};

	if (valuesHtml.trim()) {
		const start = raw.start as number | undefined;
		const orderedAttrs = ordered
			? {
					...(typeof start === "number" ? { start } : {}),
					...(raw.reversed ? { reversed: true } : {}),
				}
			: {};
		const ListTag = (ordered ? "ol" : "ul") as "ol" | "ul";
		return (
			<ListTag
				className={mergedClassName || undefined}
				style={listStyle}
				{...attributes}
				{...orderedAttrs}
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(valuesHtml) }}
			/>
		);
	}

	// Legacy fallback: `{ kind: "text", value }` with newline-separated items.
	const legacy = parseTextContent(block.content);
	const text = (legacy.value as string) || "";
	const start = legacy.start as number | undefined;
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
				style={listStyle}
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
		<ul className={mergedClassName || undefined} style={listStyle} {...attributes}>
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
	const showLineNumbers = Boolean(data.showLineNumbers);
	const wrapLines = data.wrapLines !== false;
	const showCopyButton = Boolean(data.showCopyButton);
	const [copied, setCopied] = React.useState(false);

	const mergedClassName = [
		"wp-block-code",
		language ? `language-${language}` : "",
		showLineNumbers ? "has-line-numbers" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const lines = codeContent.split("\n");

	const preStyle: React.CSSProperties = {
		backgroundColor: "#1e293b",
		color: "#f8fafc",
		padding: "1rem",
		borderRadius: "6px",
		overflowX: "auto",
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: "0.875rem",
		lineHeight: "1.6",
		...style,
	};

	return (
		<pre className={mergedClassName || undefined} style={preStyle} {...attributes}>
			{language ? (
				<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem", gap: "0.75rem", alignItems: "center" }}>
					{showCopyButton ? (
						<button
							type="button"
							onClick={() => {
								navigator.clipboard
									?.writeText(codeContent)
									.then(() => {
										setCopied(true);
										window.setTimeout(() => setCopied(false), 1500);
									})
									.catch(() => undefined);
							}}
							style={{
								background: "none",
								border: "none",
								padding: 0,
								cursor: "pointer",
								fontSize: "0.75rem",
								color: copied ? "#34d399" : "#94a3b8",
								fontFamily: "sans-serif",
							}}
						>
							{copied ? "Copied" : "Copy"}
						</button>
					) : null}
					<span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em", fontFamily: "sans-serif" }}>
						{language}
					</span>
				</div>
			) : null}
			<code style={{ display: "block", whiteSpace: wrapLines ? "pre-wrap" : "pre", wordBreak: wrapLines ? "break-word" : "normal" }}>
				{showLineNumbers
					? lines.map((line, idx) => (
							<div key={idx} style={{ display: "flex", gap: "1rem" }}>
								<span style={{ color: "#64748b", userSelect: "none", textAlign: "right", minWidth: "1.5rem" }}>
									{idx + 1}
								</span>
								<span style={{ flex: 1 }}>{line || " "}</span>
							</div>
						))
					: codeContent}
			</code>
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
	const data = parseStructuredContent(block.content);
	const legacy = parseTextContent(block.content);
	const valueHtml =
		(typeof data.value === "string" && data.value.trim() && data.value) ||
		(typeof legacy.value === "string" && legacy.value.trim()
			? `<p>${legacy.value}</p>`
			: "");
	const citation =
		(typeof data.citation === "string" && data.citation) ||
		(legacy.citation as string | undefined);

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
				<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(valueHtml) }} />
			</blockquote>
			{citation ? <cite>{citation}</cite> : null}
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
 * Renders an HTML table with headers, body, footers, caption, and styling.
 */
export function TableBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const rawData = parseStructuredContent(block.content) as Record<string, unknown>;
	const data = (rawData?.data && typeof rawData.data === "object" ? rawData.data : rawData) as Record<string, unknown>;

	type NormalizedCell = { content: string; tag: "th" | "td" };
	type NormalizedRow = { cells: NormalizedCell[] };

	let headRows: NormalizedRow[] = [];
	let bodyRows: NormalizedRow[] = [];
	let footRows: NormalizedRow[] = [];

	// 1. Check for modern structured format: { head, body, foot }
	if (Array.isArray(data?.body) || Array.isArray(data?.head) || Array.isArray(data?.foot)) {
		const parseSection = (sec: unknown, defaultTag: "th" | "td"): NormalizedRow[] => {
			if (!Array.isArray(sec)) return [];
			return sec.map((row: any) => {
				if (!row || !Array.isArray(row.cells)) return { cells: [] };
				return {
					cells: row.cells.map((c: any) => ({
						content: typeof c === "string" ? c : (c?.content ?? ""),
						tag: c?.tag === "th" || c?.tag === "td" ? c.tag : defaultTag,
					})),
				};
			});
		};

		headRows = parseSection(data.head, "th");
		bodyRows = parseSection(data.body, "td");
		footRows = parseSection(data.foot, "td");
	}
	// 2. Fallback to legacy format: { headers: string[], rows: string[][] }
	else if (Array.isArray(data?.headers) || Array.isArray(data?.rows)) {
		if (Array.isArray(data.headers) && data.headers.length > 0) {
			headRows = [
				{
					cells: (data.headers as string[]).map((h) => ({ content: String(h ?? ""), tag: "th" })),
				},
			];
		}
		if (Array.isArray(data.rows)) {
			bodyRows = (data.rows as string[][]).map((row) => ({
				cells: Array.isArray(row)
					? row.map((cell) => ({ content: String(cell ?? ""), tag: "td" }))
					: [],
			}));
		}
	}

	const hasFixedLayout = Boolean(data?.hasFixedLayout);
	const isStriped = Boolean(data?.striped);
	const isBordered = data?.bordered !== false;
	const isCompact = Boolean(data?.compact);
	const caption = typeof data?.caption === "string" ? data.caption : "";
	const customClass = typeof data?.className === "string" ? data.className : "";

	const mergedClassName = [
		"wp-block-table",
		hasFixedLayout ? "has-fixed-layout" : "",
		isStriped ? "is-style-stripes" : "",
		customClass,
		className,
	]
		.filter(Boolean)
		.join(" ");

	const tableStyle: React.CSSProperties = {
		borderCollapse: "collapse",
		width: "100%",
		tableLayout: hasFixedLayout ? "fixed" : "auto",
	};

	const cellStyle = (isHeader: boolean, rowIndex?: number): React.CSSProperties => ({
		border: isBordered ? "1px solid #e5e7eb" : "none",
		borderBottom: "1px solid #e5e7eb",
		padding: isCompact ? "4px 8px" : "8px 12px",
		backgroundColor: isHeader
			? "#f8f9fa"
			: isStriped && rowIndex !== undefined && rowIndex % 2 === 1
			? "#f9fafb"
			: "transparent",
		fontWeight: isHeader ? "600" : "normal",
	});

	return (
		<figure
			className={mergedClassName || undefined}
			style={style}
			{...attributes}
		>
			<table style={tableStyle}>
				{caption ? <caption>{caption}</caption> : null}
				{headRows.length > 0 && (
					<thead>
						{headRows.map((row, rowIndex) => (
							<tr key={`head-${rowIndex}`}>
								{row.cells.map((cell, cellIndex) => (
									<th
										key={`head-cell-${cellIndex}`}
										style={cellStyle(true)}
										dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
									/>
								))}
							</tr>
						))}
					</thead>
				)}
				<tbody>
					{bodyRows.length > 0 ? (
						bodyRows.map((row, rowIndex) => (
							<tr key={`body-${rowIndex}`}>
								{row.cells.map((cell, cellIndex) => {
									const CellTag = cell.tag === "th" ? "th" : "td";
									return (
										<CellTag
											key={`body-cell-${cellIndex}`}
											style={cellStyle(cell.tag === "th", rowIndex)}
											dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
										/>
									);
								})}
							</tr>
						))
					) : (
						<tr>
							<td colSpan={headRows[0]?.cells.length || 1} style={{ padding: "8px", textAlign: "center", color: "#666" }}>
								No data
							</td>
						</tr>
					)}
				</tbody>
				{footRows.length > 0 && (
					<tfoot>
						{footRows.map((row, rowIndex) => (
							<tr key={`foot-${rowIndex}`}>
								{row.cells.map((cell, cellIndex) => {
									const CellTag = cell.tag === "th" ? "th" : "td";
									return (
										<CellTag
											key={`foot-cell-${cellIndex}`}
											style={cellStyle(cell.tag === "th")}
											dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
										/>
									);
								})}
							</tr>
						))}
					</tfoot>
				)}
			</table>
		</figure>
	);
}

/**
 * Icon Block Component
 * Renders lucide icons inline for publish/preview; other sets use a visible placeholder.
 */
export function IconBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const icon = (data.icon as Record<string, unknown>) || {};

	const iconSet = (icon.iconSet as string) || "lucide";
	const iconName = (icon.iconName as string) || "star";
	const iconSize = typeof icon.size === "number" ? icon.size : readIconBoxSizeFromStyles(style, 24);
	const iconSizeUnit = typeof icon.sizeUnit === "string" ? icon.sizeUnit : undefined;
	const iconStrokeWidth = typeof icon.strokeWidth === "number" ? icon.strokeWidth : 2;
	const iconStrokeWidthUnit = typeof icon.strokeWidthUnit === "string" ? icon.strokeWidthUnit : undefined;
	const link = data.link as string | undefined;
	const linkTarget = data.linkTarget as string | undefined;
	const label = data.label as string | undefined;

	const glyphColor = effectiveIconGlyphColor(style, {
		color: typeof icon.color === "string" ? icon.color : undefined,
	});
	const sizeUnit = iconSizeUnit || "px";
	const strokeUnit = iconStrokeWidthUnit || "px";
	const strokeWidthProp =
		strokeUnit === "px" ? iconStrokeWidth : `${iconStrokeWidth}${strokeUnit}`;

	const mergedClassName = ["wp-block-icon", className].filter(Boolean).join(" ");

	const iconStyle: React.CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		...iconContentBoxCss({
			size: iconSize,
			sizeUnit: iconSizeUnit,
		}),
		...style,
	};

	const svgContent =
		iconSet === "lucide" ? (
			<span
				className={mergedClassName || undefined}
				style={iconStyle}
				data-icon-set={iconSet}
				data-icon-name={iconName}
				{...attributes}
			>
				<LucideGlyph
					iconName={iconName}
					size={sizeUnit === "px" ? iconSize : "100%"}
					color={glyphColor}
					strokeWidth={strokeWidthProp}
					className="wp-block-icon__glyph shrink-0"
					aria-label={label || undefined}
				/>
			</span>
		) : (
			<svg
				width={sizeUnit === "px" ? iconSize : "100%"}
				height={sizeUnit === "px" ? iconSize : "100%"}
				viewBox="0 0 24 24"
				fill="none"
				stroke={glyphColor}
				strokeWidth={strokeWidthProp}
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