import type { Page } from '@shared/schema-types';
import type { PagePackage, StoredPackageFiles } from '@shared/page-transfer';

export type ImportedTheme =
  | { status: 'none' }
  | { status: 'skipped'; name: string }
  | { status: 'added' | 'reused'; name: string; id: string };

export type PageImportResult = {
  page: Page;
  files: StoredPackageFiles;
  theme: ImportedTheme;
};

const readFailure = async (response: Response, fallback: string): Promise<Error> => {
  const text = await response.text();
  const message = (() => {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      return typeof parsed.message === 'string' ? parsed.message : fallback;
    } catch (error) {
      console.error('[page-transfer] Unreadable error response', { status: response.status, text, error });
      return fallback;
    }
  })();
  return Object.assign(new Error(message), { status: response.status });
};

const packageForm = ({ pkg, extra = {} }: { pkg: PagePackage | Blob; extra?: Record<string, string> }): FormData => {
  const form = new FormData();
  Object.entries(extra).forEach(([key, value]) => form.append(key, value));
  const blob = pkg instanceof Blob ? pkg : new Blob([JSON.stringify(pkg)], { type: 'application/json' });
  form.append('package', blob, 'page.nextpress-page.json');
  return form;
};

/**
 * Downloads a page file. With `includeFiles: false` every image, video and other file is left
 * out and comes back as a named placeholder on import.
 */
export async function downloadPageFile({
  pageId,
  includeFiles,
}: {
  pageId: string;
  includeFiles: boolean;
}): Promise<void> {
  const response = await fetch(`/api/page-transfer/pages/${pageId}/export?files=${includeFiles ? '1' : '0'}`, {
    credentials: 'include',
  });
  if (!response.ok) throw await readFailure(response, "Couldn't prepare the page file. Please try again.");

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'page.nextpress-page.json';
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Creates a draft page from a page file on the current site. */
export async function importPageFile({
  file,
  includeTheme,
  siteId,
}: {
  file: Blob;
  includeTheme: boolean;
  siteId?: string;
}): Promise<PageImportResult> {
  const response = await fetch('/api/page-transfer/import', {
    method: 'POST',
    credentials: 'include',
    body: packageForm({
      pkg: file,
      extra: { includeTheme: String(includeTheme), ...(siteId ? { siteId } : {}) },
    }),
  });
  if (!response.ok) throw await readFailure(response, "Couldn't bring this page in. Please try again.");
  return (await response.json()) as PageImportResult;
}

/** Stores the files that came with pasted blocks; returns where each old path now points. */
export async function storePastedFiles({ pkg }: { pkg: PagePackage }): Promise<StoredPackageFiles> {
  const response = await fetch('/api/page-transfer/files', {
    method: 'POST',
    credentials: 'include',
    body: packageForm({ pkg }),
  });
  if (!response.ok) throw await readFailure(response, "Couldn't add the pasted files. The blocks were not pasted.");
  return (await response.json()) as StoredPackageFiles;
}

/** "2 files did not come along: hero.mp4, bg.jpg." — or nothing when every file arrived. */
export function describeMissingFiles(missing: StoredPackageFiles['missing']): string | null {
  if (missing.length === 0) return null;
  const names = missing.slice(0, 3).map((item) => item.name).join(', ');
  const more = missing.length > 3 ? ` and ${missing.length - 3} more` : '';
  const count = missing.length === 1 ? '1 file did' : `${missing.length} files did`;
  return `${count} not come along: ${names}${more}. A placeholder shows where each one goes.`;
}
