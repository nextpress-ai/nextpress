import type { BlockConfig } from '@shared/schema-types';
import {
  decideFileTravel,
  findUploadRefs,
  looksLikePagePackage,
  readPagePackage,
  rewriteFileRefs,
  PAGE_PACKAGE_FORMAT,
  PAGE_PACKAGE_VERSION,
  type PackageFile,
  type PagePackage,
  type StoredPackageFiles,
} from '@shared/page-transfer';
import { NEXTPRESS_CONFIG } from '../../../../config';
import { storePastedFiles } from './page-transfer-api';

/** Matches the server upload limit; a file above it could not be stored anyway. */
const UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

const fileName = (ref: string): string => decodeURIComponent(ref.split('/').pop() ?? 'file');

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });

/**
 * Reads one referenced file from this site for the clipboard. Small images travel inside
 * the copied text; anything else (or anything that fails to load) is named so the other
 * site can show a placeholder.
 */
async function packClipboardFile({ ref, bytesSoFar }: { ref: string; bytesSoFar: number }): Promise<PackageFile> {
  const name = fileName(ref);
  const response = await fetch(ref, { credentials: 'include' }).catch((error: Error) => {
    console.error('[page-transfer] Could not load a file for copying', { atFunction: 'packClipboardFile', ref, error });
    return null;
  });
  if (!response?.ok) return { ref, name, mimeType: 'application/octet-stream', size: 0, leftOut: 'not-found' };

  const blob = await response.blob();
  const mimeType = blob.type || 'application/octet-stream';
  const travel = decideFileTravel({
    mode: 'clipboard',
    mimeType,
    size: blob.size,
    uploadLimit: UPLOAD_LIMIT_BYTES,
    clipboardBytesSoFar: bytesSoFar,
  });
  if (!travel.travels) return { ref, name, mimeType, size: blob.size, leftOut: travel.leftOut };
  return { ref, name, mimeType, size: blob.size, data: await blobToBase64(blob) };
}

/** Copied blocks plus the files they use, as text another NextPress site can paste. */
export async function buildBlocksPackage({ blocks }: { blocks: BlockConfig[] }): Promise<PagePackage> {
  const files: PackageFile[] = [];
  let bytesSoFar = 0;
  // One at a time so the running size cap applies in order and the page is not flooded with requests.
  for (const ref of findUploadRefs({ value: blocks })) {
    const file = await packClipboardFile({ ref, bytesSoFar });
    if (file.data) bytesSoFar += file.size;
    files.push(file);
  }
  return {
    format: PAGE_PACKAGE_FORMAT,
    formatVersion: PAGE_PACKAGE_VERSION,
    appVersion: NEXTPRESS_CONFIG.version,
    createdAt: new Date().toISOString(),
    source: 'clipboard',
    blocks,
    files,
  };
}

export type CopyToClipboardResult = { copied: true; leftOut: string[] } | { copied: false; reason: string };

/** Puts blocks on the system clipboard so they can be pasted on this or another NextPress site. */
export async function copyBlocksToSystemClipboard({ blocks }: { blocks: BlockConfig[] }): Promise<CopyToClipboardResult> {
  if (!navigator.clipboard?.writeText) {
    return { copied: false, reason: 'This browser does not allow copying here. Use Export page instead.' };
  }
  const pkg = await buildBlocksPackage({ blocks });
  const written = await navigator.clipboard.writeText(JSON.stringify(pkg)).then(
    () => true,
    (error: Error) => {
      console.error('[page-transfer] Clipboard write refused', { atFunction: 'copyBlocksToSystemClipboard', error });
      return false;
    },
  );
  if (!written) {
    return { copied: false, reason: 'The browser blocked copying. Click on the page once, then try again.' };
  }
  return { copied: true, leftOut: pkg.files.filter((file) => file.leftOut).map((file) => file.name) };
}

export type ClipboardRead =
  | { kind: 'package'; pkg: PagePackage }
  /** NextPress text that can't be used (damaged, newer format). */
  | { kind: 'refused'; message: string }
  /** The browser kept the clipboard closed. */
  | { kind: 'blocked' }
  /** The clipboard holds something else. */
  | { kind: 'none' };

/** Reads NextPress blocks from clipboard text (a paste event or a clipboard read). */
export function readBlocksFromText(text: string): ClipboardRead {
  if (!looksLikePagePackage(text)) return { kind: 'none' };
  const read = readPagePackage(text);
  return read.ok ? { kind: 'package', pkg: read.value } : { kind: 'refused', message: read.message };
}

/**
 * Asks the browser for the clipboard (menu paste). Browsers may ask the person first or refuse;
 * a paste keystroke never needs this, because the paste event carries the text.
 */
export async function readBlocksFromSystemClipboard(): Promise<ClipboardRead> {
  if (!navigator.clipboard?.readText) return { kind: 'blocked' };
  const text = await navigator.clipboard.readText().catch((error: Error) => {
    console.error('[page-transfer] Clipboard read refused', { atFunction: 'readBlocksFromSystemClipboard', error });
    return null;
  });
  return text === null ? { kind: 'blocked' } : readBlocksFromText(text);
}

/**
 * Brings pasted files into this site (only when some came along) and points the pasted
 * blocks at the stored copies. Files that did not come along become named placeholders.
 */
export async function landPastedPackage({
  pkg,
}: {
  pkg: PagePackage;
}): Promise<{ blocks: BlockConfig[]; missing: StoredPackageFiles['missing'] }> {
  if (pkg.files.length === 0) return { blocks: pkg.blocks, missing: [] };
  const stored = await storePastedFiles({ pkg });
  return {
    blocks: rewriteFileRefs({ value: pkg.blocks, refMap: stored.refMap }),
    missing: stored.missing,
  };
}
