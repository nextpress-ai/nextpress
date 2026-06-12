import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { AudioLines as AudioIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { MediaUrlField } from "../shared/media-url-field";

// ============================================================================
// TYPES
// ============================================================================

type AudioContent = {
  kind: 'media';
  mediaType: 'audio';
  url: string;
  alt?: string;
  caption?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  preload?: string;
  align?: 'default' | 'wide' | 'full';
  anchor?: string;
  className?: string;
  id?: number | string;
};

const DEFAULT_CONTENT: AudioContent = {
  kind: 'media',
  url: '',
  mediaType: 'audio',
  id: undefined,
  autoplay: false,
  controls: true,
  loop: false,
  preload: 'none',
  align: undefined,
  caption: '',
  anchor: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface AudioRendererProps {
  content: AudioContent;
  styles?: React.CSSProperties;
}

function AudioRenderer({ content, styles }: AudioRendererProps) {
  const audioUrl = content?.kind === 'media' && content.mediaType === 'audio' 
    ? content.url 
    : '';
  
  const {
    controls = true,
    autoplay = false,
    loop = false,
    preload = 'none',
    align,
    caption,
    anchor,
    className,
  } = content || {};

  if (!audioUrl) {
    return (
      <div className="rounded-[var(--npb-radius-surface)] border border-dashed border-npb-border-strong p-4 text-npb-text-muted">
        Add an audio source URL to preview the player.
      </div>
    );
  }

  return (
    <BlockShell
      as="figure"
      blockClass="wp-block-audio"
      className={[align ? `align${align}` : '', className || ''].filter(Boolean).join(' ') || undefined}
      style={{ ...styles }}
      id={anchor}
    >
      <audio
        src={audioUrl}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        preload={preload}
        style={{ display: 'block', width: '100%' }}
      >
        Your browser does not support the audio element.
      </audio>
      {caption ? (
        <figcaption className="wp-element-caption">{caption}</figcaption>
      ) : null}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface AudioSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function AudioSettings({ block, onUpdate }: AudioSettingsProps) {
  const { content, updateContent } = useSettingsState<AudioContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const audioUrl = content?.kind === "media" ? content.url : "";

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={AudioIcon} defaultOpen={true}>
        <div className="space-y-4">
          <MediaUrlField
            id="audio-src"
            label="Audio URL"
            value={audioUrl}
            kind="audio"
            libraryButtonLabel="Choose"
            placeholder="https://example.com/audio.mp3"
            onChange={({ url }) =>
              updateContent({ kind: "media", mediaType: "audio", url } as AudioContent)
            }
            onLibrarySelect={({ item }) =>
              updateContent({
                kind: "media",
                mediaType: "audio",
                id: item.id,
                url: item.url,
              } as AudioContent)
            }
          />
          
          <div>
            <SettingsLabel htmlFor="audio-caption">Caption</SettingsLabel>
            <Input
              id="audio-caption"
              value={content?.caption || ''}
              onChange={(e) => updateContent({ caption: e.target.value })}
              placeholder="Add a caption (optional)"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="audio-controls">Show Controls</SettingsLabel>
            <Switch
              id="audio-controls"
              checked={(content?.controls ?? true) !== false}
              onCheckedChange={(checked) => updateContent({ controls: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="audio-autoplay">Autoplay</SettingsLabel>
            <Switch
              id="audio-autoplay"
              checked={Boolean(content?.autoplay)}
              onCheckedChange={(checked) => updateContent({ autoplay: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="audio-loop">Loop</SettingsLabel>
            <Switch
              id="audio-loop"
              checked={Boolean(content?.loop)}
              onCheckedChange={(checked) => updateContent({ loop: checked })}
            />
          </div>
          
          <div>
            <SettingsLabel htmlFor="audio-preload">Preload</SettingsLabel>
            <Select
              value={content?.preload || 'none'}
              onValueChange={(value) => updateContent({ preload: value })}
              >
                <SelectTrigger id="audio-preload" className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="metadata">Metadata</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          
          <div>
            <SettingsLabel htmlFor="audio-align">Alignment</SettingsLabel>
            <Select
              value={content?.align || 'default'}
              onValueChange={(value) => updateContent({ align: value === 'default' ? undefined : value as any })}
            >
              <SelectTrigger id="audio-align" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const AudioBlock = createBlockDefinition<AudioContent>({
  id: 'core/audio',
  label: 'Audio',
  icon: AudioIcon,
  description: 'Add an audio player',
  category: 'media',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { width: '100%' },
  settings: AudioSettings,
  hasSettings: true,
  render: ({ content, styles }) => <AudioRenderer content={content} styles={styles} />,
});

export default AudioBlock;
