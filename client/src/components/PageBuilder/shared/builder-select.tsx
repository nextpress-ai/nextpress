import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type BuilderSelectOption = {
  value: string;
  label: ReactNode;
};

type BuilderSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly BuilderSelectOption[];
  placeholder?: string;
  /** Accessible name when the visible label is not wired via `<Label htmlFor>`. */
  ariaLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
};

/**
 * Radix select with builder sidebar trigger and menu chrome.
 * WHY: Portaled menus cannot inherit `.npb-editor-sidebar` scope — shared classes keep ergonomics in light and dark admin.
 */
export function BuilderSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  triggerClassName,
  contentClassName,
}: BuilderSelectProps): ReactNode {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'h-9 w-full rounded-none text-sm focus-visible:outline-none',
          'npb-settings-select-trigger',
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn('npb-settings-select-content max-h-64', contentClassName)}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="npb-settings-select-item rounded-none py-2"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
