import type { JSX, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { MotionBulkBar } from '@/components/motion/motion-primitives';
import { cn } from '@/lib/utils';

type ContentListBulkBarProps = {
  visible: boolean;
  selectedCount: number;
  itemLabel: string;
  onDelete: () => void;
  onClear: () => void;
  deletePending?: boolean;
  children?: ReactNode;
};

/**
 * Animated bulk selection bar shared by Posts and Pages lists.
 */
export function ContentListBulkBar({
  visible,
  selectedCount,
  itemLabel,
  onDelete,
  onClear,
  deletePending = false,
  children,
}: ContentListBulkBarProps): JSX.Element {
  return (
    <MotionBulkBar visible={visible}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-md border border-npb-border-default',
          'bg-npb-surface-base px-3 py-2.5 shadow-[var(--npb-shadow-surface)]',
        )}>
        <span className="text-sm text-npb-text-primary">
          {selectedCount} {selectedCount === 1 ? itemLabel : `${itemLabel}s`} selected
        </span>
        {children}
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={deletePending}>
          Delete selected
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </MotionBulkBar>
  );
}
