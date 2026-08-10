export type AdminListViewMode = 'table' | 'cards';

const readStorageKey = (resource: 'pages' | 'posts'): string =>
  `npb:admin:${resource}:view-mode`;

/** Reads persisted list/card preference for an admin resource. */
export const readAdminListViewMode = (
  resource: 'pages' | 'posts',
): AdminListViewMode => {
  if (typeof window === 'undefined') return 'table';
  const stored = window.localStorage.getItem(readStorageKey(resource));
  return stored === 'cards' ? 'cards' : 'table';
};

/** Persists list/card preference for an admin resource. */
export const writeAdminListViewMode = ({
  resource,
  mode,
}: {
  resource: 'pages' | 'posts';
  mode: AdminListViewMode;
}): void => {
  window.localStorage.setItem(readStorageKey(resource), mode);
};
