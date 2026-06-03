/**
 * Post Navigation block data model: content shape, adjacent-post types,
 * defaults, and placeholder data. No React here — see `post-navigation-settings.tsx`
 * for the UI and `PostNavigationBlock.tsx` for the renderer/data hook.
 */

export type PostNavigationContent = {
  postId?: string;
  showThumbnail?: boolean;
  showLabel?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
};

export type AdjacentPost = {
  id: string;
  title: string;
  slug: string;
  featuredImage?: string;
};
export type AdjacentPostsData = { prev?: AdjacentPost; next?: AdjacentPost };

export const DEFAULT_CONTENT: PostNavigationContent = {
  postId: '',
  showThumbnail: false,
  showLabel: true,
  prevLabel: 'Previous Post',
  nextLabel: 'Next Post',
  className: '',
};

export const PLACEHOLDER_ADJACENT: AdjacentPostsData = {
  prev: {
    id: 'prev-placeholder',
    title: 'Previous Post Title',
    slug: 'previous-post',
  },
  next: { id: 'next-placeholder', title: 'Next Post Title', slug: 'next-post' },
};
