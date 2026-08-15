/**
 * Video block data model: content shape, defaults, and pure YouTube URL helpers.
 * No React here — see `video-settings.tsx` for the editor UI.
 */

import type { BlockContent } from "@shared/schema-types";

// ============================================================================
// TYPES
// ============================================================================

export type VideoContent = BlockContent & {
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

export const DEFAULT_CONTENT: VideoContent = {
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

export {
  isYouTubeUrl,
  extractYouTubeId,
  parseStartSeconds,
  buildYouTubeEmbedUrl,
  type YouTubeEmbedOptions,
} from "@shared/video-embed";

// ============================================================================
// UTILITIES
// ============================================================================
// Note: YouTube URL utilities are now re-exported from @shared/video-embed.
