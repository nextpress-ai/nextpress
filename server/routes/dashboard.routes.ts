import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { readRequestSiteId, resolveRequestSite } from './shared/resolve-request-site';
import { getSiteBlogIds } from './shared/site-content';

/**
 * Dashboard routes — stats scoped to active site when siteId is provided.
 */
export function createDashboardRoutes(deps: Deps) {
  const router = Router();
  const { models, requireAuth, authService } = deps;

  router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
    try {
      const userId = authService.getCurrentUserId(req);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const site = await resolveRequestSite({
        models,
        userId,
        siteId: readRequestSiteId(req),
      });

      const blogIds = await getSiteBlogIds({ models, siteId: site.id });
      const postFilters = [
        { where: 'status', equals: 'publish' },
        ...(blogIds.length > 0 ? [{ where: 'blogId', in: blogIds }] : [{ where: 'blogId', equals: '__none__' }]),
      ];

      const [postsCount, pagesCount, commentsCount, usersCount] = await Promise.all([
        blogIds.length > 0
          ? models.posts.count({ where: postFilters })
          : Promise.resolve(0),
        models.pages.count({
          where: [
            { where: 'status', equals: 'publish' },
            { where: 'siteId', equals: site.id },
          ],
        }),
        blogIds.length > 0
          ? models.comments.count({
              where: [{ where: 'status', equals: 'approved' }],
            })
          : Promise.resolve(0),
        models.users.count({}),
      ]);

      res.json({
        posts: postsCount,
        pages: pagesCount,
        comments: commentsCount,
        users: usersCount,
        siteId: site.id,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
      const status = message === 'Site not accessible' ? 403 : 500;
      res.status(status).json({ message });
    }
  }));

  return router;
}
