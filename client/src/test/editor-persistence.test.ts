import { describe, expect, it } from 'vitest';
import {
  readDraftTimestamp,
  shouldRestoreLocalDraft,
  stampDraftTimestamp,
} from '@/lib/editor-persistence';

describe('editor-persistence', () => {
  it('prefers newer local drafts over remote timestamps', () => {
    expect(
      shouldRestoreLocalDraft({
        localUpdatedAt: '2026-08-10T12:00:00.000Z',
        remoteUpdatedAt: '2026-08-10T11:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('keeps remote data when local draft is older', () => {
    expect(
      shouldRestoreLocalDraft({
        localUpdatedAt: '2026-08-10T10:00:00.000Z',
        remoteUpdatedAt: '2026-08-10T11:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('stamps drafts at write time', () => {
    const now = new Date('2026-08-10T12:30:00.000Z');
    const stamped = stampDraftTimestamp(
      { title: 'Draft page', updatedAt: '2026-08-10T10:00:00.000Z' },
      now,
    );

    expect(stamped.updatedAt).toBe('2026-08-10T12:30:00.000Z');
    expect(stamped.title).toBe('Draft page');
  });

  it('reads draft timestamps consistently', () => {
    expect(readDraftTimestamp('2026-08-10T12:00:00.000Z')).toBe(
      Date.parse('2026-08-10T12:00:00.000Z'),
    );
    expect(readDraftTimestamp(new Date('2026-08-10T12:00:00.000Z'))).toBe(
      Date.parse('2026-08-10T12:00:00.000Z'),
    );
    expect(readDraftTimestamp(undefined)).toBe(0);
  });
});
