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

const HANDLE_POSITIONS = {
  'bottom-right': { bottom: -6, right: -6 },
  'bottom-left': { bottom: -6, left: -6 },
} as const;

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

  const { imgRef, createHandleMouseDown, resizeByKeyboard } = useImageResize({
    onResizeEnd: handleResizeEnd,
  });

  const handleResizeKeyDown = useCallback(
    (corner: keyof typeof HANDLE_POSITIONS, event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        resizeByKeyboard(corner, 8);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        resizeByKeyboard(corner, -8);
      }
    },
    [resizeByKeyboard],
  );

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
          {(Object.entries(HANDLE_POSITIONS) as Array<[keyof typeof HANDLE_POSITIONS, typeof HANDLE_POSITIONS[keyof typeof HANDLE_POSITIONS]]>).map(
            ([corner, position]) => (
              <div
                key={corner}
                role="button"
                tabIndex={0}
                aria-label="Resize image"
                title="Drag corner to resize. Arrow keys adjust width."
                onMouseDown={createHandleMouseDown(corner)}
                onKeyDown={(event) => handleResizeKeyDown(corner, event)}
                className="npb-image-resize-handle"
                data-corner={corner}
                style={{
                  ...position,
                  bottom: caption ? 28 : position.bottom,
                }}
              />
            ),
          )}
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
  setStyles: (next: React.CSSProperties | undefined) => void;
  isPreview?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
};

function ImageBlockView({
  content,
  styles,
  setStyles,
  isPreview,
  isSelected,
  isEditing,
}: ImageBlockViewProps): JSX.Element | null {
  const handleStylesChange = useCallback(
    (updates: Partial<React.CSSProperties>) => {
      setStyles({ ...styles, ...updates });
    },
    [setStyles, styles],
  );

  return (
    <ImageRenderer
      content={content}
      styles={styles}
      isEditing={Boolean(isEditing && !isPreview)}
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
  render: ({ content, styles, setStyles, isPreview, isSelected, isEditing }) => (
    <ImageBlockView
      content={content}
      styles={styles}
      setStyles={setStyles}
      isPreview={isPreview}
      isSelected={isSelected}
      isEditing={isEditing}
    />
  ),
});

export default ImageBlock;
