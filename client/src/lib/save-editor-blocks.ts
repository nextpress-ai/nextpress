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
  excerpt?: string | null;
  featuredImage?: string | null;
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
  excerpt,
  featuredImage,
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

  const extra: Record<string, unknown> = {};
  if (target.contentType === 'post') {
    if (excerpt !== undefined) extra.excerpt = excerpt;
    if (featuredImage !== undefined) extra.featuredImage = featuredImage;
  }
  if (other && target.contentType !== 'template') extra.other = other;

  const requestPayload =
    Object.keys(extra).length > 0
      ? { ...(payload as Record<string, unknown>), ...extra }
      : payload;

  const response = await apiRequest('PUT', target.endpoint, requestPayload);
  return (await response.json()) as Page | Post | Template;
}
