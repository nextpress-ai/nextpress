import { Router, type Request } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { createRateLimiter } from '../utils/rate-limit';
import { assertAuthenticatedSiteAccess, ContentAccessError } from '../lib/content-access';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';
import { resolveSiteThemeSettings } from './shared/resolve-site-theme-settings';
import { enrichPageForApi } from '@shared/page-other';
import { PAGE_PACKAGE_MAX_BYTES, readPagePackage, type PagePackage } from '@shared/page-transfer';
import { NEXTPRESS_CONFIG } from '../../config';
import {
  createPackageFileStore,
  createPagePackageBuilder,
  createPageImporter,
  createLinkedPagesFinder,
  isPageImportRefusal,
} from '../lib/page-transfer';

const RATE_WINDOW_MS = 60_000;
const IMPORT_LIMIT_PER_MINUTE = 10;
const EXPORT_LIMIT_PER_MINUTE = 20;
const MAX_INCLUDED_PAGES = 50;

type PublicError = Error & { statusCode: number; publicMessage: string };

const refuse = (statusCode: number, publicMessage: string, cause?: string): PublicError =>
  Object.assign(new Error(cause ?? publicMessage), { statusCode, publicMessage });

const isPublicError = (error: Error): error is PublicError =>
  typeof (error as Partial<PublicError>).publicMessage === 'string' &&
  typeof (error as Partial<PublicError>).statusCode === 'number';

/**
 * Moving a page between NextPress sites: download a page file, bring one in, or store the
 * files that came with pasted blocks. Page files arrive as an uploaded file, not a JSON body,
 * because they carry images and can be tens of megabytes.
 *
 * - GET  /api/page-transfer/pages/:id/links - Pages this page links to (and what those link to)
 * - GET  /api/page-transfer/pages/:id/export?files=1|0&include=id,id - Download a page file, with chosen linked pages
 * - POST /api/page-transfer/import - Create a draft page from a page file (field `package`)
 * - POST /api/page-transfer/files  - Store the files of copied blocks, returns old → new paths
 */
