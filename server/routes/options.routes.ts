import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';
import { resolvePublicSite, readPublicSiteIdHint } from './shared/resolve-public-site';

/**
 * Creates options routes (WordPress-compatible settings API).
 * Options are scoped per site via siteId query/body param.
 */
export function createOptionsRoutes(deps: Deps) {
  const router = Router();
  const { models, requireAuth, authService } = deps;

  /**
   * GET /api/options/:name?siteId=
   * Get option value by name for a site.
   */
  router.get('/:name', asyncHandler(async (req, res) => {
    try {
      const site = await resolvePublicSite({
        models,
        req,
        siteIdHint: readPublicSiteIdHint(req),
      });
      if (!site) {
        return res.status(404).json({ message: 'Site not found' });
      }

      const option = await models.options.getOption(req.params.name, site.id);
      if (!option) {
        return res.status(404).json({ message: 'Option not found' });
      }
      res.json(option);
    } catch (error) {
      console.error('Error fetching option:', error);
      res.status(500).json({ message: 'Failed to fetch option' });
    }
  }));

  /**
   * POST /api/options
   * Set or update option value for a site.
   */
  router.post('/', requireAuth, asyncHandler(async (req, res) => {
    try {
      const userId = authService.getCurrentUserId(req);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const { name, value } = req.body ?? {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'name is required' });
      }
      if (value === undefined || value === null) {
        return res.status(400).json({ message: 'value is required' });
      }

      const site = await resolveRequestSite({
        models,
        userId,
        siteId: readRequestSiteId(req),
      });

      const option = await models.options.setOption({
        name,
        value: String(value),
        siteId: site.id,
      });
      res.json(option);
    } catch (error) {
      console.error('Error setting option:', error);
      const message = error instanceof Error ? error.message : 'Failed to set option';
      const status = message === 'Site not accessible' ? 403 : 500;
      res.status(status).json({ message });
    }
  }));

  return router;
}
