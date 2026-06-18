import type { Express } from 'express';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { buildDeps } from './shared/deps';
import { initializeDefaultRolesAndSite } from './init/initialize-default';
import { setupAuth } from '../replitAuth';
import hooks from '../hooks';
import { createAuthRoutes } from './auth.routes';
import { createUsersRoutes } from './users.routes';
import { createPostsRoutes } from './posts.routes';
import { createPagesRoutes } from './pages.routes';
import { createBlogsRoutes } from './blogs.routes';
import { createCommentsRoutes } from './comments.routes';
import { createMediaRoutes } from './media.routes';
import { createTemplatesRoutes } from './templates.routes';
import { createThemesRoutes } from './themes.routes';
import { createOptionsRoutes } from './options.routes';
import { createSettingsRoutes } from './settings.routes';
import { createSiteRoutes } from './site.routes';
import { createDashboardRoutes } from './dashboard.routes';
import { createPreviewRoutes } from './preview.routes';
import { createPublicRoutes } from './public.routes';
import { createRenderRoutes } from './render.routes';
import { createSetupRoutes } from './setup.routes';
import { createWordPressImportRoutes } from './import.wordpress.routes';
import { setupCheck } from '../middleware/setupCheck';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFirstExistingPath(paths: string[]): string | null {
  const found = paths.find((candidate) => fs.existsSync(candidate));
  return found ?? null;
}

/**
 * Orchestrates all route registration for the NextPress application.
 * Initializes dependencies, sets up auth, mounts all route modules,
 * and returns the configured HTTP server.
 *
 * This is the main entry point for routing configuration.
 *
 * @param app - Express application instance
 * @returns Configured HTTP server ready to listen
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Build dependency injection container
  const deps = await buildDeps();

  // Initialize default roles and site on first run
  await initializeDefaultRolesAndSite(deps);

  // Setup authentication middleware
  setupAuth(app);

  // ============================================
  // Setup Wizard Routes (must be before setupCheck middleware)
  // ============================================
  app.use('/api/setup', createSetupRoutes(deps));

  // Health check endpoint for container orchestration (before setupCheck so it's always accessible)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Setup check middleware - redirects to wizard if not configured
  app.use(setupCheck);

  // Fire WordPress-style 'init' action hook
  hooks.doAction('init');

  // ============================================
  // Mount route modules
  // ============================================

  app.use('/api/auth', createAuthRoutes(deps));
  app.use('/api/users', createUsersRoutes(deps));

  app.use('/api/posts', createPostsRoutes(deps));
  app.use('/api/pages', createPagesRoutes(deps));
  app.use('/api/blogs', createBlogsRoutes(deps));

  app.use('/api/comments', createCommentsRoutes(deps));
  app.use('/api/media', createMediaRoutes(deps));

  app.use('/api/templates', createTemplatesRoutes(deps));
  // Mount themes routes at /api to handle /themes, /plugins, and /hooks
  app.use('/api', createThemesRoutes(deps));

  app.use('/api/options', createOptionsRoutes(deps));
  app.use('/api/settings', createSettingsRoutes(deps));
  app.use('/api/site', createSiteRoutes(deps));
  app.use('/api/dashboard', createDashboardRoutes(deps));
  app.use('/api/import/wordpress', createWordPressImportRoutes(deps));

  app.use('/api/preview', createPreviewRoutes(deps));
  app.use('/api/public', createPublicRoutes(deps));

  // Mount HTML rendering routes (must come before static routes)
  app.use('/', createRenderRoutes(deps));

  // Vendor files for published pages (animation libraries, etc.)
  const vendorFileSources: Record<string, string[]> = {
    'animate.min.css': [
      path.join(__dirname, '../../dist/public/vendor/animate.min.css'),
      path.join(process.cwd(), 'client/src/lib/animate.min.css'),
      path.join(process.cwd(), 'node_modules/animate.css/animate.min.css'),
    ],
    'entry-animations.js': [
      path.join(__dirname, '../../dist/public/vendor/entry-animations.js'),
      path.join(process.cwd(), 'client/public/vendor/entry-animations.js'),
    ],
  };

  for (const [filename, candidates] of Object.entries(vendorFileSources)) {
    app.get(`/vendor/${filename}`, (_req, res) => {
      const resolved = candidates.find((candidate) => fs.existsSync(candidate));
      if (!resolved) {
        res.status(404).send('Vendor asset not found');
        return;
      }
      res.sendFile(path.resolve(resolved));
    });
  }

  app.use(
    '/vendor',
    express.static(path.join(__dirname, '../../dist/public/vendor'))
  );

  if (app.get('env') !== 'development') {
    const adminIndexPath = resolveFirstExistingPath([
      // Most common when the server is bundled into `dist/` (tsup single-file).
      path.resolve(__dirname, 'public/index.html'),
      // Common when running from source layouts with nested `server/` output structure.
      path.resolve(__dirname, '../../dist/public/index.html'),
      // Fallbacks for differing container WORKDIR / build layouts.
      path.resolve(process.cwd(), 'dist/public/index.html'),
      '/app/dist/public/index.html',
      '/dist/public/index.html',
    ]);

    if (!adminIndexPath) {
      throw new Error(
        [
          'Missing admin build file: dist/public/index.html.',
          'Tried common locations relative to the runtime bundle and working directory.',
          'Fix by ensuring the release image includes the Vite build output (dist/public).',
        ].join(' '),
      );
    }

    // Admin static assets
    const adminDistAssetsPath = path.resolve(path.dirname(adminIndexPath), 'assets');

    app.use(
      '/admin/assets',
      express.static(adminDistAssetsPath)
    );

    // Admin SPA routes
    app.get('/admin', (_req, res) => {
      res.sendFile(adminIndexPath);
    });
    app.get('/admin/*', (_req, res) => {
      res.sendFile(adminIndexPath);
    });
  }

  // Serve uploaded files
  app.use('/uploads', express.static(deps.uploadDir));

  // Create HTTP server
  const httpServer = createServer(app);

  // Signal that NextPress is fully loaded
  hooks.doAction('wp_loaded');

  return httpServer;
}
