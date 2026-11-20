import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { safeTryAsync } from '../utils';
import { enrichPostForApi, takePageAfterCategoryFilter } from '@shared/posts/post-other';
import { attachPostAuthor } from '../lib/attach-post-author';
import { isPubliclyReadable } from '../lib/is-publicly-readable';
import { allowsVisitorAccounts, findSignUpSite } from '../lib/accounts/visitor-sign-up';
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
import type { BlockConfig, Site } from '@shared/schema-types';
import { publicSiteDescription, publicSiteName } from '@shared/published-document-meta';
import { resolvePageTemplateParts } from '../lib/template-parts';
import { siteSearchIndexOf } from '../lib/site-search';
import { findPageByPath } from '../lib/page-paths/page-paths';
import { matchesIfNoneMatch } from './shared/if-none-match';
import { composeWrittenPost } from '../lib/compose-written-post';
import { createRateLimiter } from '../utils/rate-limit';
import { clientAddress } from '../utils/client-address';

/** A browser may reuse its copy of the search index for a minute, then asks again (a cheap 304 when nothing changed). */
const DOCS_INDEX_CACHE_CONTROL = 'public, max-age=60, must-revalidate';

/**
 * Public API routes — resolve site from Host header or ?siteId= hint.
 */
export function createPublicRoutes(deps: Deps): Router {
  const router = Router();
  const { models } = deps;
  const searchIndex = siteSearchIndexOf({ models });
  const checkSearchLimit = createRateLimiter();

  const siteIdentity = async (site: Site) => {
    const stored = await models.sites.getSettings(site.id);
    const url = stored.general.siteUrl || site.siteUrl || '';
    return {
      name: publicSiteName({
        settingsName: stored.general.siteName,
        recordName: site.name,
        siteUrl: url,
      }),
      description: publicSiteDescription(stored.general.siteDescription),
      url,
      discourageIndexing: Boolean(stored.reading.discourageSearchIndexing),
      descriptionFrom: stored.reading.descriptionFrom,
      logoUrl: site.logoUrl || "",
    };
  };

  router.get(
    '/page/*',
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

        // One word (`install`) or a full address (`guides/install`).
        const found = await findPageByPath({ models, siteId: site.id, path: req.params[0] ?? '' });
        const page = found?.page;
        if (!found || !page || !isPubliclyReadable(page)) {
          res.status(404).json({ message: 'Page not found' });
          return;
        }

        const parts = await resolvePageTemplateParts({
          models,
          siteId: site.id,
          pageId: page.id,
          blocks: (Array.isArray(page.blocks) ? page.blocks : []) as BlockConfig[],
        });
        res.json({ ...page, path: found.path, blocks: parts.blocks, site: await siteIdentity(site) });
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
        const category = typeof req.query.category === 'string' ? req.query.category : '';
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
        const fetchWide = Boolean(category.trim());
        const posts = await models.posts.findManyWhere(filters, {
          limit: fetchWide ? 500 : perPage,
          offset: fetchWide ? 0 : (page - 1) * perPage,
          orderBy: toModelOrderBy(listSort),
        });
        const mapped = [];
        // Password-protected posts never show to visitors.
        for (const post of posts.filter((row) => isPubliclyReadable(row))) {
          mapped.push(await attachPostAuthor({ models, post: enrichPostForApi(post) }));
        }
        const paged = fetchWide
          ? takePageAfterCategoryFilter({ posts: mapped, category, page, perPage })
          : { posts: mapped, total: await models.posts.count({ where: filters }) };
        res.json({
          posts: paged.posts,
          total: paged.total,
          page,
          per_page: perPage,
          total_pages: Math.ceil(paged.total / perPage) || 0,
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
        if (!post || !isPubliclyReadable(post)) {
          res.status(404).json({ message: 'Post not found' });
          return;
        }

        const payload = await attachPostAuthor({ models, post: enrichPostForApi(post) });
        const parts = await resolvePageTemplateParts({
          models,
          siteId: site.id,
          pageId: post.id,
          // A written post is shown inside its blog's look, as on the server-rendered page.
          blocks: (await composeWrittenPost({ models, blogId: post.blogId, blocks: (Array.isArray(post.blocks) ? post.blocks : []) as BlockConfig[] })).blocks,
        });
        const boundBlocks = bindPostBlocks({
          blocks: parts.blocks,
          post: bindablePostFromRecord(payload),
        });
        res.json({
          ...payload,
          blocks: parts.blocks,
          site: await siteIdentity(site),
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
        if (!page || !isPubliclyReadable(page)) {
          res.status(404).json({ message: 'No homepage content found' });
          return;
        }

        const parts = await resolvePageTemplateParts({
          models,
          siteId: site.id,
          pageId: page.id,
          blocks: (Array.isArray(page.blocks) ? page.blocks : []) as BlockConfig[],
        });
        res.json({ ...page, blocks: parts.blocks, site: await siteIdentity(site) });
      });

      if (err) {
        console.error('Error fetching homepage:', err);
        res.status(500).json({ message: 'Failed to fetch homepage' });
      }
    }),
  );

  /**
   * GET /api/public/docs-index — the prebuilt search index of the site this address belongs to:
   * `{ version, builtAt, options, index }`. A reader's browser downloads it once, the first time
   * they open search, and answers every keystroke itself. Only pages visitors may read are in it.
   * The server builds it a moment after pages change and keeps it ready. The ETag follows the
   * site's pages, so a site that has not changed costs two small queries and a 304.
   */
  router.get(
    '/docs-index',
    asyncHandler(async (req, res) => {
      let siteId: string | null = null;
      const { err } = await safeTryAsync(async () => {
        const site = await resolvePublicSite({ models, req, siteIdHint: readPublicSiteIdHint(req) });
        if (!site) {
          res.status(404).json({ message: 'Site not found' });
          return;
        }
        siteId = site.id;

        const stamp = await searchIndex.readStamp({ siteId: site.id });
        res.setHeader('Cache-Control', DOCS_INDEX_CACHE_CONTROL);
        res.setHeader('ETag', stamp.etag);
        if (matchesIfNoneMatch({ header: req.get('if-none-match'), etag: stamp.etag })) {
          res.status(304).end();
          return;
        }
        const built = await searchIndex.read({ siteId: site.id, fingerprint: stamp.fingerprint });
        res.setHeader('ETag', built.etag);
        res.type('application/json').send(built.body);
      });

      if (err) {
        console.error({ atFunction: 'public.docsIndex', data: { siteId, host: req.get('host') ?? null, error: err }, message: 'Could not serve the search index' });
        if (res.headersSent) return;
        // An error must not be kept by a browser or a cache the way the index is.
        res.removeHeader('ETag');
        res.setHeader('Cache-Control', 'no-store');
        res.status(500).json({ message: "Search isn't available right now. Try again in a moment." });
      }
    }),
  );

  /**
   * GET /api/public/search?q=… — search the site the address belongs to, for headless readers and the
   * SDK. Answers from the same prebuilt index the visitor's browser downloads, so a result is never
   * older than what a visitor sees. Only what a visitor may read is in that index. Sixty searches a
   * minute per address; an empty query answers with no results rather than an error.
   */
  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      if (!checkSearchLimit({ key: clientAddress(req), limit: 60, windowMs: 60_000 })) {
        return res.status(429).json({ message: 'Too many searches. Wait a moment and try again.' });
      }

      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const requested = Number.parseInt(String(req.query.limit ?? ''), 10);
      const limit = Number.isFinite(requested) ? requested : undefined;

      const { err, result } = await safeTryAsync(async () => {
        const site = await resolvePublicSite({ models, req, siteIdHint: readPublicSiteIdHint(req) });
        if (!site) return null;
        const results = await searchIndex.search({ siteId: site.id, query, limit });
        return { query, results };
      });

      if (err) {
        console.error({ atFunction: 'public.search', data: { host: req.get('host') ?? null, error: err }, message: 'Could not search the site' });
        return res.status(500).json({ message: "Search isn't available right now. Try again in a moment." });
      }
      if (!result) return res.status(404).json({ message: 'Site not found' });
      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
    }),
  );

  /**
   * GET /api/public/sign-up-status — whether the site this address belongs to lets visitors make an
   * account (commenters only). The sign-up page asks first, so a closed site shows the invite message.
   */
  router.get(
    '/sign-up-status',
    asyncHandler(async (req, res) => {
      const { err, result } = await safeTryAsync(async () => {
        const site = await findSignUpSite({ models, host: req.get('host') });
        if (!site) return { open: false, siteName: null };
        return { open: await allowsVisitorAccounts({ models, siteId: site.id }), siteName: site.name ?? null };
      });
      if (err || !result) {
        console.error({ atFunction: 'public.signUpStatus', data: { host: req.get('host') ?? null, error: err }, message: 'Could not read whether sign-up is open' });
        return res.status(500).json({ message: "We couldn't check this right now. Try again in a moment." });
      }
      res.json(result);
    }),
  );

  return router;
}
