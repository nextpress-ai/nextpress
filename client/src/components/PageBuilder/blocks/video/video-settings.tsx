import { useState } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Video as VideoIcon, AlignCenter, Maximize, Settings } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { type VideoContent, DEFAULT_CONTENT } from "./video-model";

interface VideoSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function VideoSettings({ block, onUpdate }: VideoSettingsProps) {
  const { content, updateContent } = useSettingsState<VideoContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isPosterPickerOpen, setPosterPickerOpen] = useState(false);

  const alignmentOptions = [
    { value: 'default', label: 'Default', icon: AlignCenter },
    { value: 'wide', label: 'Wide', icon: Maximize },
    { value: 'full', label: 'Full', icon: Maximize }
  ];

  const currentAlign = content?.align || 'default';
  const videoUrl = content?.kind === 'media' ? content.url : '';

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Content"
        icon={VideoIcon}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Video URL */}
          <div>
            <SettingsLabel htmlFor="video-src">Video URL</SettingsLabel>
            <div className="flex items-center gap-2">
              <Input
                id="video-src"
                value={videoUrl}
                onChange={(e) => updateContent({ kind: 'media', mediaType: 'video', url: e.target.value } as VideoContent)}
                placeholder="https://example.com/video.mp4 or YouTube URL"
              />
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from library</Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind="video"
              onSelect={(m) => {
                updateContent({ id: m.id ? Number(m.id) : undefined, url: m.url });
              }}
            />
          </div>

          {/* Poster Image */}
          <div>
            <SettingsLabel htmlFor="video-poster">Poster Image URL</SettingsLabel>
            <div className="flex items-center gap-2">
              <Input
                id="video-poster"
                value={content?.poster || ''}
                onChange={(e) => updateContent({ poster: e.target.value })}
                placeholder="https://example.com/poster.jpg"
              />
              <Button type="button" variant="outline" onClick={() => setPosterPickerOpen(true)}>Choose image</Button>
            </div>
            <MediaPickerDialog
              open={isPosterPickerOpen}
              onOpenChange={setPosterPickerOpen}
              kind="image"
              onSelect={(m) => updateContent({ poster: m.url })}
            />
          </div>

          {/* Caption */}
          <div>
            <SettingsLabel htmlFor="video-caption">Caption</SettingsLabel>
            <Input
              id="video-caption"
              value={content?.caption || ''}
              onChange={(e) => updateContent({ caption: e.target.value })}
              placeholder="Add a caption (optional)"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Playback" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          {/* Player Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-controls">Show Controls</SettingsLabel>
              <Switch
                id="video-controls"
                checked={(content?.controls ?? true) !== false}
                onCheckedChange={(checked) => updateContent({ controls: checked })}
              />
            </div>
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-autoplay">Autoplay</SettingsLabel>
              <Switch
                id="video-autoplay"
                checked={Boolean(content?.autoplay)}
                onCheckedChange={(checked) => updateContent({ autoplay: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-loop">Loop</SettingsLabel>
              <Switch
                id="video-loop"
                checked={Boolean(content?.loop)}
                onCheckedChange={(checked) => updateContent({ loop: checked })}
              />
            </div>
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-muted">Muted</SettingsLabel>
              <Switch
                id="video-muted"
                checked={Boolean(content?.muted)}
                onCheckedChange={(checked) => updateContent({ muted: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-playsinline">Plays Inline</SettingsLabel>
              <Switch
                id="video-playsinline"
                checked={(content?.playsInline ?? true) !== false}
                onCheckedChange={(checked) => updateContent({ playsInline: checked })}
              />
            </div>
            <div className="space-y-2">
              <SettingsLabel htmlFor="video-preload">Preload</SettingsLabel>
              <Select
                value={content?.preload || 'metadata'}
                onValueChange={(value) => updateContent({ preload: value })}
              >
                <SelectTrigger id="video-preload">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="metadata">Metadata</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Figure layout" icon={Maximize} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <SettingsLabel>Figure width</SettingsLabel>
            <p className="text-xs text-npb-text-muted mt-1 mb-2">
              Wide and full presets. Use the sidebar <span className="font-semibold">Style</span> tab for exact width
              and height.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {alignmentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateContent({
                        align: option.value === "default" ? undefined : (option.value as "wide" | "full"),
                      })
                    }
                    className={`flex items-center gap-2 p-3 text-sm font-medium rounded-lg border transition-colors ${
                      currentAlign === option.value
                        ? "bg-npb-interactive-bg-active text-npb-interactive-text-active border-npb-interactive-bg-active"
                        : "bg-npb-interactive-bg text-npb-interactive-text border-npb-border-default hover:bg-npb-interactive-bg-hover"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
