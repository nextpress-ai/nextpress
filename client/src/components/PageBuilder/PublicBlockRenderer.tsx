import type { CSSProperties, JSX, ReactNode } from "react";
import { generateBlockAnimationCSS, getEntryAnimationAttributes } from "@shared/animation-utils";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import {
  type ColumnLayout,
  readColumnsData,
  buildColumnsContainerStyle,
  buildColumnStyle,
} from "@shared/columns-layout";
import {
  getBlockSiblingFlexItemStyles,
  stripBlockContainerPlacementStyles,
  getBlockStackLayerWrapperStyles,
  readContainerLayoutFromBlock,
  getContainerChildrenStackStyle,
  getContainerOuterShellStyle,
  getContainerSiblingStackDirection,
  type BlockStackDirection,
} from "@shared/block-container-placement";
import { generateBlockModifierCSS, resolveTokenMap } from "@/lib/tailwind-tokens";
import { IconRenderer } from "@/components/PageBuilder/blocks/shared/IconRenderer";
import { sanitizeHtml } from "@/components/PageBuilder/utils";
import type { IconReference } from "@/lib/icon-indexes";

type PublicBlockRendererProps = {
  block: BlockConfig;
  /** Sibling stacking direction inside the immediate parent (column cells, canvas, row groups, etc.). */
  stackDirection?: BlockStackDirection;
};

type BlockRenderer = (block: BlockConfig, styles: CSSProperties) => ReactNode;

type TextContent = Extract<BlockContent, { kind: "text" }> & {
  align?: CSSProperties["textAlign"];
  anchor?: string;
  className?: string;
};

type MediaContent = Extract<BlockContent, { kind: "media" }> & {
  align?: string;
  className?: string;
  href?: string;
  linkDestination?: "none" | "media" | "attachment" | "custom";
  linkTarget?: "_self" | "_blank";
  rel?: string;
  sizeSlug?: string;
  target?: string;
  title?: string;
};

type ButtonsData = {
  buttons?: Array<{
    id?: string;
    text?: string;
    url?: string;
    linkTarget?: "_self" | "_blank";
    rel?: string;
    title?: string;
    className?: string;
    icon?: IconReference;
    iconPosition?: "left" | "right";
    iconOnly?: boolean;
  }>;
  className?: string;
  layout?: string;
  orientation?: "horizontal" | "vertical";
};

type ButtonTextContent = TextContent & {
  url?: string;
  linkTarget?: "_self" | "_blank";
  target?: string;
  rel?: string;
  title?: string;
  icon?: IconReference;
  iconPosition?: "left" | "right";
  iconOnly?: boolean;
};

type FileBlockData = {
  href?: string;
  fileName?: string;
  textLinkHref?: string;
  textLinkTarget?: "_self" | "_blank";
  showDownloadButton?: boolean;
  downloadButtonText?: string;
  displayPreview?: boolean;
  fileSize?: string;
  className?: string;
};

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

const publicBlockRenderers: Record<string, BlockRenderer> = {
  "core/audio": renderAudioBlock,
  "core/button": renderButtonBlock,
  "core/buttons": renderButtonsBlock,
  "core/code": renderCodeBlock,
  "core/cover": renderCoverBlock,
  "core/divider": renderDividerBlock,
  "core/file": renderFileBlock,
  "core/gallery": renderGalleryBlock,
  "core/group": renderGroupBlock,
  "core/container": renderContainerBlock,
  "core/heading": renderHeadingBlock,
  "core/html": renderHtmlBlock,
  "core/icon": renderIconBlock,
  "core/image": renderImageBlock,
  "core/columns": renderColumnsBlock,
  "core/list": renderListBlock,
  "core/markdown": renderMarkdownBlock,
  "core/media-text": renderMediaTextBlock,
  "core/paragraph": renderParagraphBlock,
  "core/preformatted": renderPreformattedBlock,
  "core/pullquote": renderPullquoteBlock,
  "core/quote": renderQuoteBlock,
  "core/separator": renderSeparatorBlock,
  "core/spacer": renderSpacerBlock,
  "core/table": renderTableBlock,
  "core/video": renderVideoBlock,
  "post/excerpt": renderParagraphBlock,
  "post/featured-image": renderImageBlock,
  "post/title": renderHeadingBlock,
};

