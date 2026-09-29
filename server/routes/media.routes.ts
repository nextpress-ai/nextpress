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
import { sanitizeSvgMarkup, isSvglFileUrl, SVG_FILE_MAX_BYTES } from '@shared/icon-drawing';
import { sideloadRemoteImage } from '../utils/sideload-remote-image';
import { createRateLimiter } from '../utils/rate-limit';

const SVG_MIME_TYPES = new Set(['image/svg+xml', 'image/svg']);

/** Thrown for uploads we refuse on purpose; carries the status and the message people see. */
type RefusedUpload = Error & { statusCode: number; publicMessage: string };

const refuseUpload = ({ publicMessage, cause }: { publicMessage: string; cause: string }): RefusedUpload =>
  Object.assign(new Error(cause), { statusCode: 400, publicMessage });

const isRefusedUpload = (err: Error): err is RefusedUpload =>
  typeof (err as Partial<RefusedUpload>).publicMessage === 'string';

/**
 * Rewrites an uploaded SVG without scripts or outside links. WHY: an SVG in /uploads opened on its
 * own runs on this site's address, so a hostile drawing could act as the signed-in person.
 */
async function cleanUploadedSvg({ filePath }: { filePath: string }): Promise<{ ok: true; size: number } | { ok: false; message: string }> {
  const raw = await fs.readFile(filePath, 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > SVG_FILE_MAX_BYTES) {
    return { ok: false, message: `SVG larger than ${SVG_FILE_MAX_BYTES} bytes` };
  }
  const cleaned = sanitizeSvgMarkup(raw);
  if (!cleaned.ok) return { ok: false, message: cleaned.message };
  await fs.writeFile(filePath, cleaned.svg, 'utf8');
  return { ok: true, size: Buffer.byteLength(cleaned.svg, 'utf8') };
}

/**
 * Creates media routes for file upload and management.
 * Handles file uploads with security restrictions (multer),
 * file deletion from disk on media deletion, and WordPress-style hooks.
 * 
 * Endpoints:
 * - GET    /api/media        - List media with pagination and mime_type filter
 * - GET    /api/media/:id    - Get single media item
 * - POST   /api/media        - Upload file (auth required, fires wp_handle_upload hook; SVGs are cleaned)
 * - POST   /api/media/svgl   - Save one svgl.app brand logo into the library (auth required, rate limited)
 * - PUT    /api/media/:id    - Update media metadata (auth required, fires wp_update_attachment_metadata hook)
 * - DELETE /api/media/:id    - Delete media and file (auth required, fires delete_attachment hook)
 */
export function createMediaRoutes(deps: Deps): Router {
  const router = Router();
  const checkLogoRateLimit = createRateLimiter();
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

        let fileSize = file.size;
        if (SVG_MIME_TYPES.has(file.mimetype)) {
          const cleaned = await cleanUploadedSvg({ filePath: path.join(uploadDir, file.filename) });
          if (!cleaned.ok) {
            await fs.unlink(path.join(uploadDir, file.filename)).catch((unlinkError) =>
              console.error('[media] Could not remove refused SVG', { file: file.filename, userId, unlinkError }),
            );
            throw refuseUpload({
              publicMessage: "This SVG can't be used. Export it again as a plain SVG and try once more.",
              cause: `SVG refused for user ${userId}, file ${file.originalname}: ${cleaned.message}`,
            });
          }
          fileSize = cleaned.size;
        }

        // Create URL for the uploaded file
        const fileUrl = `/uploads/${file.filename}`;

        const parsedData = schemas.media.insert.parse({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: fileSize,
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
        if (isRefusedUpload(err)) {
          return res.status(err.statusCode).json({ message: err.publicMessage });
        }
        return res.status(500).json({ message: 'Failed to upload media' });
      }

      res.status(201).json(result);
    })
  );

  // POST /api/media/svgl - Save one brand logo from svgl.app into the media library (auth required)
  router.post(
    '/svgl',
    requireAuth,
    asyncHandler(async (req: any, res) => {
      const userId = authService.getCurrentUserId(req);
      if (!userId) return res.status(401).json({ message: 'Sign in to add brand logos.' });

      const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
      const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : '';
      if (!isSvglFileUrl(url)) {
        return res.status(400).json({ message: 'That logo could not be found. Pick it again from the list.' });
      }
      if (!checkLogoRateLimit({ key: `svgl:${userId}`, limit: 30, windowMs: 60_000 })) {
        return res.status(429).json({ message: 'Too many logos at once. Wait a minute and try again.' });
      }

      const { err, result } = await safeTryAsync(async () => {
        const site = await resolveRequestSite({ models, userId, siteId: readRequestSiteId(req) });
        // One copy per logo per site: picking the same logo again reuses it.
        const originalName = `svgl-${path.posix.basename(new URL(url).pathname)}`;
        const [existing] = await models.media.findManyWhere(
          [
            { where: 'siteId', equals: site.id },
            { where: 'originalName', equals: originalName },
          ],
          { limit: 1 },
        );
        if (existing) return { status: 200, item: existing };

        const saved = await sideloadRemoteImage({
          imageUrl: url,
          uploadDir,
          allowedMimeTypes: ['image/svg+xml'],
          maxSize: SVG_FILE_MAX_BYTES,
          filenamePrefix: 'svgl',
        });
        if (!saved.ok) {
          throw Object.assign(new Error(`svgl download failed for ${url}: ${saved.message}`), {
            statusCode: 502,
            publicMessage: "That logo couldn't be downloaded right now. Try again in a moment.",
          });
        }

        const item = await models.media.create({
          authorId: String(userId),
          siteId: String(site.id),
          filename: saved.filename,
          originalName,
          mimeType: saved.mimeType,
          size: saved.size,
          url: saved.url,
          alt: title,
          description: `Brand logo from svgl.app (${url})`,
        });
        hooks.doAction('wp_handle_upload', item);
        return { status: 201, item };
      });

      if (err || !result) {
        console.error('[media] Brand logo save failed', { atFunction: 'POST /api/media/svgl', userId, url, err });
        if (err && isRefusedUpload(err)) return res.status(err.statusCode).json({ message: err.publicMessage });
        return res.status(500).json({ message: "That logo couldn't be saved. Try again in a moment." });
      }
      return res.status(result.status).json(result.item);
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
