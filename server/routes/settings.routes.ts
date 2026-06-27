import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { partialSettingsSchema } from '@shared/settings-schema';
import { getOptionalCaddyAcmeEmail } from '../config';
import { updateCaddyConfig, syncCaddyFromSites } from '../utils/caddy';
import { getCaddyTlsHostnames, validateDomain } from '../utils/validate-domain';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';

/**
 * Creates settings routes for site-wide configuration management
 * 
 * Endpoints:
 * - GET /api/settings - Get current site settings
 * - PATCH /api/settings - Update site settings (partial)
 * 
 * All endpoints require authentication.
 * Settings are stored in sites.settings jsonb column.
 * 
 * @param deps - Injected dependencies (models, auth)
 * @returns Express router with mounted settings routes
 */
export function createSettingsRoutes(deps: Deps): Router {
  const router = Router();
  const { models, requireAuth, authService } = deps;

  /**
   * GET /api/settings
   * Get current site settings merged with defaults
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
        const settings = await models.sites.getSettings(site.id);
        return { status: true, data: settings, siteId: site.id };
      });

      if (err) {
        console.error('Error fetching settings:', err);
        const message = err instanceof Error ? err.message : 'Failed to fetch settings';
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
   * PATCH /api/settings
   * Update site settings with partial changes
   * Auth: Required
   * 
   * Validates partial payload, merges with existing, persists
   */
  router.patch(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      // Log incoming payload for debugging
      console.log('PATCH /api/settings - Received payload:', JSON.stringify(req.body, null, 2));

      const userId = authService.getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Validate partial payload first (before safeTryAsync)
      const validationResult = partialSettingsSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.errors);
        return res.status(400).json({
          status: false,
          message: 'Invalid settings data',
          errors: validationResult.error.errors,
        });
      }

      const { err, result } = await safeTryAsync(async () => {
        const site = await resolveRequestSite({
          models,
          userId,
          siteId: readRequestSiteId(req),
        });

        // If updating siteUrl, validate domain resolves then update Caddyfile
        if (validationResult.data.general?.siteUrl) {
          const oldSettings = await models.sites.getSettings(site.id);
          const oldUrl = oldSettings.general?.siteUrl;
          const newUrl = validationResult.data.general.siteUrl;
          
          if (oldUrl !== newUrl && newUrl) {
            const tlsHosts = getCaddyTlsHostnames(newUrl);
            for (const host of tlsHosts) {
              const domainCheck = await validateDomain(host);
              if (!domainCheck.valid) {
                return { status: false, message: `${domainCheck.message} (host: ${host})` };
              }
            }

            const patchGeneral = validationResult.data.general;
            const acmeFromPatch = patchGeneral?.adminEmail?.trim();
            const acmeStored = oldSettings.general?.adminEmail?.trim();
            const acmeEmail =
              (acmeFromPatch && acmeFromPatch.length > 0 ? acmeFromPatch : undefined) ??
              (acmeStored && acmeStored.length > 0 ? acmeStored : undefined) ??
              getOptionalCaddyAcmeEmail();

            const caddyResult = await updateCaddyConfig(newUrl, { acmeEmail });
            console.log('Settings Caddy update:', caddyResult.message);

            if (!caddyResult.success) {
              return { status: false, message: `Domain saved but Caddy configuration failed: ${caddyResult.message}` };
            }

            await syncCaddyFromSites({ models });
          }
        }

        const updatedSettings = await models.sites.updateSettings(
          validationResult.data,
          site.id,
        );

        return { status: true, data: updatedSettings, siteId: site.id };
      });

      if (err) {
        console.error('Error updating settings:', err);
        const message = err instanceof Error ? err.message : 'Failed to update settings';
        const status = message === 'Site not accessible' ? 403 : 500;
        return res.status(status).json({
          status: false,
          message,
        });
      }

      // Domain validation or Caddy config failures are returned as { status: false }
      if (result && !result.status) {
        return res.status(400).json(result);
      }

      res.json(result);
    })
  );

  return router;
}
