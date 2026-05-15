/**
 * WHY: CSS `truncate` clips to the box but flex layouts still show unstable clipping;
 * explicit string caps keep one-line labels predictable with a visible `...` suffix.
 */

/** Block chrome toolbar — includes `"..."` when truncated (total char budget). */
export const NPB_BLOCK_TOOLBAR_LABEL_MAX_CHARS = 44;

/**
 * Sidebar, settings rows, picker cells, and canvas toolbar segment for
 * `formatIconReferenceLabel` / icon-name strings passed to `truncateWithEllipsis` as `maxChars`.
 * When truncated, up to **8** characters of the source remain before the `...` suffix (11 total).
 */
export const NPB_ICON_REFERENCE_ROW_MAX_CHARS = 11;

/** Block library draggable card title. */
export const NPB_BLOCK_LIBRARY_CARD_LABEL_MAX_CHARS = 24;

/** Template name in sidebar template list. */
export const NPB_TEMPLATE_LIST_NAME_MAX_CHARS = 48;

/** Chip labels (e.g. font family) in block settings. */
export const NPB_SETTINGS_CHIP_LABEL_MAX_CHARS = 10;

/**
 * Returns `text` unchanged when within `maxChars`; otherwise slices and appends `...`.
 * Ellipsis counts toward `maxChars` when truncation applies.
 */
export function truncateWithEllipsis(params: {
  text: string;
  maxChars: number;
}): string {
  const { text, maxChars } = params;
  if (maxChars < 1) {
    return '';
  }
  if (text.length <= maxChars) {
    return text;
  }
  if (maxChars <= 3) {
    return '...'.slice(0, maxChars);
  }
  return `${text.slice(0, maxChars - 3)}...`;
}
