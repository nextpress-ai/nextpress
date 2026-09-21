import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Link as LinkIcon, Smile, Type } from "lucide-react";
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
import ColorField, { type ColorTarget } from "../../ColorField";
import { UnitValueField } from "../../unit-value-field";
import { SIZE_UNITS, parseUnitValue } from "@shared/unit-value";
import {
  type IconContent,
  parseIconContent,
  serializeIconContent,
  DEFAULT_ICON_CONTENT,
} from "./icon-block-model";
import { LinkUrlField, LinkTargetChips } from "../shared/link-settings";

function settingsChipClass(selected: boolean): string {
  return cn(
    "npb-settings-chip flex min-h-10 w-full min-w-0 items-center justify-center px-2 text-xs font-medium focus:outline-none",
    selected && "npb-settings-chip--active",
  );
}

function paddingStyleToField(padding: unknown): {
  value: string | undefined;
  asymmetric: boolean;
} {
  const raw = String(padding ?? "").trim();
  if (!raw) {
    return { value: undefined, asymmetric: false };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { value: undefined, asymmetric: false };
  }
  const first = parts[0]!;
  const asymmetric = parts.some((p) => p !== first);
  return {
    value: first,
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

  /** Hands the colour back to the page's theme: drop the token, the plain style, and the old saved colour. */
  const followTheme = (target: ColorTarget) => {
    const key = target.property === "backgroundColor" ? "backgroundColor" : "color";
    clearStyleWhileToken(key);
    const currentOther = block.other || {};
    onUpdate?.({
      other: {
        ...currentOther,
        tokenMap: { ...(currentOther.tokenMap || {}), [key]: null } as Record<string, TokenEntry>,
      },
    });
    if (key === "color" && currentIcon.color) updateContent({ icon: { ...currentIcon, color: undefined } });
    rerender();
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

  // Older icons store only a number, so fall back to the same defaults the field always showed.
  const sizeValue = `${currentIcon.size ?? 24}${currentIcon.sizeUnit ?? "px"}`;
  const strokeValue = `${currentIcon.strokeWidth ?? 2}${currentIcon.strokeWidthUnit ?? "px"}`;
  const padState = paddingStyleToField(styles?.padding);
  const paddingValue = padState.value;

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Icon" icon={Smile} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label className="npb-settings-label text-sm font-medium">
              Selected Icon
            </Label>
            <div className="mt-2 flex min-w-0 items-center gap-3">
              <div className="npb-settings-well flex h-10 w-10 shrink-0 items-center justify-center rounded-none border p-0">
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

      <CollapsibleCard title="Appearance" icon={Type} defaultOpen={false}>
        <div className="space-y-4">
          <UnitValueField
            id="icon-size"
            label="Icon size"
            value={sizeValue}
            segmentLabel={null}
            onChange={(next) => {
              const parsed = parseUnitValue({ value: next, units: SIZE_UNITS });
              const n = parsed.kind === "amount" ? Number(parsed.amount) : NaN;
              if (!Number.isFinite(n) || parsed.kind !== "amount") return;
              updateContent({
                icon: {
                  ...currentIcon,
                  size: Math.min(200, Math.max(0.25, n)),
                  sizeUnit: (parsed.unit || currentIcon.sizeUnit || "px") as IconReference["sizeUnit"],
                },
              });
            }}
          />

          <div className="space-y-2">
            <Label className="npb-settings-label text-sm font-medium">Colors</Label>
            <ColorField
              ariaLabel="Icon color"
              defaultProperty="color"
              targets={[
                {
                  property: "color",
                  label: "Icon",
                  entry: getTokenEntry("color"),
                  styleValue:
                    (typeof styles?.color === "string" && styles.color) ||
                    currentIcon.color ||
                    undefined,
                },
                {
                  property: "backgroundColor",
                  label: "Background",
                  entry: getTokenEntry("backgroundColor"),
                  styleValue: styles?.backgroundColor as string | undefined,
                },
              ]}
              onChange={(entry) =>
                entry.property === "backgroundColor"
                  ? handleBackgroundTokenChange(entry)
                  : handleColorTokenChange(entry)
              }
              onTheme={followTheme}
            />
          </div>

          {currentIcon.iconSet === "lucide" && (
            <UnitValueField
              id="icon-stroke"
              label="Stroke width"
              value={strokeValue}
              segmentLabel={null}
              onChange={(next) => {
                const parsed = parseUnitValue({ value: next, units: SIZE_UNITS });
                const n = parsed.kind === "amount" ? Number(parsed.amount) : NaN;
                if (!Number.isFinite(n) || parsed.kind !== "amount") return;
                updateContent({
                  icon: {
                    ...currentIcon,
                    strokeWidth: Math.min(8, Math.max(0.25, n)),
                    strokeWidthUnit: (parsed.unit || currentIcon.strokeWidthUnit || "px") as IconReference["strokeWidthUnit"],
                  },
                });
              }}
            />
          )}

          <div>
            <UnitValueField
              id="icon-padding-uniform"
              label="Inner padding (uniform)"
              value={paddingValue}
              segmentLabel={null}
              onChange={(next) => {
                if (next === undefined) {
                  removeUniformPadding();
                  return;
                }
                const parsed = parseUnitValue({ value: next, units: SIZE_UNITS });
                if (parsed.kind !== "amount") return;
                updateStyles({ padding: `${Number(parsed.amount)}${parsed.unit || "px"}` });
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
          <LinkUrlField
            id="icon-link"
            value={content?.link || ""}
            onChange={({ url }) => updateContent({ link: url })}
          />

          <LinkTargetChips
            value={content?.linkTarget}
            onChange={({ target }) => updateContent({ linkTarget: target })}
          />

          <div>
            <Label
              htmlFor="icon-label"
              className="npb-settings-label text-sm font-medium">
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
