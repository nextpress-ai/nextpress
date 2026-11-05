import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VERSION_STALE } from '@shared/content-version';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { readErrorStatus, resolveRequestSite } from './shared/resolve-request-site';
import { assertAuthenticatedSiteAccess, ContentAccessError } from '../lib/content-access';
import { createRateLimiter } from '../utils/rate-limit';
import { createDocsService, isDocsRefusal } from '../lib/docs';
import { createPagePackageBuilderFromDeps } from '../lib/page-transfer';
import { isPageVersionStale } from '../lib/save-page-version';
import { PageDeleteError } from '../lib/delete-page';

const WRITE_LIMIT_PER_MINUTE = 120;
const RATE_WINDOW_MS = 60_000;

const featuresSchema = z.object({ sidebar: z.boolean(), toc: z.boolean(), prevNext: z.boolean(), copyPage: z.boolean() }).partial();
const linkSchema = z.object({ label: z.string().max(80), url: z.string().max(2048) });

const createSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().max(200).default(''),
  logoUrl: z.string().max(2048).optional(),
  search: z.boolean().optional(),
  features: featuresSchema.optional(),
  ownAddress: z.boolean().optional(),
});

const settingsSchema = z
  .object({
    title: z.string().max(200),
    logoUrl: z.string().max(2048),
    logoDarkUrl: z.string().max(2048),
    links: z.array(linkSchema).max(6),
    button: linkSchema,
    search: z.object({ show: z.boolean(), label: z.string().max(80), placeholder: z.string().max(120) }).partial(),
    features: featuresSchema,
  })
  .partial();

const addItemSchema = z.object({
  parentId: z.string().min(1),
  title: z.string().min(1).max(200),
  kind: z.enum(['page', 'group']),
  slug: z.string().max(200).optional(),
  position: z.number().int().min(0).optional(),
});

const updateItemSchema = z.object({
  title: z.string().max(200).optional(),
  slug: z.string().max(200).optional(),
  parentId: z.string().min(1).optional(),
  hidden: z.boolean().optional(),
  kind: z.enum(['page', 'group']).optional(),
});

const reorderSchema = z.object({ parentId: z.string().min(1), orderedIds: z.array(z.string().min(1)).max(1000) });

/**
 * The docs system: list and create docs, their navigation tree and settings, and
 * the whole docs as one page file. The editor, the SDK and MCP all use these. The routes are
 * listed in `shared/docs/types.ts`.
 */
