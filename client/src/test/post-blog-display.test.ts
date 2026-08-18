import { describe, expect, it } from 'vitest';
import { buildPostBlogLookup, resolvePostBlogDisplay } from '@/lib/post-blog-display';
import type { Blog } from '@shared/schema-types';

const sampleBlogs = [
  {
    id: 'blog-1',
    name: 'News',
    pageId: 'page-1',
  },
] as Blog[];

describe('post-blog-display', () => {
  it('builds a lookup map from blogs', () => {
    const lookup = buildPostBlogLookup(sampleBlogs);
    expect(lookup.get('blog-1')).toEqual({ name: 'News', pageId: 'page-1' });
  });

  it('returns blog name and page id for assigned posts', () => {
    const lookup = buildPostBlogLookup(sampleBlogs);
    expect(
      resolvePostBlogDisplay({ blogId: 'blog-1', lookup }),
    ).toEqual({ name: 'News', pageId: 'page-1', missing: false });
  });

  it('marks posts without a blog as missing', () => {
    const lookup = buildPostBlogLookup(sampleBlogs);
    expect(
      resolvePostBlogDisplay({ blogId: null, lookup }),
    ).toEqual({ name: 'No blog', pageId: null, missing: true });
  });
});
