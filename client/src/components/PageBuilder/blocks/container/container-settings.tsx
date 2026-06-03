import React from "react";
import type { BlockConfig, BlockContent, TokenEntry } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Layout, Palette, Ruler } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { cn } from "@/lib/utils";
import TokenColorPicker from "../../TokenColorPicker";
import {
  type ContainerContent,
  DEFAULT_CONTENT,
  MAX_WIDTH_PRESETS,
  WIDTH_PRESETS,
  MIN_HEIGHT_PRESETS,
  MAX_WIDTH_VALUES,
  parseNumericLength,
  swapLengthUnit,
} from "./container-model";

export interface ContainerSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function settingsChipClass(selected: boolean): string {
  return cn(
    "npb-settings-chip flex min-h-10 w-full min-w-0 items-center justify-center px-2 text-xs font-medium focus:outline-none",
    !selected && "border-[color:var(--npb-coll-header-divider)]",
    selected && "npb-settings-chip--active",
  );
}

function UnitToggle({
  unit,
  onUnitChange,
  disabled,
}: {
  unit: "px" | "rem";
  onUnitChange: (u: "px" | "rem") => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 rounded-none border border-solid p-0.5",
        "border-[color:var(--npb-coll-header-divider)] bg-transparent",
      )}
      role="group"
      aria-label="Length unit"
    >
      {(["px", "rem"] as const).map((u) => (
        <button
          key={u}
          type="button"
          disabled={disabled}
          onClick={() => onUnitChange(u)}
          className={cn(
            "min-w-[2.25rem] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
            unit === u
              ? "bg-zinc-600 text-white dark:bg-zinc-200 dark:text-zinc-900"
              : "text-muted-foreground hover:bg-muted/60",
            disabled && "pointer-events-none opacity-40",
          )}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

export function ContainerSettings({ block, onUpdate }: ContainerSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  const content = accessor
    ? (accessor.getContent() as ContainerContent)
    : ((block.content as ContainerContent) || DEFAULT_CONTENT);
  const styles = accessor ? accessor.getStyles() : block.styles;

  const updateContent = (updates: Partial<ContainerContent>) => {
    if (accessor) {
      const current = accessor.getContent() as ContainerContent;
      accessor.setContent({ ...current, ...updates });
      setUpdateTrigger((n) => n + 1);
    } else if (onUpdate) {
      onUpdate({
        content: { ...DEFAULT_CONTENT, ...block.content, ...updates } as BlockContent,
      });
    }
  };

  const updateStyles = (styleUpdates: Partial<React.CSSProperties>) => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      accessor.setStyles({ ...current, ...styleUpdates });
      setUpdateTrigger((n) => n + 1);
    } else if (onUpdate) {
      onUpdate({
        styles: { ...block.styles, ...styleUpdates },
      });
    }
  };

  const clearBackgroundStyleWhileToken = () => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      const { backgroundColor: _b, ...rest } = current;
      accessor.setStyles(rest);
      setUpdateTrigger((n) => n + 1);
    } else if (onUpdate && block.styles?.backgroundColor != null) {
      const { backgroundColor: _b, ...rest } = block.styles;
      onUpdate({ styles: rest });
    }
  };

  const mergeTokenEntry = (entry: TokenEntry) => {
    const currentOther = block.other || {};
    onUpdate?.({
      other: {
        ...currentOther,
        tokenMap: {
          ...(currentOther.tokenMap || {}),
          [entry.property]: entry,
        },
      },
    });
  };

  const handleBackgroundTokenChange = (entry: TokenEntry) => {
    clearBackgroundStyleWhileToken();
    mergeTokenEntry(entry);
  };

  const getBgTokenEntry = (): TokenEntry | undefined =>
    block.other?.tokenMap?.backgroundColor;

  const tagOptions = [
    { value: "div", label: "div" },
    { value: "section", label: "section" },
    { value: "article", label: "article" },
    { value: "aside", label: "aside" },
  ];

  const currentTag = content?.tagName || "div";

  const maxW = (styles?.maxWidth as string) || "";
  const maxWIsPreset = maxW !== "" && MAX_WIDTH_VALUES.has(maxW);

  const widthRaw = (styles?.width as string) || "";
  const widthMatchesPreset =
    widthRaw === "" ||
    widthRaw === "auto" ||
    WIDTH_PRESETS.some((p) => p.value !== "__auto__" && p.value === widthRaw);

  const minH = (styles?.minHeight as string) || "";
  const minHPreset = MIN_HEIGHT_PRESETS.find((p) => p.value !== "__auto__" && p.value === minH);
  const minHAuto = minH === "";
  const minHPresetKey = minHAuto ? "__auto__" : minHPreset ? minH : "__custom_minh__";

  const maxWUnitFromValue = (): "px" | "rem" => {
    const p = parseNumericLength(maxW);
    return p?.unit ?? "px";
  };

  const minHUnitFromValue = (): "px" | "rem" => {
    const p = parseNumericLength(minH);
    return p?.unit ?? "px";
  };

  const paddingTrim = String(styles?.padding ?? "").trim();
  const paddingParts = paddingTrim.split(/\s+/).filter(Boolean);
  const paddingSingleNumeric =
    paddingParts.length === 1 && parseNumericLength(paddingParts[0] ?? "") != null;

  const radiusTrim = String(styles?.borderRadius ?? "").trim();
  const radiusParts = radiusTrim.split(/\s+/).filter(Boolean);
  const radiusSingleNumeric =
    radiusParts.length === 1 && parseNumericLength(radiusParts[0] ?? "") != null;

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Structure" icon={Layout} defaultOpen>
        <div className="space-y-3">
          <Label className="npb-settings-label text-sm font-semibold">HTML tag</Label>
          <div className="grid grid-cols-2 gap-2">
            {tagOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateContent({ tagName: opt.value })}
                className={settingsChipClass(currentTag === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="npb-settings-hint-muted text-xs">
            Wrapper classes: use the sidebar <span className="font-semibold">Advanced</span> tab → CSS Classes (same
            field as other blocks).
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Sizing" icon={Ruler} defaultOpen={false}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="npb-settings-label text-sm font-semibold">Max width</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MAX_WIDTH_PRESETS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyles({ maxWidth: opt.value })}
                  className={settingsChipClass(maxW === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (maxWIsPreset) {
                    updateStyles({ maxWidth: undefined });
                  }
                }}
                className={settingsChipClass(!maxWIsPreset)}
              >
                Custom
              </button>
            </div>
            {!maxWIsPreset && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="container-max-w-custom"
                  className="text-sm sm:flex-1"
                  value={maxW}
                  onChange={(e) => updateStyles({ maxWidth: e.target.value || undefined })}
                  placeholder="e.g. 72rem, min(100%, 40rem)"
                  aria-label="Custom max width"
                />
                <UnitToggle
                  unit={maxWUnitFromValue()}
                  disabled={!parseNumericLength(maxW)}
                  onUnitChange={(next) => {
                    const nextStr = swapLengthUnit(maxW, next);
                    if (nextStr) updateStyles({ maxWidth: nextStr });
                  }}
                />
              </div>
            )}
            {maxWIsPreset && (
              <p className="npb-settings-hint-muted text-xs">Preset applied. Choose Custom for arbitrary CSS.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="npb-settings-label text-sm font-semibold">Width</Label>
            <div className="grid grid-cols-2 gap-2">
              {WIDTH_PRESETS.map((opt) => {
                const selected =
                  opt.value === "__auto__"
                    ? widthRaw === "" || widthRaw === "auto"
                    : widthRaw === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateStyles({
                        width: opt.value === "__auto__" ? undefined : opt.value,
                      })
                    }
                    className={settingsChipClass(selected)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {!widthMatchesPreset && widthRaw !== "" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="container-width-custom"
                  className="text-sm sm:flex-1"
                  value={widthRaw}
                  onChange={(e) => updateStyles({ width: e.target.value || undefined })}
                  placeholder="Custom width CSS"
                />
                <UnitToggle
                  unit={parseNumericLength(widthRaw)?.unit ?? "px"}
                  disabled={!parseNumericLength(widthRaw)}
                  onUnitChange={(next) => {
                    const nextStr = swapLengthUnit(widthRaw, next);
                    if (nextStr) updateStyles({ width: nextStr });
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="npb-settings-label text-sm font-semibold">Min height</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MIN_HEIGHT_PRESETS.map((opt) => {
                const selected =
                  opt.value === "__auto__"
                    ? minHAuto
                    : minH === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateStyles({
                        minHeight: opt.value === "__auto__" ? undefined : opt.value,
                      })
                    }
                    className={settingsChipClass(selected)}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (minHPresetKey !== "__custom_minh__") {
                    updateStyles({ minHeight: "200px" });
                  }
                }}
                className={settingsChipClass(minHPresetKey === "__custom_minh__")}
              >
                Custom
              </button>
            </div>
            {minHPresetKey === "__custom_minh__" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="container-min-h-custom"
                  className="text-sm sm:flex-1"
                  value={minH}
                  onChange={(e) => updateStyles({ minHeight: e.target.value || undefined })}
                  placeholder="e.g. 50vh, 12rem"
                />
                <UnitToggle
                  unit={minHUnitFromValue()}
                  disabled={!parseNumericLength(minH)}
                  onUnitChange={(next) => {
                    const nextStr = swapLengthUnit(minH, next);
                    if (nextStr) updateStyles({ minHeight: nextStr });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Style" icon={Palette} defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="container-bg-token" className="npb-settings-label text-sm font-semibold">
              Background
            </Label>
            <p className="npb-settings-hint-muted text-xs">
              Uses the same TokenColorPicker pattern as the Style → Colors section for paragraph blocks.
            </p>
            <div id="container-bg-token" className="mt-2">
              <TokenColorPicker
                property="backgroundColor"
                currentEntry={getBgTokenEntry()}
                currentStyleValue={styles?.backgroundColor as string | undefined}
                onChange={handleBackgroundTokenChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="container-pad" className="npb-settings-label text-sm font-semibold">
              Padding
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="container-pad"
                className="text-sm sm:flex-1"
                value={(styles?.padding as string) || ""}
                onChange={(e) => updateStyles({ padding: e.target.value })}
                placeholder="e.g. 24px or 1rem 2rem"
              />
              <UnitToggle
                unit={parseNumericLength(paddingParts[0] ?? "")?.unit ?? "px"}
                disabled={!paddingSingleNumeric}
                onUnitChange={(next) => {
                  const first = paddingParts[0] ?? "";
                  const swapped = swapLengthUnit(first, next);
                  if (swapped) updateStyles({ padding: swapped });
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="container-radius" className="npb-settings-label text-sm font-semibold">
              Border radius
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="container-radius"
                className="text-sm sm:flex-1"
                value={(styles?.borderRadius as string) || ""}
                onChange={(e) => updateStyles({ borderRadius: e.target.value || undefined })}
                placeholder="e.g. 8px or 0.5rem"
              />
              <UnitToggle
                unit={parseNumericLength(radiusParts[0] ?? "")?.unit ?? "px"}
                disabled={!radiusSingleNumeric}
                onUnitChange={(next) => {
                  const raw = radiusParts[0] ?? "";
                  const swapped = swapLengthUnit(raw, next);
                  if (swapped) updateStyles({ borderRadius: swapped });
                }}
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
