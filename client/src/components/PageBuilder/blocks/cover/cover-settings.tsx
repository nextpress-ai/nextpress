import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Square as CoverIcon, Settings } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { MediaUrlField } from "../shared/media-url-field";
import { type CoverContent, type CoverData, DEFAULT_CONTENT, DEFAULT_DATA } from './cover-model';

interface CoverSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function CoverSettings({ block, onUpdate }: CoverSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  // Get current state
  const content = accessor
    ? (accessor.getContent() as CoverContent)
    : (block.content as CoverContent) || DEFAULT_CONTENT;

  const blockData = content?.kind === 'structured'
    ? (content.data as CoverData)
    : DEFAULT_DATA;

  // Update handlers
  const updateContent = (updates: Partial<CoverData>) => {
    if (accessor) {
      const current = accessor.getContent() as CoverContent;
      const currentData = current?.kind === 'structured' ? (current.data as CoverData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as CoverContent);
      rerender();
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured'
        ? (block.content.data as CoverData)
        : DEFAULT_DATA;
      onUpdate({
        content: {
          kind: 'structured',
          data: {
            ...currentData,
            ...updates,
          },
        } as BlockContent,
      });
    }
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={CoverIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="cover-content">Cover Content</SettingsLabel>
            <Textarea
              id="cover-content"
              value={blockData?.innerContent || '<p>Write title…</p>'}
              onChange={(e) => updateContent({ innerContent: e.target.value })}
              placeholder="Enter your cover content (HTML allowed)"
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="cover-background-type">Background Type</SettingsLabel>
            <Select
              value={blockData?.backgroundType || 'image'}
              onValueChange={(value) => updateContent({ backgroundType: value as any })}
            >
              <SelectTrigger id="cover-background-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <MediaUrlField
            id="cover-media"
            label={`Background ${blockData?.backgroundType === "video" ? "Video" : "Image"}`}
            value={blockData?.url || ""}
            kind={blockData?.backgroundType === "video" ? "video" : "image"}
            libraryButtonLabel="Choose"
            placeholder={`https://example.com/${blockData?.backgroundType === "video" ? "video.mp4" : "image.jpg"}`}
            onChange={({ url }) => updateContent({ url })}
            onLibrarySelect={({ item }) => {
              updateContent({
                url: item.url,
                alt: blockData?.alt || item.alt || item.originalName || item.filename,
              });
            }}
          />

          {blockData?.backgroundType === 'image' && (
            <div>
              <SettingsLabel htmlFor="cover-alt">Alt Text</SettingsLabel>
              <Input
                id="cover-alt"
                value={blockData?.alt || ''}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Background image description"
                className="mt-1 h-9"
              />
            </div>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Layout & overlay" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          {blockData?.backgroundType === 'image' && (
            <div className="flex items-center justify-between">
              <SettingsLabel htmlFor="cover-parallax">Fixed Background</SettingsLabel>
              <Switch
                id="cover-parallax"
                checked={blockData?.hasParallax || false}
                onCheckedChange={(checked) => updateContent({ hasParallax: checked })}
              />
            </div>
          )}

          <div>
            <SettingsLabel htmlFor="cover-min-height">Minimum Height (px)</SettingsLabel>
            <Input
              id="cover-min-height"
              type="number"
              value={blockData?.minHeight || 400}
              onChange={(e) => updateContent({ minHeight: parseInt(e.target.value) || 400 })}
              className="mt-1 h-9"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="cover-content-position">Content Position</SettingsLabel>
            <Select
              value={blockData?.contentPosition || 'center center'}
              onValueChange={(value) => updateContent({ contentPosition: value })}
            >
              <SelectTrigger id="cover-content-position" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top left">Top Left</SelectItem>
                <SelectItem value="top center">Top Center</SelectItem>
                <SelectItem value="top right">Top Right</SelectItem>
                <SelectItem value="center left">Center Left</SelectItem>
                <SelectItem value="center center">Center Center</SelectItem>
                <SelectItem value="center right">Center Right</SelectItem>
                <SelectItem value="bottom left">Bottom Left</SelectItem>
                <SelectItem value="bottom center">Bottom Center</SelectItem>
                <SelectItem value="bottom right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="cover-overlay-opacity">Overlay Opacity (%)</SettingsLabel>
            <div className="flex items-center space-x-4 mt-1">
              <Slider
                aria-label="Overlay opacity percentage"
                value={[blockData?.dimRatio || 50]}
                onValueChange={([value]) => updateContent({ dimRatio: value })}
                max={100}
                min={0}
                step={5}
                className="flex-1"
              />
              <Input
                id="cover-overlay-opacity"
                type="number"
                value={blockData?.dimRatio || 50}
                onChange={(e) => updateContent({ dimRatio: parseInt(e.target.value) || 50 })}
                className="w-20 h-9"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="cover-overlay-color">Overlay Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="cover-overlay-color"
                type="color"
                value={blockData?.customOverlayColor || '#000000'}
                onChange={(e) => updateContent({ customOverlayColor: e.target.value })}
                className="w-12 h-9 p-1 border-npb-border-default"
              />
              <Input
                value={blockData?.customOverlayColor || '#000000'}
                onChange={(e) => updateContent({ customOverlayColor: e.target.value })}
                placeholder="#000000"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}
