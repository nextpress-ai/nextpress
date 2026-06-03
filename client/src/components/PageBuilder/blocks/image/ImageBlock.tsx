import React, { useCallback } from "react";
import type { JSX } from "react";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Image as ImageIcon } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { useImageResize } from "./use-image-resize";
import {
  PLACEHOLDER_IMAGE_ALT,
  PLACEHOLDER_IMAGE_URL,
} from "@shared/placeholder-image";
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

/**
 * Shared resize handle styles for the corner drag handles.
 * Positioned absolutely within the figure wrapper.
 */
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

function ImageRenderer({ content, styles, isEditing, isSelected, onStylesChange }: ImageRendererProps): JSX.Element | null {
  const url = content?.kind === 'media' && content.mediaType === 'image'
    ? content.url
    : '';
  const alt = content?.alt as string | undefined;
  const caption = content?.caption as string | undefined;
  const align = content?.align as string | undefined;
  const sizeSlug = content?.sizeSlug as string | undefined;
  const className = content?.className as string | undefined;
  const linkDestination = (content?.linkDestination as string | undefined) || 'none';
  const href = content?.href as string | undefined;
  const linkTarget = (content?.linkTarget as string | undefined) || (content?.target as string | undefined);
  const rel = content?.rel as string | undefined;
  const title = content?.title as string | undefined;

  const showHandles = isEditing && isSelected;

  /** Commits the resized width to block styles */
  const handleResizeEnd = useCallback((width: number) => {
    onStylesChange?.({ width: `${width}px`, height: "auto" });
  }, [onStylesChange]);

  const { imgRef, createHandleMouseDown } = useImageResize({
    onResizeEnd: handleResizeEnd,
  });

  if (!url) return null;

  const wrapperClasses = [
    'wp-block-image',
    sizeSlug ? `size-${sizeSlug}` : '',
    align ? `align${align}` : '',
    (styles?.width || styles?.height) ? 'is-resized' : '',
    className || '',
  ].filter(Boolean).join(' ');

  const imgEl = (
    <img
      ref={showHandles ? imgRef : undefined}
      src={url}
      alt={alt}
      style={{ ...styles }}
      draggable={false}
    />
  );

  const linkHref = linkDestination === 'custom' && href
    ? href
    : linkDestination === 'media'
    ? url
    : undefined;

  const contentEl = linkHref ? (
    <a href={linkHref} target={linkTarget} rel={rel} title={title}>
      {imgEl}
    </a>
  ) : imgEl;

  return (
    <figure
      className={wrapperClasses}
      style={{ padding: styles?.padding, margin: styles?.margin, position: "relative" }}
    >
      {contentEl}
      {caption ? (
        <figcaption className="wp-element-caption">{caption}</figcaption>
      ) : null}

      {/* Resize handles — only visible when block is selected in editor */}
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
// MAIN COMPONENT
// ============================================================================

export function ImageBlockComponent({
  value,
  onChange,
  isPreview,
  isSelected,
}: BlockComponentProps) {
  const { content, styles, setStyles } = useBlockState<ImageContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  /** Called by resize handles to commit new width to block styles */
  const handleStylesChange = useCallback((updates: Partial<React.CSSProperties>) => {
    setStyles((prev) => ({ ...prev, ...updates }));
  }, [setStyles]);

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

const ImageBlock: BlockDefinition = {
  id: 'core/image',
  label: 'Image',
  icon: ImageIcon,
  description: 'Add an image',
  category: 'media',
  defaultContent: {
    kind: 'media',
    url: PLACEHOLDER_IMAGE_URL,
    mediaType: 'image',
    alt: PLACEHOLDER_IMAGE_ALT,
    caption: '',
    id: undefined,
    sizeSlug: 'full',
    align: '',
    linkDestination: 'none',
    href: '',
    linkTarget: '_self',
    rel: '',
    title: '',
    className: '',
  },
  defaultStyles: {
    width: '500px',
    height: 'auto',
  },
  component: ImageBlockComponent,
  settings: ImageSettings,
  hasSettings: true,
};

export default ImageBlock;
