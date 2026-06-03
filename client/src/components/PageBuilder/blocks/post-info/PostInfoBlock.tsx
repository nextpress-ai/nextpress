import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig, BlockContent } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Info,
  Calendar,
  Folder,
  Tag,
  Clock,
  Settings,
} from 'lucide-react';
import { getBlockStateAccessor } from '../blockStateRegistry';
import { useBlockState } from '../useBlockState';

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

type PostMeta = {
  publishedAt?: string;
  categories?: string[];
  tags?: string[];
  wordCount?: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONTENT: PostInfoContent = {
  postId: '',
  showDate: true,
  showCategories: true,
  showTags: true,
  showReadTime: true,
  dateFormat: 'long',
  layout: 'inline',
  className: '',
};

const PLACEHOLDER_META: PostMeta = {
  publishedAt: '2025-01-15T00:00:00Z',
  categories: ['Technology', 'Design'],
  tags: ['react', 'nextpress', 'cms'],
  wordCount: 1000,
};

const WORDS_PER_MINUTE = 200;

const DATE_FORMAT_OPTIONS = [
  { value: 'short' as const, label: 'Short (Jan 15, 2025)' },
  { value: 'long' as const, label: 'Long (January 15, 2025)' },
  { value: 'relative' as const, label: 'Relative (3 days ago)' },
] as const;

const LAYOUT_OPTIONS = [
  { value: 'inline' as const, label: 'Inline' },
  { value: 'stacked' as const, label: 'Stacked' },
] as const;

// ============================================================================
// HELPERS
// ============================================================================

/** Compute a human-readable relative time string from a date. */
function formatRelativeTime(date: Date): string {
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
function formatDate(
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
function computeReadTime(wordCount: number | undefined): string {
  if (!wordCount || wordCount <= 0) return '1 min read';
  return `${Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))} min read`;
}

/** Fetch post metadata from the API. Returns null while loading or on failure. */
function usePostMeta(
  postId: string | undefined,
  isPreview: boolean,
): PostMeta | null {
  const { data } = useQuery({
    queryKey: ['post-meta', postId],
    queryFn: () =>
      fetch(`/api/posts/${postId}`)
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.json();
        }),
    enabled: !!isPreview && !!postId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;
  return {
    publishedAt: data.publishedAt,
    categories: data.categories,
    tags: data.tags,
    wordCount: data.wordCount,
  };
}

/** Build the wrapper className string. */
function buildClassName(
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

// ============================================================================
// RENDERER
// ============================================================================

interface PostInfoRendererProps {
  content: PostInfoContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

/** Renders a small pill/badge for categories and tags. */
function CategoryBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-npb-surface-inset px-2.5 py-0.5 text-xs font-medium text-npb-text-secondary">
      {children}
    </span>
  );
}

/**
 * Pure presentational renderer for the post info block.
 * Preview mode fetches real data; editor mode shows placeholders.
 */
function PostInfoRenderer({
  content,
  styles,
  isPreview,
}: PostInfoRendererProps) {
  const layout = content?.layout ?? 'inline';
  const dateFormat = content?.dateFormat ?? 'long';
  const className = buildClassName(content, layout);
  const fetched = usePostMeta(content?.postId, !!isPreview);
  const meta: PostMeta = isPreview && fetched ? fetched : PLACEHOLDER_META;
  const items: React.ReactNode[] = [];
  const itemKeys: string[] = [];

  if ((content?.showDate ?? true) && meta.publishedAt) {
    items.push(
      <span
        key="date"
        className="flex items-center gap-1.5 text-sm text-npb-text-secondary">
        <Calendar className="h-3.5 w-3.5" />
        {formatDate(meta.publishedAt, dateFormat)}
      </span>,
    );
    itemKeys.push('date');
  }
  if ((content?.showCategories ?? true) && meta.categories?.length) {
    items.push(
      <span
        key="categories"
        className="flex items-center gap-1.5 text-sm text-npb-text-secondary">
        <Folder className="h-3.5 w-3.5" />
        <span className="flex flex-wrap gap-1">
          {meta.categories.map((cat) => (
            <CategoryBadge key={cat}>{cat}</CategoryBadge>
          ))}
        </span>
      </span>,
    );
    itemKeys.push('categories');
  }
  if ((content?.showTags ?? true) && meta.tags?.length) {
    items.push(
      <span
        key="tags"
        className="flex items-center gap-1.5 text-sm text-npb-text-secondary">
        <Tag className="h-3.5 w-3.5" />
        <span className="flex flex-wrap gap-1">
          {meta.tags.map((tag) => (
            <CategoryBadge key={tag}>{tag}</CategoryBadge>
          ))}
        </span>
      </span>,
    );
    itemKeys.push('tags');
  }
  if (content?.showReadTime ?? true) {
    items.push(
      <span
        key="readtime"
        className="flex items-center gap-1.5 text-sm text-npb-text-secondary">
        <Clock className="h-3.5 w-3.5" />
        {computeReadTime(meta.wordCount)}
      </span>,
    );
    itemKeys.push('readtime');
  }

  if (items.length === 0) {
    return (
      <div className={className} style={styles}>
        <p className="text-sm text-npb-text-muted italic">
          No post info items enabled
        </p>
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className={className} style={styles}>
        <div className="flex flex-wrap items-center gap-3">
          {items.map((item, idx) => (
            <React.Fragment key={itemKeys[idx]}>
              {idx > 0 && <span className="text-npb-text-muted">·</span>}
              {item}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={styles}>
      <div className="flex flex-col gap-2">{items}</div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostInfoBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostInfoContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });
  return (
    <PostInfoRenderer content={content} styles={styles} isPreview={isPreview} />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostInfoSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/** Sidebar settings panel for the post info block. */
function PostInfoSettings({ block, onUpdate }: PostInfoSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const content = (block.content as PostInfoContent) || DEFAULT_CONTENT;

  const updateContent = (updates: Partial<PostInfoContent>) => {
    const updated = { ...content, ...updates };
    if (accessor) {
      accessor.setContent(updated);
    } else if (onUpdate) {
      onUpdate({
        content: { ...updated } as unknown as BlockContent,
      });
    }
  };

  const toggles = [
    {
      id: 'show-date',
      label: 'Show Date',
      key: 'showDate' as const,
      value: content?.showDate ?? true,
    },
    {
      id: 'show-categories',
      label: 'Show Categories',
      key: 'showCategories' as const,
      value: content?.showCategories ?? true,
    },
    {
      id: 'show-tags',
      label: 'Show Tags',
      key: 'showTags' as const,
      value: content?.showTags ?? true,
    },
    {
      id: 'show-readtime',
      label: 'Show Read Time',
      key: 'showReadTime' as const,
      value: content?.showReadTime ?? true,
    },
  ];

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Display" icon={Settings} defaultOpen>
        <div className="space-y-4">
          {toggles.map((toggle) => (
            <div key={toggle.id} className="flex items-center justify-between">
              <SettingsLabel htmlFor={toggle.id}>
                {toggle.label}
              </SettingsLabel>
              <Switch
                id={toggle.id}
                checked={toggle.value}
                onCheckedChange={(checked) =>
                  updateContent({ [toggle.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Format" icon={Settings} defaultOpen>
        <div className="space-y-4">
          <div>
            <SettingsLabel>Date Format</SettingsLabel>
            <Select
              value={content?.dateFormat ?? 'long'}
              onValueChange={(val) =>
                updateContent({
                  dateFormat: val as PostInfoContent['dateFormat'],
                })
              }>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel>Layout</SettingsLabel>
            <Select
              value={content?.layout ?? 'inline'}
              onValueChange={(val) =>
                updateContent({ layout: val as PostInfoContent['layout'] })
              }>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Post" icon={Settings} defaultOpen={false}>
        <div className="space-y-2">
          <SettingsLabel>Post ID</SettingsLabel>
          {content?.postId ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs truncate">
                {content.postId}
              </Badge>
              <button
                onClick={() => updateContent({ postId: '' })}
                className="text-xs text-npb-text-muted hover:text-npb-status-error">
                clear
              </button>
            </div>
          ) : (
            <Input
              value={content?.postId || ''}
              onChange={(e) => updateContent({ postId: e.target.value })}
              placeholder="Auto-set when added to a post"
              className="h-9 text-sm"
            />
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

/**
 * Post Info block definition for the PageBuilder.
 * Displays post metadata: date, categories, tags, and estimated read time.
 */
const PostInfoBlock: BlockDefinition = {
  id: 'post/info',
  label: 'Post Info',
  icon: Info,
  description: 'Display post metadata: date, categories, tags, and read time',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0.5em 0' },
  component: PostInfoBlockComponent,
  settings: PostInfoSettings,
  hasSettings: true,
};

export default PostInfoBlock;
