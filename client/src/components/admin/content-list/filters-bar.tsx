import type { JSX, ReactNode } from 'react';
import { ContentListToolbar } from './toolbar';
import { AdminListViewModeToggle } from './list-view-controls';

type ContentListFiltersBarProps = {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  /** Optional controls placed beside search (type filters, etc.). */
  leadingExtras?: ReactNode;
};

/**
 * Search and layout controls for admin content lists — lives above the table, not in the page header.
 */
export function ContentListFiltersBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  viewMode,
  onViewModeChange,
  leadingExtras = null,
}: ContentListFiltersBarProps): JSX.Element {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <ContentListToolbar
          value={searchValue}
          placeholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />
        {leadingExtras}
      </div>
      <AdminListViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );
}
