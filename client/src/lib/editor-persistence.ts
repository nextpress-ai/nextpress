export type DraftTimestamp = Date | string | null | undefined;

/** Converts persisted draft timestamps to comparable milliseconds. */
export function readDraftTimestamp(value: DraftTimestamp): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string') return 0;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Restores local work only when it was written after the remote entity.
 * This keeps a first-load server write from replacing newer canvas edits.
 */
export function shouldRestoreLocalDraft({
  localUpdatedAt,
  remoteUpdatedAt,
}: {
  localUpdatedAt: DraftTimestamp;
  remoteUpdatedAt: DraftTimestamp;
}): boolean {
  return readDraftTimestamp(localUpdatedAt) > readDraftTimestamp(remoteUpdatedAt);
}

/** Stamps drafts at write time so debounce delay cannot preserve stale metadata. */
export function stampDraftTimestamp<T extends { updatedAt?: Date | string | null }>(
  draft: T,
  now = new Date(),
): T {
  return { ...draft, updatedAt: now.toISOString() };
}
