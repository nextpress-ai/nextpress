import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Smile, Link as LinkIcon, Type, ExternalLink, Palette } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { IconRenderer } from "../shared/IconRenderer";
import { IconPickerButton } from "../../IconPicker/IconPickerButton";
import {
  type IconReference,
  formatIconReferenceLabel,
} from "@/lib/icon-indexes";
import {
  NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  truncateWithEllipsis,
} from "@/lib/truncate-with-ellipsis";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import TokenColorPicker from "../../TokenColorPicker";
import {
  NumericWithUnitField,
  composeCssLength,
  parseCssLengthToNumericWithUnit,
  type NumericWithUnitValue,
} from "../../numeric-with-unit-field";
import type { NpbNumericLengthUnit } from "@/lib/icon-indexes";
import {
  type IconContent,
  parseIconContent,
  serializeIconContent,
  DEFAULT_ICON_CONTENT,
} from "./icon-block-model";

function settingsChipClass(selected: boolean): string {
  return cn(
    "npb-settings-chip flex min-h-10 w-full min-w-0 items-center justify-center px-2 text-xs font-medium focus:outline-none",
    selected && "npb-settings-chip--active",
  );
}

function iconSizeToField(icon: IconReference): NumericWithUnitValue {
  const unit: NpbNumericLengthUnit = icon.sizeUnit ?? "px";
  const n = icon.size ?? 24;
  return { magnitude: String(n), unit };
}

function iconStrokeToField(icon: IconReference): NumericWithUnitValue {
  const unit: NpbNumericLengthUnit = icon.strokeWidthUnit ?? "px";
  const n = icon.strokeWidth ?? 2;
  return { magnitude: String(n), unit };
}

function paddingStyleToField(padding: unknown): {
  field: NumericWithUnitValue;
  asymmetric: boolean;
} {
  const raw = String(padding ?? "").trim();
  if (!raw) {
    return { field: { magnitude: "", unit: "px" }, asymmetric: false };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { field: { magnitude: "", unit: "px" }, asymmetric: false };
  }
  const first = parts[0]!;
  const asymmetric = parts.some((p) => p !== first);
  const parsed = parseCssLengthToNumericWithUnit(first);
  return {
    field: parsed ?? { magnitude: "", unit: "px" },
    asymmetric,
  };
}

export type IconBlockSettingsProps = {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
};

/**
 * Sidebar controls for the Icon block: icon pick, dimensions, token colors, link.
 * WHY: Isolated from the canvas component to keep each file under the LOC budget
 * while sharing the same `npb-settings-*` chrome as container / global block settings.
 */
