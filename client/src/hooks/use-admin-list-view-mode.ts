import { useCallback, useState } from 'react';
import {
  readAdminListViewMode,
  writeAdminListViewMode,
  type AdminListViewMode,
  type AdminListResource,
} from '@/lib/admin-list-view-mode';

/** Keeps table/card view preference in local storage per admin resource. */
export function useAdminListViewMode(resource: AdminListResource): {
  viewMode: AdminListViewMode;
  setViewMode: (mode: AdminListViewMode) => void;
} {
  const [viewMode, setViewModeState] = useState<AdminListViewMode>(() =>
    readAdminListViewMode(resource),
  );

  const setViewMode = useCallback(
    (mode: AdminListViewMode) => {
      setViewModeState(mode);
      writeAdminListViewMode({ resource, mode });
    },
    [resource],
  );

  return { viewMode, setViewMode };
}
