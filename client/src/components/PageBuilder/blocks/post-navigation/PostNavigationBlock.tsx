import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBlockState } from '../useBlockState';
import { getBlockStateAccessor } from '../blockStateRegistry';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig, BlockContent } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
} from 'lucide-react';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type PostNavigationContent = {
  postId?: string;
  showThumbnail?: boolean;
  showLabel?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
};

type AdjacentPost = {
  id: string;
  title: string;
  slug: string;
  featuredImage?: string;
};
type AdjacentPostsData = { prev?: AdjacentPost; next?: AdjacentPost };

const DEFAULT_CONTENT: PostNavigationContent = {
  postId: '',
  showThumbnail: false,
  showLabel: true,
  prevLabel: 'Previous Post',
  nextLabel: 'Next Post',
  className: '',
};

const PLACEHOLDER_ADJACENT: AdjacentPostsData = {
  prev: {
    id: 'prev-placeholder',
    title: 'Previous Post Title',
    slug: 'previous-post',
  },
  next: { id: 'next-placeholder', title: 'Next Post Title', slug: 'next-post' },
};

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
// MAIN COMPONENT
// ============================================================================

export function PostNavigationBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostNavigationContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <PostNavigationRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostNavigationSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/** Sidebar settings panel for the post navigation block. */
function PostNavigationSettings({
  block,
  onUpdate,
}: PostNavigationSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const content = (block.content as PostNavigationContent) || DEFAULT_CONTENT;

  const updateContent = (updates: Partial<PostNavigationContent>) => {
    const updated = { ...content, ...updates };
    if (accessor) {
      accessor.setContent(updated);
    } else if (onUpdate) {
      onUpdate({
        content: {
          ...updated,
        } as unknown as BlockContent,
      });
    }
  };

  const currentShowThumbnail = content?.showThumbnail ?? false;
  const currentShowLabel = content?.showLabel ?? true;

  return (
    <div className="space-y-4">
      {/* Display Settings */}
      <CollapsibleCard title="Display" icon={Eye} defaultOpen>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="nav-show-thumbnail">
              Show Thumbnail
            </SettingsLabel>
            <Switch
              id="nav-show-thumbnail"
              checked={currentShowThumbnail}
              onCheckedChange={(checked) =>
                updateContent({ showThumbnail: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="nav-show-label">Show Label</SettingsLabel>
            <Switch
              id="nav-show-label"
              checked={currentShowLabel}
              onCheckedChange={(checked) =>
                updateContent({ showLabel: checked })
              }
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Label Text */}
      <CollapsibleCard title="Labels" icon={Tag} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="nav-prev-label">Previous Label</SettingsLabel>
            <Input
              id="nav-prev-label"
              value={content?.prevLabel || ''}
              onChange={(e) => updateContent({ prevLabel: e.target.value })}
              placeholder="Previous Post"
              className="mt-1 h-9 text-sm"
            />
          </div>
          <div>
            <SettingsLabel htmlFor="nav-next-label">Next Label</SettingsLabel>
            <Input
              id="nav-next-label"
              value={content?.nextLabel || ''}
              onChange={(e) => updateContent({ nextLabel: e.target.value })}
              placeholder="Next Post"
              className="mt-1 h-9 text-sm"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Post */}
      <CollapsibleCard title="Post" icon={Tag} defaultOpen={false}>
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
 * Post Navigation block definition for the PageBuilder.
 * Displays previous/next post navigation links with optional thumbnails and labels.
 */
const PostNavigationBlock: BlockDefinition = {
  id: 'post/navigation',
  label: 'Post Navigation',
  icon: ArrowLeftRight,
  description: 'Navigate between previous and next posts',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '2em 0' },
  component: PostNavigationBlockComponent,
  settings: PostNavigationSettings,
  hasSettings: true,
};

export default PostNavigationBlock;
