import type { JSX } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ContentListToolbarProps } from './types';

const SEARCH_INPUT_ID = 'content-list-search';

/** Controlled search field for admin content lists. */
export function ContentListToolbar({
  value,
  placeholder,
  onSearchChange,
  className,
}: ContentListToolbarProps): JSX.Element {
  return (
    <div className={cn('relative w-full sm:max-w-sm', className)}>
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        {placeholder}
      </label>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-npb-text-muted"
        aria-hidden
      />
      <Input
        id={SEARCH_INPUT_ID}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-9 pl-10"
      />
    </div>
  );
}
