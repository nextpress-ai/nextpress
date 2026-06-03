/**
 * Post Info block data model: content shape, meta type, defaults, constants, and
 * pure date/read-time helpers. No React here — see `post-info-settings.tsx` for
 * the UI and `PostInfoBlock.tsx` for the renderer (which owns the data fetch).
 */

// ============================================================================
// TYPES
// ============================================================================

export type PostInfoContent = {
  postId?: string;
  showDate?: boolean;
  showCategories?: boolean;
  showTags?: boolean;
  showReadTime?: boolean;
  dateFormat?: 'short' | 'long' | 'relative';
  layout?: 'inline' | 'stacked';
  className?: string;
};

export type PostMeta = {
  publishedAt?: string;
  categories?: string[];
  tags?: string[];
  wordCount?: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_CONTENT: PostInfoContent = {
  postId: '',
  showDate: true,
  showCategories: true,
  showTags: true,
  showReadTime: true,
  dateFormat: 'long',
  layout: 'inline',
  className: '',
};

export const PLACEHOLDER_META: PostMeta = {
  publishedAt: '2025-01-15T00:00:00Z',
  categories: ['Technology', 'Design'],
  tags: ['react', 'nextpress', 'cms'],
  wordCount: 1000,
};

export const WORDS_PER_MINUTE = 200;

export const DATE_FORMAT_OPTIONS = [
  { value: 'short' as const, label: 'Short (Jan 15, 2025)' },
  { value: 'long' as const, label: 'Long (January 15, 2025)' },
  { value: 'relative' as const, label: 'Relative (3 days ago)' },
] as const;

export const LAYOUT_OPTIONS = [
  { value: 'inline' as const, label: 'Inline' },
  { value: 'stacked' as const, label: 'Stacked' },
] as const;

// ============================================================================
// HELPERS
// ============================================================================

/** Compute a human-readable relative time string from a date. */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffDays >= 365)
    return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? 's' : ''} ago`;
  if (diffDays >= 30)
    return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
  if (diffDays >= 7)
    return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0)
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/** Format a date string according to the specified format. */
export function formatDate(
  isoDate: string,
  format: 'short' | 'long' | 'relative',
): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Invalid date';
  if (format === 'relative') return formatRelativeTime(date);
  const month = format === 'short' ? 'short' : 'long';
  return date.toLocaleDateString('en-US', {
    month,
    day: 'numeric',
    year: 'numeric',
  });
}

/** Estimate read time from word count (~200 words/min). */
export function computeReadTime(wordCount: number | undefined): string {
  if (!wordCount || wordCount <= 0) return '1 min read';
  return `${Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))} min read`;
}

/** Build the wrapper className string. */
export function buildClassName(
  content: PostInfoContent,
  layout: 'inline' | 'stacked',
): string {
  return [
    'wp-block-post-info',
    layout === 'stacked' ? 'post-info--stacked' : 'post-info--inline',
    content?.className || '',
  ]
    .filter(Boolean)
    .join(' ');
}