export function createPageTransferRoutes(deps: Deps): Router {
  const router = Router();
  const { models, hooks, requireAuth, authService, uploadDir, CONFIG } = deps;
  const checkRateLimit = createRateLimiter();

  const readPackageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: PAGE_PACKAGE_MAX_BYTES, files: 1 },
  }).single('package');

  const store = createPackageFileStore({
    media: models.media,
    uploadDir,
    allowedMimeTypes: CONFIG.UPLOAD.ALLOWED_MIME_TYPES,
    uploadLimit: CONFIG.UPLOAD.LIMIT,
    onFileStored: (item) => hooks.doAction('wp_handle_upload', item),
  });

  const builder = createPagePackageBuilder({
    listSiteMedia: (siteId) => models.media.findManyWhere([{ where: 'siteId', equals: siteId }]),
    readActiveTheme: async (siteId) => {
      const resolved = await resolveSiteThemeSettings({ models, siteId });
      if (!resolved.themeId) return null;
      const theme = await models.themes.findById(resolved.themeId);
      if (!theme) return null;
      return {
        name: theme.name,
        description: theme.description ?? null,
        settings: resolved.settings as unknown as Record<string, unknown>,
      };
    },
    uploadDir,
    uploadLimit: CONFIG.UPLOAD.LIMIT,
    appVersion: NEXTPRESS_CONFIG.version,
  });

  const linkedPages = createLinkedPagesFinder({
    findBySiteAndSlug: (siteId, slug) => models.pages.findBySiteAndSlug(siteId, slug),
    readHomepageSlug: async (siteId) => {
      const option = await models.options.getOption('homepage_page_slug', siteId);
      return typeof option?.value === 'string' && option.value ? option.value : null;
    },
  });

  const importer = createPageImporter({
    store,
    generateId: randomUUID,
    isSlugTaken: async ({ siteId, slug }) => Boolean(await models.pages.findBySiteAndSlug(siteId, slug)),
    createPage: (data) => models.pages.create(data),
    findThemesByName: (name) => models.themes.findManyWhere([{ where: 'name', equals: name }]),
    createTheme: ({ name, description, authorId, settings }) =>
      models.themes.create({
        name,
        description,
        authorId,
        settings,
        version: '1.0.0',
        requires: '1.0.0',
        status: 'inactive',
        renderer: null,
      }),
    activateTheme: async ({ siteId, themeId }) => {
      await models.themes.setActiveTheme(themeId);
      await models.sites.update(siteId, { activeThemeId: themeId });
    },
    draftStatus: CONFIG.STATUS.DRAFT,
  });

  const requireUserId = (req: Request): string => {
    const userId = authService.getCurrentUserId(req);
    if (!userId) throw refuse(401, 'You must be signed in to do this.');
    return userId;
  };

  const assertWithinRate = ({ userId, action, limit }: { userId: string; action: string; limit: number }) => {
    if (!checkRateLimit({ key: `${action}:${userId}`, limit, windowMs: RATE_WINDOW_MS })) {
      throw refuse(429, 'Too many page moves at once. Wait a minute and try again.');
    }
  };

  const readUploadedPackage = (req: Request): PagePackage => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw refuse(400, 'Choose a page file first.');
    const read = readPagePackage(file.buffer.toString('utf8'));
    if (!read.ok) throw refuse(400, read.message, `Page package refused: ${read.message}`);
    return read.value;
  };

  /** Multer errors (file too big) arrive before the handler; turn them into plain words. */
  const acceptPackageUpload = (req: Request, res: Parameters<typeof readPackageUpload>[1], next: (error?: unknown) => void) =>
    readPackageUpload(req, res, (error: unknown) => {
      if (!error) return next();
      console.error('[page-transfer] Page file upload refused', { atFunction: 'acceptPackageUpload', error });
      const tooBig = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
      res.status(tooBig ? 413 : 400).json({
        message: tooBig
          ? 'This page file is too large. Export it again with files left out, then add the big files by hand.'
          : "This page file couldn't be read. Export it again and try once more.",
      });
    });

  const sendError = ({
    res,
    err,
    atFunction,
    ids,
    fallback,
  }: {
    res: Parameters<Parameters<typeof asyncHandler>[0]>[1];
    err: Error;
    atFunction: string;
    ids: Record<string, unknown>;
    fallback: string;
  }) => {
    console.error(`[page-transfer] ${fallback}`, { atFunction, ...ids, error: err });
    if (err instanceof ContentAccessError) return res.status(err.statusCode).json({ message: err.message });
    if (isPublicError(err)) return res.status(err.statusCode).json({ message: err.publicMessage });
    if (isPageImportRefusal(err)) return res.status(400).json({ message: err.publicMessage });
    return res.status(500).json({ message: fallback });
  };

  /**
   * Pages the chosen ones in `?include=id,id` stand for. Each must be a real page on the same site
   * as the exported page; anything else is refused rather than quietly dropped.
   */
  const readIncludedPages = async ({ req, siteId, mainId }: { req: Request; siteId: string; mainId: string }) => {
    const raw = typeof req.query.include === 'string' ? req.query.include : '';
    const ids = [...new Set(raw.split(',').map((id) => id.trim()).filter((id) => id && id !== mainId))];
    if (ids.length > MAX_INCLUDED_PAGES) throw refuse(400, `Choose at most ${MAX_INCLUDED_PAGES} linked pages.`);
    const rows = await Promise.all(ids.map((id) => models.pages.findById(id)));
    if (rows.some((row) => !row || String(row.siteId) !== siteId)) {
      throw refuse(400, 'Some chosen pages are not on this site any more. Open Export again and retry.');
    }
    return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
  };

  router.get(
    '/pages/:id/links',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const page = await models.pages.findById(req.params.id);
        if (!page) throw refuse(404, 'This page no longer exists.');
        await assertAuthenticatedSiteAccess({ req, models, siteId: String(page.siteId) });
        return linkedPages.findLinked({ page });
      });
      if (err || !result) {
        return sendError({
          res,
          err: err ?? new Error('Finding linked pages returned nothing'),
          atFunction: 'pageTransfer.links',
          ids: { pageId: req.params.id },
          fallback: "Couldn't list the linked pages. Please try again.",
        });
      }
      res.json(result);
    }),
  );

  router.get(
    '/pages/:id/export',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = requireUserId(req);
        assertWithinRate({ userId, action: 'export', limit: EXPORT_LIMIT_PER_MINUTE });
        const page = await models.pages.findById(req.params.id);
        if (!page) throw refuse(404, 'This page no longer exists.');
        await assertAuthenticatedSiteAccess({ req, models, siteId: String(page.siteId) });
        const extraPages = await readIncludedPages({ req, siteId: String(page.siteId), mainId: page.id });
        return builder.buildForPage({ page, extraPages, includeFiles: req.query.files !== '0' });
      });

      if (err || !result) {
        return sendError({
          res,
          err: err ?? new Error('Export returned nothing'),
          atFunction: 'pageTransfer.export',
          ids: { pageId: req.params.id },
          fallback: "Couldn't prepare the page file. Please try again.",
        });
      }

      const fileName = `${result.page?.slug || 'page'}.nextpress-page.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^a-z0-9._-]/gi, '-')}"`);
      res.type('application/json').send(JSON.stringify(result));
    }),
  );

  router.post(
    '/import',
    requireAuth,
    acceptPackageUpload,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = requireUserId(req);
        assertWithinRate({ userId, action: 'import', limit: IMPORT_LIMIT_PER_MINUTE });
        const site = await resolveRequestSite({ models, userId, siteId: readRequestSiteId(req) });
        const pkg = readUploadedPackage(req);
        const imported = await importer.importPage({
          pkg,
          siteId: String(site.id),
          authorId: userId,
          includeTheme: req.body?.includeTheme === 'true',
        });
        imported.pages.forEach((created) => hooks.doAction('save_post', created));
        return imported;
      });

      if (err || !result) {
        return sendError({
          res,
          err: err ?? new Error('Import returned nothing'),
          atFunction: 'pageTransfer.import',
          ids: { userId: authService.getCurrentUserId(req), siteId: readRequestSiteId(req) },
          fallback: "Couldn't bring this page in. Please try again.",
        });
      }

      res.status(201).json({
        ...result,
        page: enrichPageForApi(result.page),
        pages: result.pages.map((created) => ({ id: created.id, title: created.title, slug: created.slug })),
      });
    }),
  );

  router.post(
    '/files',
    requireAuth,
    acceptPackageUpload,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = requireUserId(req);
        assertWithinRate({ userId, action: 'files', limit: IMPORT_LIMIT_PER_MINUTE });
        const site = await resolveRequestSite({ models, userId, siteId: readRequestSiteId(req) });
        const pkg = readUploadedPackage(req);
        return store.storeFiles({ files: pkg.files, siteId: String(site.id), authorId: userId });
      });

      if (err || !result) {
        return sendError({
          res,
          err: err ?? new Error('Storing files returned nothing'),
          atFunction: 'pageTransfer.files',
          ids: { userId: authService.getCurrentUserId(req), siteId: readRequestSiteId(req) },
          fallback: "Couldn't add the pasted files. The blocks were not pasted.",
        });
      }

      res.status(201).json(result);
    }),
  );

  return router;
}
