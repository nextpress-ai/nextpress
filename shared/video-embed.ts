/**
 * Shared video embedding utilities for editor, preview, and SSR renderers.
 */

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

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
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

export function parseStartSeconds(url?: string): number | undefined {
  if (!url) return undefined;
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

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  start?: number;
}

export function buildYouTubeEmbedUrl(url: string, options: YouTubeEmbedOptions = {}): string | null {
  const youTubeId = extractYouTubeId(url);
  if (!youTubeId) return null;

  const params = new URLSearchParams();
  if (options.autoplay) params.set('autoplay', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', youTubeId);
  }
  if (options.muted || options.autoplay) params.set('mute', '1');
  const start = options.start ?? parseStartSeconds(url);
  if (start && start > 0) params.set('start', String(start));
  params.set('rel', '0');
  params.set('modestbranding', '1');

  return `https://www.youtube.com/embed/${youTubeId}?${params.toString()}`;
}
