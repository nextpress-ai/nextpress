import { Router } from 'express';
import type { Deps } from './shared/deps';

/**
 * Creates themes, plugins and hooks routes
 * Handles theme management, plugin listing, and WordPress hook debugging
 * 
 * Note: This router is mounted at /api and handles:
 * - /api/themes/* - Theme management
 * - /api/plugins - Plugin listing
 * - /api/hooks - Hook debugging
 */
export function createThemesRoutes(deps: Deps) {
  const router = Router();
  const { models, requireAuth, hooks } = deps;

  /**
   * GET /api/themes
   * List all themes
   * Auth: Required
   */
  router.get('/themes', requireAuth, async (_req, res) => {
    try {
      const themes = await models.themes.findMany();
      res.json(themes);
    } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({ message: 'Failed to fetch themes' });
    }
  });

  /**
   * GET /api/themes/active
   * Get currently active theme
   * Auth: Public (needed for rendering)
   */
  router.get('/themes/active', async (_req, res) => {
    try {
      const theme = await models.themes.findActiveTheme();
      res.json(theme);
    } catch (error) {
      console.error('Error fetching active theme:', error);
      res.status(500).json({ message: 'Failed to fetch active theme' });
    }
  });

  /**
   * POST /api/themes/:id/activate
   * Activate a theme by ID
   * Auth: Required
   */
  router.post('/themes/:id/activate', requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const theme = await models.themes.setActiveTheme(id);

      const site = await models.sites.findDefaultSite();
      if (site) {
        await models.sites.update(site.id, { activeThemeId: id });
      }

      res.json(theme);
    } catch (error) {
      console.error('Error activating theme:', error);
      res.status(500).json({ message: 'Failed to activate theme' });
    }
  });

  /**
   * GET /api/plugins
   * List all plugins
   * Auth: Required
   */
  router.get('/plugins', requireAuth, async (_req, res) => {
    try {
      const plugins = await models.plugins.findMany();
      res.json(plugins);
    } catch (error) {
      console.error('Error fetching plugins:', error);
      res.status(500).json({ message: 'Failed to fetch plugins' });
    }
  });

  /**
   * GET /api/hooks
   * Debug endpoint showing all registered WordPress hooks
   * Auth: Required
   */
  router.get('/hooks', requireAuth, async (_req, res) => {
    try {
      res.json({
        actions: hooks.getActions(),
        filters: hooks.getFilters(),
      });
    } catch (error) {
      console.error('Error fetching hooks:', error);
      res.status(500).json({ message: 'Failed to fetch hooks' });
    }
  });

  return router;
}
