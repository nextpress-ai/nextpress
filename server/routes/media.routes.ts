import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';
import {
  DEFAULT_MEDIA_LIST_SORT,
  MEDIA_LIST_SORT_FIELDS,
  parseContentListSort,
  toModelOrderBy,
} from '@shared/content-list-query';

/**
 * Creates media routes for file upload and management.
 * Handles file uploads with security restrictions (multer),
 * file deletion from disk on media deletion, and WordPress-style hooks.
 * 
 * Endpoints:
 * - GET    /api/media        - List media with pagination and mime_type filter
 * - GET    /api/media/:id    - Get single media item
 * - POST   /api/media        - Upload file (auth required, fires wp_handle_upload hook)
 * - PUT    /api/media/:id    - Update media metadata (auth required, fires wp_update_attachment_metadata hook)
 * - DELETE /api/media/:id    - Delete media and file (auth required, fires delete_attachment hook)
 */
export function createMediaRoutes(deps: Deps): Router {
  const router = Router();
  const {
    models,
    hooks,
    requireAuth,
    authService,
    schemas,
    upload,
    uploadDir,
    parsePaginationParams,
    CONFIG,
  } = deps;

  // GET /api/media - List media with pagination and optional mime_type filter
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const { page, limit, offset } = parsePaginationParams(
          req.query,
          CONFIG.PAGINATION.DEFAULT_MEDIA_PER_PAGE
        );
        const { mime_type } = req.query;
        const siteId =
          typeof req.query.siteId === 'string' && req.query.siteId.trim()
            ? req.query.siteId.trim()
            : undefined;

        const filters = [
          ...(mime_type ? [{ where: 'mimeType', equals: mime_type as string }] : []),
          ...(siteId ? [{ where: 'siteId', equals: siteId }] : []),
        ];

        const listSort = parseContentListSort({
          sort: req.query.sort,
          order: req.query.order,
          allowedFields: MEDIA_LIST_SORT_FIELDS,
          defaults: DEFAULT_MEDIA_LIST_SORT,
        });

        const mediaItems =
          filters.length > 0
            ? await models.media.findManyWhere(filters, {
                limit,
                offset,
                orderBy: toModelOrderBy(listSort),
              })
            : await models.media.findMany({
                limit,
                offset,
                orderBy: toModelOrderBy(listSort),
              });

        const total = await models.media.count({
          where: filters.length > 0 ? filters : undefined,
        });

        return {
          media: mediaItems,
          total,
          page,
          per_page: limit,
          total_pages: Math.ceil(total / limit),
        };
      });

      if (err) {
        console.error('Error fetching media:', err);
        return res.status(500).json({ message: 'Failed to fetch media' });
      }

      res.json(result);
    })
  );

  // GET /api/media/:id - Get single media item
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const mediaItem = await models.media.findById(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ message: 'Media not found' });
      }
      res.json(mediaItem);
    })
  );

  // POST /api/media - Upload file (auth required)
  router.post(
    '/',
    requireAuth,
    upload.single('file'),
    asyncHandler(async (req: any, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = authService.getCurrentUserId(req);
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const site = await resolveRequestSite({
          models,
          userId,
          siteId: readRequestSiteId(req),
        });

        const file = req.file;
        if (!file) {
          throw new Error('No file uploaded');
        }

        const { alt, caption, description } = req.body;

        // Create URL for the uploaded file
        const fileUrl = `/uploads/${file.filename}`;

        const parsedData = schemas.media.insert.parse({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl,
          alt: alt || '',
          caption: caption || '',
          description: description || '',
          authorId: userId,
          siteId: site.id,
        });

        const mediaData = {
          authorId: String(parsedData.authorId),
          siteId: String(parsedData.siteId),
          filename: String(parsedData.filename),
          originalName: String(parsedData.originalName),
          mimeType: String(parsedData.mimeType),
          size: Number(parsedData.size),
          url: String(parsedData.url),
          ...(parsedData.alt && { alt: String(parsedData.alt) }),
          ...(parsedData.caption && { caption: String(parsedData.caption) }),
          ...(parsedData.description && { description: String(parsedData.description) }),
        };

        const mediaItem = await models.media.create(mediaData);
        hooks.doAction('wp_handle_upload', mediaItem);

        return mediaItem;
      });

      if (err) {
        console.error('Error uploading media:', err);
        return res.status(500).json({ message: 'Failed to upload media' });
      }

      res.status(201).json(result);
    })
  );

  // PUT /api/media/:id - Update media metadata (auth required)
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = req.params.id;
      const mediaData = schemas.media.update.parse(req.body);

      const mediaItem = await models.media.update(id, mediaData);

      hooks.doAction('wp_update_attachment_metadata', mediaItem);
      res.json(mediaItem);
    })
  );

  // DELETE /api/media/:id - Delete media and file from disk (auth required)
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = req.params.id;

      // Get media item to delete the file from disk
      const mediaItem = await models.media.findById(id);
      if (mediaItem) {
        const filePath = path.join(uploadDir, mediaItem.filename);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.warn('Could not delete file:', filePath, error);
        }
      }

      await models.media.delete(id);
      hooks.doAction('delete_attachment', id);

      res.json({ message: 'Media deleted successfully' });
    })
  );

  return router;
}
