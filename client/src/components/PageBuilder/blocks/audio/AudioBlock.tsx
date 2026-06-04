import React, { useState } from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { AudioLines as AudioIcon, Settings } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';

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

  const classes = [
    'wp-block-audio',
    align ? `align${align}` : '',
    className || '',
  ].filter(Boolean).join(' ');

  if (!audioUrl) {
    return (
      <div className="p-4 border border-dashed border-gray-300 rounded text-gray-500">
        Add an audio source URL to preview the player.
      </div>
    );
  }

  return (
    <figure id={anchor} className={classes} style={{ ...styles }}>
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
    </figure>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AudioBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<AudioContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <AudioRenderer content={content} styles={styles} />;
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
  const [isPickerOpen, setPickerOpen] = useState(false);

  const audioUrl = content?.kind === 'media' ? content.url : '';

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={AudioIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="audio-src">Audio URL</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="audio-src"
                value={audioUrl}
                onChange={(e) => updateContent({ kind: 'media', mediaType: 'audio', url: e.target.value } as AudioContent)}
                placeholder="https://example.com/audio.mp3"
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Choose</Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind="audio"
              onSelect={(m) => updateContent({ kind: 'media', mediaType: 'audio', id: m.id, url: m.url } as AudioContent)}
            />
          </div>
          
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

const AudioBlock: BlockDefinition = {
  id: 'core/audio',
  label: 'Audio',
  icon: AudioIcon,
  description: 'Add an audio player',
  category: 'media',
  defaultContent: {
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
  },
  defaultStyles: { width: '100%' },
  component: AudioBlockComponent,
  settings: AudioSettings,
  hasSettings: true,
};

export default AudioBlock;
