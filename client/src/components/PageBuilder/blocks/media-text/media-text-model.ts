/**
 * Media & Text block data model: data/content shapes and defaults. No React here
 * — see `media-text-settings.tsx` for the UI and `MediaTextBlock.tsx` for the
 * renderer.
 */

import type { BlockContent } from "@shared/schema-types";
import {
  PLACEHOLDER_IMAGE_ALT,
  PLACEHOLDER_IMAGE_URL,
} from "@shared/placeholder-image";

// ============================================================================
// TYPES
// ============================================================================

export type MediaTextData = {
  mediaId?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaAlt?: string;
  mediaPosition?: 'left' | 'right';
  mediaWidth?: number;
  isStackedOnMobile?: boolean;
  imageFill?: boolean;
  verticalAlignment?: 'top' | 'center' | 'bottom';
  href?: string;
  linkTarget?: '_self' | '_blank';
  rel?: string;
  title?: string;
  content?: string;
  className?: string;
  anchor?: string;
};

export type MediaTextContent = BlockContent & {
  data?: MediaTextData;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_DATA: MediaTextData = {
  mediaId: undefined,
  mediaUrl: PLACEHOLDER_IMAGE_URL,
  mediaType: 'image',
  mediaAlt: PLACEHOLDER_IMAGE_ALT,
  mediaPosition: 'left',
  mediaWidth: 50,
  isStackedOnMobile: true,
  imageFill: false,
  verticalAlignment: 'center',
  href: '',
  linkTarget: '_self',
  rel: '',
  title: '',
  content: '<p>Add your content…</p>',
  anchor: '',
  className: '',
};

export const DEFAULT_CONTENT: MediaTextContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};
