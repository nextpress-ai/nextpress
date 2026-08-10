/**
 * Stable admin routes for opening content in the page builder.
 */
export const postEditorPath = (id: string): string =>
  `/admin/page-builder/post/${id}`;

export const pageEditorPath = (id: string): string =>
  `/admin/page-builder/page/${id}`;
