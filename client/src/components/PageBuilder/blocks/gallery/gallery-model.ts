/**
 * Gallery block data model: image/data/content shapes and defaults. No React
 * here — see `gallery-settings.tsx` for the UI and `GalleryBlock.tsx` for the
 * renderer.
 */

import type { BlockContent } from '@shared/schema-types';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImage {
  id: string | number;
  url: string;
  alt: string;
  caption?: string;
  sizeSlug?: string;
}

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

export const DEFAULT_CONTENT: GalleryContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};
