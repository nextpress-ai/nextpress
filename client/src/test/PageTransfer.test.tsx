import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import type { PagePackage } from '@shared/page-transfer';
import { ImportPageDialog } from '@/components/PageTransfer/ImportPageDialog';
import { ExportPageDialog } from '@/components/PageTransfer/ExportPageDialog';
import { PasteBlocksDialog } from '@/components/PageTransfer/PasteBlocksDialog';
import { buildBlocksPackage, landPastedPackage } from '@/lib/page-transfer/blocks-clipboard';
import { describeMissingFiles } from '@/lib/page-transfer/page-transfer-api';

const setLocation = vi.fn();
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('wouter', () => ({ useLocation: () => ['/', setLocation] }));
vi.mock('@/lib/sonner-toast', () => ({
  showSuccessToast: toasts.success,
  showErrorToast: toasts.error,
}));

const fetchMock = vi.fn();

const image = (id: string, url: string): BlockConfig => ({
  id,
  name: 'core/image',
  type: 'block',
  parentId: null,
  content: { kind: 'media', url, mediaType: 'image' },
});

const pageFile = (over: Partial<PagePackage> = {}): File => {
  const pkg: PagePackage = {
    format: 'nextpress-page',
    formatVersion: 1,
    appVersion: '1.3.8',
    createdAt: '2026-09-29T00:00:00.000Z',
    source: 'export',
    page: { title: 'walkableca', slug: 'walkableca', featuredImage: null, other: {} },
    blocks: [image('a', '/uploads/hero.png')],
    files: [
      { ref: '/uploads/hero.png', name: 'hero.png', mimeType: 'image/png', size: 4, data: 'AAAA' },
      { ref: '/uploads/clip.mp4', name: 'clip.mp4', mimeType: 'video/mp4', size: 9, leftOut: 'left-out' },
    ],
    theme: { name: 'Walk theme', description: null, settings: {} },
    ...over,
  };
  return new File([JSON.stringify(pkg)], 'walkableca.nextpress-page.json', { type: 'application/json' });
};

const withQuery = (node: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

beforeEach(() => {
  fetchMock.mockReset();
  setLocation.mockReset();
  toasts.success.mockReset();
  toasts.error.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ImportPageDialog', () => {
  it('refuses a file that is not a page file, in plain words', async () => {
    const user = userEvent.setup();
    withQuery(<ImportPageDialog open onOpenChange={() => undefined} />);
    await user.upload(screen.getByLabelText('Page file'), new File(['hello'], 'notes.json', { type: 'application/json' }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("This isn't a NextPress page file."));
    expect(screen.getByRole('button', { name: 'Choose a file first' })).toBeDisabled();
  });

  it('shows what is inside, sends the file with the theme choice, then opens the new draft', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          page: { id: 'page-9', title: 'walkableca' },
          files: { refMap: {}, added: ['hero.png'], reused: [], missing: [{ name: 'clip.mp4', reason: 'left out on export' }] },
          theme: { status: 'added', name: 'Walk theme', id: 't1' },
        }),
        { status: 201 },
      ),
    );
    withQuery(<ImportPageDialog open onOpenChange={() => undefined} siteId="site-2" />);
    await user.upload(screen.getByLabelText('Page file'), pageFile());

    expect(await screen.findByText('1 included, 1 as placeholders')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Also add theme "Walk theme"/ }));
    await user.click(screen.getByRole('button', { name: 'Import as draft' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/page-transfer/import');
    const form = init.body as FormData;
    expect(form.get('includeTheme')).toBe('false');
    expect(form.get('siteId')).toBe('site-2');
    expect(form.get('package')).toBeInstanceOf(Blob);

    expect(await screen.findByText(/is ready as a draft/)).toBeInTheDocument();
    expect(screen.getByText(/1 file did not come along: clip.mp4/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open in editor' }));
    expect(setLocation).toHaveBeenCalledWith(expect.stringContaining('page-9'));
  });
});

describe('ExportPageDialog', () => {
  it('asks the server to leave files out when the switch is off', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const createUrl = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ExportPageDialog page={{ id: 'p1', title: 'Home' }} open onOpenChange={() => undefined} />);

    await user.click(screen.getByRole('switch', { name: /Include images, videos and other files/ }));
    await user.click(screen.getByRole('button', { name: 'Download file' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/page-transfer/pages/p1/export?files=0', expect.anything()));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Page file downloaded'));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});

describe('PasteBlocksDialog', () => {
  it('adds at the end by default and can replace the page instead', async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();
    render(<PasteBlocksDialog open blockCount={42} isPasting={false} onCancel={() => undefined} onPaste={onPaste} />);
    expect(screen.getByRole('heading', { name: 'Paste 42 blocks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add blocks' }));
    expect(onPaste).toHaveBeenLastCalledWith('append');
    await user.click(screen.getByRole('radio', { name: /Replace this page/ }));
    await user.click(screen.getByRole('button', { name: 'Replace page' }));
    expect(onPaste).toHaveBeenLastCalledWith('replace');
  });
});

describe('blocks clipboard', () => {
  it('carries small images inside the copy and names a video as a placeholder', async () => {
    fetchMock.mockImplementation(async (ref: string) => ({
      ok: true,
      blob: async () =>
        ref.endsWith('.png')
          ? new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
          : new Blob([new Uint8Array(10)], { type: 'video/mp4' }),
    }));
    const pkg = await buildBlocksPackage({ blocks: [image('a', '/uploads/hero.png'), image('b', '/uploads/clip.mp4')] });
    expect(pkg.source).toBe('clipboard');
    expect(pkg.files.find((file) => file.name === 'hero.png')?.data).toBe('AQID');
    expect(pkg.files.find((file) => file.name === 'clip.mp4')).toMatchObject({ leftOut: 'not-in-clipboard' });
    expect(pkg.files.find((file) => file.name === 'clip.mp4')?.data).toBeUndefined();
  });

  it('points pasted blocks at the files stored on this site', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ refMap: { '/uploads/hero.png': '/uploads/hero-77.png' }, added: ['hero.png'], reused: [], missing: [] }),
        { status: 201 },
      ),
    );
    const landed = await landPastedPackage({
      pkg: {
        format: 'nextpress-page',
        formatVersion: 1,
        appVersion: 't',
        createdAt: 't',
        source: 'clipboard',
        blocks: [image('a', '/uploads/hero.png')],
        files: [{ ref: '/uploads/hero.png', name: 'hero.png', mimeType: 'image/png', size: 3, data: 'AQID' }],
      },
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/page-transfer/files', expect.objectContaining({ method: 'POST' }));
    expect(JSON.stringify(landed.blocks)).toContain('/uploads/hero-77.png');
    expect(JSON.stringify(landed.blocks)).not.toContain('"/uploads/hero.png"');
  });

  it('describes missing files briefly', () => {
    expect(describeMissingFiles([])).toBeNull();
    expect(
      describeMissingFiles(['a', 'b', 'c', 'd'].map((name) => ({ name: `${name}.mp4`, reason: 'too big to copy' }))),
    ).toBe('4 files did not come along: a.mp4, b.mp4, c.mp4 and 1 more. A placeholder shows where each one goes.');
  });
});
