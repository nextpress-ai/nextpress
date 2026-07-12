/**
 * Gallery block data model: image/data/content shapes and defaults. Shared by
 * editor, preview, and publish render paths.
 */

import type { BlockContent } from '@shared/schema-types';

// ============================================================================
// TYPES
// ============================================================================

export type GalleryImage = {
  id: string | number;
  url: string;
  alt: string;
  caption?: string;
  sizeSlug?: string;
};

export type GalleryData = {
  images?: GalleryImage[];
  columns?: number;
  imageCrop?: boolean;
  linkTo?: 'none' | 'media' | 'attachment';
  sizeSlug?: string;
  caption?: string;
  className?: string;
};

export type GalleryContent = BlockContent & {
  data?: GalleryData;
};

export const DEFAULT_DATA: GalleryData = {
  images: [],
  columns: 3,
  imageCrop: true,
  linkTo: 'none',
  sizeSlug: 'large',
  caption: '',
  className: '',
};

/**
 * Reads gallery fields from either persisted `{ kind, data }` content or the
 * unwrapped `GalleryData` returned by the block state accessor.
 */
export function readGalleryData(
  raw: GalleryContent | GalleryData | BlockContent | undefined,
): GalleryData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_DATA;
  }
  if ('kind' in raw && raw.kind === 'structured' && 'data' in raw && raw.data) {
    return raw.data as GalleryData;
  }
  return raw as GalleryData;
}

/**
 * Keeps column count within the number of images so the grid never leaves
 * empty columns after images are removed.
 */
export function resolveGalleryColumns(args: {
  imageCount: number;
  columns?: number;
}): number {
  const current = args.columns ?? DEFAULT_DATA.columns ?? 3;
  if (args.imageCount <= 0) {
    return current;
  }
  return Math.min(current, args.imageCount);
}
