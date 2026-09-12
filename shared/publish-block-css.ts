import { GALLERY_PUBLISH_CSS } from "./gallery-render.js";
import { FLUID_HEADING_CSS } from "./responsive-scales.js";

/**
 * Shared publish CSS for preview, SPA, and SSR.
 * Single source so client and server never drift on responsive fallbacks.
 */
export const PUBLISH_BLOCK_CSS = `
${FLUID_HEADING_CSS}

.wp-block-markdown p {
  margin: 0 0 1rem;
}
.wp-block-markdown h1,
.wp-block-markdown h2,
.wp-block-markdown h3,
.wp-block-markdown h4,
.wp-block-markdown h5,
.wp-block-markdown h6 {
  font-weight: 700;
  margin: 0 0 0.75rem;
  line-height: 1.25;
}
.wp-block-markdown h1 { font-size: 2.25rem; }
.wp-block-markdown h2 { font-size: 1.875rem; }
.wp-block-markdown h3 { font-size: 1.5rem; }
.wp-block-markdown ul,
.wp-block-markdown ol {
  margin: 0 0 1rem;
  padding-left: 1.5rem;
}
.wp-block-markdown li { margin-bottom: 0.25rem; }
.wp-block-markdown blockquote {
  margin: 0 0 1rem;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 4px solid #d1d5db;
  font-style: italic;
}
.wp-block-markdown a { color: var(--npb-accent, #007cba); }
.wp-block-markdown code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
}
.wp-block-markdown pre {
  margin: 0 0 1rem;
  padding: 1rem;
  overflow-x: auto;
  background: #f3f4f6;
  border-radius: 0.375rem;
}
.wp-block-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1rem;
}
.wp-block-markdown th,
.wp-block-markdown td {
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  text-align: left;
}

/* Prose readability */
.wp-block-paragraph {
  max-width: 65ch;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Reset UA figure margins (1em 40px) so blocks stay within the content column */
figure.wp-block-gallery,
figure.wp-block-table,
figure.wp-block-image,
figure.wp-block-embed {
  margin: 1em 0;
  max-width: 100%;
}

/* Images — never overflow viewport */
.wp-block-image {
  margin: 1.5em 0;
  max-width: 100%;
}
.wp-block-image img {
  max-width: 100%;
  height: auto;
  display: block;
}
.wp-block-image figcaption {
  margin-top: 0.5em;
  font-size: 0.875em;
  color: #666;
  text-align: center;
}

/* Container / group shells */
.wp-block-container,
.wp-block-group {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Stack shells — layout (flex/grid) is inline; CSS only guards the box */
.wp-block-stack {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}
.wp-block-stack__inner > * {
  min-width: 0;
}

/* Columns */
.wp-block-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin: 1.5em 0;
  width: 100%;
}
.wp-block-column {
  flex: 1 1 var(--np-columns-min-width, 220px);
  min-width: 0;
}

/* Buttons row */
.wp-block-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1.5em 0;
}
.wp-block-button__link {
  min-height: 44px;
  min-width: 44px;
  font-size: 16px;
}

/* Media + text stack on mobile */
.wp-block-media-text.is-stacked-on-mobile {
  display: grid;
  grid-template-columns: 1fr;
}
.wp-block-media-text.is-stacked-on-mobile.has-media-on-the-right .wp-block-media-text__media {
  order: -1;
}
.wp-block-media-text__media img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Cover */
.wp-block-cover {
  min-height: clamp(240px, 50vh, 400px);
}

/* Code / preformatted overflow */
.wp-block-code,
.wp-block-preformatted {
  overflow-x: auto;
  max-width: 100%;
}

/* Table scroll on narrow viewports */
.wp-block-table {
  overflow-x: auto;
  max-width: 100%;
  display: block;
}

/* Video / audio fluid */
.wp-block-video video,
.wp-block-audio audio {
  max-width: 100%;
  width: 100%;
}

/* Page shell — prevent horizontal scroll from nested blocks */
#main-content,
.np-public-block-stack {
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: clip;
}

#main-content.has-page-shell,
.np-public-block-stack.has-page-shell {
  max-width: none;
  padding: 0;
}

.wp-block-page-shell {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

.wp-block-header {
  container-type: inline-size;
  container-name: np-header;
  width: 100%;
  box-sizing: border-box;
  background: inherit;
  color: inherit;
}

.wp-block-header.is-sticky {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(12px);
}

.wp-block-header__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.75rem 1.25rem;
  box-sizing: border-box;
  position: relative;
}

.wp-block-header__slot {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.wp-block-header__slot.is-middle {
  flex: 1;
  justify-content: center;
}

.wp-block-header__slot.is-right {
  justify-content: flex-end;
  margin-left: auto;
}

.wp-block-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-decoration: none;
  color: inherit;
}

.wp-block-header__mark {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  background: var(--npb-accent, #f97316);
  flex-shrink: 0;
}

.wp-block-header__brand img {
  height: 1.75rem;
  width: auto;
}

.wp-block-header__nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wp-block-header__nav a,
.wp-block-header__nav summary {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: inherit;
  text-decoration: none;
  font-size: 0.8125rem;
  line-height: 1;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  opacity: 0.72;
}

.wp-block-header__nav a:hover,
.wp-block-header__nav summary:hover {
  opacity: 1;
}

.wp-block-header__dropdown {
  position: relative;
}

.wp-block-header__dropdown summary {
  list-style: none;
}

.wp-block-header__dropdown summary::-webkit-details-marker {
  display: none;
}

.wp-block-header__dropdown summary::after {
  content: "";
  width: 0.28rem;
  height: 0.28rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
}

.wp-block-header__dropdown-list {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  min-width: 10rem;
  padding: 0.4rem;
  margin: 0;
  list-style: none;
  background: inherit;
  background-color: var(--npb-canvas-page, Canvas);
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  z-index: 20;
}

.wp-block-header__dropdown-list a {
  display: block;
  padding: 0.4rem 0.5rem;
  opacity: 0.8;
}

.wp-block-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wp-block-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  color: inherit;
  opacity: 1;
}

.wp-block-header__action.is-solid {
  background: var(--npb-accent, #f97316);
  border-color: transparent;
  color: #fff;
}

.wp-block-header__mobile-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 2rem;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.wp-block-header__mobile-toggle > summary {
  list-style: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 2rem;
  cursor: pointer;
}

.wp-block-header__mobile-toggle > summary::-webkit-details-marker {
  display: none;
}

.wp-block-header__burger,
.wp-block-header__burger::before,
.wp-block-header__burger::after {
  display: block;
  width: 1rem;
  height: 1.5px;
  background: currentColor;
}

.wp-block-header__burger {
  position: relative;
}

.wp-block-header__burger::before,
.wp-block-header__burger::after {
  content: "";
  position: absolute;
  left: 0;
}

.wp-block-header__burger::before {
  top: -4px;
}

.wp-block-header__burger::after {
  top: 4px;
}

.wp-block-header__mobile-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  padding: 0.85rem 1.25rem 1rem;
  box-sizing: border-box;
  background: inherit;
  background-color: var(--npb-canvas-page, Canvas);
}

.wp-block-header__mobile-body .wp-block-header__nav,
.wp-block-header__mobile-body .wp-block-header__actions {
  flex-direction: column;
  align-items: flex-start;
}

.wp-block-header__desktop {
  display: contents;
}

.wp-block-header__mobile-panel {
  display: none;
}

@container np-header (max-width: 767px) {
  .wp-block-header__desktop {
    display: none;
  }
  .wp-block-header__mobile-toggle {
    display: inline-flex;
    margin-left: auto;
  }
  .wp-block-header__mobile-panel[open],
  .wp-block-header__mobile-panel {
    display: block;
  }
  .wp-block-header__mobile-panel:not([open]) .wp-block-header__mobile-body {
    display: none;
  }
}

.wp-block-gallery,
.wp-block-gallery .blocks-gallery-grid {
  max-width: 100%;
  min-width: 0;
}

${GALLERY_PUBLISH_CSS}

@media (max-width: 768px) {
  #main-content:not(.has-page-shell),
  .np-public-block-stack:not(.has-page-shell) {
    padding: 1rem !important;
  }

  .wp-block-columns {
    flex-direction: column !important;
    gap: 1rem;
  }

  .wp-block-column {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .wp-block-media-text.is-stacked-on-mobile,
  .wp-block-media-text:not(.has-media-on-the-right):not(.is-image-fill) {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .wp-block-gallery .blocks-gallery-grid {
    grid-template-columns: 1fr !important;
  }
}

.np-post-list__items--grid,
.np-post-list--grid:not(:has(> .np-post-list__items)),
.np-post-list__items--cards,
.np-post-list--cards:not(:has(> .np-post-list__items)) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
.np-post-list__items--list,
.np-post-list--list:not(:has(> .np-post-list__items)) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.np-post-list__card {
  min-width: 0;
  border: 1px solid var(--npb-border-default, #e4e4e7);
  overflow: hidden;
}
.np-post-list__link {
  color: inherit;
}
.np-post-list__image {
  display: block;
  width: 100%;
  height: 10rem;
  object-fit: cover;
  background: var(--npb-surface-inset, #f4f4f5);
}
.np-post-list__body { padding: 1rem; }
.np-post-list__title { display: block; margin-bottom: 0.35rem; font-weight: 600; }
.np-post-list__excerpt { margin: 0 0 0.5rem; color: var(--npb-text-secondary, #52525b); font-size: 0.875rem; }
.np-post-list__meta { color: var(--npb-text-muted, #71717a); }
.np-post-overlay {
  --npb-text-primary: #18181b;
  --npb-text-secondary: #52525b;
  --npb-text-muted: #71717a;
  width: min(44rem, calc(100vw - 1.5rem));
  max-height: 90dvh;
  padding: 0;
  border: 1px solid #e4e4e7;
  background: #fafafa;
  color: #18181b;
  color-scheme: light;
}
.np-post-overlay::backdrop { background: rgb(24 24 27 / 0.72); }
.np-post-overlay__chrome { display: flex; justify-content: flex-end; padding: 0.75rem 1rem 0; }
.np-post-overlay__close {
  border: 1px solid #e4e4e7;
  background: transparent;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
}
.np-post-overlay__article { padding: 2.25rem 1.75rem 2rem; overflow: auto; }
.np-post-overlay__title { margin: 0 0 1rem; font-size: clamp(1.75rem, 3vw, 2.25rem); line-height: 1.15; letter-spacing: -0.04em; }
.np-post-overlay__image { width: 100%; margin-bottom: 1.25rem; aspect-ratio: 16 / 9; object-fit: cover; }
.np-post-overlay__excerpt { margin: 0 0 1rem; font-size: 1.05rem; line-height: 1.6; color: #52525b; }
.np-post-overlay__html .wp-block-heading:first-child,
.np-post-overlay__html h1:first-child { display: none; }
.np-post-overlay__html [class*="wp-block-"] { padding-left: 0; padding-right: 0; }
.np-post-overlay__html p { max-width: 65ch; line-height: 1.65; }
@media (min-width: 768px) {
  .np-post-list__items--grid,
  .np-post-list--grid:not(:has(> .np-post-list__items)),
  .np-post-list__items--cards,
  .np-post-list--cards:not(:has(> .np-post-list__items)) { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .np-post-list__items--grid,
  .np-post-list--grid:not(:has(> .np-post-list__items)) { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 639px) {
  .np-post-overlay { width: 100%; max-height: 100dvh; height: 100dvh; margin: 0; }
}
`.trim();

/** Container-query rules for editor canvas — @media does not fire when only inner div shrinks. */
export const EDITOR_CANVAS_CONTAINER_CSS = `
@container npb-canvas (max-width: 768px) {
  .npb-canvas-page .wp-block-container,
  .npb-canvas-page .wp-block-group {
    padding: 16px !important;
  }
  .npb-canvas-page .wp-block-columns {
    flex-direction: column !important;
  }
  .npb-canvas-page .wp-block-media-text.is-stacked-on-mobile,
  .npb-canvas-page .wp-block-media-text {
    display: grid !important;
    grid-template-columns: 1fr !important;
  }
  .npb-canvas-page .wp-block-gallery .blocks-gallery-grid {
    grid-template-columns: 1fr !important;
  }
  .npb-canvas-page .wp-block-table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
  .npb-canvas-page figure.wp-block-gallery,
  .npb-canvas-page figure.wp-block-table,
  .npb-canvas-page figure.wp-block-image {
    margin-left: 0 !important;
    margin-right: 0 !important;
    max-width: 100%;
  }
}
`.trim();

export const FULL_PUBLISH_CSS = `${PUBLISH_BLOCK_CSS}\n${EDITOR_CANVAS_CONTAINER_CSS}`;
