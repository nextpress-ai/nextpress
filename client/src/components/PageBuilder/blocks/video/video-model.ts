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

// ============================================================================
// UTILITIES
// ============================================================================

export function isYouTubeUrl(url?: string): boolean {
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

export function extractYouTubeId(url: string): string | null {
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

export function parseStartSeconds(url: string): number | undefined {
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
