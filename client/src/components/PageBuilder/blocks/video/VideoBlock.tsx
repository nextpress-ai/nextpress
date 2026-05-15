import React, { useState } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Video as VideoIcon, AlignCenter, Maximize, Settings } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

// ============================================================================
// TYPES
// ============================================================================

type VideoContent = BlockContent & {
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: string;
  align?: 'default' | 'wide' | 'full';
  caption?: string;
  anchor?: string;
  className?: string;
  sources?: Array<{ src: string; type: string }>;
  id?: number;
};

const DEFAULT_CONTENT: VideoContent = {
  kind: 'media',
  mediaType: 'video',
  url: '',
  id: undefined,
  poster: '',
  autoplay: false,
  controls: true,
  loop: false,
  muted: false,
  playsInline: true,
  preload: 'metadata',
  align: undefined,
  caption: '',
  anchor: '',
  className: '',
};

// ============================================================================
// UTILITIES
// ============================================================================

function isYouTubeUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return (
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be'
    );
  } catch {
    return false;
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (u.searchParams.has('v')) {
      return u.searchParams.get('v');
    }
    const m = u.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{6,})/);
    if (m && m[2]) return m[2];
    return null;
  } catch {
    return null;
  }
}

function parseStartSeconds(url: string): number | undefined {
  try {
    const u = new URL(url);
    if (u.searchParams.has('start')) {
      const s = Number(u.searchParams.get('start'));
      return Number.isFinite(s) ? s : undefined;
    }
    if (u.searchParams.has('t')) {
      const t = u.searchParams.get('t') || '';
      const re = /(?:(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?)|(\d+)/i;
      const m = t.match(re);
      if (m) {
        if (m[4]) return Number(m[4]);
        const h = Number(m[1] || 0);
        const min = Number(m[2] || 0);
        const s = Number(m[3] || 0);
        return h * 3600 + min * 60 + s;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ============================================================================
// RENDERER
// ============================================================================

interface VideoRendererProps {
  content: VideoContent;
  styles?: React.CSSProperties;
}

function VideoRenderer({ content, styles }: VideoRendererProps) {
  const url = content?.kind === 'media' && content.mediaType === 'video'
    ? content.url
    : '';
  
  const {
    poster,
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    playsInline = true,
    preload = 'metadata',
    align,
    caption,
    anchor,
    className,
    sources,
  } = content || {};

  const classes = [
    'wp-block-video',
    align ? `align${align}` : '',
    className || '',
  ].filter(Boolean).join(' ');

  const youTubeId = isYouTubeUrl(url) ? extractYouTubeId(url) : null;
  if (youTubeId) {
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (controls === false) params.set('controls', '0');
    if (loop) {
      params.set('loop', '1');
      params.set('playlist', youTubeId);
    }
    if (muted || autoplay) params.set('mute', '1');
    const start = parseStartSeconds(url);
    if (start && start > 0) params.set('start', String(start));
    params.set('rel', '0');
    params.set('modestbranding', '1');

    const embedUrl = `https://www.youtube.com/embed/${youTubeId}?${params.toString()}`;
    const embedClasses = [
      'wp-block-embed',
      'is-type-video',
      'is-provider-youtube',
      'wp-block-embed-youtube',
      align ? `align${align}` : '',
      className || '',
    ].filter(Boolean).join(' ');

    const aspectWidth = 16;
    const aspectHeight = 9;
    const paddingBottom = `${(aspectHeight / aspectWidth) * 100}%`;
    const hasExplicitHeight = typeof styles?.height === 'string' && styles.height !== '';

    return (
      <figure id={anchor} className={embedClasses} style={{ ...styles }}>
        <div
          className="wp-block-embed__wrapper"
          style={{
            position: 'relative',
            width: '100%',
            height: hasExplicitHeight ? '100%' : 0,
            paddingBottom: hasExplicitHeight ? undefined : paddingBottom,
          }}
        >
          <iframe
            src={embedUrl}
            title={caption || 'YouTube video player'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
        {caption ? (
          <figcaption className="wp-element-caption">{caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure id={anchor} className={classes} style={{ ...styles }}>
      <video
        src={url}
        poster={poster}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        style={{ display: 'block', width: '100%', height: styles?.height ? '100%' : 'auto' }}
      >
        {Array.isArray(sources) && sources.map((s: any, i: number) => (
          <source key={s.src || `source-${i}`} src={s.src} type={s.type} />
        ))}
        Your browser does not support the video tag.
      </video>
      {caption ? (
        <figcaption className="wp-element-caption">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VideoBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<VideoContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <VideoRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface VideoSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function VideoSettings({ block, onUpdate }: VideoSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isPosterPickerOpen, setPosterPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as VideoContent)
    : (block.content as VideoContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<VideoContent>) => {
    if (accessor) {
      const current = accessor.getContent() as VideoContent;
      accessor.setContent({ ...current, ...updates } as VideoContent);
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
            <Label htmlFor="video-src">Video URL</Label>
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
                updateContent({ id: m.id, url: m.url } as VideoContent);
              }}
            />
          </div>

          {/* Poster Image */}
          <div>
            <Label htmlFor="video-poster">Poster Image URL</Label>
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
            <Label htmlFor="video-caption">Caption</Label>
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
              <Label htmlFor="video-controls">Show Controls</Label>
              <Switch
                id="video-controls"
                checked={(content?.controls ?? true) !== false}
                onCheckedChange={(checked) => updateContent({ controls: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-autoplay">Autoplay</Label>
              <Switch
                id="video-autoplay"
                checked={Boolean(content?.autoplay)}
                onCheckedChange={(checked) => updateContent({ autoplay: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video-loop">Loop</Label>
              <Switch
                id="video-loop"
                checked={Boolean(content?.loop)}
                onCheckedChange={(checked) => updateContent({ loop: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-muted">Muted</Label>
              <Switch
                id="video-muted"
                checked={Boolean(content?.muted)}
                onCheckedChange={(checked) => updateContent({ muted: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video-playsinline">Plays Inline</Label>
              <Switch
                id="video-playsinline"
                checked={(content?.playsInline ?? true) !== false}
                onCheckedChange={(checked) => updateContent({ playsInline: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-preload">Preload</Label>
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
            <Label>Figure width</Label>
            <p className="text-xs text-gray-600 mt-1 mb-2">
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
                        ? "bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
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

// ============================================================================
// LEGACY RENDERER (Backward Compatibility)
// ============================================================================

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const VideoBlock: BlockDefinition = {
  id: 'core/video',
  label: 'Video',
  icon: VideoIcon,
  description: 'Add a video player',
  category: 'media',
  defaultContent: {
    kind: 'media',
    mediaType: 'video',
    url: '',
    id: undefined,
    poster: '',
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    playsInline: true,
    preload: 'metadata',
    align: undefined,
    caption: '',
    anchor: '',
    className: '',
  },
  defaultStyles: { width: '100%' },
  component: VideoBlockComponent,
  settings: VideoSettings,
  hasSettings: true,
};

export default VideoBlock;
