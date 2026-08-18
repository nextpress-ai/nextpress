import type { JSX, ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentListSortOrder } from '@shared/content-list-query';

type SortableHeaderProps = {
  label: string;
  field: string;
  activeField: string;
  order: ContentListSortOrder;
  onSortChange: (field: string) => void;
};

/**
 * Accessible sort control for admin list table headers.
 */
export function SortableHeader({
  label,
  field,
  activeField,
  order,
  onSortChange,
}: SortableHeaderProps): JSX.Element {
  const isActive = activeField === field;
  const Icon = !isActive ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto px-0 py-0 font-medium hover:bg-transparent"
      onClick={() => onSortChange(field)}
      aria-label={`Sort by ${label}${isActive ? `, currently ${order === 'asc' ? 'ascending' : 'descending'}` : ''}`}>
      <span>{label}</span>
      <Icon className="ml-1 h-3.5 w-3.5 text-npb-text-muted" aria-hidden />
    </Button>
  );
}

type AdminListViewModeToggleProps = {
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
};

/** Switches between table and card layouts for admin lists. */
export function AdminListViewModeToggle({
  viewMode,
  onViewModeChange,
}: AdminListViewModeToggleProps): JSX.Element {
  const segmentClass = (active: boolean): string =>
    active
      ? 'bg-npb-surface-base text-npb-text-primary shadow-sm'
      : 'text-npb-text-secondary hover:text-npb-text-primary';

  return (
    <div className="inline-flex shrink-0 rounded-md border border-npb-border-strong bg-npb-surface-inset p-0.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={`h-8 px-3 text-xs font-semibold ${segmentClass(viewMode === 'table')}`}
        onClick={() => onViewModeChange('table')}
        aria-pressed={viewMode === 'table'}>
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={`h-8 px-3 text-xs font-semibold ${segmentClass(viewMode === 'cards')}`}
        onClick={() => onViewModeChange('cards')}
        aria-pressed={viewMode === 'cards'}>
        Cards
      </Button>
    </div>
  );
}

type ContentCardGridProps<T extends { id: string; title?: string | null }> = {
  items: T[];
  renderMeta: (item: T) => ReactNode;
  renderActions: (item: T) => ReactNode;
  hrefForItem: (item: T) => string;
};

/** Card layout alternative to admin list tables. */
export function ContentCardGrid<T extends { id: string; title?: string | null }>({
  items,
  renderMeta,
  renderActions,
  hrefForItem,
}: ContentCardGridProps<T>): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-lg border border-npb-border-strong bg-npb-surface-base p-4 shadow-[var(--npb-shadow-surface)]">
          <Link href={hrefForItem(item)} className="text-base font-medium text-npb-text-primary hover:text-npb-accent">
            {item.title || 'Untitled'}
          </Link>
          <div className="mt-2 text-sm text-npb-text-muted">{renderMeta(item)}</div>
          <div className="mt-4 flex items-center gap-2">{renderActions(item)}</div>
        </article>
      ))}
    </div>
  );
}
