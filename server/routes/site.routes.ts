import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { z } from 'zod';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';

/**
 * Site information routes for managing site-level fields
 * 
 * Endpoints:
 * - GET /api/site - Get site information (logo, favicon, theme)
 * - PATCH /api/site - Update site information
 * 
 * These handle direct columns in the sites table:
 * - logoUrl, faviconUrl, activeThemeId
 * 
 * For settings (JSONB), use /api/settings instead.
 */

const siteInfoSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  activeThemeId: z.string().uuid().nullable().optional(),
});

export function createSiteRoutes(deps: Deps): Router {
  const router = Router();
  const { models, requireAuth, authService } = deps;

  /**
   * GET /api/site
   * Get current site information
   * Auth: Required
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = authService.getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { err, result } = await safeTryAsync(async () => {
        const site = await resolveRequestSite({
          models,
          userId,
          siteId: readRequestSiteId(req),
        });

        return {
          status: true,
          data: {
            id: site.id,
            logoUrl: site.logoUrl,
            faviconUrl: site.faviconUrl,
            activeThemeId: site.activeThemeId,
          },
        };
      });

      if (err) {
        console.error('Error fetching site info:', err);
        const message = err instanceof Error ? err.message : 'Failed to fetch site information';
        const status = message === 'Site not accessible' ? 403 : 500;
        return res.status(status).json({
          status: false,
          message,
        });
      }

      res.json(result);
    })
  );

  /**
   * PATCH /api/site
   * Update site information
   * Auth: Required
   */
  router.patch(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      console.log('PATCH /api/site - Received payload:', JSON.stringify(req.body, null, 2));

      const userId = authService.getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Validate payload
      const validationResult = siteInfoSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.errors);
        return res.status(400).json({
          status: false,
          message: 'Invalid site information',
          errors: validationResult.error.errors,
        });
      }

      const { err, result } = await safeTryAsync(async () => {
        const site = await resolveRequestSite({
          models,
          userId,
          siteId: readRequestSiteId(req),
        });

        // Update only provided fields
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (validationResult.data.logoUrl !== undefined) {
          updateData.logoUrl = validationResult.data.logoUrl;
        }
        if (validationResult.data.faviconUrl !== undefined) {
          updateData.faviconUrl = validationResult.data.faviconUrl;
        }
        if (validationResult.data.activeThemeId !== undefined) {
          updateData.activeThemeId = validationResult.data.activeThemeId;
        }

        await models.sites.update(site.id, updateData);

        // Fetch updated site
        const updatedSite = await models.sites.findById(site.id);

        return {
          status: true,
          data: {
            id: site.id,
            logoUrl: updatedSite?.logoUrl,
            faviconUrl: updatedSite?.faviconUrl,
            activeThemeId: updatedSite?.activeThemeId,
          },
        };
      });

      if (err) {
        console.error('Error updating site info:', err);
        const message = err instanceof Error ? err.message : 'Failed to update site information';
        const status = message === 'Site not accessible' ? 403 : 500;
        return res.status(status).json({
          status: false,
          message,
        });
      }

      res.json(result);
    })
  );

  return router;
}
