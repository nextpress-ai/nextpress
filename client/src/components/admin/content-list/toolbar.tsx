import type { JSX } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ContentListToolbarProps } from './types';

const CURRENT_PAGE_SEARCH_HINT = 'Search applies to the current page only.';
const SEARCH_INPUT_ID = 'content-list-search';

/**
 * Renders controlled list search while keeping current-page scope explicit.
 */
export function ContentListToolbar({
  value,
  placeholder,
  onSearchChange,
  hint = CURRENT_PAGE_SEARCH_HINT,
  className,
  compact = false,
}: ContentListToolbarProps): JSX.Element {
  return (
    <div className={cn(compact ? 'flex items-center' : 'flex flex-col items-end gap-1', className)}>
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        {placeholder}
      </label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-npb-text-muted w-4 h-4"
          aria-hidden
        />
        <Input
          id={SEARCH_INPUT_ID}
          placeholder={placeholder}
          title={compact ? hint : undefined}
          value={value}
          onChange={(event) => onSearchChange(event.target.value)}
          className={cn('pl-10', compact ? 'h-8 w-44 sm:w-52 text-sm' : 'w-64')}
        />
      </div>
      {!compact ? <p className="text-xs text-npb-text-muted">{hint}</p> : null}
    </div>
  );
}
