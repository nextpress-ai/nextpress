import React, { useState, useCallback } from "react";
import type { JSX } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Maximize, Settings, Link } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import { useImageResize } from "./use-image-resize";
import {
  PLACEHOLDER_IMAGE_ALT,
  PLACEHOLDER_IMAGE_URL,
} from "@shared/placeholder-image";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Image block content type. Extends the 'media' variant of BlockContent
 * with image-specific properties for alignment, sizing, and linking.
 */
type ImageContent = {
  kind: 'media';
  url: string;
  alt?: string;
  caption?: string;
  mediaType: 'image' | 'video' | 'audio';
  align?: 'left' | 'center' | 'right' | 'wide' | 'full' | '';
  sizeSlug?: 'thumbnail' | 'medium' | 'large' | 'full';
  className?: string;
  linkDestination?: 'none' | 'media' | 'attachment' | 'custom';
  href?: string;
  linkTarget?: '_self' | '_blank';
  target?: string;
  rel?: string;
  title?: string;
  id?: string;
};

const DEFAULT_CONTENT: ImageContent = {
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
};

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
// SETTINGS COMPONENT
// ============================================================================

interface ImageSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ImageSettings({ block, onUpdate }: ImageSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const [isPickerOpen, setPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as ImageContent)
    : (block.content as ImageContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<ImageContent>) => {
    if (accessor) {
      const current = accessor.getContent() as ImageContent;
      accessor.setContent({ ...current, ...updates } as ImageContent);
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      onUpdate({
        content: {
          ...block.content,
          ...updates,
        } as BlockContent,
      });
    }
  };

  const alignmentOptions = [
    { value: '', label: 'Default', icon: AlignCenter },
    { value: 'left', label: 'Left', icon: AlignLeft },
    { value: 'center', label: 'Center', icon: AlignCenter },
    { value: 'right', label: 'Right', icon: AlignRight },
    { value: 'wide', label: 'Wide', icon: Maximize },
    { value: 'full', label: 'Full', icon: Maximize }
  ];

  const sizeOptions = [
    { value: 'thumbnail', label: 'Thumbnail' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'full', label: 'Full' }
  ];

  const currentAlign = content?.align || '';
  const currentSize = content?.sizeSlug || 'full';
  const imageUrl = content?.kind === 'media' ? content.url : '';

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Content"
        icon={ImageIcon}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Image Preview */}
          {imageUrl && (
            <div>
              <Label>Preview</Label>
              <div className="mt-2 inline-block border border-dashed border-gray-300 p-2 rounded-lg" style={{ maxWidth: '100%' }}>
                <img
                  src={imageUrl}
                  alt={content?.alt || ''}
                  style={{ width: '240px', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          )}

          {/* Image URL */}
          <div>
            <Label htmlFor="image-src">Image URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image-src"
                value={imageUrl}
                onChange={(e) => updateContent({ kind: 'media', mediaType: 'image', url: e.target.value } as ImageContent)}
                placeholder="https://example.com/image.jpg"
              />
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from library</Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind="image"
              onSelect={(m) => {
                updateContent({
                  kind: 'media',
                  mediaType: 'image',
                  id: m.id,
                  url: m.url,
                  alt: content?.alt || m.alt || m.originalName || m.filename,
                  caption: content?.caption,
                } as ImageContent);
              }}
            />
          </div>

          {/* Alt Text */}
          <div>
            <Label htmlFor="image-alt">Alt Text</Label>
            <Input
              id="image-alt"
              aria-label="Alt text"
              className="h-9"
              value={content?.alt || ''}
              onChange={(e) => updateContent({ alt: e.target.value } as ImageContent)}
              placeholder="Image description"
            />
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="image-caption">Caption</Label>
            <Input
              id="image-caption"
              value={content?.caption || ''}
              onChange={(e) => updateContent({ caption: e.target.value } as ImageContent)}
              placeholder="Image caption (optional)"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Figure layout"
        icon={Settings}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Block width in the editor (use Style → Position in container for flex placement) */}
          <div>
            <Label className="text-sm font-semibold text-gray-800">Figure width</Label>
            <p className="text-xs text-gray-600 mt-1 mb-2">
              How wide the image sits in the layout. This is not text alignment; use{" "}
              <span className="font-semibold">Style → Position in container</span> to nudge the block left, center, or
              right among siblings.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {alignmentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateContent({ align: option.value as any })}
                    className={`flex items-center gap-2 p-3 h-9 text-sm font-medium rounded-lg border transition-colors ${
                      currentAlign === option.value
                        ? 'bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    aria-label={`Figure width ${option.label}`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Size */}
          <div>
            <Label>Image Size</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {sizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ sizeSlug: option.value as any })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentSize === option.value
                      ? 'bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Width, height, max size, and object fit live under the sidebar <span className="font-semibold">Style</span>{" "}
            tab (Layout &amp; Dimensions).
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Link Settings"
        icon={Link}
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Link Destination */}
          <div>
            <Label htmlFor="image-link-destination-select">Link To</Label>
            <Select
              value={content?.linkDestination || 'none'}
              onValueChange={(value) => updateContent({ linkDestination: value as any })}
            >
              <SelectTrigger id="image-link-destination-select" aria-label="Link destination">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="media">Media File</SelectItem>
                <SelectItem value="attachment">Attachment Page</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Link URL */}
          {(content?.linkDestination === 'custom') && (
            <div>
              <Label htmlFor="image-link-url">Custom Link URL</Label>
              <Input
                id="image-link-url"
                value={content?.href || ''}
                onChange={(e) => updateContent({ href: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Link Target */}
          <div>
            <Label htmlFor="image-link-target-select">Link Target</Label>
            <Select
              value={(content?.linkTarget || content?.target || '_self')}
              onValueChange={(value) => updateContent({ linkTarget: value as any, target: undefined })}
            >
              <SelectTrigger id="image-link-target-select" aria-label="Link target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">Same Window</SelectItem>
                <SelectItem value="_blank">New Window</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}

// ============================================================================
// LEGACY RENDERER (Backward Compatibility)
// ============================================================================

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
