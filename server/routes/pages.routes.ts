import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync, normalizePageSlug, isPageSlugConflictError } from '../utils';
import { coerceDates } from './shared/date-coerce';
import {
  assertAuthenticatedSiteAccess,
  ensureNonPublicContentAccess,
  listQueryRequiresAuth,
} from '../lib/content-access';
import { attachRequestAuth, resolveRequestAuth } from '../auth';

/**
 * Validates that a slug is unique (application-level check before insert).
 * Complements the database unique constraint with clearer errors.
 * @param models - Models dependency
 * @param slug - The slug to validate
 * @param excludePageId - Optional page ID to exclude from check (for updates)
 * @returns Normalized slug when unique, throws when taken
 */
async function validateSlugUniqueness(
	models: any,
	slug: string,
	siteId: string,
	excludePageId?: string
) {
	const normalizedSlug = normalizePageSlug(slug);
	if (!normalizedSlug) {
		throw new Error('URL slug is required');
	}

	const existingPage = await models.pages.findBySiteAndSlug(siteId, normalizedSlug);

	if (existingPage) {
		if (excludePageId && existingPage.id === excludePageId) {
			return normalizedSlug;
		}
		throw new Error(`Slug "${normalizedSlug}" already exists on this site`);
	}

	return normalizedSlug;
}

/**
 * Creates Pages CRUD routes for the NextPress API.
 * Pages are a special type of post with type='page'.
 * 
 * Endpoints:
 * - GET /api/pages - List pages with pagination and status filter
 * - GET /api/pages/:id - Get single page by ID
 * - POST /api/pages - Create new page (requires auth)
 * - PUT /api/pages/:id - Update page (requires auth)
 * - DELETE /api/pages/:id - Delete page (requires auth)
 * 
 * @param deps - Injected dependencies (models, hooks, schemas, auth, etc.)
 * @returns Express router with mounted page routes
 */
