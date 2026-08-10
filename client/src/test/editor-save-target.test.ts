import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import {
  buildEditorSavePayload,
  resolveEditorSaveTarget,
} from '@/lib/editor-save-target';

const blocks: BlockConfig[] = [];

describe('editor save target', () => {
  it('resolves inline posts to the post endpoint with their version', () => {
    const target = resolveEditorSaveTarget({
      contentType: 'post',
      id: 'post-inline',
      expectedVersion: 4,
    });

    expect(target).toEqual({
      contentType: 'post',
      id: 'post-inline',
      endpoint: '/api/posts/post-inline',
      expectedVersion: 4,
    });
    expect(
      buildEditorSavePayload({
        target,
        title: 'Inline post',
        slug: 'inline-post',
        status: 'draft',
        blocks,
      }),
    ).toMatchObject({ expectedVersion: 4, blocks });
  });

  it('does not add a concurrency token to template payloads', () => {
    const target = resolveEditorSaveTarget({
      contentType: 'template',
      id: 'template-1',
      expectedVersion: 9,
    });

    expect(
      buildEditorSavePayload({
        target,
        title: 'Template',
        slug: '',
        status: 'publish',
        blocks,
      }),
    ).toEqual({ name: 'Template', blocks });
  });
});

