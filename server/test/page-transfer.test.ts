import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { BlockConfig, Media, Theme } from '@shared/schema-types';
import type { pages } from '@shared/schema';
import { readPagePackage, type PagePackage } from '@shared/page-transfer';
import {
  createPackageFileStore,
  createPagePackageBuilder,
  createPageImporter,
  isPageImportRefusal,
} from '../lib/page-transfer';

type PageRow = typeof pages.$inferSelect;

const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml', 'video/mp4'];
const UPLOAD_LIMIT = 1024 * 1024;
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** In-memory stand-in for the media table: the only database edge these flows touch. */
const createMediaTable = () => {
  const rows: Media[] = [];
  return {
    rows,
    findManyWhere: async (where: { where: string; equals: unknown }[]) =>
      rows.filter((row) => where.every(({ where: key, equals }) => row[key as keyof Media] === equals)),
    create: async (data: Omit<Media, 'id' | 'createdAt' | 'updatedAt' | 'alt' | 'caption' | 'description'> & { alt?: string; caption?: string }) => {
      const row = {
        ...data,
        id: `media-${rows.length + 1}`,
        alt: data.alt ?? null,
        caption: data.caption ?? null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Media;
      rows.push(row);
      return row;
    },
  };
};

const makeSite = async (label: string) => {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), `np-transfer-${label}-`));
  const media = createMediaTable();
  const store = createPackageFileStore({ media, uploadDir, allowedMimeTypes: ALLOWED, uploadLimit: UPLOAD_LIMIT });
  return { uploadDir, media, store };
};

const shellWith = (children: BlockConfig[]): BlockConfig[] => [
  {
    id: 'shell',
    name: 'core/page-shell',
    type: 'container',
    parentId: null,
    content: { kind: 'structured', data: {} },
    children: children.map((child) => ({ ...child, parentId: 'shell' })),
  },
];

const imageBlock = (id: string, url: string): BlockConfig => ({
  id,
  name: 'core/image',
  type: 'block',
  parentId: null,
  content: { kind: 'media', url, mediaType: 'image', alt: 'x' },
});

