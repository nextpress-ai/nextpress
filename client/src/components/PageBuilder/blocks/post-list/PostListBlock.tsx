import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useBlockState } from '../useBlockState';
import type { BlockDefinition, BlockComponentProps } from '../types';
import {
  LayoutList,
  Calendar,
  User,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';
import {
  type PostListContent,
  type PostItem,
  DEFAULT_CONTENT,
  buildPlaceholderPosts,
  formatDate,
} from './post-list-model';
import { PostListSettings } from './post-list-settings';

// ============================================================================
// RENDERER
// ============================================================================

/**
 * Dispatches a custom event to signal the page builder to inline-edit a post.
 * The PageBuilderEditor listens for this event and swaps the canvas content.
 */
function dispatchEditPost(postId: string) {
  window.dispatchEvent(new CustomEvent('np:edit-post', { detail: { postId } }));
}

/**
 * Renders the post list in the chosen layout.
 * In preview mode (isPreview=true) it fetches real posts from the API.
 * In editor mode it fetches real posts when blogId is set (for inline editing),
 * otherwise falls back to placeholder cards.
 */
function PostListRenderer({
  content,
  styles,
  isPreview,
}: {
  content: PostListContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}) {
  const cfg = { ...DEFAULT_CONTENT, ...content } as Required<PostListContent>;
  const shouldFetchReal = isPreview || !!cfg.blogId;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posts', cfg.blogId, cfg.postsPerPage, cfg.orderBy, cfg.order],
    queryFn: async () => {
      const statusParam = isPreview ? 'publish' : 'any';
      const params = new URLSearchParams({
        per_page: String(cfg.postsPerPage),
        status: statusParam,
      });
      if (cfg.blogId) params.set('blog_id', cfg.blogId);
      if (cfg.orderBy) params.set('order_by', cfg.orderBy);
      if (cfg.order) params.set('order', cfg.order);

      const res = await fetch(`/api/posts?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch posts (${res.status})`);
      const json = await res.json();
      const items: PostItem[] = (
        Array.isArray(json) ? json : (json.posts ?? [])
      ).map((p: any) => ({
        id: p.id,
        title: p.title ?? 'Untitled',
        slug: p.slug ?? '',
        excerpt: p.excerpt ?? '',
        featuredImage: p.featuredImage ?? p.featured_image ?? '',
        publishedAt: p.publishedAt ?? p.published_at ?? p.createdAt ?? '',
        author: p.author ? { name: p.author.name ?? 'Unknown' } : undefined,
      }));
      return items;
    },
    enabled: shouldFetchReal,
    staleTime: 5 * 60 * 1000,
  });

  const posts: PostItem[] = data ?? buildPlaceholderPosts(cfg.postsPerPage);

  const wrapperClass = [
    'np-post-list',
    `np-post-list--${cfg.layout}`,
    cfg.className,
  ]
    .filter(Boolean)
    .join(' ');

  if (isLoading)
    return (
      <div className={wrapperClass} style={styles}>
        <p className="text-sm text-npb-text-muted py-8 text-center">Loading posts…</p>
      </div>
    );
  if (isError)
    return (
      <div className={wrapperClass} style={styles}>
        <p className="text-sm text-npb-status-error py-8 text-center">
          {error instanceof Error ? error.message : 'Failed to load posts'}
        </p>
      </div>
    );

  if (posts.length === 0) {
    return (
      <div className={wrapperClass} style={styles}>
        <div className="text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-strong rounded">
          <LayoutList className="w-10 h-10 mx-auto mb-2" />
          <p>No posts found</p>
        </div>
      </div>
    );
  }

  const layoutMap: Record<string, React.CSSProperties> = {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '1.25rem',
    },
    list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    cards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '1.5rem',
    },
  };

  return (
    <div className={wrapperClass} style={styles}>
      <div style={layoutMap[cfg.layout]}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            layout={cfg.layout}
            cfg={cfg}
            isPreview={isPreview}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// POST CARD
// ============================================================================

/** Renders a single post entry adapted to the selected layout. */
function PostCard({
  post,
  layout,
  cfg,
  isPreview,
}: {
  post: PostItem;
  layout: 'grid' | 'list' | 'cards';
  cfg: Required<PostListContent>;
  isPreview?: boolean;
}) {
  const isEditorWithRealPosts = !isPreview && typeof post.id === 'string';

  const handleEditClick = (e: React.MouseEvent) => {
    if (!isEditorWithRealPosts) return;
    e.preventDefault();
    e.stopPropagation();
    dispatchEditPost(String(post.id));
  };

  const Wrapper = isPreview ? 'a' : 'div';
  const wrapperProps = isPreview ? { href: `/post/${post.slug}` } : {};

  /** Overlay shown in editor mode on real posts — indicates they are clickable for inline editing */
  const editOverlay = isEditorWithRealPosts ? (
    <div
      className="absolute inset-0 bg-black/0 hover:bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer z-10 rounded-lg"
      onClick={handleEditClick}
      title="Click to edit this post">
      <span className="bg-white/90 text-npb-text-secondary text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
        <Pencil className="w-3 h-3" /> Edit Post
      </span>
    </div>
  ) : null;

  const imagePlaceholder = (size: string) => (
    <div
      className={`${size} flex-shrink-0 rounded bg-npb-surface-inset overflow-hidden flex items-center justify-center`}>
      {post.featuredImage ? (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <ImageIcon className="w-6 h-6 text-npb-text-muted" />
      )}
    </div>
  );

  if (layout === 'list') {
    return (
      <div className="relative">
        {editOverlay}
        <Wrapper
          {...wrapperProps}
          className="flex items-start gap-4 p-3 rounded-lg border border-npb-border-default hover:border-npb-border-strong transition-colors"
          style={{ textDecoration: 'none', color: 'inherit' }}>
          {cfg.showFeaturedImage && imagePlaceholder('w-24 h-24')}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-1 truncate">
              {post.title}
            </h3>
            {cfg.showExcerpt && post.excerpt && (
              <p className="text-sm text-npb-text-muted line-clamp-2">
                {post.excerpt}
              </p>
            )}
            <PostMeta post={post} cfg={cfg} />
          </div>
        </Wrapper>
      </div>
    );
  }

  return (
    <div className="relative">
      {editOverlay}
      <Wrapper
        {...wrapperProps}
        className="flex flex-col rounded-lg border border-npb-border-default overflow-hidden hover:border-npb-border-strong transition-colors"
        style={{ textDecoration: 'none', color: 'inherit' }}>
        {cfg.showFeaturedImage && (
          <div
            className="w-full bg-npb-surface-inset flex items-center justify-center"
            style={{ height: layout === 'cards' ? 180 : 140 }}>
            {post.featuredImage ? (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-npb-text-muted" />
            )}
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-base leading-tight mb-1">
            {post.title}
          </h3>
          {cfg.showExcerpt && post.excerpt && (
            <p className="text-sm text-npb-text-muted line-clamp-3 mb-2">
              {post.excerpt}
            </p>
          )}
          <PostMeta post={post} cfg={cfg} />
        </div>
      </Wrapper>
    </div>
  );
}

/** Renders optional date and author metadata line. */
function PostMeta({
  post,
  cfg,
}: {
  post: PostItem;
  cfg: Required<PostListContent>;
}) {
  const parts: React.ReactNode[] = [];
  if (cfg.showDate && post.publishedAt) {
    parts.push(
      <span key="date" className="inline-flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {formatDate(post.publishedAt)}
      </span>,
    );
  }
  if (cfg.showAuthor && post.author?.name) {
    parts.push(
      <span key="author" className="inline-flex items-center gap-1">
        <User className="w-3 h-3" />
        {post.author.name}
      </span>,
    );
  }
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-3 text-xs text-npb-text-muted mt-auto pt-2">
      {parts}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostListBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostListContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });
  return (
    <PostListRenderer content={content} styles={styles} isPreview={isPreview} />
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const PostListBlock: BlockDefinition = {
  id: 'post/list',
  label: 'Post List',
  icon: LayoutList,
  description: 'Display a list of posts in grid, list, or card layout',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  component: PostListBlockComponent,
  settings: PostListSettings,
  hasSettings: true,
};

export default PostListBlock;
