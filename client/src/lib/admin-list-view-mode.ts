export type AdminListViewMode = 'table' | 'cards';

export type AdminListResource = 'pages' | 'posts' | 'media';

const readStorageKey = (resource: AdminListResource): string =>
  `npb:admin:${resource}:view-mode`;

/** Reads persisted list/card preference for an admin resource. */
export const readAdminListViewMode = (
  resource: AdminListResource,
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
  resource: AdminListResource;
  mode: AdminListViewMode;
}): void => {
  window.localStorage.setItem(readStorageKey(resource), mode);
};
