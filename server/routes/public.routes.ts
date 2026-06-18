import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { enrichPostForApi } from '@shared/posts/post-other';

/**
 * Creates public API routes for accessing published content without authentication.
 * 
 * Endpoints:
 * - GET /api/public/page/:slug - Get published page by slug
 * - GET /api/public/post/:slug - Get published post by slug
 * - GET /api/public/homepage - Get homepage content
 * 
 * All endpoints only return content with status 'publish', ensuring
 * draft and private content remains inaccessible.
 * 
 * @param deps - Injected dependencies (models)
 * @returns Express router with mounted public routes
 */
export function createPublicRoutes(deps: Deps): Router {
  const router = Router();
  const { models } = deps;

  /**
   * GET /api/public/page/:slug - Get published page by slug
   * Only returns pages with status 'publish'
   */
  router.get(
    '/page/:slug',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const page = await models.pages.findBySlug(req.params.slug);
        if (!page) {
          return res.status(404).json({ message: 'Page not found' });
        }

        // Only allow access to published pages
        if (page.status !== 'publish') {
          return res.status(404).json({ message: 'Page not found' });
        }

        res.json(page);
      });

      if (err) {
        console.error('Error fetching published page:', err);
        res.status(500).json({ message: 'Failed to fetch page' });
      }
    })
  );

  /**
   * GET /api/public/post/:slug - Get published post by slug
   * Only returns posts with status 'publish'
   */
  router.get(
    '/post/:slug',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const post = await models.posts.findBySlug(req.params.slug);
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        // Only allow access to published posts
        if (post.status !== 'publish') {
          return res.status(404).json({ message: 'Post not found' });
        }

        res.json(enrichPostForApi(post));
      });

      if (err) {
        console.error('Error fetching published post:', err);
        res.status(500).json({ message: 'Failed to fetch post' });
      }
    })
  );

  /**
   * GET /api/public/homepage - Get configured homepage content.
   * Only returns a page when an admin selected a published homepage.
   */
  router.get(
    '/homepage',
    asyncHandler(async (_req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const homepage = await models.options.getOption('homepage_page_slug');

        if (!homepage?.value) {
          return res.status(404).json({ message: 'No homepage has been configured' });
        }

        const page = await models.pages.findBySlug(homepage.value);
        if (!page || page.status !== 'publish') {
          return res.status(404).json({ message: 'No homepage content found' });
        }

        res.json(page);
      });

      if (err) {
        console.error('Error fetching homepage:', err);
        res.status(500).json({ message: 'Failed to fetch homepage' });
      }
    })
  );

  return router;
}
