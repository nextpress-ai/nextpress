import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  NPB_SETTINGS_CHIP_LABEL_MAX_CHARS,
  truncateWithEllipsis,
} from "@/lib/truncate-with-ellipsis";
import { cn } from "@/lib/utils";

export type SettingsChipOption = {
  value: string;
  label: string;
  /** Accessible name when the visible label is shortened. */
  accessibleName?: string;
  icon?: LucideIcon;
};

type SettingsChipGroupProps = {
  /** Section heading; omit or pass empty to hide (e.g. when a parent already titles the group). */
  label: string;
  options: SettingsChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** Optional leading icon for the label row — matches typography / layout chips in BlockSettings. */
  icon?: LucideIcon;
  className?: string;
  /** Accessible name when `label` is visually hidden. */
  ariaLabel?: string;
  /** Override default chip label truncation (layout controls use short labels). */
  labelMaxChars?: number;
  /** Grid (default) or horizontal scroll for long preset rows (e.g. gap). */
  layout?: "grid" | "scroll";
};

/**
 * Dense chip grid for block sidebar settings so alignment, weight, and layout enums stay visually
 * consistent with the rest of the builder (shared chrome vs ad-hoc native controls).
 */
export function SettingsChipGroup({
  label,
  options,
  value,
  onChange,
  icon: Icon,
  className = "",
  ariaLabel,
  labelMaxChars = NPB_SETTINGS_CHIP_LABEL_MAX_CHARS,
  layout = "grid",
}: SettingsChipGroupProps) {
  const gridCols =
    options.length === 1 ? "grid-cols-1" : options.length === 2 ? "grid-cols-2" : "grid-cols-2";
  const groupLabel = label || ariaLabel || "Options";
  const isScroll = layout === "scroll";

  const activateAt = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
  };

  const onGroupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      activateAt((currentIndex + 1) % options.length);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      activateAt((currentIndex - 1 + options.length) % options.length);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label ? (
        <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </Label>
      ) : null}
      <div
        className={cn(
          isScroll ? "npb-settings-chip-scroll flex gap-2 overflow-x-auto pb-0.5" : cn("grid gap-2", gridCols),
        )}
        role="radiogroup"
        aria-label={groupLabel}
        onKeyDown={onGroupKeyDown}
      >
        {options.map((option) => {
          const OptionIcon = option.icon;
          const selected = value === option.value;
          return (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={selected}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "npb-settings-chip flex min-w-0 items-center justify-center focus:outline-none",
                isScroll ? "npb-settings-chip--scroll shrink-0" : "w-full",
                selected ? "npb-settings-chip--active" : "",
              )}
              title={option.accessibleName ?? option.label}
              aria-label={option.accessibleName ?? option.label}
            >
              <div className="flex min-w-0 items-center justify-center gap-1">
                {OptionIcon ? <OptionIcon className="h-3 w-3 shrink-0" aria-hidden /> : null}
                <span className="min-w-0">
                  {truncateWithEllipsis({
                    text: option.label,
                    maxChars: labelMaxChars,
                  })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
