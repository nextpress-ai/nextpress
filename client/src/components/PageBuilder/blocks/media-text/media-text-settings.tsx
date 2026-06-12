import { useState } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { Image as ImageIcon, Settings, Link } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { LinkUrlField, LinkTargetSelect } from "../shared/link-settings";
import { type MediaTextContent, type MediaTextData, DEFAULT_CONTENT, DEFAULT_DATA } from './media-text-model';

interface MediaTextSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function MediaTextSettings({ block, onUpdate }: MediaTextSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });
  const [isPickerOpen, setPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as MediaTextContent)
    : (block.content as MediaTextContent) || DEFAULT_CONTENT;
  const blockData = content?.kind === 'structured'
    ? (content.data as MediaTextData)
    : DEFAULT_DATA;

  // Update handlers
  const updateContent = (updates: Partial<MediaTextData>) => {
    if (accessor) {
      const current = accessor.getContent() as MediaTextContent;
      const currentData = current?.kind === 'structured' ? (current.data as MediaTextData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as MediaTextContent);
      rerender();
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured'
        ? (block.content.data as MediaTextData)
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
      <CollapsibleCard title="Content" icon={ImageIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="media-url">Media URL</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="media-url"
                value={blockData?.mediaUrl || ''}
                onChange={(e) => updateContent({ mediaUrl: e.target.value })}
                placeholder="https://example.com/image-or-video.jpg"
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Choose</Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind="any"
              onSelect={(m) => {
                const type = m.mimeType?.startsWith("video/") ? "video" : "image";
                updateContent({
                  mediaId: m.id ? Number(m.id) : undefined,
                  mediaUrl: m.url,
                  mediaType: type,
                  mediaAlt: blockData?.mediaAlt || m.alt || m.originalName || m.filename,
                });
              }}
            />
          </div>
          <div>
            <SettingsLabel htmlFor="media-alt">Alt Text</SettingsLabel>
            <Input
              id="media-alt"
              value={blockData?.mediaAlt || ''}
              onChange={(e) => updateContent({ mediaAlt: e.target.value })}
              placeholder="Describe the media"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <SettingsLabel htmlFor="text-content">Text Content (HTML)</SettingsLabel>
            <Textarea
              id="text-content"
              value={blockData?.content || ''}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="<p>Add your content…</p>"
              rows={4}
              className="mt-1"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Layout" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="media-position">Media Position</SettingsLabel>
            <Select
              value={blockData?.mediaPosition || 'left'}
              onValueChange={(value) => updateContent({ mediaPosition: value as any })}
            >
              <SelectTrigger id="media-position" className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="media-width">Media Width (%)</SettingsLabel>
            <Input
              id="media-width"
              type="number"
              min={0}
              max={100}
              value={blockData?.mediaWidth ?? 50}
              onChange={(e) => updateContent({ mediaWidth: Number(e.target.value) })}
              className="h-9 mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="stacked-mobile">Stack on mobile</SettingsLabel>
            <Switch
              id="stacked-mobile"
              checked={Boolean(blockData?.isStackedOnMobile)}
              onCheckedChange={(checked) => updateContent({ isStackedOnMobile: checked })}
              />
            </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="image-fill">Image fill</SettingsLabel>
            <Switch
              id="image-fill"
              checked={Boolean(blockData?.imageFill)}
              onCheckedChange={(checked) => updateContent({ imageFill: checked })}
            />
          </div>

          <div>
            <SettingsLabel htmlFor="vertical-align">Vertical alignment</SettingsLabel>
            <Select
              value={blockData?.verticalAlignment || 'center'}
              onValueChange={(value) => updateContent({ verticalAlignment: value as any })}
            >
              <SelectTrigger id="vertical-align" className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Link Settings" icon={Link} defaultOpen={false}>
        <div className="space-y-4">
          <LinkUrlField
            id="media-link"
            label="Media Link"
            value={blockData?.href || ""}
            onChange={({ url }) => updateContent({ href: url })}
          />

          <LinkTargetSelect
            id="media-target"
            label="Link Target"
            value={blockData?.linkTarget}
            onChange={({ target }) => updateContent({ linkTarget: target })}
          />

          <div>
            <SettingsLabel htmlFor="media-rel">Rel</SettingsLabel>
            <Input
              id="media-rel"
              value={blockData?.rel || ''}
              onChange={(e) => updateContent({ rel: e.target.value })}
              placeholder="noopener noreferrer"
              className="h-9 mt-1"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="media-title">Title</SettingsLabel>
            <Input
              id="media-title"
              value={blockData?.title || ''}
              onChange={(e) => updateContent({ title: e.target.value })}
              placeholder="Media title"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
