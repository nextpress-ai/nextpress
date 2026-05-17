import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { NpbNumericLengthUnit } from "@/lib/icon-indexes";

/** Editor-side value for a single CSS length built from magnitude + unit. */
export type NumericWithUnitValue = {
  /** Numeric portion only (may include `-` for future use; typically non-negative). */
  magnitude: string;
  unit: NpbNumericLengthUnit;
};

const LENGTH_RE = /^(-?\d*\.?\d+)\s*(px|rem|em|%|vh|vw|dvh|ch)$/i;

/**
 * Composes a valid CSS length from the magnitude string and unit dropdown.
 * WHY: Keeping magnitude and unit separate avoids ambiguous parses (`1` + `em` vs `1em`),
 * validates the suffix set in one place, and matches how designers reason about scale.
 */
export function composeCssLength(value: NumericWithUnitValue): string {
  const raw = value.magnitude.trim();
  const n = raw === "" || raw === "-" || raw === "." ? 0 : Number(raw);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe}${value.unit}`;
}

/**
 * Parses a CSS length into magnitude + known layout unit, or null if unrecognized.
 * WHY: Hydrates from legacy/saved CSS; regex still tolerates an optional space before the unit,
 * but NextPress expects adjacent tokens (`120px`, `20rem`) when authoring new values.
 */
export function parseCssLengthToNumericWithUnit(
  input: string | undefined,
): NumericWithUnitValue | null {
  if (input == null) return null;
  const m = String(input).trim().match(LENGTH_RE);
  if (!m) return null;
  const unit = m[2].toLowerCase() as NpbNumericLengthUnit;
  return { magnitude: m[1], unit };
}

export type NumericWithUnitFieldProps = {
  id?: string;
  label: string;
  value: NumericWithUnitValue;
  onChange: (next: NumericWithUnitValue) => void;
  disabled?: boolean;
  className?: string;
  /** Passed to the magnitude `<Input>` (e.g. min/max for numeric UX). */
  magnitudeInputProps?: Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "disabled"
  >;
};

const UNITS: readonly NpbNumericLengthUnit[] = [
  "px",
  "rem",
  "em",
  "%",
  "vh",
  "vw",
  "dvh",
  "ch",
];

/**
 * Text magnitude + shadcn `Select` unit chooser for one CSS length.
 * WHY: Radix Select matches sidebar theming (`npb-settings-select-trigger`) and avoids
 * native `<select>` contrast issues inside the dark builder chrome.
 */
export function NumericWithUnitField({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  magnitudeInputProps,
}: NumericWithUnitFieldProps) {
  const handleMagnitudeChange = (raw: string) => {
    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
      onChange({ magnitude: raw, unit: value.unit });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="npb-settings-label text-sm font-semibold">
        {label}
      </Label>
      <div className="flex min-w-0 items-stretch gap-2">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={value.magnitude}
          onChange={(e) => handleMagnitudeChange(e.target.value)}
          className={cn("min-w-0 flex-1 text-sm")}
          {...magnitudeInputProps}
        />
        <Select
          value={value.unit}
          disabled={disabled}
          onValueChange={(u) =>
            onChange({ magnitude: value.magnitude, unit: u as NpbNumericLengthUnit })
          }
        >
          <SelectTrigger
            aria-label={`${label} unit`}
            className={cn("h-9 w-[4.75rem] shrink-0", "npb-settings-select-trigger")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
