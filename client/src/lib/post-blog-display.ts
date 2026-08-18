import type { Blog } from '@shared/schema-types';

export type PostBlogEntry = {
  name: string;
  pageId: string | null;
};

export type PostBlogLookup = Map<string, PostBlogEntry>;

/** Index blogs by id for post list labels and page links. */
export function buildPostBlogLookup(blogs: Blog[]): PostBlogLookup {
  return new Map(
    blogs.map((blog) => [
      blog.id,
      {
        name: blog.name,
        pageId: blog.pageId ?? null,
      },
    ]),
  );
}

/** Resolves the blog label and optional blog page id for a post row. */
export function resolvePostBlogDisplay({
  blogId,
  lookup,
}: {
  blogId: string | null | undefined;
  lookup: PostBlogLookup;
}): PostBlogEntry & { missing: boolean } {
  if (!blogId) {
    return { name: 'No blog', pageId: null, missing: true };
  }

  const blog = lookup.get(blogId);
  if (!blog) {
    return { name: 'Unknown blog', pageId: null, missing: true };
  }

  return { ...blog, missing: false };
}
