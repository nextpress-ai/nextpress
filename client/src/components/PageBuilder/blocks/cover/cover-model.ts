/**
 * Cover block data model: data/content shapes and defaults. No React here — see
 * `cover-settings.tsx` for the UI and `CoverBlock.tsx` for the renderer.
 */

import type { BlockContent } from '@shared/schema-types';

// ============================================================================
// TYPES
// ============================================================================

export type CoverData = {
  url?: string;
  alt?: string;
  hasParallax?: boolean;
  dimRatio?: number;
  overlayColor?: string;
  minHeight?: number;
  contentPosition?: string;
  customOverlayColor?: string;
  backgroundType?: 'image' | 'video';
  focalPoint?: { x: number; y: number };
  innerContent?: string;
  className?: string;
};

export type CoverContent = BlockContent & {
  data?: CoverData;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_DATA: CoverData = {
  url: '',
  alt: '',
  hasParallax: false,
  dimRatio: 50,
  minHeight: 400,
  contentPosition: 'center center',
  customOverlayColor: '#000000',
  backgroundType: 'image',
  focalPoint: { x: 0.5, y: 0.5 },
  innerContent: '<p style="font-size: 2.5em; font-weight: bold;">Write title…</p>',
  className: '',
};

export const DEFAULT_CONTENT: CoverContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};
