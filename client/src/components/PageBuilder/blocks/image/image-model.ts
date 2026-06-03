/**
 * Image block data model: content shape, defaults, and the alignment-button
 * class helper. No React here — see `image-settings.tsx` for the UI.
 */

import {
  PLACEHOLDER_IMAGE_ALT,
  PLACEHOLDER_IMAGE_URL,
} from "@shared/placeholder-image";

// ============================================================================
// TYPES
// ============================================================================

export type ImageContent = {
  kind: 'media';
  url: string;
  alt?: string;
  caption?: string;
  mediaType: 'image' | 'video' | 'audio';
  align?: 'left' | 'center' | 'right' | 'wide' | 'full' | '';
  sizeSlug?: 'thumbnail' | 'medium' | 'large' | 'full';
  className?: string;
  linkDestination?: 'none' | 'media' | 'attachment' | 'custom';
  href?: string;
  linkTarget?: '_self' | '_blank';
  target?: string;
  rel?: string;
  title?: string;
  id?: string;
};

export const DEFAULT_CONTENT: ImageContent = {
  kind: 'media',
  url: PLACEHOLDER_IMAGE_URL,
  mediaType: 'image',
  alt: PLACEHOLDER_IMAGE_ALT,
  caption: '',
  id: undefined,
  sizeSlug: 'full',
  align: '',
  linkDestination: 'none',
  href: '',
  linkTarget: '_self',
  rel: '',
  title: '',
  className: '',
};

// ============================================================================
// UTILITIES
// ============================================================================

export const getAlignmentButtonClass = (isActive: boolean) =>
  `flex items-center gap-2 p-3 h-9 text-sm font-medium rounded-lg border transition-colors ${
    isActive
      ? 'bg-npb-interactive-bg-active text-npb-interactive-text-active border-npb-interactive-bg-active'
      : 'bg-npb-interactive-bg text-npb-interactive-text border-npb-border-default hover:bg-npb-interactive-bg-hover'
  }`;
