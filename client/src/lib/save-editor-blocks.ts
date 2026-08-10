import { apiRequest } from '@/lib/queryClient';
import {
  buildEditorSavePayload,
  resolveEditorSaveTarget,
  type EditorSaveContentType,
} from '@/lib/editor-save-target';
import { stripVisualContentFromBlocks } from '@shared/strip-visual-content-from-blocks';
import type { BlockConfig, Page, Post, Template } from '@shared/schema-types';

export type SaveEditorBlocksParams = {
  contentType: EditorSaveContentType;
  id: string;
  expectedVersion?: number;
  title: string;
  slug: string;
  status: string;
  blocks: BlockConfig[];
  other?: Record<string, unknown>;
};

/**
 * Single remote block save used by header Save, Ctrl/Cmd+S, and legacy hooks.
 */
export async function saveEditorBlocks({
  contentType,
  id,
  expectedVersion,
  title,
  slug,
  status,
  blocks,
  other,
}: SaveEditorBlocksParams): Promise<Page | Post | Template> {
  const target = resolveEditorSaveTarget({ contentType, id, expectedVersion });
  const payload = buildEditorSavePayload({
    target,
    title,
    slug,
    status,
    blocks: stripVisualContentFromBlocks(blocks),
  });

  const requestPayload =
    other && target.contentType !== 'template'
      ? { ...(payload as Record<string, unknown>), other }
      : payload;

  const response = await apiRequest('PUT', target.endpoint, requestPayload);
  return (await response.json()) as Page | Post | Template;
}