export function createDocsRoutes(deps: Deps): Router {
  const router = Router();
  const { models, hooks, requireAuth, authService } = deps;
  const docs = createDocsService({ models, hooks, newId: randomUUID, builder: createPagePackageBuilderFromDeps(deps) });
  const checkRateLimit = createRateLimiter();

  const userIdOf = (req: Request): string => {
    const userId = authService.getCurrentUserId(req);
    if (!userId) throw Object.assign(new Error('You must be signed in to do this.'), { statusCode: 401 });
    return userId;
  };

  const assertWriteRate = (req: Request) => {
    if (!checkRateLimit({ key: `docs-write:${userIdOf(req)}`, limit: WRITE_LIMIT_PER_MINUTE, windowMs: RATE_WINDOW_MS })) {
      throw Object.assign(new Error('Too many changes at once. Wait a minute and try again.'), { statusCode: 429 });
    }
  };

  /** Loads a page and checks the caller may edit content on its site; answers 404 for a missing page. */
  const pageWithAccess = async (req: Request, pageId: string) => {
    const page = await docs.findPage(pageId);
    if (!page) throw Object.assign(new Error('That page no longer exists.'), { statusCode: 404 });
    await assertAuthenticatedSiteAccess({ req, models, siteId: String(page.siteId) });
    return page;
  };

  const sendError = ({ res, err, atFunction, ids }: { res: Response; err: Error; atFunction: string; ids: Record<string, string | undefined> }) => {
    if (isDocsRefusal(err)) {
      return res.status(err.statusCode).json({ message: err.publicMessage });
    }
    if (isPageVersionStale(err)) {
      return res.status(409).json({ code: VERSION_STALE, message: 'The page changed somewhere else. Read it again.', remoteVersion: err.remoteVersion });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: `That request isn't complete: ${err.issues.map((issue) => issue.path.join('.') || issue.message).join(', ')}.` });
    }
    if (err instanceof PageDeleteError || err instanceof ContentAccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    const status = readErrorStatus(err, 500);
    if (status !== 500) return res.status(status).json({ message: err.message });
    console.error('[docs] Request failed', { atFunction, data: { ...ids, error: err } });
    return res.status(500).json({ message: "Couldn't finish that. Please try again." });
  };

  /** Wraps a handler so every failure goes through one place, with the ids that explain it. */
  const handle = (atFunction: string, run: (req: Request, res: Response) => Promise<void>) =>
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await run(req, res);
      } catch (error) {
        sendError({ res, err: error instanceof Error ? error : new Error(String(error)), atFunction, ids: { ...req.params, userId: authService.getCurrentUserId(req) ?? undefined } });
      }
    });

  router.get('/', requireAuth, handle('docs.list', async (req, res) => {
    const site = await resolveRequestSite({ models, req, userId: userIdOf(req) });
    res.json({ docs: await docs.listDocs({ siteId: String(site.id) }) });
  }));

  router.post('/', requireAuth, handle('docs.create', async (req, res) => {
    assertWriteRate(req);
    const input = createSchema.parse(req.body);
    const userId = userIdOf(req);
    const site = await resolveRequestSite({ models, req, userId });
    res.status(201).json(await docs.createDocs({ input: { ...input, siteId: String(site.id) }, authorId: userId }));
  }));

  router.get('/items/:pageId', requireAuth, handle('docs.treeOfPage', async (req, res) => {
    const page = await pageWithAccess(req, req.params.pageId);
    res.json(await docs.readTreeOfPage({ siteId: String(page.siteId), pageId: page.id }));
  }));

  router.patch('/items/:pageId', requireAuth, handle('docs.updateItem', async (req, res) => {
    assertWriteRate(req);
    const page = await pageWithAccess(req, req.params.pageId);
    const input = updateItemSchema.parse(req.body);
    res.json({ item: await docs.updateItem({ siteId: String(page.siteId), pageId: page.id, input }) });
  }));

  router.delete('/items/:pageId', requireAuth, handle('docs.deleteItem', async (req, res) => {
    assertWriteRate(req);
    const page = await pageWithAccess(req, req.params.pageId);
    await docs.deleteItem({ siteId: String(page.siteId), pageId: page.id });
    res.json({ ok: true });
  }));

  router.get('/:homeId/tree', requireAuth, handle('docs.tree', async (req, res) => {
    await pageWithAccess(req, req.params.homeId);
    res.json(await docs.readTree({ homeId: req.params.homeId }));
  }));

  router.put('/:homeId/settings', requireAuth, handle('docs.updateSettings', async (req, res) => {
    assertWriteRate(req);
    await pageWithAccess(req, req.params.homeId);
    res.json({ settings: await docs.updateSettings({ homeId: req.params.homeId, input: settingsSchema.parse(req.body) }) });
  }));

  router.post('/:homeId/items', requireAuth, handle('docs.addItem', async (req, res) => {
    assertWriteRate(req);
    const home = await pageWithAccess(req, req.params.homeId);
    const input = addItemSchema.parse(req.body);
    res.status(201).json({ item: await docs.addItem({ siteId: String(home.siteId), homeId: home.id, authorId: userIdOf(req), input }) });
  }));

  router.put('/:homeId/order', requireAuth, handle('docs.reorder', async (req, res) => {
    assertWriteRate(req);
    const home = await pageWithAccess(req, req.params.homeId);
    await docs.reorder({ siteId: String(home.siteId), homeId: home.id, input: reorderSchema.parse(req.body) });
    res.json({ ok: true });
  }));

  router.get('/:homeId/export', requireAuth, handle('docs.export', async (req, res) => {
    const home = await pageWithAccess(req, req.params.homeId);
    const pkg = await docs.exportDocs({ homeId: home.id, includeFiles: req.query.files !== '0' });
    const fileName = `${home.slug || 'docs'}-docs.nextpress-page.json`.replace(/[^a-z0-9._-]/gi, '-');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.type('application/json').send(JSON.stringify(pkg));
  }));

  return router;
}
