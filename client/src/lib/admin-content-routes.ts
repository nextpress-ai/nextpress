/**
 * Stable admin routes for opening content in the page builder.
 */
export const postEditorPath = (id: string): string =>
  `/admin/page-builder/post/${id}`;

export const pageEditorPath = (id: string): string =>
  `/admin/page-builder/page/${id}`;

/** Opens the site theme design editor. */
export const themeEditorPath = (id: string): string => `/admin/themes/${id}`;
