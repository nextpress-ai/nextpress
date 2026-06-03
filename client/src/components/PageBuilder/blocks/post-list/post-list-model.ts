/**
 * Post List block data model: content shape, post item type, defaults, and pure
 * preview/date helpers. No React here — see `post-list-settings.tsx` for the UI.
 */

export type PostListContent = {
  layout?: 'grid' | 'list' | 'cards';
  postsPerPage?: number;
  showExcerpt?: boolean;
  showFeaturedImage?: boolean;
  showDate?: boolean;
  showAuthor?: boolean;
  blogId?: string;
  orderBy?: 'date' | 'title';
  order?: 'asc' | 'desc';
  className?: string;
};

export type PostItem = {
  id: string | number;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: string;
  author?: { name: string };
};

export const DEFAULT_CONTENT: PostListContent = {
  layout: 'cards',
  postsPerPage: 6,
  showExcerpt: true,
  showFeaturedImage: true,
  showDate: true,
  showAuthor: true,
  blogId: '',
  orderBy: 'date',
  order: 'desc',
  className: '',
};

/** Generates placeholder posts for the editor preview. */
export function buildPlaceholderPosts(count: number): PostItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Post Title ${i + 1}`,
    slug: `post-title-${i + 1}`,
    excerpt:
      'This is a sample excerpt for the post. It gives readers a quick preview of the content.',
    featuredImage: '',
    publishedAt: new Date().toISOString(),
    author: { name: 'Author Name' },
  }));
}

/** Formats an ISO date string to a readable locale date. */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