export function IconBlockSettings({ block, onUpdate }: IconBlockSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });
  const [iconSizeDraft, setIconSizeDraft] = React.useState<NumericWithUnitValue | null>(
    null,
  );
  const [iconStrokeDraft, setIconStrokeDraft] = React.useState<NumericWithUnitValue | null>(
    null,
  );
  const [paddingDraft, setPaddingDraft] = React.useState<NumericWithUnitValue | null>(null);

  const content = accessor
    ? (accessor.getContent() as unknown as IconContent)
    : parseIconContent(block.content);

  const styles = accessor ? accessor.getStyles() : block.styles;

  const currentIcon: IconReference = content?.icon ?? DEFAULT_ICON_CONTENT.icon;
  const iconRefFullLabel = formatIconReferenceLabel(currentIcon);
  const iconRefDisplayLabel = truncateWithEllipsis({
    text: iconRefFullLabel,
    maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  });

  const updateContent = (updates: Partial<IconContent>) => {
    if (accessor) {
      const current = accessor.getContent() as unknown as IconContent;
      accessor.setContent({ ...current, ...updates });
      rerender();
    } else if (onUpdate) {
      onUpdate({
        content: serializeIconContent({
          ...parseIconContent(block.content),
          ...updates,
        }),
      });
    }
  };

  const updateStyles = (styleUpdates: React.CSSProperties) => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      accessor.setStyles({ ...current, ...styleUpdates });
      rerender();
    } else if (onUpdate) {
      onUpdate({
        styles: { ...block.styles, ...styleUpdates },
      });
    }
  };

  /** WHY: Shallow merge cannot drop keys; omitting padding clears uniform inner padding in saved styles. */
  const removeUniformPadding = (): void => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      if (!("padding" in current)) return;
      const { padding: _removed, ...rest } = current;
      accessor.setStyles(rest);
      rerender();
    } else if (onUpdate) {
      const prev = block.styles || {};
      if (!("padding" in prev)) return;
      const { padding: _removed, ...rest } = prev;
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
    rerender();
  };

  const clearStyleWhileToken = (key: "backgroundColor" | "color") => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      if (key in current) {
        const next = { ...current };
        delete next[key];
        accessor.setStyles(next);
        rerender();
      }
    } else if (onUpdate && block.styles && key in block.styles) {
      const next = { ...block.styles };
      delete next[key];
      onUpdate({ styles: next });
    }
  };

  const handleBackgroundTokenChange = (entry: TokenEntry) => {
    clearStyleWhileToken("backgroundColor");
    mergeTokenEntry(entry);
  };

  const handleColorTokenChange = (entry: TokenEntry) => {
    clearStyleWhileToken("color");
    mergeTokenEntry(entry);
  };

  const getTokenEntry = (property: string): TokenEntry | undefined =>
    block.other?.tokenMap?.[property];

  const handleIconSelect = (icon: IconReference) => {
    updateContent({ icon });
  };

  React.useEffect(() => {
    setIconSizeDraft(null);
  }, [currentIcon.size]);

  React.useEffect(() => {
    setIconStrokeDraft(null);
  }, [currentIcon.strokeWidth]);

  const sizeField = iconSizeDraft ?? iconSizeToField(currentIcon);
  const strokeField = iconStrokeDraft ?? iconStrokeToField(currentIcon);
  const padState = paddingStyleToField(styles?.padding);
  const paddingField = paddingDraft ?? padState.field;

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Icon" icon={Smile} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label className="npb-settings-label text-sm font-semibold">
              Selected Icon
            </Label>
            <div className="mt-2 flex min-w-0 items-center gap-3">
              <div className="npb-settings-panel flex h-10 w-10 shrink-0 items-center justify-center rounded-none border p-0">
                <IconRenderer icon={currentIcon} size={20} />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    className="npb-settings-hint-muted min-w-0 flex-1 cursor-default text-xs"
                    title={iconRefFullLabel}>
                    {iconRefDisplayLabel}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs break-all">
                  {iconRefFullLabel}
                </TooltipContent>
              </Tooltip>
              <IconPickerButton
                className="shrink-0"
                currentIcon={currentIcon}
                onSelect={handleIconSelect}
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Appearance" icon={Type} defaultOpen={true}>
        <div className="space-y-4">
          <NumericWithUnitField
            id="icon-size"
            label="Icon size"
            value={sizeField}
            magnitudeInputProps={{
              onBlur: () => setIconSizeDraft(null),
            }}
            onChange={(next) => {
              const raw = next.magnitude.trim();
              if (raw === "") {
                setIconSizeDraft({ magnitude: next.magnitude, unit: next.unit });
                updateContent({
                  icon: { ...currentIcon, sizeUnit: next.unit },
                });
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) {
                setIconSizeDraft({ magnitude: next.magnitude, unit: next.unit });
                return;
              }
              setIconSizeDraft(null);
              const safe = Math.min(200, Math.max(0.25, n));
              updateContent({
                icon: {
                  ...currentIcon,
                  size: safe,
                  sizeUnit: next.unit,
                },
              });
            }}
          />

          <div>
            <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-3 w-3" />
              Icon color
            </Label>
            <p className="npb-settings-hint-muted mt-1 text-xs">
              Token map + resolver (same pattern as Style → Colors). Overrides the
              legacy content color when a token or custom entry resolves.
            </p>
            <div className="npb-settings-panel mt-2 rounded-none border p-3">
              <TokenColorPicker
                property="color"
                currentEntry={getTokenEntry("color")}
                currentStyleValue={
                  (typeof styles?.color === "string" && styles.color) ||
                  currentIcon.color ||
                  undefined
                }
                onChange={handleColorTokenChange}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="icon-bg-token"
              className="npb-settings-label text-sm font-semibold">
              Background color
            </Label>
            <p className="npb-settings-hint-muted mt-1 text-xs">
              Uses TokenColorPicker + <span className="font-mono">tokenMap</span> like
              container / paragraph blocks.
            </p>
            <div id="icon-bg-token" className="npb-settings-panel mt-2 rounded-none border p-3">
              <TokenColorPicker
                property="backgroundColor"
                currentEntry={getTokenEntry("backgroundColor")}
                currentStyleValue={styles?.backgroundColor as string | undefined}
                onChange={handleBackgroundTokenChange}
              />
            </div>
          </div>

          {currentIcon.iconSet === "lucide" && (
            <NumericWithUnitField
              id="icon-stroke"
              label="Stroke width"
              value={strokeField}
              magnitudeInputProps={{
                onBlur: () => setIconStrokeDraft(null),
              }}
              onChange={(next) => {
                const raw = next.magnitude.trim();
                if (raw === "") {
                  setIconStrokeDraft({ magnitude: next.magnitude, unit: next.unit });
                  updateContent({
                    icon: { ...currentIcon, strokeWidthUnit: next.unit },
                  });
                  return;
                }
                const n = Number(raw);
                if (!Number.isFinite(n)) {
                  setIconStrokeDraft({ magnitude: next.magnitude, unit: next.unit });
                  return;
                }
                setIconStrokeDraft(null);
                const safe = Math.min(8, Math.max(0.25, n));
                updateContent({
                  icon: {
                    ...currentIcon,
                    strokeWidth: safe,
                    strokeWidthUnit: next.unit,
                  },
                });
              }}
            />
          )}

          <div>
            <NumericWithUnitField
              id="icon-padding-uniform"
              label="Inner padding (uniform)"
              value={paddingField}
              magnitudeInputProps={{
                onBlur: () => setPaddingDraft(null),
              }}
              onChange={(next) => {
                const raw = next.magnitude.trim();
                if (raw === "") {
                  setPaddingDraft(null);
                  removeUniformPadding();
                  return;
                }
                const n = Number(raw);
                if (!Number.isFinite(n)) {
                  setPaddingDraft(next);
                  return;
                }
                setPaddingDraft(null);
                updateStyles({ padding: composeCssLength(next) });
              }}
            />
            {padState.asymmetric ? (
              <p className="npb-settings-hint-muted mt-1 text-xs">
                Shorthand uses different sides; first side value is shown. Saving
                overwrites with uniform padding.
              </p>
            ) : null}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Link" icon={LinkIcon} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="icon-link"
              className="npb-settings-label text-sm font-semibold">
              Link URL
            </Label>
            <Input
              id="icon-link"
              className="mt-2 text-sm"
              value={content?.link || ""}
              onChange={(e) => updateContent({ link: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label className="npb-settings-label text-sm font-semibold">Link target</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateContent({ linkTarget: "_self" })}
                className={settingsChipClass((content?.linkTarget || "_self") === "_self")}>
                Same window
              </button>
              <button
                type="button"
                onClick={() => updateContent({ linkTarget: "_blank" })}
                className={settingsChipClass((content?.linkTarget || "_self") === "_blank")}>
                <ExternalLink className="mr-1 inline h-3 w-3 shrink-0 align-middle" />
                New window
              </button>
            </div>
          </div>

          <div>
            <Label
              htmlFor="icon-label"
              className="npb-settings-label text-sm font-semibold">
              Accessible label
            </Label>
            <Input
              id="icon-label"
              className="mt-2 text-sm"
              value={content?.label || ""}
              onChange={(e) => updateContent({ label: e.target.value })}
              placeholder="Describe this icon for screen readers"
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
