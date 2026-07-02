import { Router } from 'express';
import { eq } from 'drizzle-orm';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { db } from '../db';
import { pages } from '@shared/schema';
import { getRequestAuthSiteId, getRequestAuthUserId } from '../auth';
import {
  createPreviewTokenRecord,
  generatePreviewTokenMaterial,
  purgeExpiredPreviewTokens,
  verifyPreviewToken,
  type PreviewContentType,
} from '../lib/sdk-auth';
import { assertPreviewContentAccess, ContentAccessError } from '../lib/content-access';
import { previewShareRateLimit } from '../middleware/preview-share-rate-limit';

const DEFAULT_PREVIEW_TTL_SECONDS = 300;
const MAX_PREVIEW_TTL_SECONDS = 3600;

/**
 * Creates preview routes for NextPress content.
 *
 * Endpoints:
 * - POST /tokens — create expiring share token (session or API key)
 * - GET /shared/:type/:id?token=… — public preview via token (no session)
 * - GET /post|page|template/:id — authenticated preview (session or API key)
 */
export function createPreviewRoutes(deps: Deps): Router {
  const router = Router();
  const { models, requireAuth } = deps;

  /** Public share preview — validated by expiring token query param. */
  router.get(
    '/shared/:type/:id',
    previewShareRateLimit,
    asyncHandler(async (req, res) => {
      const contentType = req.params.type as PreviewContentType;
      const contentId = req.params.id;
      const token = typeof req.query.token === 'string' ? req.query.token : '';

      if (!['page', 'post', 'template'].includes(contentType)) {
        return res.status(400).json({ message: 'Invalid content type' });
      }

      if (!token) {
        return res.status(401).json({ message: 'Preview token required' });
      }

      const verified = await verifyPreviewToken({ token, contentType, contentId });
      if (!verified) {
        return res.status(401).json({ message: 'Preview token invalid or expired' });
      }

      const payload = await loadPreviewContent({ models, contentType, contentId });
      if (!payload) {
        return res.status(404).json({ message: 'Content not found' });
      }

      res.json(payload);
    }),
  );

  router.use(requireAuth);

  /** POST /tokens — mint a time-limited preview URL for sharing. */
  router.post(
    '/tokens',
    asyncHandler(async (req, res) => {
      const userId = getRequestAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contentType = req.body?.contentType as PreviewContentType;
      const contentId = typeof req.body?.contentId === 'string' ? req.body.contentId : '';
      const expiresInSeconds =
        typeof req.body?.expiresInSeconds === 'number' && req.body.expiresInSeconds > 0
          ? Math.min(req.body.expiresInSeconds, MAX_PREVIEW_TTL_SECONDS)
          : DEFAULT_PREVIEW_TTL_SECONDS;

      if (!['page', 'post', 'template'].includes(contentType) || !contentId) {
        return res.status(400).json({ message: 'contentType and contentId are required' });
      }

      await purgeExpiredPreviewTokens();

      try {
        await assertPreviewContentAccess({
          models,
          userId,
          apiKeySiteId: getRequestAuthSiteId(req),
          contentType,
          contentId,
        });
      } catch (error) {
        if (error instanceof ContentAccessError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        throw error;
      }

      const exists = await loadPreviewContent({ models, contentType, contentId });
      if (!exists) {
        return res.status(404).json({ message: 'Content not found' });
      }

      const token = generatePreviewTokenMaterial();
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      const siteId =
        typeof req.body?.siteId === 'string'
          ? req.body.siteId
          : getRequestAuthSiteId(req) ?? (exists as { siteId?: string }).siteId ?? null;

      await createPreviewTokenRecord({
        token,
        contentType,
        contentId,
        siteId,
        createdBy: userId,
        expiresAt,
      });

      const baseUrl = `${req.protocol}://${req.get('host') ?? 'localhost'}`;
      const previewPath = `/preview/${contentType}/${contentId}`;

      res.status(201).json({
        token,
        contentType,
        contentId,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds,
        previewUrl: `${baseUrl}${previewPath}?token=${encodeURIComponent(token)}`,
        apiUrl: `/api/preview/shared/${contentType}/${contentId}?token=${encodeURIComponent(token)}`,
      });
    }),
  );

  router.get(
    '/post/:id',
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        const post = await models.posts.findById(req.params.id);
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }

        if (post.status !== 'publish' && post.status !== 'preview') {
          return res
            .status(404)
            .json({ message: 'Post not available for preview' });
        }

        const userId = getRequestAuthUserId(req);
        if (userId) {
          await assertPreviewContentAccess({
            models,
            userId,
            apiKeySiteId: getRequestAuthSiteId(req),
            contentType: 'post',
            contentId: req.params.id,
          });
        }

        res.json(post);
      });

      if (err) {
        if (err instanceof ContentAccessError) {
          return res.status(err.statusCode).json({ message: err.message });
        }
        console.error('Error fetching post preview:', err);
        res.status(500).json({ message: 'Failed to fetch post preview' });
      }
    })
  );

  router.get(
    '/page/:id',
    asyncHandler(async (req, res) => {
      const id = req.params.id;
      const { err } = await safeTryAsync(async () => {
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

        const userId = getRequestAuthUserId(req);
        if (userId) {
          await assertPreviewContentAccess({
            models,
            userId,
            apiKeySiteId: getRequestAuthSiteId(req),
            contentType: 'page',
            contentId: id,
          });
        }

        res.json(page);
      });

      if (err) {
        if (err instanceof ContentAccessError) {
          return res.status(err.statusCode).json({ message: err.message });
        }
        console.error('Error fetching page preview:', err);
        res.status(500).json({ message: 'Failed to fetch page preview' });
      }
    })
  );

  router.get(
    '/template/:id',
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        const template = await models.templates.findById(req.params.id);
        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }

        const userId = getRequestAuthUserId(req);
        if (userId) {
          await assertPreviewContentAccess({
            models,
            userId,
            apiKeySiteId: getRequestAuthSiteId(req),
            contentType: 'template',
            contentId: req.params.id,
          });
        }

        res.json(template);
      });

      if (err) {
        if (err instanceof ContentAccessError) {
          return res.status(err.statusCode).json({ message: err.message });
        }
        console.error('Error fetching template preview:', err);
        res.status(500).json({ message: 'Failed to fetch template preview' });
      }
    })
  );

  return router;
}

async function loadPreviewContent({
  models,
  contentType,
  contentId,
}: {
  models: Deps['models'];
  contentType: PreviewContentType;
  contentId: string;
}) {
  if (contentType === 'post') {
    const post = await models.posts.findById(contentId);
    if (!post || (post.status !== 'publish' && post.status !== 'preview' && post.status !== 'draft')) {
      return null;
    }
    return post;
  }

  if (contentType === 'page') {
    const rows = await db.select().from(pages).where(eq(pages.id, contentId));
    const page = rows[0] ?? null;
    if (!page) {
      return null;
    }
    const status = (page as { status?: string }).status;
    if (status !== 'publish' && status !== 'preview' && status !== 'draft') {
      return null;
    }
    return page;
  }

  const template = await models.templates.findById(contentId);
  return template ?? null;
}
