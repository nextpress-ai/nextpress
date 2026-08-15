import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Video as VideoIcon, AlignCenter, Maximize, Settings } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { MediaUrlField } from "../shared/media-url-field";
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
          <MediaUrlField
            id="video-src"
            label="Video URL"
            value={videoUrl}
            kind="video"
            placeholder="https://example.com/video.mp4 or YouTube URL"
            onChange={({ url }) =>
              updateContent({ kind: "media", mediaType: "video", url } as VideoContent)
            }
            onLibrarySelect={({ item }) => {
              updateContent({ id: item.id ? Number(item.id) : undefined, url: item.url });
            }}
          />

          <MediaUrlField
            id="video-poster"
            label="Poster Image URL"
            value={content?.poster || ""}
            kind="image"
            libraryButtonLabel="Choose image"
            placeholder="https://example.com/poster.jpg"
            onChange={({ url }) => updateContent({ poster: url })}
            onLibrarySelect={({ item }) => updateContent({ poster: item.url })}
          />

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
