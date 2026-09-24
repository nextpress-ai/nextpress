import { describe, expect, it, vi } from 'vitest';
import {
  listEditorEntityQueryKeys,
  readEditorSaveVersion,
  writeEditorEntityCache,
} from '@/lib/editor-entity-cache';

describe('editor entity cache', () => {
  it('covers the id, the name, and the address used to open the page', () => {
    expect(
      listEditorEntityQueryKeys({
        apiBase: '/api/pages',
        id: 'page-id',
        slug: 'walkableca',
        address: 'walkableca',
      }),
    ).toEqual([['/api/pages/page-id'], ['/api/pages/walkableca']]);
  });

  it('writes the entity under every key', () => {
    const setQueryData = vi.fn();
    writeEditorEntityCache({
      queryClient: { setQueryData } as never,
      keys: [['/api/pages/page-id'], ['/api/pages/walkableca']],
      entity: { version: 4 },
    });
    expect(setQueryData).toHaveBeenCalledTimes(2);
    expect(setQueryData).toHaveBeenCalledWith(['/api/pages/walkableca'], {
      version: 4,
    });
  });

  it('saves with the editor version, not a leftover query row', () => {
    expect(
      readEditorSaveVersion({
        pageVersion: 6,
        fallback: { version: 3 },
      }),
    ).toBe(6);
    expect(
      readEditorSaveVersion({
        inlinePost: { version: 2 },
        pageVersion: 6,
        fallback: { version: 1 },
      }),
    ).toBe(2);
  });
});
