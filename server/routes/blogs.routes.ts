import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { generateSlug } from './shared/slug';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';

/**
 * Builds a PostList block config pre-configured for a specific blog.
 * This block is placed on the auto-created blog page so it lists that blog's posts.
 */
function buildBlogPostListBlock(blogId: string) {
  return {
    id: crypto.randomUUID(),
    name: 'post/list',
    label: 'Post List',
    type: 'block' as const,
    parentId: null,
    category: 'post' as const,
    content: {
      layout: 'cards',
      postsPerPage: 6,
      showExcerpt: true,
      showFeaturedImage: true,
      showDate: true,
      showAuthor: true,
      blogId,
      orderBy: 'date',
      order: 'desc',
      className: '',
    },
    styles: { padding: '20px', margin: '0px' },
    settings: {},
  };
}

/**
 * Creates Blog CRUD routes for the NextPress API.
 *
 * Endpoints:
 * - GET /api/blogs       — List blogs with pagination
 * - GET /api/blogs/:id   — Get single blog by ID
 * - POST /api/blogs      — Create new blog (requires auth)
 * - PUT /api/blogs/:id   — Update blog (requires auth)
 * - DELETE /api/blogs/:id — Delete blog (requires auth)
 *
 * @param deps - Injected dependencies (models, hooks, schemas, auth, etc.)
 * @returns Express router with mounted blog routes
 */
export function createBlogsRoutes(deps: Deps): Router {
  const router = Router();
  const { models, hooks, requireAuth, authService, CONFIG, parsePaginationParams, parseStatusParam, schemas } = deps;
  const blogSchemas = schemas.blogs;

  /**
   * GET /api/blogs — List blogs with pagination and optional status filter.
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const { page, limit, offset } = parsePaginationParams(req.query, 20);
        const { status } = req.query;
        const siteId =
          typeof req.query.siteId === 'string' && req.query.siteId.trim()
            ? req.query.siteId.trim()
            : undefined;

        const actualStatus = status ? parseStatusParam(status as string) : null;

        const filters = [
          ...(actualStatus ? [{ where: 'status', equals: actualStatus }] : []),
          ...(siteId ? [{ where: 'siteId', equals: siteId }] : []),
        ];

        const blogs =
          filters.length > 0
            ? await models.blogs.findManyWhere(filters, { limit, offset })
            : await models.blogs.findMany({ limit, offset });

        const total = await models.blogs.count({
          where: filters.length > 0 ? filters : undefined,
        });

        return {
          blogs,
          total,
          page,
          per_page: limit,
          total_pages: Math.ceil(total / limit),
        };
      });

      if (err) {
        console.error('Error fetching blogs:', err);
        return res.status(500).json({ message: 'Failed to fetch blogs' });
      }

      res.json(result);
    })
  );

  /**
   * GET /api/blogs/:id — Get a single blog by ID.
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      try {
        const blog = await models.blogs.findById(req.params.id);
        if (!blog) {
          return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
      } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ message: 'Failed to fetch blog' });
      }
    })
  );

  /**
   * POST /api/blogs — Create a new blog (requires authentication).
   * Also auto-creates a corresponding page in the pages table with a
   * pre-configured PostList block, so the blog has a browsable index page.
   */
  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req: any, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const { authService } = deps;
        const userId = authService.getCurrentUserId(req);
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const name = req.body.name;
        if (!name || typeof name !== 'string') {
          throw new Error('Blog name is required');
        }

        // Generate slug before validation so the required field is present
        const site = await resolveRequestSite({
          models,
          userId,
          siteId: readRequestSiteId(req) ?? req.body?.siteId,
        });

        const slugValue = req.body.slug
          ? String(req.body.slug)
          : generateSlug(String(name));

        const parsedData = blogSchemas.insert.parse({
          ...req.body,
          slug: slugValue,
          authorId: userId,
          siteId: site.id,
        });

        const blogData = {
          ...parsedData,
          name: String(parsedData.name),
          slug: String(parsedData.slug),
          authorId: String(parsedData.authorId),
          siteId: String(parsedData.siteId),
        };

        const blog = await models.blogs.create(blogData);

        const siteId = String(site.id);

        // Auto-create the blog's index page with a PostList block
        const blogPage = await models.pages.create({
          title: String(blog.name),
          slug: `blog-${String(blog.slug)}`,
          siteId,
          authorId: String(userId),
          status: 'draft',
          blocks: [buildBlogPostListBlock(blog.id)],
          other: { isBlogPage: true, blogId: blog.id },
        } as any);

        // Link the page back to the blog
        const updatedBlog = await models.blogs.update(blog.id, {
          pageId: blogPage.id,
        } as any);

        hooks.doAction('save_blog', updatedBlog);

        return updatedBlog;
      });

      if (err) {
        console.error('Error creating blog:', err);
        return res.status(500).json({ message: 'Failed to create blog' });
      }

      res.status(201).json(result);
    })
  );

  /**
   * PUT /api/blogs/:id — Update an existing blog (requires authentication).
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const blogData = blogSchemas.update.parse(req.body);

        const existing = await models.blogs.findById(id);
        if (!existing) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        const blog = await models.blogs.update(id, blogData);
        hooks.doAction('save_blog', blog);

        res.json(blog);
      } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ message: 'Failed to update blog' });
      }
    })
  );

  /**
   * DELETE /api/blogs/:id — Delete a blog and its associated page (requires authentication).
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const blog = await models.blogs.findById(id);

        if (!blog) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        // Delete associated blog page if it exists
        const pageId = (blog as any).pageId;
        if (pageId) {
          const { err } = await safeTryAsync(async () => {
            await models.pages.delete(pageId);
          });
          if (err) {
            console.warn(`Failed to delete blog page ${pageId}:`, err);
          }
        }

        await models.blogs.delete(id);
        hooks.doAction('delete_blog', id);

        res.json({ message: 'Blog deleted successfully' });
      } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ message: 'Failed to delete blog' });
      }
    })
  );

  return router;
}
