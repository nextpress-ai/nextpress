import { useState, type JSX } from 'react';
import { ChevronDown } from 'lucide-react';
import TokenColorPicker from '@/components/PageBuilder/TokenColorPicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { resolveTailwindColorToken } from '@/lib/resolve-tailwind-color-token';
import type { TokenEntry } from '@shared/schema-types';
import { cn } from '@/lib/utils';

type ThemeColorRowProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  property?: 'backgroundColor' | 'color';
};

const toTokenEntry = ({
  value,
  property,
}: {
  value: string;
  property: ThemeColorRowProps['property'];
}): TokenEntry | undefined => {
  if (!value.trim()) return undefined;
  const resolved = resolveTailwindColorToken(value);
  return {
    property: property ?? 'backgroundColor',
    value: resolved?.family ?? '',
    variant: resolved?.shade ?? null,
    alias: property === 'color' ? 'text' : 'bg',
    style: value,
  };
};

/** One-line color control — opens the palette in a builder-style popover. */
export function ThemeColorRow({
  label,
  value,
  onChange,
  property = 'backgroundColor',
}: ThemeColorRowProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const swatchColor = value.trim() || '#e4e4e7';

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-npb-text-secondary">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'npb-settings-select-trigger flex h-9 min-w-[5.5rem] items-center justify-between gap-2 rounded-none px-2',
              'focus-visible:outline-none',
            )}
            aria-label={`Change ${label}`}
          >
            <span
              className="h-5 w-5 shrink-0 border border-npb-border-subtle"
              style={{ backgroundColor: swatchColor }}
            />
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="npb-settings-popover-surface w-[min(calc(100vw-2rem),18.5rem)] rounded-none p-3"
        >
          <TokenColorPicker
            property={property}
            currentEntry={toTokenEntry({ value, property })}
            currentStyleValue={value}
            onChange={(entry) => {
              onChange(entry.style ?? value);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