/**
 * Renders published page-builder blocks without importing editor modules.
 * This keeps public routes fast and avoids loading drag/drop, settings panels, and pickers.
 */
export default function PublicBlockRenderer({
  block,
  stackDirection = "column",
}: PublicBlockRendererProps) {
  const { styles, css } = getPublicBlockStyles(block);
  const renderer = publicBlockRenderers[block.name] ?? renderUnsupportedBlock;
  const animationAttributes = block.other?.animation?.entry
    ? getEntryAnimationAttributes(block.other.animation.entry)
    : {};

  const flexItemPlacement = getBlockSiblingFlexItemStyles(block.styles, stackDirection);

  return (
    <div className="block-container w-full">
      <div
        style={{
          width: "100%",
          minWidth: 0,
          ...flexItemPlacement,
          ...getBlockStackLayerWrapperStyles(block),
        }}
      >
        <div
          className={`block-${block.id}`}
          style={{ width: styles.width || "100%" }}
          {...animationAttributes}
        >
          {renderer(block, styles)}
        </div>
      </div>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
    </div>
  );
}

function getPublicBlockStyles(block: BlockConfig): {
  css: string;
  styles: CSSProperties;
} {
  const tokenResolution = block.other?.tokenMap
    ? resolveTokenMap(block.other.tokenMap, block.other?.units || {})
    : null;

  const styles: CSSProperties = stripBlockContainerPlacementStyles({
    ...block.styles,
    ...(tokenResolution?.style || {}),
  });

  const modifierCSS = tokenResolution?.modifierEntries?.length
    ? generateBlockModifierCSS(block.id, tokenResolution.modifierEntries)
    : "";

  const animationCSS = block.other?.animation
    ? generateBlockAnimationCSS(block.id, block.other.animation)
    : "";

  return {
    css: [modifierCSS, animationCSS].filter(Boolean).join("\n"),
    styles,
  };
}

function renderNestedBlocks(
  blocks: BlockConfig[] | undefined,
  stackDirection: BlockStackDirection = "column",
) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return blocks.map((child) => (
    <PublicBlockRenderer
      key={child.id}
      block={child}
      stackDirection={stackDirection}
    />
  ));
}

function getTextContent(content: BlockContent): string {
  return content?.kind === "text" ? content.value : "";
}

function getStructuredData(content: BlockContent): Record<string, unknown> {
  return content?.kind === "structured" && content.data ? content.data : {};
}

/** HTML blocks may use canonical `{ kind: "html", value }` or legacy editor `{ content }`. */
function getHtmlContent(content: BlockContent | undefined): string {
  if (content?.kind === "html") {
    return content.value;
  }
  if (content && typeof content === "object" && "content" in content) {
    const legacy = content as { content?: string };
    if (typeof legacy.content === "string") {
      return legacy.content;
    }
  }
  return "";
}

/** Icon blocks may be structured (`data`) or legacy flat `{ icon, link, ... }`. */
function getIconBlockPayload(content: BlockContent): Record<string, unknown> {
  if (content?.kind === "structured" && content.data && typeof content.data === "object") {
    return content.data as Record<string, unknown>;
  }
  if (content && typeof content === "object" && "icon" in content) {
    return content as unknown as Record<string, unknown>;
  }
  return {};
}

function renderHeadingBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as (TextContent & { level?: number }) | undefined;
  const level = typeof content?.level === "number" ? content.level : 2;
  const safeLevel = Math.min(6, Math.max(1, level));
  const Tag = `h${safeLevel}` as keyof JSX.IntrinsicElements;
  const className = [
    "wp-block-heading",
    content?.textAlign ? `has-text-align-${content.textAlign}` : "",
    content?.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      id={content?.anchor}
      className={className}
      style={{
        fontSize: HEADING_FONT_SIZES[safeLevel],
        fontWeight: HEADING_FONT_WEIGHTS[safeLevel],
        ...styles,
      }}
    >
      {getTextContent(block.content)}
    </Tag>
  );
}

function renderParagraphBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as TextContent | undefined;
  const align = styles.textAlign || content?.textAlign || content?.align;
  const textAlignStyle =
    align === "left" ||
    align === "center" ||
    align === "right" ||
    align === "justify" ||
    align === "start" ||
    align === "end"
      ? align
      : undefined;

  const className = [
    "wp-block-paragraph",
    align ? `has-text-align-${align}` : "",
    content?.dropCap ? "has-drop-cap" : "",
    content?.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p
      id={content?.anchor}
      className={className}
      style={{
        ...styles,
        ...(textAlignStyle ? { textAlign: textAlignStyle } : {}),
      }}
    >
      {getTextContent(block.content)}
    </p>
  );
}

function mapTextAlignToJustifyContent(
  textAlign: CSSProperties["textAlign"] | undefined,
): CSSProperties["justifyContent"] | undefined {
  if (!textAlign) return undefined;
  if (textAlign === "left") return "flex-start";
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "flex-end";
  return undefined;
}

function renderButtonBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as ButtonTextContent | undefined;
  const url = content?.url || "#";
  const target = content?.linkTarget || content?.target;
  const className = ["wp-block-button", content?.className || ""].filter(Boolean).join(" ");
  const icon = content?.icon;
  const iconPosition = content?.iconPosition || "left";
  const iconOnly = content?.iconOnly || false;
  const textContent = getTextContent(block.content);

  const iconElement = icon ? (
    <IconRenderer
      icon={icon}
      size={icon.size || 16}
      color="currentColor"
      strokeWidth={icon.strokeWidth || 2}
      style={{ flexShrink: 0 }}
    />
  ) : null;

  const label = iconOnly && icon ? content?.title || textContent || undefined : undefined;
  const justifyFromTextAlign = mapTextAlignToJustifyContent(styles?.textAlign);
  const justifyContent =
    (styles?.justifyContent as CSSProperties["justifyContent"] | undefined) ??
    justifyFromTextAlign ??
    "center";

  return (
    <div className={className} role="presentation">
      <a
        className="wp-block-button__link wp-element-button"
        href={url}
        target={target}
        rel={content?.rel}
        title={label}
        style={{
          ...styles,
          display: "inline-flex",
          alignItems: (styles?.alignItems as CSSProperties["alignItems"]) ?? "center",
          justifyContent,
          gap: iconElement && !iconOnly ? "6px" : undefined,
        }}
      >
        {iconElement && iconPosition === "left" ? iconElement : null}
        {!iconOnly ? textContent : null}
        {iconElement && iconPosition === "right" ? iconElement : null}
      </a>
    </div>
  );
}

function renderButtonsBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content) as ButtonsData;
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  const orientation = data.orientation || "horizontal";
  const layout = data.layout || "flex-start";
  const className = [
    "wp-block-buttons",
    orientation === "vertical" ? "is-vertical" : "",
    layout === "center" ? "is-content-justification-center" : "",
    layout === "right" ? "is-content-justification-right" : "",
    layout === "space-between" ? "is-content-justification-space-between" : "",
    data.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{
        ...styles,
        alignItems: orientation === "vertical" ? "flex-start" : "center",
        display: "flex",
        flexDirection: orientation === "vertical" ? "column" : "row",
        flexWrap: "wrap",
        gap: "0.5em",
        justifyContent: layout,
      }}
    >
      {buttons.map((button, index) => {
        const icon = button.icon;
        const iconPosition = button.iconPosition || "left";
        const iconOnly = button.iconOnly || false;
        const iconElement = icon ? (
          <IconRenderer
            icon={icon}
            size={icon.size || 16}
            color="#ffffff"
            strokeWidth={icon.strokeWidth || 2}
            style={{ flexShrink: 0 }}
          />
        ) : null;

        return (
          <div
            key={button.id || `${button.url}-${index}`}
            className={["wp-block-button", button.className || ""].filter(Boolean).join(" ")}
          >
            <a
              className="wp-block-button__link"
              href={button.url || "#"}
              target={button.linkTarget}
              rel={button.rel}
              title={iconOnly && icon ? button.title || button.text : button.title}
              style={{
                backgroundColor: "#007cba",
                border: "none",
                borderRadius: "4px",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "16px",
                fontWeight: "600",
                gap: iconElement && !iconOnly ? "6px" : undefined,
                justifyContent: "center",
                padding: "12px 24px",
                textDecoration: "none",
              }}
            >
              {iconElement && iconPosition === "left" ? iconElement : null}
              {!iconOnly ? button.text || "Button" : null}
              {iconElement && iconPosition === "right" ? iconElement : null}
            </a>
          </div>
        );
      })}
    </div>
  );
}

function renderImageBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as MediaContent | undefined;
  const url = content?.kind === "media" && content.mediaType === "image" ? content.url : "";
  if (!url) return null;

  const linkHref =
    content?.linkDestination === "custom" && content.href
      ? content.href
      : content?.linkDestination === "media"
        ? url
        : undefined;

  const image = (
    <img src={url} alt={content?.alt || ""} style={{ ...styles }} draggable={false} />
  );

  return (
    <figure
      className={[
        "wp-block-image",
        content?.sizeSlug ? `size-${content.sizeSlug}` : "",
        content?.align ? `align${content.align}` : "",
        styles.width || styles.height ? "is-resized" : "",
        content?.className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ margin: styles.margin, padding: styles.padding }}
    >
      {linkHref ? (
        <a href={linkHref} target={content?.linkTarget || content?.target} rel={content?.rel} title={content?.title}>
          {image}
        </a>
      ) : (
        image
      )}
      {content?.caption ? <figcaption className="wp-element-caption">{content.caption}</figcaption> : null}
    </figure>
  );
}

function renderVideoBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as MediaContent | undefined;
  const url = content?.kind === "media" && content.mediaType === "video" ? content.url : "";
  if (!url) return null;

  return (
    <figure className="wp-block-video" style={{ margin: styles.margin }}>
      <video controls src={url} style={{ ...styles, width: styles.width || "100%" }}>
        <track kind="captions" />
      </video>
      {content?.caption ? <figcaption className="wp-element-caption">{content.caption}</figcaption> : null}
    </figure>
  );
}

function renderAudioBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as MediaContent | undefined;
  const url = content?.kind === "media" && content.mediaType === "audio" ? content.url : "";
  if (!url) return null;

  return (
    <figure className="wp-block-audio" style={{ margin: styles.margin }}>
      <audio controls src={url} style={{ width: styles.width || "100%" }}>
        <track kind="captions" />
      </audio>
      {content?.caption ? <figcaption className="wp-element-caption">{content.caption}</figcaption> : null}
    </figure>
  );
}

function renderSpacerBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const height = typeof data.height === "string" ? data.height : styles.height || "40px";
  return <div aria-hidden="true" className="wp-block-spacer" style={{ ...styles, height }} />;
}

function renderSeparatorBlock(_block: BlockConfig, styles: CSSProperties) {
  return <hr className="wp-block-separator" style={styles} />;
}

function renderDividerBlock(_block: BlockConfig, styles: CSSProperties) {
  return <hr className="wp-block-divider" style={styles} />;
}

function renderContainerBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as Record<string, unknown> | undefined;
  const tagName = typeof content?.tagName === "string" ? content.tagName : "div";
  const Tag = tagName as keyof JSX.IntrinsicElements;
  const layout = readContainerLayoutFromBlock({ styles: block.styles, content });
  const stackDirection = getContainerSiblingStackDirection(layout);
  const outerStyle = getContainerOuterShellStyle(block.styles, { children: block.children });
  const innerStyle = getContainerChildrenStackStyle(layout, {
    shellStyles: block.styles,
    children: block.children,
  });
  return (
    <Tag
      className={["wp-block-container", typeof content?.className === "string" ? content.className : ""]
        .filter(Boolean)
        .join(" ")}
      style={outerStyle}
    >
      <div className="wp-block-container__inner" style={innerStyle}>
        {renderNestedBlocks(block.children, stackDirection)}
      </div>
    </Tag>
  );
}

function renderGroupBlock(block: BlockConfig, styles: CSSProperties) {
  const content = block.content as Record<string, unknown> | undefined;
  const tagName = typeof content?.tagName === "string" ? content.tagName : "div";
  const Tag = tagName as keyof JSX.IntrinsicElements;
  const display = typeof content?.display === "string" ? content.display : "block";
  const gap = typeof content?.gap === "string" ? content.gap : "0px";
  const flexDir = typeof content?.flexDirection === "string" ? content.flexDirection : "column";
  const groupStackDirection: BlockStackDirection =
    flexDir === "row" || flexDir === "row-reverse" ? "row" : "column";

  return (
    <Tag
      className={["wp-block-group", typeof content?.className === "string" ? content.className : ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...styles,
        alignItems: content?.alignItems as CSSProperties["alignItems"],
        display,
        flexDirection: content?.flexDirection as CSSProperties["flexDirection"],
        flexWrap: content?.flexWrap as CSSProperties["flexWrap"],
        gap,
        gridTemplateColumns: content?.gridTemplateColumns as CSSProperties["gridTemplateColumns"],
        justifyContent: content?.justifyContent as CSSProperties["justifyContent"],
        overflow: content?.overflow as CSSProperties["overflow"],
      }}
    >
      <div className="wp-block-group__inner-container">
        {renderNestedBlocks(block.children, groupStackDirection)}
      </div>
    </Tag>
  );
}

function renderCoverBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const imageUrl = typeof data.url === "string" ? data.url : "";
  const overlay = typeof data.overlayColor === "string" ? data.overlayColor : "rgba(0,0,0,0.35)";

  return (
    <div
      className="wp-block-cover"
      style={{
        ...styles,
        backgroundImage: imageUrl ? `linear-gradient(${overlay}, ${overlay}), url(${imageUrl})` : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
        minHeight: styles.minHeight || "320px",
      }}
    >
      <div className="wp-block-cover__inner-container">{renderNestedBlocks(block.children)}</div>
    </div>
  );
}

function renderGalleryBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const images = Array.isArray(data.images) ? data.images : [];

  return (
    <figure
      className="wp-block-gallery"
      style={{
        ...styles,
        display: "grid",
        gap: styles.gap || "16px",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {images.map((image, index) => {
        if (!image || typeof image !== "object") return null;
        const item = image as { alt?: string; caption?: string; id?: string; url?: string };
        if (!item.url) return null;
        return (
          <figure key={item.id || `${item.url}-${index}`} className="wp-block-image">
            <img src={item.url} alt={item.alt || ""} />
            {item.caption ? <figcaption className="wp-element-caption">{item.caption}</figcaption> : null}
          </figure>
        );
      })}
    </figure>
  );
}

function renderListBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const items = Array.isArray(data.items) ? data.items.map(String) : [getTextContent(block.content)].filter(Boolean);
  const ordered = Boolean(data.ordered);
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className="wp-block-list" style={styles}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </Tag>
  );
}

function renderQuoteBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const text = typeof data.text === "string" ? data.text : getTextContent(block.content);
  const citation = typeof data.citation === "string" ? data.citation : "";

  return (
    <blockquote className="wp-block-quote" style={styles}>
      <p>{text}</p>
      {citation ? <cite>{citation}</cite> : null}
    </blockquote>
  );
}

function renderPullquoteBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const text = typeof data.text === "string" ? data.text : getTextContent(block.content);
  const citation = typeof data.citation === "string" ? data.citation : "";

  return (
    <figure className="wp-block-pullquote" style={styles}>
      <blockquote>
        <p>{text}</p>
        {citation ? <cite>{citation}</cite> : null}
      </blockquote>
    </figure>
  );
}

function renderMediaTextBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const mediaUrl = typeof data.mediaUrl === "string" ? data.mediaUrl : "";
  const mediaAlt = typeof data.mediaAlt === "string" ? data.mediaAlt : "";

  return (
    <div
      className="wp-block-media-text"
      style={{
        ...styles,
        display: "grid",
        gap: styles.gap || "24px",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {mediaUrl ? <img src={mediaUrl} alt={mediaAlt} /> : null}
      <div className="wp-block-media-text__content">{renderNestedBlocks(block.children)}</div>
    </div>
  );
}

function renderCodeBlock(block: BlockConfig, styles: CSSProperties) {
  return (
    <pre className="wp-block-code" style={styles}>
      <code>{getTextContent(block.content)}</code>
    </pre>
  );
}

function renderPreformattedBlock(block: BlockConfig, styles: CSSProperties) {
  return (
    <pre className="wp-block-preformatted" style={styles}>
      {getTextContent(block.content)}
    </pre>
  );
}

function renderMarkdownBlock(block: BlockConfig, styles: CSSProperties) {
  return (
    <div className="wp-block-markdown whitespace-pre-wrap" style={styles}>
      {getTextContent(block.content)}
    </div>
  );
}

function renderHtmlBlock(block: BlockConfig, styles: CSSProperties) {
  const html = sanitizeHtml(getHtmlContent(block.content));
  return <div className="wp-block-html" style={styles} dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderTableBlock(block: BlockConfig, styles: CSSProperties) {
  const data = getStructuredData(block.content);
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <figure className="wp-block-table" style={styles}>
      <table>
        <tbody>
          {rows.map((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : [];
            return (
              <tr key={`row-${rowIndex}`}>
                {cells.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`}>{String(cell)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

function renderColumnsBlock(block: BlockConfig, styles: CSSProperties) {
  const data = readColumnsData(block.content);
  const layout =
    (block.settings?.columnLayout as ColumnLayout[] | undefined) || [
      { columnId: "default-col-1", width: "100%", blockIds: [] },
    ];
  const children = block.children || [];
  const layoutMode = data.layoutMode || "flex";
  const direction = data.direction || "row";

  const columnVerticalAlignment = data.columnVerticalAlignment || "top";
  const columnHorizontalAlignment = data.columnHorizontalAlignment || "stretch";

  const columnAlignItems = {
    stretch: "stretch",
    left: "flex-start",
    center: "center",
    right: "flex-end",
  }[columnHorizontalAlignment];

  const columnJustifyContent = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
    stretch: "stretch",
  }[columnVerticalAlignment];

  const containerStyle = buildColumnsContainerStyle(data, layout, styles);

  return (
    <div className="wp-block-columns" style={containerStyle}>
      {layout.map((column) => {
        const columnChildren = children.filter((child) => column.blockIds.includes(child.id));
        const columnStyle = buildColumnStyle(data, layoutMode, direction, column, layout);

        return (
          <div
            key={column.columnId}
            className="wp-block-column"
            style={{
              ...columnStyle,
              alignItems: columnAlignItems,
              display: "flex",
              flexDirection: "column",
              justifyContent: columnJustifyContent,
            }}
          >
            {columnChildren.map((child) => (
              <PublicBlockRenderer key={child.id} block={child} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function renderIconBlock(block: BlockConfig, styles: CSSProperties) {
  const d = getIconBlockPayload(block.content);
  const iconRaw = (d.icon as Record<string, unknown>) || {};
  const icon: IconReference = {
    iconSet: (iconRaw.iconSet as IconReference["iconSet"]) || "lucide",
    iconName: typeof iconRaw.iconName === "string" ? iconRaw.iconName : "star",
    size: typeof iconRaw.size === "number" ? iconRaw.size : 24,
    color: typeof iconRaw.color === "string" ? iconRaw.color : "currentColor",
    strokeWidth: typeof iconRaw.strokeWidth === "number" ? iconRaw.strokeWidth : 2,
  };
  const link = typeof d.link === "string" ? d.link : "";
  const linkTarget = d.linkTarget === "_blank" ? "_blank" : "_self";
  const label = typeof d.label === "string" ? d.label : "";

  const wrapperStyle: CSSProperties = {
    ...styles,
    alignItems: "center",
    display: "inline-flex",
    justifyContent: "center",
  };

  const inner = (
    <span className="wp-block-icon" style={wrapperStyle}>
      <IconRenderer
        icon={icon}
        className="wp-block-icon__glyph"
        aria-label={label || undefined}
      />
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

function getFileBlockData(content: BlockContent): FileBlockData {
  if (content?.kind === "structured" && content.data && typeof content.data === "object") {
    return content.data as FileBlockData;
  }
  return {};
}

function renderFileBlock(block: BlockConfig, styles: CSSProperties) {
  const blockData = getFileBlockData(block.content);
  const url = blockData?.href || "";
  const fileName = blockData?.fileName || "";
  const textLinkHref = blockData?.textLinkHref || url;
  const textLinkTarget = blockData?.textLinkTarget || "_self";
  const showDownloadButton = blockData?.showDownloadButton !== false;
  const downloadButtonText = blockData?.downloadButtonText || "Download";
  const displayPreview = blockData?.displayPreview !== false;
  const fileSize = blockData?.fileSize || "";

  const className = ["wp-block-file", blockData?.className || ""].filter(Boolean).join(" ");
  const fileExtension = fileName ? fileName.split(".").pop()?.toUpperCase() : "";

  if (!url) {
    return null;
  }

  const downloadGlyph = (
    <IconRenderer
      icon={{ iconSet: "lucide", iconName: "download", size: 16, color: "currentColor", strokeWidth: 2 }}
      size={16}
      style={{ flexShrink: 0 }}
    />
  );

  return (
    <div className={className} style={styles}>
      <div className="wp-block-file__content-wrapper">
        {displayPreview ? (
          <div className="wp-block-file__preview">
            <div style={{ alignItems: "center", display: "flex", marginBottom: "1em" }}>
              <IconRenderer
                icon={{ iconSet: "lucide", iconName: "file", size: 32, color: "#4b5563", strokeWidth: 2 }}
                size={32}
                style={{ flexShrink: 0, marginRight: "12px" }}
              />
              <div>
                <div className="file-name font-medium">
                  <a
                    href={textLinkHref}
                    rel={textLinkTarget === "_blank" ? "noopener noreferrer" : undefined}
                    style={{ color: "#007cba", textDecoration: "none" }}
                    target={textLinkTarget}
                  >
                    {fileName || "Download File"}
                  </a>
                </div>
                {(fileExtension || fileSize) && (
                  <div className="file-details text-sm text-gray-500">
                    {fileExtension ? <span>{fileExtension}</span> : null}
                    {fileExtension && fileSize ? <span> • </span> : null}
                    {fileSize ? <span>{fileSize}</span> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {showDownloadButton ? (
          <div className="wp-block-file__button-container">
            <a
              className="wp-block-file__button"
              download={fileName}
              href={url}
              style={{
                alignItems: "center",
                backgroundColor: "#007cba",
                borderRadius: "4px",
                color: "#ffffff",
                display: "inline-flex",
                fontSize: "16px",
                fontWeight: "600",
                gap: "8px",
                padding: "12px 24px",
                textDecoration: "none",
              }}
            >
              {downloadGlyph}
              {downloadButtonText}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderUnsupportedBlock(block: BlockConfig, styles: CSSProperties) {
  return (
    <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500" style={styles}>
      {block.label || block.name} block is not available in the public renderer yet.
    </div>
  );
}
