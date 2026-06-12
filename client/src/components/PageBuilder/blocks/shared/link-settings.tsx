import React from "react";
import type { JSX } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsLabel } from "../../shared";

export type LinkTargetValue = "_self" | "_blank";

/** Chip button class for link-target toggles (matches icon/container settings). */
export function linkTargetChipClass(selected: boolean): string {
  return selected
    ? "bg-npb-interactive-bg-active text-npb-interactive-text-active hover:bg-npb-interactive-bg-active"
    : "bg-npb-surface-base text-npb-text-secondary border border-npb-border-default hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong";
}

type LinkUrlFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: ({ url }: { url: string }) => void;
  placeholder?: string;
};

/** URL text input used across button, icon, image, and media blocks. */
export function LinkUrlField({
  id,
  label = "Link URL",
  value,
  onChange,
  placeholder = "https://example.com",
}: LinkUrlFieldProps): JSX.Element {
  return (
    <div>
      <SettingsLabel htmlFor={id}>{label}</SettingsLabel>
      <Input
        id={id}
        className="mt-1 h-9 text-sm"
        value={value}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );
};

type LinkTargetChipsProps = {
  value: LinkTargetValue | string | undefined;
  legacyTarget?: string | undefined;
  onChange: ({ target }: { target: LinkTargetValue }) => void;
};

/** Same-window / new-window chip pair (icon, button link sections). */
export function LinkTargetChips({
  value,
  legacyTarget,
  onChange,
}: LinkTargetChipsProps): JSX.Element {
  const current = (value || legacyTarget || "_self") as LinkTargetValue;

  return (
    <div>
      <SettingsLabel>Link target</SettingsLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ target: "_self" })}
          className={`h-8 rounded-md px-3 text-xs font-medium transition-all ${linkTargetChipClass(current === "_self")}`}
        >
          Same window
        </button>
        <button
          type="button"
          onClick={() => onChange({ target: "_blank" })}
          className={`flex h-8 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium transition-all ${linkTargetChipClass(current === "_blank")}`}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          New window
        </button>
      </div>
    </div>
  );
}

type LinkTargetSelectProps = {
  id: string;
  label?: string;
  value: LinkTargetValue | string | undefined;
  legacyTarget?: string | undefined;
  onChange: ({ target }: { target: LinkTargetValue }) => void;
};

/** Select-based link target (image, media-text). */
export function LinkTargetSelect({
  id,
  label = "Link Target",
  value,
  legacyTarget,
  onChange,
}: LinkTargetSelectProps): JSX.Element {
  const current = (value || legacyTarget || "_self") as LinkTargetValue;

  return (
    <div>
      <SettingsLabel htmlFor={id}>{label}</SettingsLabel>
      <Select
        value={current}
        onValueChange={(next) => onChange({ target: next as LinkTargetValue })}
      >
        <SelectTrigger id={id} aria-label={label} className="mt-1 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_self">Same Window</SelectItem>
          <SelectItem value="_blank">New Window</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
