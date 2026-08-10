import type { BlockConfig } from '@shared/schema-types';

export type EditorSaveContentType = 'page' | 'post' | 'template';

export type EditorSaveTarget = {
  contentType: EditorSaveContentType;
  id: string;
  endpoint: string;
  expectedVersion: number | null;
};

type ResolveEditorSaveTargetParams = {
  contentType: EditorSaveContentType;
  id: string;
  expectedVersion?: number;
};

type BuildEditorSavePayloadParams = {
  target: EditorSaveTarget;
  title: string;
  slug: string;
  status: string;
  blocks: BlockConfig[];
};

export type EditorSavePayload =
  | { name: string; blocks: BlockConfig[] }
  | {
      title: string;
      slug: string;
      status: string;
      blocks: BlockConfig[];
      expectedVersion: number;
    };

/**
 * Resolves one canonical endpoint and concurrency token for an editor save.
 */
export function resolveEditorSaveTarget({
  contentType,
  id,
  expectedVersion,
}: ResolveEditorSaveTargetParams): EditorSaveTarget {
  return {
    contentType,
    id,
    endpoint: `/api/${contentType === 'template' ? 'templates' : `${contentType}s`}/${id}`,
    expectedVersion: contentType === 'template' ? null : expectedVersion ?? 0,
  };
}

/**
 * Builds the payload shared by header Save and Ctrl/Cmd+S.
 */
export function buildEditorSavePayload({
  target,
  title,
  slug,
  status,
  blocks,
}: BuildEditorSavePayloadParams): EditorSavePayload {
  if (target.contentType === 'template') {
    return { name: title, blocks };
  }

  return {
    title,
    slug,
    status,
    blocks,
    expectedVersion: target.expectedVersion ?? 0,
  };
}

