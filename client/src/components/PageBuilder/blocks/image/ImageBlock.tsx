import React, { useCallback } from "react";
import type { JSX } from "react";
import { Image as ImageIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { useImageResize } from "./use-image-resize";
import { type ImageContent, DEFAULT_CONTENT } from "./image-model";
import { ImageSettings } from "./image-settings";

// ============================================================================
// RENDERER
// ============================================================================

interface ImageRendererProps {
  content: ImageContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  isSelected?: boolean;
  onStylesChange?: (updates: Partial<React.CSSProperties>) => void;
}

const HANDLE_BASE_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 12,
  height: 12,
  background: "#3b82f6",
  border: "2px solid #fff",
  borderRadius: "50%",
  zIndex: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
};

function ImageRenderer({
  content,
  styles,
  isEditing,
  isSelected,
  onStylesChange,
}: ImageRendererProps): JSX.Element | null {
  const url = content?.kind === "media" && content.mediaType === "image" ? content.url : "";
  const alt = content?.alt;
  const caption = content?.caption;
  const align = content?.align;
  const sizeSlug = content?.sizeSlug;
  const className = content?.className;
  const linkDestination = content?.linkDestination || "none";
  const href = content?.href;
  const linkTarget = content?.linkTarget || content?.target;
  const rel = content?.rel;
  const title = content?.title;

  const showHandles = isEditing && isSelected;

  const handleResizeEnd = useCallback(
    (width: number) => {
      onStylesChange?.({ width: `${width}px`, height: "auto" });
    },
    [onStylesChange],
  );

  const { imgRef, createHandleMouseDown } = useImageResize({
    onResizeEnd: handleResizeEnd,
  });

  if (!url) return null;

  const wrapperClasses = [
    "wp-block-image",
    sizeSlug ? `size-${sizeSlug}` : "",
    align ? `align${align}` : "",
    styles?.width || styles?.height ? "is-resized" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const imgEl = (
    <img
      ref={showHandles ? imgRef : undefined}
      src={url}
      alt={alt}
      style={{ ...styles }}
      draggable={false}
    />
  );

  const linkHref =
    linkDestination === "custom" && href
      ? href
      : linkDestination === "media"
        ? url
        : undefined;

  const contentEl = linkHref ? (
    <a href={linkHref} target={linkTarget} rel={rel} title={title}>
      {imgEl}
    </a>
  ) : (
    imgEl
  );

  return (
    <figure
      className={wrapperClasses}
      style={{ padding: styles?.padding, margin: styles?.margin, position: "relative" }}
    >
      {contentEl}
      {caption ? <figcaption className="wp-element-caption">{caption}</figcaption> : null}

      {showHandles && (
        <>
          <div
            onMouseDown={createHandleMouseDown("bottom-right")}
            style={{
              ...HANDLE_BASE_STYLE,
              bottom: caption ? 28 : -6,
              right: -6,
              cursor: "nwse-resize",
            }}
            title="Drag to resize"
          />
          <div
            onMouseDown={createHandleMouseDown("bottom-left")}
            style={{
              ...HANDLE_BASE_STYLE,
              bottom: caption ? 28 : -6,
              left: -6,
              cursor: "nesw-resize",
            }}
            title="Drag to resize"
          />
        </>
      )}
    </figure>
  );
}

// ============================================================================
// INTERACTIVE WRAPPER (hooks for resize)
// ============================================================================

type ImageBlockViewProps = {
  content: ImageContent;
  styles?: React.CSSProperties;
  setStyles: (next: React.CSSProperties | ((prev: React.CSSProperties | undefined) => React.CSSProperties | undefined)) => void;
  isPreview?: boolean;
  isSelected?: boolean;
};

function ImageBlockView({
  content,
  styles,
  setStyles,
  isPreview,
  isSelected,
}: ImageBlockViewProps): JSX.Element | null {
  const handleStylesChange = useCallback(
    (updates: Partial<React.CSSProperties>) => {
      setStyles((prev) => ({ ...prev, ...updates }));
    },
    [setStyles],
  );

  return (
    <ImageRenderer
      content={content}
      styles={styles}
      isEditing={!isPreview}
      isSelected={isSelected}
      onStylesChange={handleStylesChange}
    />
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ImageBlock = createBlockDefinition<ImageContent>({
  id: "core/image",
  label: "Image",
  icon: ImageIcon,
  description: "Add an image",
  category: "media",
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    width: "100%",
    maxWidth: "100%",
    height: "auto",
  },
  settings: ImageSettings,
  hasSettings: true,
  render: ({ content, styles, setStyles, isPreview, isSelected }) => (
    <ImageBlockView
      content={content}
      styles={styles}
      setStyles={setStyles}
      isPreview={isPreview}
      isSelected={isSelected}
    />
  ),
});

export default ImageBlock;
