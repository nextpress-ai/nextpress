import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBlockDefinition } from '../createBlockDefinition';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  type PostNavigationContent,
  type AdjacentPost,
  type AdjacentPostsData,
  DEFAULT_CONTENT,
  PLACEHOLDER_ADJACENT,
} from './post-navigation-model';
import { PostNavigationSettings } from './post-navigation-settings';

// ============================================================================
// DATA HOOK
// ============================================================================

/** Fetch adjacent posts from the API in preview mode. Returns placeholder data in editor. */
function useAdjacentPosts(
  postId: string | undefined,
  isPreview: boolean,
): AdjacentPostsData | null {
  const { data } = useQuery({
    queryKey: ['adjacent-posts', postId],
    queryFn: () =>
      fetch(`/api/posts/${postId}/adjacent`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch adjacent posts');
          return res.json();
        }),
    enabled: !!isPreview && !!postId,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostNavigationRendererProps {
  content: PostNavigationContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

/**
 * Pure presentational renderer for post navigation.
 * Preview mode fetches real adjacent posts; editor mode shows placeholders.
 */
function PostNavigationRenderer({
  content,
  styles,
  isPreview,
}: PostNavigationRendererProps) {
  const showThumbnail = content?.showThumbnail ?? false;
  const showLabel = content?.showLabel ?? true;
  const prevLabel = content?.prevLabel || 'Previous Post';
  const nextLabel = content?.nextLabel || 'Next Post';

  const className = ['wp-block-post-navigation', content?.className || '']
    .filter(Boolean)
    .join(' ');

  const adjacentData = useAdjacentPosts(content?.postId, !!isPreview);
  const displayData: AdjacentPostsData =
    isPreview && adjacentData ? adjacentData : PLACEHOLDER_ADJACENT;

  const hasPrev = !!displayData.prev;
  const hasNext = !!displayData.next;

  if (!hasPrev && !hasNext) {
    return (
      <div className={className} style={styles}>
        <p className="text-sm text-npb-text-muted text-center py-4">
          No adjacent posts found.
        </p>
      </div>
    );
  }

  return (
    <div className={className} style={styles}>
      <nav className="flex items-stretch justify-between gap-4">
        {/* Previous post */}
        {hasPrev ? (
          <NavigationLink
            post={displayData.prev!}
            direction="prev"
            label={prevLabel}
            showLabel={showLabel}
            showThumbnail={showThumbnail}
            isPreview={!!isPreview}
          />
        ) : (
          <div className="flex-1" />
        )}

        {/* Next post */}
        {hasNext ? (
          <NavigationLink
            post={displayData.next!}
            direction="next"
            label={nextLabel}
            showLabel={showLabel}
            showThumbnail={showThumbnail}
            isPreview={!!isPreview}
          />
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </div>
  );
}

// ============================================================================
// NAVIGATION LINK (sub-component)
// ============================================================================

interface NavigationLinkProps {
  post: AdjacentPost;
  direction: 'prev' | 'next';
  label: string;
  showLabel: boolean;
  showThumbnail: boolean;
  isPreview: boolean;
}

/** Renders a single prev/next navigation link with optional thumbnail and label. */
function NavigationLink({
  post,
  direction,
  label,
  showLabel,
  showThumbnail,
  isPreview,
}: NavigationLinkProps) {
  const isPrev = direction === 'prev';
  const alignment = isPrev ? 'text-left' : 'text-right';
  const flexDirection = isPrev ? 'flex-row' : 'flex-row-reverse';

  const innerContent = (
    <div className={`flex items-center gap-3 ${flexDirection}`}>
      {/* Directional arrow */}
      {isPrev ? (
        <ChevronLeft className="w-5 h-5 text-npb-text-muted flex-shrink-0" />
      ) : (
        <ChevronRight className="w-5 h-5 text-npb-text-muted flex-shrink-0" />
      )}

      {/* Thumbnail */}
      {showThumbnail && post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-12 h-12 rounded object-cover flex-shrink-0"
        />
      )}

      {/* Text content */}
      <div className={alignment}>
        {showLabel && (
          <span className="block text-xs text-npb-text-muted uppercase tracking-wide mb-0.5">
            {label}
          </span>
        )}
        <span className="block text-sm font-medium text-npb-text-primary leading-snug">
          {post.title}
        </span>
      </div>
    </div>
  );

  const sharedClassName =
    'flex-1 p-3 rounded-md border border-npb-border-default hover:border-npb-border-strong hover:bg-npb-surface-raised transition-colors';

  // Preview mode: render as real links
  if (isPreview) {
    return (
      <a
        href={`/post/${post.slug}`}
        className={`${sharedClassName} no-underline`}>
        {innerContent}
      </a>
    );
  }

  // Editor mode: render as non-interactive div
  return <div className={sharedClassName}>{innerContent}</div>;
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

/**
 * Post Navigation block definition for the PageBuilder.
 * Displays previous/next post navigation links with optional thumbnails and labels.
 */
const PostNavigationBlock = createBlockDefinition<PostNavigationContent>({
  id: 'post/navigation',
  label: 'Post Navigation',
  icon: ArrowLeftRight,
  description: 'Navigate between previous and next posts',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '2em 0' },
  settings: PostNavigationSettings,
  hasSettings: true,
  render: ({ content, styles, isPreview }) => (
    <PostNavigationRenderer content={content} styles={styles} isPreview={isPreview} />
  ),
});

export default PostNavigationBlock;