describe('page transfer between two sites', () => {
  let local: Awaited<ReturnType<typeof makeSite>>;
  let remote: Awaited<ReturnType<typeof makeSite>>;
  let createdPages: PageRow[];
  let themes: Theme[];

  beforeEach(async () => {
    local = await makeSite('local');
    remote = await makeSite('remote');
    createdPages = [];
    themes = [];
    await fs.writeFile(path.join(local.uploadDir, 'hero-1.png'), PNG_BYTES);
    await local.media.create({
      filename: 'hero-1.png',
      originalName: 'hero.png',
      mimeType: 'image/png',
      size: PNG_BYTES.length,
      url: '/uploads/hero-1.png',
      siteId: 'site-local',
      authorId: 'u1',
      alt: 'Hero',
    });
  });

  afterEach(async () => {
    await fs.rm(local.uploadDir, { recursive: true, force: true });
    await fs.rm(remote.uploadDir, { recursive: true, force: true });
  });

  const sourcePage = (): PageRow =>
    ({
      id: 'page-local',
      title: 'Walkable',
      slug: 'walkableca',
      siteId: 'site-local',
      status: 'draft',
      authorId: 'u1',
      featuredImage: '/uploads/hero-1.png',
      blocks: shellWith([
        imageBlock('img', '/uploads/hero-1.png'),
        { ...imageBlock('bg', ''), styles: { backgroundImage: 'url("/uploads/hero-1.png")' } },
        imageBlock('gone', '/uploads/deleted-5.png'),
      ]),
      other: { seo: { metaTitle: 'Walk' } },
    }) as unknown as PageRow;

  const builder = (site: typeof local) =>
    createPagePackageBuilder({
      listSiteMedia: async () => site.media.rows,
      readActiveTheme: async () => ({ name: 'Walk theme', description: null, settings: {} }),
      uploadDir: site.uploadDir,
      uploadLimit: UPLOAD_LIMIT,
      appVersion: 'test',
    });

  const importerFor = (site: typeof remote, takenSlugs: string[] = []) => {
    let n = 0;
    return createPageImporter({
      store: site.store,
      generateId: () => `id-${++n}`,
      isSlugTaken: async ({ slug }) => takenSlugs.includes(slug) || createdPages.some((page) => page.slug === slug),
      createPage: async (data) => {
        const row = { ...data, id: `page-${createdPages.length + 1}` } as unknown as PageRow;
        createdPages.push(row);
        return row;
      },
      findThemesByName: async (name) => themes.filter((theme) => theme.name === name),
      createTheme: async (data) => {
        const theme = { ...data, id: `theme-${themes.length + 1}` } as unknown as Theme;
        themes.push(theme);
        return theme;
      },
      draftStatus: 'draft',
    });
  };

  const roundTrip = async (pkg: PagePackage): Promise<PagePackage> => {
    const read = readPagePackage(JSON.stringify(pkg));
    if (!read.ok) throw new Error(read.message);
    return read.value;
  };

  it('moves the page with its file: new paths everywhere, new ids, a draft, no edits needed', async () => {
    const pkg = await roundTrip(await builder(local).buildForPage({ page: sourcePage(), includeFiles: true }));
    expect(pkg.files.find((file) => file.ref === '/uploads/hero-1.png')?.data).toBe(PNG_BYTES.toString('base64'));
    expect(pkg.files.find((file) => file.ref === '/uploads/deleted-5.png')?.leftOut).toBe('not-found');

    const result = await importerFor(remote).importPage({ pkg, siteId: 'site-remote', authorId: 'u9', includeTheme: false });

    const saved = JSON.stringify(result.page.blocks);
    const newUrl = result.files.refMap['/uploads/hero-1.png']!;
    expect(newUrl).toMatch(/^\/uploads\/hero-\d+-[0-9a-f]{8}\.png$/);
    expect(saved).not.toContain('/uploads/hero-1.png');
    expect(saved).toContain(`url(\\"${newUrl}\\")`);
    expect(result.page.featuredImage).toBe(newUrl);
    expect(saved).not.toContain('"img"');
    expect(result.page.status).toBe('draft');
    expect(result.page.siteId).toBe('site-remote');
    expect(await fs.readFile(path.join(remote.uploadDir, path.basename(newUrl)))).toEqual(PNG_BYTES);
    expect(remote.media.rows.find((row) => row.url === newUrl)?.alt).toBe('Hero');
    expect(result.files.missing).toEqual([{ name: 'deleted-5.png', reason: 'missing on the original site' }]);
    expect(saved).toContain(result.files.refMap['/uploads/deleted-5.png']);
  });

  it('importing twice reuses the files and gives the second page a free web address', async () => {
    const pkg = await builder(local).buildForPage({ page: sourcePage(), includeFiles: true });
    const importer = importerFor(remote);
    const first = await importer.importPage({ pkg, siteId: 'site-remote', authorId: 'u9', includeTheme: false });
    const second = await importer.importPage({ pkg, siteId: 'site-remote', authorId: 'u9', includeTheme: false });

    expect(first.page.slug).toBe('walkableca');
    expect(second.page.slug).toBe('walkableca-2');
    expect(second.files.reused).toEqual(['hero.png']);
    expect(remote.media.rows.filter((row) => row.originalName === 'hero.png')).toHaveLength(1);
    // One real file + one placeholder, shared by both imports.
    expect(await fs.readdir(remote.uploadDir)).toHaveLength(2);
  });

  it('files left out on export become named placeholders', async () => {
    const pkg = await builder(local).buildForPage({ page: sourcePage(), includeFiles: false });
    expect(pkg.files.every((file) => !file.data)).toBe(true);

    const result = await importerFor(remote).importPage({ pkg, siteId: 'site-remote', authorId: 'u9', includeTheme: false });
    expect(result.files.added).toEqual([]);
    expect(result.files.missing.map((item) => item.reason)).toContain('left out on export');
    const placeholder = remote.media.rows.find((row) => row.url === result.files.refMap['/uploads/hero-1.png']);
    expect(placeholder?.mimeType).toBe('image/svg+xml');
    expect(placeholder?.alt).toBe('Missing file: hero.png');
  });

  it('adds the theme only when asked, and reuses an identical one', async () => {
    const pkg = await builder(local).buildForPage({ page: sourcePage(), includeFiles: false });
    const importer = importerFor(remote);
    expect((await importer.importPage({ pkg, siteId: 's', authorId: 'u', includeTheme: false })).theme).toEqual({
      status: 'skipped',
      name: 'Walk theme',
    });
    expect((await importer.importPage({ pkg, siteId: 's', authorId: 'u', includeTheme: true })).theme.status).toBe('added');
    expect((await importer.importPage({ pkg, siteId: 's', authorId: 'u', includeTheme: true })).theme.status).toBe('reused');
    expect(themes).toHaveLength(1);
  });

  it('refuses copied blocks as a page file', async () => {
    const pkg = await builder(local).buildForPage({ page: sourcePage(), includeFiles: false });
    const { page: _page, ...blocksOnly } = pkg;
    const attempt = importerFor(remote).importPage({
      pkg: { ...blocksOnly, source: 'clipboard' },
      siteId: 's',
      authorId: 'u',
      includeTheme: false,
    });
    await expect(attempt).rejects.toSatisfy((error: Error) => isPageImportRefusal(error));
  });
});

describe('package file store', () => {
  let site: Awaited<ReturnType<typeof makeSite>>;
  beforeEach(async () => {
    site = await makeSite('store');
  });
  afterEach(async () => {
    await fs.rm(site.uploadDir, { recursive: true, force: true });
  });

  it('keeps names inside the uploads folder, refuses unknown types, and cleans SVG', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>';
    const result = await site.store.storeFiles({
      siteId: 's',
      authorId: 'u',
      files: [
        { ref: '/uploads/a.png', name: '../../etc/evil name.png', mimeType: 'image/png', size: 8, data: PNG_BYTES.toString('base64') },
        { ref: '/uploads/b.exe', name: 'b.exe', mimeType: 'application/x-msdownload', size: 3, data: 'AAAA' },
        { ref: '/uploads/c.svg', name: 'c.svg', mimeType: 'image/svg+xml', size: svg.length, data: Buffer.from(svg).toString('base64') },
      ],
    });

    const stored = await fs.readdir(site.uploadDir);
    expect(stored.every((name) => !name.includes('/') && !name.startsWith('.'))).toBe(true);
    expect(result.refMap['/uploads/a.png']).toMatch(/^\/uploads\/evil-name-\d+-[0-9a-f]{8}\.png$/);
    expect(result.missing).toEqual([{ name: 'b.exe', reason: "this file type isn't allowed on this site" }]);
    const svgOnDisk = await fs.readFile(path.join(site.uploadDir, path.basename(result.refMap['/uploads/c.svg']!)), 'utf8');
    expect(svgOnDisk).not.toContain('<script');
  });
});
