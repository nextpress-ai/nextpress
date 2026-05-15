import * as React from "react";
import type { BlockData } from "../block-types";

export * from "./MarkdownBlock";

/**
 * Quote Block Component
 * Renders a blockquote with optional citation
 */
export function QuoteBlock(props: BlockData) {
  const { content, citation, className, style, attributes } = props as Extract<
    BlockData,
    { blockName: "core/quote" }
  >;

  const mergedClassName = ["wp-block-quote", className]
    .filter(Boolean)
    .join(" ");

  return (
    <blockquote
      className={mergedClassName || undefined}
      style={style}
      {...attributes}
    >
      <p>{content || ""}</p>
      {citation && <cite>{citation}</cite>}
    </blockquote>
  );
}

/**
 * List Block Component
 * Renders an ordered or unordered list
 */
export function ListBlock(props: BlockData) {
  const { content, ordered, start, className, style, attributes } =
    props as Extract<BlockData, { blockName: "core/list" }>;

  const mergedClassName = ["wp-block-list", className]
    .filter(Boolean)
    .join(" ");

  // Parse content into list items (simple line break splitting)
  const items = content
    ? content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  if (ordered) {
    return (
      <ol
        className={mergedClassName || undefined}
        style={style}
        start={start}
        {...attributes}
      >
        {items.map((item, index) => {
          // Use item content + index as key for stability
          const itemKey = `${item}-${index}`;
          return <li key={itemKey}>{item}</li>;
        })}
      </ol>
    );
  }

  return (
    <ul className={mergedClassName || undefined} style={style} {...attributes}>
      {items.map((item, index) => {
        // Use item content + index as key for stability
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
export function CodeBlock(props: BlockData) {
  const { content, language, className, style, attributes } = props as Extract<
    BlockData,
    { blockName: "core/code" }
  >;

  const mergedClassName = [
    "wp-block-code",
    language ? `language-${language}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <pre className={mergedClassName || undefined} style={style} {...attributes}>
      <code>{content || ""}</code>
    </pre>
  );
}

/**
 * HTML Block Component
 * Renders raw HTML content
 */
export function HtmlBlock(props: BlockData) {
  const { content, className, style, attributes } = props as Extract<
    BlockData,
    { blockName: "core/html" }
  >;

  const mergedClassName = ["wp-block-html", className]
    .filter(Boolean)
    .join(" ");

  // HTML blocks intentionally use dangerouslySetInnerHTML to render raw HTML
  // In production, content should be sanitized before reaching this point
  // eslint-disable-next-line react/no-danger
  return (
    <div
      className={mergedClassName || undefined}
      style={style}
      {...attributes}
      dangerouslySetInnerHTML={{ __html: content || "" }}
    />
  );
}

/**
 * Pullquote Block Component
 * Renders a pullquote (highlighted quote) with optional citation
 */
export function PullquoteBlock(props: BlockData) {
  const { content, citation, className, style, attributes } = props as Extract<
    BlockData,
    { blockName: "core/pullquote" }
  >;

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
        <p>{content || ""}</p>
      </blockquote>
      {citation && <cite>{citation}</cite>}
    </figure>
  );
}

/**
 * Preformatted Block Component
 * Renders preformatted text (preserves whitespace)
 */
export function PreformattedBlock(props: BlockData) {
  const { content, className, style, attributes } = props as Extract<
    BlockData,
    { blockName: "core/preformatted" }
  >;

  const mergedClassName = ["wp-block-preformatted", className]
    .filter(Boolean)
    .join(" ");

  return (
    <pre className={mergedClassName || undefined} style={style} {...attributes}>
      {content || ""}
    </pre>
  );
}

/**
 * Table Block Component
 * Renders an HTML table with headers and rows
 */
export function TableBlock(props: BlockData) {
  const { headers, rows, hasFixedLayout, className, style, attributes } =
    props as Extract<BlockData, { blockName: "core/table" }>;

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
                // Use header content + index as key for stability
                const headerKey = `${header}-${index}`;
                return <th key={headerKey}>{header}</th>;
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {rows && rows.length > 0 ? (
            rows.map((row, rowIndex) => {
              // Use row content + index as key for stability
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
export function IconBlock(props: BlockData) {
  const {
    iconSet,
    iconName,
    iconSize,
    iconSizeUnit,
    iconColor,
    iconStrokeWidth,
    iconStrokeWidthUnit,
    link,
    linkTarget,
    label,
    className,
    style,
    attributes,
  } = props as Extract<BlockData, { blockName: "core/icon" }>;

  const sizeNum = iconSize || 24;
  const sizeUnit = iconSizeUnit || "px";
  const boxW =
    sizeUnit === "px" ? sizeNum : `${sizeNum}${sizeUnit}`;
  const boxH = boxW;
  const color = iconColor || "currentColor";
  const strokeU = iconStrokeWidthUnit || "px";
  const strokeWidthVal =
    strokeU === "px"
      ? String(iconStrokeWidth || 2)
      : `${iconStrokeWidth || 2}${strokeU}`;
  const svgW = sizeUnit === "px" ? sizeNum : "100%";
  const svgH = sizeUnit === "px" ? sizeNum : "100%";

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
      stroke={color}
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
