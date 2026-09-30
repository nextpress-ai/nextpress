import type { JSX, ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type RowAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Shown under the label while disabled, so the item is never a silent dead end. */
  disabledReason?: string;
  /** Destructive actions sit last, after a divider, and open their own confirm. */
  destructive?: boolean;
};

type RowActionsMenuProps = {
  /** Item title, for the button's screen-reader label. */
  itemTitle: string;
  actions: RowAction[];
};

function RowActionItem({ action }: { action: RowAction }): JSX.Element {
  const reason = action.disabled ? action.disabledReason : undefined;
  return (
    <DropdownMenuItem
      variant={action.destructive ? 'destructive' : 'default'}
      disabled={action.disabled}
      onSelect={action.onSelect}
      className={reason ? 'items-start' : undefined}
    >
      <span className={reason ? 'mt-0.5' : undefined}>{action.icon}</span>
      <span className="flex flex-col">
        <span>{action.label}</span>
        {reason ? <span className="text-xs text-npb-text-muted">{reason}</span> : null}
      </span>
    </DropdownMenuItem>
  );
}

/**
 * The "⋯" menu for a row in the admin content lists. Keeps rows calm once an item has more than a
 * couple of actions; the most-used action (Edit) stays a visible button beside it.
 */
export function RowActionsMenu({ itemTitle, actions }: RowActionsMenuProps): JSX.Element {
  const regular = actions.filter((action) => !action.destructive);
  const destructive = actions.filter((action) => action.destructive);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`More actions for ${itemTitle || 'Untitled'}`} title="More actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {regular.map((action) => (
          <RowActionItem key={action.key} action={action} />
        ))}
        {regular.length > 0 && destructive.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map((action) => (
          <RowActionItem key={action.key} action={action} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
