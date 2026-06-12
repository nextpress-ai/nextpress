import React from "react";
import { Video as VideoIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import {
  type VideoContent,
  DEFAULT_CONTENT,
  isYouTubeUrl,
  extractYouTubeId,
  parseStartSeconds,
} from "./video-model";
import { VideoSettings } from "./video-settings";

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
      'is-type-video',
      'is-provider-youtube',
      align ? `align${align}` : '',
      className || '',
    ].filter(Boolean).join(' ');

    const aspectWidth = 16;
    const aspectHeight = 9;
    const paddingBottom = `${(aspectHeight / aspectWidth) * 100}%`;
    const hasExplicitHeight = typeof styles?.height === 'string' && styles.height !== '';

    return (
      <BlockShell
        as="figure"
        blockClass="wp-block-embed wp-block-embed-youtube"
        className={embedClasses || undefined}
        style={{ ...styles }}
        id={anchor}
      >
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
      </BlockShell>
    );
  }

  return (
    <BlockShell
      as="figure"
      blockClass="wp-block-video"
      className={classes || undefined}
      style={{ ...styles }}
      id={anchor}
    >
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
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const VideoBlock = createBlockDefinition<VideoContent>({
  id: 'core/video',
  label: 'Video',
  icon: VideoIcon,
  description: 'Add a video player',
  category: 'media',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { width: '100%' },
  settings: VideoSettings,
  hasSettings: true,
  render: ({ content, styles }) => <VideoRenderer content={content} styles={styles} />,
});

export default VideoBlock;
