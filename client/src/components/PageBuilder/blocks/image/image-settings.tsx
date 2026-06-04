import React, { useState } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Maximize, Settings, Link } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { type ImageContent, DEFAULT_CONTENT, getAlignmentButtonClass } from "./image-model";

interface ImageSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function ImageSettings({ block, onUpdate }: ImageSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });
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
      rerender();
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
              <div className="mt-2 inline-block border border-dashed border-npb-border-strong p-2 rounded-lg" style={{ maxWidth: '100%' }}>
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
            <SettingsLabel htmlFor="image-src">Image URL</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
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
            <SettingsLabel htmlFor="image-alt">Alt Text</SettingsLabel>
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
            <SettingsLabel htmlFor="image-caption">Caption</SettingsLabel>
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
            <SettingsLabel htmlFor="figure-width">Figure width</SettingsLabel>
            <p className="text-xs text-npb-text-muted mt-1 mb-2">
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
                    className={getAlignmentButtonClass(currentAlign === option.value)}
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
            <SettingsLabel htmlFor="image-size">Image Size</SettingsLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {sizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ sizeSlug: option.value as any })}
                  className={getAlignmentButtonClass(currentSize === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-npb-text-muted">
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
            <SettingsLabel htmlFor="image-link-destination-select">Link To</SettingsLabel>
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
              <SettingsLabel htmlFor="image-link-url">Custom Link URL</SettingsLabel>
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
            <SettingsLabel htmlFor="image-link-target-select">Link Target</SettingsLabel>
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
