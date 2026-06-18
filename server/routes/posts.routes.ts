import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { coerceDates } from './shared/date-coerce';
import { enrichPostForApi } from '@shared/posts/post-other';

/**
 * Creates Posts CRUD routes for the NextPress API.
 * 
 * Endpoints:
 * - GET /api/posts - List posts with pagination and status filter
 * - GET /api/posts/:id - Get single post by ID
 * - POST /api/posts - Create new post (requires auth)
 * - PUT /api/posts/:id - Update post (requires auth)
 * - DELETE /api/posts/:id - Delete post (requires auth)
 * 
 * @param deps - Injected dependencies (models, hooks, schemas, auth, etc.)
 * @returns Express router with mounted post routes
 */
export function createPostsRoutes(deps: Deps): Router {
  const router = Router();
  const { models, hooks, authService, requireAuth, CONFIG, parsePaginationParams, parseStatusParam, schemas } = deps;
  const postSchemas = schemas.posts;

  /**
   * GET /api/posts - List posts with pagination, status and blog_id filter
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const { page, limit, offset } = parsePaginationParams(
          req.query,
          CONFIG.PAGINATION.DEFAULT_POSTS_PER_PAGE
        );
        const { status = CONFIG.STATUS.PUBLISH, blog_id } = req.query;

        // Handle 'any' status to show all posts (for admin interface)
        const actualStatus = parseStatusParam(status as string);

        // Build combined filter array for status + blogId
        const filters: Array<{ where: string; equals: unknown }> = [];
        if (actualStatus) {
          filters.push({ where: 'status', equals: actualStatus });
        }
        if (blog_id && typeof blog_id === 'string') {
          filters.push({ where: 'blogId', equals: blog_id });
        }

        const posts = filters.length > 0
          ? await models.posts.findManyWhere(filters, { limit, offset })
          : await models.posts.findMany({ limit, offset });

        const total = await models.posts.count({
          where: filters.length > 0 ? filters : undefined,
        });

        return {
          posts: posts.map(enrichPostForApi),
          total,
          page,
          per_page: limit,
          total_pages: Math.ceil(total / limit),
        };
      });

      if (err) {
        console.error('Error fetching posts:', err);
        return res.status(500).json({ message: 'Failed to fetch posts' });
      }

      res.json(result);
    })
  );

  /**
   * GET /api/posts/:id - Get single post by ID
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      try {
        const post = await models.posts.findById(req.params.id);
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }
        res.json(enrichPostForApi(post));
      } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post' });
      }
    })
  );

  /**
   * POST /api/posts - Create new post (requires authentication)
   */
  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req: any, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = authService.getCurrentUserId(req);
        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Validate title before parse so we can generate slug
        const title = req.body.title;
        if (!title || typeof title !== 'string') {
          throw new Error('Title is required and must be a string');
        }

        // Generate slug before validation so the required field is present
        const titleStr = String(title);
        const slugValue = req.body.slug 
          ? String(req.body.slug)
          : titleStr
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

        // Include authorId and slug in the data before validation
        const parsedData = postSchemas.insert.parse({
          ...req.body,
          slug: slugValue,
          authorId: userId,
        });
        
        const postData = {
          ...parsedData,
          title: String(parsedData.title),
          slug: String(parsedData.slug),
          authorId: String(parsedData.authorId),
        };

        const post = await models.posts.create(postData);
        hooks.doAction('save_post', post);

        if (post.status === CONFIG.STATUS.PUBLISH) {
          hooks.doAction('publish_post', post);
        }

        return post;
      });

      if (err) {
        console.error('Error creating post:', err);
        return res.status(500).json({ message: 'Failed to create post' });
      }

      res.status(201).json(result);
    })
  );

  /**
   * PUT /api/posts/:id - Update existing post (requires authentication)
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const postData = postSchemas.update.parse(coerceDates(req.body, ['publishedAt']));

        const existingPost = await models.posts.findById(id);
        if (!existingPost) {
          return res.status(404).json({ message: 'Post not found' });
        }

        const wasPublished = existingPost.status === 'publish';
        const post = await models.posts.update(id, postData);

        hooks.doAction('save_post', post);

        if (!wasPublished && post.status === 'publish') {
          hooks.doAction('publish_post', post);
        }

        res.json(post);
      } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post' });
      }
    })
  );

  /**
   * DELETE /api/posts/:id - Delete post (requires authentication)
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const post = await models.posts.findById(id);

        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        await models.posts.delete(id);
        hooks.doAction('delete_post', id);

        res.json({ message: 'Post deleted successfully' });
      } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post' });
      }
    })
  );

  return router;
}
