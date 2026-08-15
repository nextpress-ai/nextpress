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

.wp-block-gallery,
.wp-block-gallery .blocks-gallery-grid {
  max-width: 100%;
  min-width: 0;
}

${GALLERY_PUBLISH_CSS}

@media (max-width: 768px) {
  #main-content,
  .np-public-block-stack {
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
