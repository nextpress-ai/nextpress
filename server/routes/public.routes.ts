import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { enrichPostForApi } from '@shared/posts/post-other';
import { attachPostAuthor } from '../lib/attach-post-author';
import { resolvePublicSite, readPublicSiteIdHint } from './shared/resolve-public-site';
import { getSiteBlogIds } from './shared/site-content';

/**
 * Public API routes — resolve site from Host header or ?siteId= hint.
 */
export function createPublicRoutes(deps: Deps): Router {
  const router = Router();
  const { models } = deps;

  router.get(
    '/page/:slug',
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        const site = await resolvePublicSite({
          models,
          req,
          siteIdHint: readPublicSiteIdHint(req),
        });
        if (!site) {
          res.status(404).json({ message: 'Site not found' });
          return;
        }

        const page = await models.pages.findBySiteAndSlug(site.id, req.params.slug);
        if (!page || page.status !== 'publish') {
          res.status(404).json({ message: 'Page not found' });
          return;
        }

        res.json(page);
      });

      if (err) {
        console.error('Error fetching published page:', err);
        res.status(500).json({ message: 'Failed to fetch page' });
      }
    }),
  );

  router.get(
    '/post/:slug',
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        const site = await resolvePublicSite({ models, req, siteIdHint: readPublicSiteIdHint(req) });
        if (!site) {
          res.status(404).json({ message: 'Site not found' });
          return;
        }

        const blogIds = await getSiteBlogIds({ models, siteId: site.id });
        if (blogIds.length === 0) {
          res.status(404).json({ message: 'Post not found' });
          return;
        }

        const posts = await models.posts.findManyWhere([
          { where: 'slug', equals: req.params.slug },
          { where: 'blogId', in: blogIds },
        ]);

        const post = posts[0];
        if (!post || post.status !== 'publish') {
          res.status(404).json({ message: 'Post not found' });
          return;
        }

        res.json(await attachPostAuthor({ models, post: enrichPostForApi(post) }));
      });

      if (err) {
        console.error('Error fetching published post:', err);
        res.status(500).json({ message: 'Failed to fetch post' });
      }
    }),
  );

  router.get(
    '/homepage',
    asyncHandler(async (req, res) => {
      const { err } = await safeTryAsync(async () => {
        const site = await resolvePublicSite({ models, req, siteIdHint: readPublicSiteIdHint(req) });
        if (!site) {
          res.status(404).json({ message: 'Site not found' });
          return;
        }

        const homepage = await models.options.getOption('homepage_page_slug', site.id);
        if (!homepage?.value) {
          res.status(404).json({ message: 'No homepage has been configured' });
          return;
        }

        const page = await models.pages.findBySiteAndSlug(site.id, homepage.value);
        if (!page || page.status !== 'publish') {
          res.status(404).json({ message: 'No homepage content found' });
          return;
        }

        res.json(page);
      });

      if (err) {
        console.error('Error fetching homepage:', err);
        res.status(500).json({ message: 'Failed to fetch homepage' });
      }
    }),
  );

  return router;
}