export function createPagesRoutes(deps: Deps): Router {
  const router = Router();
  const { models, hooks, authService, requireAuth, CONFIG, parsePaginationParams, parseStatusParam, schemas } = deps;
  const pageSchemas = schemas.pages;

  /**
   * GET /api/pages - List pages with pagination and status filter
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const rawStatus = typeof req.query.status === 'string' ? req.query.status : CONFIG.STATUS.PUBLISH;
        if (listQueryRequiresAuth(rawStatus)) {
          const authContext = await resolveRequestAuth(req);
          if (!authContext) {
            throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
          }
          attachRequestAuth(req, authContext);
        }

        const { page, limit, offset } = parsePaginationParams(
          req.query,
          CONFIG.PAGINATION.DEFAULT_POSTS_PER_PAGE
        );
        const { status = CONFIG.STATUS.PUBLISH } = req.query;
        const siteId =
          typeof req.query.siteId === 'string' && req.query.siteId.trim()
            ? req.query.siteId.trim()
            : undefined;

        // Handle 'any' status to show all pages (for admin interface)
        const actualStatus = parseStatusParam(status as string);

        const filters: Array<{ where: string; equals?: unknown }> = [];
        if (actualStatus) {
          filters.push({ where: 'status', equals: actualStatus });
        }
        if (siteId) {
          filters.push({ where: 'siteId', equals: siteId });
        }

        const pages =
          filters.length > 0
            ? await models.pages.findManyWhere(filters, {
                limit,
                offset,
              })
            : await models.pages.findMany({ limit, offset });

        const total = await models.pages.count({
          where: filters.length > 0 ? filters : undefined,
        });

        return {
          pages,
          total,
          page,
          per_page: limit,
          total_pages: Math.ceil(total / limit),
        };
      });

      if (err) {
        console.error('Error fetching pages:', err);
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        if (statusCode === 401) {
          return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.status(500).json({ message: 'Failed to fetch pages' });
      }

      res.json(result);
    })
  );

  /**
   * GET /api/pages/:id - Get single page by ID or slug
   * Supports both UUID and slug for flexibility
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        // Check if id is a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        const page = isUUID 
          ? await models.pages.findById(id)
          : await models.pages.findBySlug(id);
        
        if (!page) {
          return res.status(404).json({ message: 'Page not found' });
        }

        const allowed = await ensureNonPublicContentAccess({
          req,
          res,
          models,
          siteId: String(page.siteId),
          status: (page as { status?: string }).status,
        });
        if (!allowed) {
          return;
        }

        res.json(page);
      } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({ message: 'Failed to fetch page' });
      }
    })
  );

  /**
   * GET /api/pages/:id/history - Version snapshots saved on each update.
   */
  router.get(
    '/:id/history',
    requireAuth,
    asyncHandler(async (req, res) => {
      const page = await models.pages.findById(req.params.id);
      if (!page) {
        return res.status(404).json({ message: 'Page not found' });
      }

      try {
        await assertAuthenticatedSiteAccess({
          req,
          models,
          siteId: String(page.siteId),
        });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
        return res.status(statusCode).json({ message: (error as Error).message });
      }

      const history = Array.isArray(page.history) ? page.history : [];
      res.json({
        pageId: page.id,
        currentVersion: page.version ?? 0,
        history,
      });
    }),
  );

  /**
   * POST /api/pages/:id/restore - Restore blocks from a history version.
   */
  router.post(
    '/:id/restore',
    requireAuth,
    asyncHandler(async (req, res) => {
      const version = req.body?.version;
      if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
        return res.status(400).json({ message: 'version must be a non-negative integer' });
      }

      const existingPage = await models.pages.findById(req.params.id);
      if (!existingPage) {
        return res.status(404).json({ message: 'Page not found' });
      }

      try {
        await assertAuthenticatedSiteAccess({
          req,
          models,
          siteId: String(existingPage.siteId),
        });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
        return res.status(statusCode).json({ message: (error as Error).message });
      }

      const history = Array.isArray(existingPage.history) ? existingPage.history : [];
      const snapshot = history.find(
        (entry: { version?: number }) => entry?.version === version,
      );

      if (!snapshot || !Array.isArray((snapshot as { blocks?: unknown }).blocks)) {
        return res.status(404).json({ message: 'Version not found in history' });
      }

      const previousSnapshot = {
        version: existingPage.version ?? 0,
        updatedAt: existingPage.updatedAt
          ? new Date(existingPage.updatedAt as string).toISOString()
          : new Date().toISOString(),
        blocks: existingPage.blocks ?? [],
        authorId: (existingPage as { authorId?: string }).authorId,
      };

      const page = await models.pages.update(req.params.id, {
        blocks: (snapshot as { blocks: unknown[] }).blocks,
        version: (existingPage.version ?? 0) + 1,
        history: [previousSnapshot, ...history],
      });

      hooks.doAction('save_post', page);
      res.json(page);
    }),
  );

  /**
   * POST /api/pages - Create new page (requires authentication)
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

        // Get siteId from request or use default site (before validation)
        let siteId = req.body?.siteId;
        if (!siteId) {
          const defaultSite = await models.sites.findDefaultSite();
          if (!defaultSite || !defaultSite.id) {
            throw new Error('No site found. Please create a site first.');
          }
          siteId = String(defaultSite.id);
        } else {
          siteId = String(siteId);
        }

        // Prepare data object with required fields before validation
        const dataToValidate = {
          ...req.body,
          authorId: userId,
          siteId: siteId,
        };

        // Include authorId and siteId in the data before validation
        const parsedData = pageSchemas.insert.parse(dataToValidate) as any;

        // Generate slug if not provided
        const title = parsedData.title;
        if (!title || typeof title !== 'string') {
          throw new Error('Title is required and must be a string');
        }

        const rawSlug =
          typeof parsedData.slug === 'string' && parsedData.slug.trim() !== ''
            ? parsedData.slug
            : title;
        const normalizedSlug = await validateSlugUniqueness(models, rawSlug, siteId);

        const pageData = {
          ...parsedData,
          title: String(title),
          slug: normalizedSlug,
        };

        const page = await models.pages.create(pageData);
        hooks.doAction('save_post', page);

        if (page.status === CONFIG.STATUS.PUBLISH) {
          hooks.doAction('publish_post', page);
        }

        return page;
      });

      if (err) {
        console.error('Error creating page:', err);
        const message = err instanceof Error ? err.message : 'Failed to create page';
        if (isPageSlugConflictError(err)) {
          return res.status(409).json({
            message: 'This page already exists. Choose a different URL slug.',
            code: 'PAGE_SLUG_EXISTS',
          });
        }
        if (message.includes('not authenticated')) {
          return res.status(401).json({ message: 'You must be signed in to create pages.' });
        }
        return res.status(500).json({ message: 'Failed to create page. Please try again.' });
      }

      res.status(201).json(result);
    })
  );

  /**
   * PUT /api/pages/:id - Update existing page (requires authentication)
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const parsed = pageSchemas.update.parse(coerceDates(req.body, ['publishedAt'])) as any;

        const existingPage = await models.pages.findById(id);
        if (!existingPage) {
          return res.status(404).json({ message: 'Page not found' });
        }

        try {
          await assertAuthenticatedSiteAccess({
            req,
            models,
            siteId: String(existingPage.siteId),
          });
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
          return res.status(statusCode).json({ message: (error as Error).message });
        }

        const previousSnapshot = {
          version: existingPage.version ?? 0,
          updatedAt: existingPage.updatedAt
            ? new Date(existingPage.updatedAt as any).toISOString()
            : new Date().toISOString(),
          blocks: existingPage.blocks ?? [],
          authorId: (existingPage as any).authorId,
        };

        const existingHistory = Array.isArray(existingPage.history) ? existingPage.history : [];
        
        let nextSlug = existingPage.slug;
        if (parsed.slug && parsed.slug !== existingPage.slug) {
          nextSlug = await validateSlugUniqueness(
            models,
            parsed.slug,
            String(existingPage.siteId),
            id,
          );
        }

        const pageData = {
          ...parsed,
          slug: nextSlug,
          version: (existingPage.version ?? 0) + 1,
          history: [previousSnapshot, ...existingHistory], // append previous snapshot to existing history
        };

        const wasPublished = existingPage.status === 'publish';
        const page = await models.pages.update(id, pageData);

        hooks.doAction('save_post', page);

        if (!wasPublished && page.status === 'publish') {
          hooks.doAction('publish_post', page);
        }

        res.json(page);
      } catch (error) {
        console.error('Error updating page:', error);
        res.status(500).json({ message: 'Failed to update page' });
      }
    })
  );

  /**
   * DELETE /api/pages/:id - Delete page (requires authentication)
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const id = req.params.id;
        const page = await models.pages.findById(id);

        if (!page) {
          return res.status(404).json({ message: 'Page not found' });
        }

        try {
          await assertAuthenticatedSiteAccess({
            req,
            models,
            siteId: String(page.siteId),
          });
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
          return res.status(statusCode).json({ message: (error as Error).message });
        }

        await models.pages.delete(id);
        hooks.doAction('delete_post', id);

        res.json({ message: 'Page deleted successfully' });
      } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ message: 'Failed to delete page' });
      }
    })
  );

  return router;
}
