import { Router, type Request } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { createRateLimiter } from '../utils/rate-limit';
import { clientAddress } from '../utils/client-address';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';
import { resolveAccessibleSites } from './shared/resolve-accessible-sites';
import { renderStatusHtml } from '../../renderer/templates/status-page';
import {
  createFormSubmissionService,
  publishedPagesWithBlockQuery,
  submissionsToCsv,
} from '../lib/form-submissions';

const SENDS_PER_MINUTE = 5;
const MINUTE_MS = 60_000;
const MAX_PER_PAGE = 100;

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** A browser with scripts off posts the form itself; answer with a small page it can show. */
const wantsHtml = (req: Request): boolean => req.is('application/x-www-form-urlencoded') === 'application/x-www-form-urlencoded';

/**
 * Form blocks: the public send, and the admin list of what was sent.
 *
 * - POST   /api/forms/submit                - Visitor sends a form (JSON from the page script, or a plain form post)
 * - GET    /api/forms/submissions           - List for a site (?siteId, page, per_page, form, status)
 * - GET    /api/forms/submissions/export    - All of a site's submissions as CSV (?siteId, form)
 * - PATCH  /api/forms/submissions/:id       - Mark read or new ({ status })
 * - DELETE /api/forms/submissions/:id       - Remove one
 */
export function createFormsRoutes(deps: Deps): Router {
  const router = Router();
  const { models, requireAuth, authService } = deps;
  const checkRateLimit = createRateLimiter();

  const service = createFormSubmissionService({
    findPublishedPagesWithBlock: (blockId) =>
      models.pages.findManyWhere(publishedPagesWithBlockQuery(blockId), { limit: 2 }),
    submissions: models.formSubmissions,
  });

  router.post(
    '/submit',
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const formId = typeof body.formId === 'string' ? body.formId : typeof body.np_form === 'string' ? body.np_form : '';
      const values = body.values && typeof body.values === 'object' ? (body.values as Record<string, unknown>) : body;
      const html = wantsHtml(req);

      const reply = (status: number, ok: boolean, message: string, field?: string) => {
        if (!html) return res.status(status).json({ ok, message, ...(field ? { field } : {}) });
        const back = typeof req.get('referer') === 'string' ? req.get('referer') : '/';
        return res
          .status(status)
          .type('html')
          .send(
            renderStatusHtml({
              status,
              title: ok ? 'Thank you' : 'Please check the form',
              message: `${escapeHtml(message)}<br><a href="${escapeHtml(back ?? '/')}">Back to the page</a>`,
              canonicalUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            }),
          );
      };

      // Keyed by address in memory only; nothing about the visitor is stored.
      if (!checkRateLimit({ key: `form:${clientAddress(req)}`, limit: SENDS_PER_MINUTE, windowMs: MINUTE_MS })) {
        return reply(429, false, 'Too many messages at once. Please wait a minute and try again.');
      }

      const { err, result } = await safeTryAsync(() => service.submit({ formId, values }));
      if (err || !result) {
        console.error('[forms] Could not save a form send', { atFunction: 'forms.submit', formId, error: err });
        return reply(500, false, "Your message couldn't be sent. Please try again in a moment.");
      }
      if (!result.ok) return reply(result.status, false, result.message, result.field);
      return reply(201, true, result.message);
    }),
  );

  const requireUserId = (req: Request): string => {
    const userId = authService.getCurrentUserId(req);
    if (!userId) throw Object.assign(new Error('Not signed in'), { statusCode: 401 });
    return userId;
  };

  /** A submission is only visible to people who can manage its site. */
  const loadOwnSubmission = async (req: Request) => {
    const userId = requireUserId(req);
    const item = await service.findById(req.params.id);
    if (!item) throw Object.assign(new Error('Submission not found'), { statusCode: 404 });
    const sites = await resolveAccessibleSites({ models, userId });
    if (!sites.some((site) => site.id === item.siteId)) {
      throw Object.assign(new Error('Submission not found'), { statusCode: 404 });
    }
    return item;
  };

  const fail = (res: Parameters<Parameters<typeof asyncHandler>[0]>[1], err: Error, atFunction: string, ids: Record<string, unknown>) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    console.error('[forms] Admin request failed', { atFunction, ...ids, error: err });
    const message =
      statusCode === 404 ? 'That submission no longer exists.' : statusCode === 401 ? 'Please sign in again.' : 'Something went wrong. Please try again.';
    return res.status(statusCode).json({ message });
  };

  router.get(
    '/submissions',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = requireUserId(req);
        const site = await resolveRequestSite({ models, userId, siteId: readRequestSiteId(req) });
        const page = Math.max(1, Number(req.query.page) || 1);
        const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(req.query.per_page) || 20));
        const listed = await service.list({
          siteId: String(site.id),
          formName: typeof req.query.form === 'string' && req.query.form ? req.query.form : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          limit: perPage,
          offset: (page - 1) * perPage,
        });
        const pageIds = [...new Set(listed.items.map((item) => item.pageId).filter((id): id is string => Boolean(id)))];
        const pageRows = await Promise.all(pageIds.map((id) => models.pages.findById(id)));
        const pageTitles = Object.fromEntries(pageRows.filter(Boolean).map((row) => [row!.id, row!.title]));
        return { ...listed, page, perPage, pageTitles };
      });
      if (err || !result) return fail(res, err ?? new Error('No result'), 'forms.list', { siteId: readRequestSiteId(req) });
      res.json(result);
    }),
  );

  router.get(
    '/submissions/export',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const userId = requireUserId(req);
        const site = await resolveRequestSite({ models, userId, siteId: readRequestSiteId(req) });
        const formName = typeof req.query.form === 'string' && req.query.form ? req.query.form : undefined;
        const items = await service.all({ siteId: String(site.id), formName });
        const pageIds = [...new Set(items.map((item) => item.pageId).filter((id): id is string => Boolean(id)))];
        const pageRows = await Promise.all(pageIds.map((id) => models.pages.findById(id)));
        const pageTitles = Object.fromEntries(pageRows.filter(Boolean).map((row) => [row!.id, row!.title]));
        return { csv: submissionsToCsv({ items, pageTitles }), formName };
      });
      if (err || !result) return fail(res, err ?? new Error('No result'), 'forms.export', { siteId: readRequestSiteId(req) });
      const fileName = `${(result.formName ?? 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-submissions.csv`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.type('text/csv; charset=utf-8').send(result.csv);
    }),
  );

  router.patch(
    '/submissions/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const status = req.body?.status;
      if (status !== 'new' && status !== 'read') {
        return res.status(400).json({ message: 'Choose "new" or "read".' });
      }
      const { err, result } = await safeTryAsync(async () => {
        await loadOwnSubmission(req);
        return service.setStatus(req.params.id, status);
      });
      if (err || !result) return fail(res, err ?? new Error('No result'), 'forms.setStatus', { submissionId: req.params.id });
      res.json(result);
    }),
  );

  router.delete(
    '/submissions/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        await loadOwnSubmission(req);
        await service.remove(req.params.id);
      });
      if (err) return fail(res, err, 'forms.remove', { submissionId: req.params.id });
      res.status(204).end();
    }),
  );

  return router;
}
