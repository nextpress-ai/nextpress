import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { enrichPostForApi } from '@shared/posts/post-other';
import { attachPostAuthor } from '../lib/attach-post-author';
import { resolvePublicSite, readPublicSiteIdHint } from './shared/resolve-public-site';
import { getSiteBlogIds } from './shared/site-content';
import {
  DEFAULT_POST_LIST_SORT,
  POST_LIST_SORT_FIELDS,
  parseContentListSort,
  toModelOrderBy,
} from '@shared/content-list-query';
import type { Filter } from '@shared/create-models';
import { bindPostBlocks } from '@shared/bind-post-blocks';
import { bindablePostFromRecord } from '@shared/bind-post-blocks';
import { renderBlocksToHtml } from '../../renderer/to-html';
import { sanitizeHtml } from '@shared/sanitize-html';
import type { BlockConfig } from '@shared/schema-types';

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
    '/posts',
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

        const blogIds = await getSiteBlogIds({ models, siteId: site.id });
        if (blogIds.length === 0) {
          res.json({ posts: [], total: 0, page: 1, per_page: 12, total_pages: 0 });
          return;
        }

        const requestedBlog =
          typeof req.query.blogId === 'string' && req.query.blogId.trim()
            ? req.query.blogId.trim()
            : '';
        const scopedBlogIds = requestedBlog
          ? blogIds.includes(requestedBlog)
            ? [requestedBlog]
            : []
          : blogIds;
        if (scopedBlogIds.length === 0) {
          res.json({ posts: [], total: 0, page: 1, per_page: 12, total_pages: 0 });
          return;
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const perPage = Math.min(50, Math.max(1, Number(req.query.per_page) || 12));
        const listSort = parseContentListSort({
          sort: req.query.sort,
          order: req.query.order,
          allowedFields: POST_LIST_SORT_FIELDS,
          defaults: DEFAULT_POST_LIST_SORT,
        });
        const filters: Filter[] = [
          { where: 'status', equals: 'publish' },
          { where: 'blogId', in: scopedBlogIds },
        ];
        const posts = await models.posts.findManyWhere(filters, {
          limit: perPage,
          offset: (page - 1) * perPage,
          orderBy: toModelOrderBy(listSort),
        });
        const total = await models.posts.count({ where: filters });
        const mapped = [];
        for (const post of posts) {
          mapped.push(await attachPostAuthor({ models, post: enrichPostForApi(post) }));
        }
        res.json({
          posts: mapped,
          total,
          page,
          per_page: perPage,
          total_pages: Math.ceil(total / perPage) || 0,
        });
      });

      if (err) {
        console.error('Error listing published posts:', err);
        res.status(500).json({ message: 'Failed to list posts' });
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

        const payload = await attachPostAuthor({ models, post: enrichPostForApi(post) });
        const rawBlocks = (Array.isArray(post.blocks) ? post.blocks : []) as BlockConfig[];
        const boundBlocks = bindPostBlocks({
          blocks: rawBlocks,
          post: bindablePostFromRecord(payload),
        });
        res.json({
          ...payload,
          renderedHtml:
            boundBlocks.length > 0
              ? sanitizeHtml(renderBlocksToHtml(boundBlocks))
              : '',
        });
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
