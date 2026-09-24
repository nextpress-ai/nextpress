import type { QueryClient } from '@tanstack/react-query';

/**
 * The editor may be opened by id or by name. Saves must write every address
 * that query used, or the next Ctrl+S still holds the old version.
 */
export function listEditorEntityQueryKeys({
  apiBase,
  id,
  slug,
  address,
}: {
  apiBase: string;
  id?: string | null;
  slug?: string | null;
  address?: string | null;
}): string[][] {
  const seen = new Set<string>();
  const keys: string[][] = [];
  for (const part of [id, slug, address]) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    keys.push([`${apiBase}/${part}`]);
  }
  return keys;
}

/** Writes the same entity under every editor address for that record. */
export function writeEditorEntityCache({
  queryClient,
  keys,
  entity,
}: {
  queryClient: QueryClient;
  keys: string[][];
  entity: unknown;
}): void {
  for (const key of keys) {
    queryClient.setQueryData(key, entity);
  }
}

/** Version to send on save: the live editor copy, not a stale query row. */
export function readEditorSaveVersion({
  inlinePost,
  pageVersion,
  fallback,
}: {
  inlinePost?: { version?: number } | null;
  pageVersion: number;
  fallback?: { version?: number } | null;
}): number {
  if (inlinePost) return inlinePost.version ?? fallback?.version ?? 0;
  return pageVersion;
}
