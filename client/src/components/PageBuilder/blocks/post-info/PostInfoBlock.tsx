import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import {
  Info,
  Calendar,
  Folder,
  Tag,
  Clock,
} from 'lucide-react';
import { useBlockState } from '../useBlockState';
import { defaultParseContent, defaultSerializeContent } from '../createBlockDefinition';
import {
  type PostInfoContent,
  type PostMeta,
  DEFAULT_CONTENT,
  PLACEHOLDER_META,
  formatDate,
  computeReadTime,
  buildClassName,
} from './post-info-model';
import { PostInfoSettings } from './post-info-settings';

// ============================================================================
// DATA FETCH
// ============================================================================

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
    parseContent: defaultParseContent,
    serializeContent: defaultSerializeContent,
  });
  return (
    <PostInfoRenderer content={content} styles={styles} isPreview={isPreview} />
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
  parseContent: defaultParseContent,
  serializeContent: defaultSerializeContent,
};

export default PostInfoBlock;
