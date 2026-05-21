import { Router } from 'express';
import { eq } from 'drizzle-orm';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { db } from '../db';
import { pages } from '@shared/schema';

/**
 * Creates preview routes for NextPress content.
 * 
 * Endpoints:
 * - GET /api/preview/post/:id - Preview a post by ID (published or preview status)
 * - GET /api/preview/page/:id - Preview a page by ID (draft, preview, or publish)
 * - GET /api/preview/template/:id - Preview a template by ID (all templates available)
 * 
 * Requires authentication — draft/preview content must not be public.
 * Pages use the pages table; posts use the posts table.
 * 
 * @param deps - Injected dependencies (models)
 * @returns Express router with mounted preview routes
 */
export function createPreviewRoutes(deps: Deps): Router {
  const router = Router();
  const { models, requireAuth } = deps;

  router.use(requireAuth);

  /**
   * GET /api/preview/post/:id - Preview a post by ID
   * Only allows preview of posts with status 'publish' or 'preview'
   */
  router.get(
    '/post/:id',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const post = await models.posts.findById(req.params.id);
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        // Only allow preview of published posts or posts with status 'preview'
        if (post.status !== 'publish' && post.status !== 'preview') {
          return res
            .status(404)
            .json({ message: 'Post not available for preview' });
        }

        res.json(post);
      });

      if (err) {
        console.error('Error fetching post preview:', err);
        res.status(500).json({ message: 'Failed to fetch post preview' });
      }
    })
  );

  /**
   * GET /api/preview/page/:id - Preview a page by ID
   * Pages are stored in the pages table. Allows draft, preview, and publish so authors can preview after save.
   * Uses db + pages table directly so we always query the same store as the rest of the app.
   */
  router.get(
    '/page/:id',
    asyncHandler(async (req, res) => {
      const id = req.params.id;
      const { err, result } = await safeTryAsync(async () => {
        const rows = await db.select().from(pages).where(eq(pages.id, id));
        const page = rows[0] ?? null;
        if (!page) {
          return res.status(404).json({ message: 'Page not found' });
        }

        const status = (page as { status?: string }).status;
        if (status !== 'publish' && status !== 'preview' && status !== 'draft') {
          return res
            .status(404)
            .json({ message: 'Page not available for preview' });
        }

        res.json(page);
      });

      if (err) {
        console.error('Error fetching page preview:', err);
        res.status(500).json({ message: 'Failed to fetch page preview' });
      }
    })
  );

  /**
   * GET /api/preview/template/:id - Preview a template by ID
   * Template preview is available for all templates
   */
  router.get(
    '/template/:id',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const template = await models.templates.findById(req.params.id);
        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }

        // Template preview is available for all templates

        res.json(template);
      });

      if (err) {
        console.error('Error fetching template preview:', err);
        res.status(500).json({ message: 'Failed to fetch template preview' });
      }
    })
  );

  return router;
}
