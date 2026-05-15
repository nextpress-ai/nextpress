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
}: SettingsChipGroupProps) {
  const gridCols =
    options.length === 1 ? "grid-cols-1" : options.length === 2 ? "grid-cols-2" : "grid-cols-2";

  return (
    <div className={cn("space-y-3", className)}>
      {label ? (
        <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </Label>
      ) : null}
      <div className={cn("grid gap-2", gridCols)}>
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "npb-settings-chip flex w-full min-w-0 items-center justify-center focus:outline-none",
                value === option.value ? "npb-settings-chip--active" : "",
              )}
              title={option.label}
            >
              <div className="flex min-w-0 items-center justify-center gap-1">
                {OptionIcon ? <OptionIcon className="h-3 w-3 shrink-0" /> : null}
                <span className="min-w-0">
                  {truncateWithEllipsis({
                    text: option.label,
                    maxChars: NPB_SETTINGS_CHIP_LABEL_MAX_CHARS,
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
