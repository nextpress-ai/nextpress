import React from "react";
import type { BlockConfig, BlockContent, TokenEntry } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { DimensionPresetField } from "../../dimension-preset-field";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Layout, Palette, Ruler } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { cn } from "@/lib/utils";
import ColorField, { type ColorTarget } from "../../ColorField";
import {
  type ContainerContent,
  DEFAULT_CONTENT,
  MAX_WIDTH_PRESETS,
  WIDTH_PRESETS,
  MIN_HEIGHT_PRESETS,
} from "./container-model";
import { BORDER_RADIUS_PRESETS, SPACING_PRESETS } from "@shared/dimension-presets";

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

export function ContainerSettings({ block, onUpdate }: ContainerSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  const content = accessor
    ? (accessor.getContent() as ContainerContent)
    : ((block.content as ContainerContent) || DEFAULT_CONTENT);
  const styles = accessor ? accessor.getStyles() : block.styles;

  const updateContent = (updates: Partial<ContainerContent>) => {
    if (accessor) {
      const current = accessor.getContent() as ContainerContent;
      accessor.setContent({ ...current, ...updates });
      rerender();
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
      rerender();
    } else if (onUpdate) {
      onUpdate({
        styles: { ...block.styles, ...styleUpdates },
      });
    }
  };

  /** A token beats the plain style of the same name, so drop the style when a token is set. */
  const clearColorStyleWhileToken = (key: "backgroundColor" | "color") => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      if (key in current) {
        const { [key]: _removed, ...rest } = current;
        accessor.setStyles(rest);
        rerender();
      }
    } else if (onUpdate && block.styles?.[key] != null) {
      const { [key]: _removed, ...rest } = block.styles;
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

  /** Hands the colour back to the page's theme: drop the token and any plain style of the same name. */
  const followTheme = (target: ColorTarget) => {
    const key = target.property === "color" ? "color" : "backgroundColor";
    clearColorStyleWhileToken(key);
    const currentOther = block.other || {};
    onUpdate?.({
      other: {
        ...currentOther,
        tokenMap: { ...(currentOther.tokenMap || {}), [key]: null } as Record<string, TokenEntry>,
      },
    });
  };

  const handleColorTokenChange = (entry: TokenEntry) => {
    clearColorStyleWhileToken(entry.property === "color" ? "color" : "backgroundColor");
    mergeTokenEntry(entry);
  };

  const tagOptions = [
    { value: "div", label: "div" },
    { value: "section", label: "section" },
    { value: "article", label: "article" },
    { value: "aside", label: "aside" },
  ];

  const currentTag = content?.tagName || "div";

  const maxW = (styles?.maxWidth as string) || "";

  const widthRaw = (styles?.width as string) || "";

  const minH = (styles?.minHeight as string) || "";

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Structure" icon={Layout} defaultOpen>
        <div className="space-y-3">
          <Label className="npb-settings-label text-sm font-medium">HTML tag</Label>
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
          <DimensionPresetField
            label="Max width"
            presets={MAX_WIDTH_PRESETS}
            value={maxW || undefined}
            onChange={(next) => updateStyles({ maxWidth: next })}
            customPlaceholder="e.g. 72"
          />
          <DimensionPresetField
            label="Width"
            presets={WIDTH_PRESETS}
            value={widthRaw || undefined}
            onChange={(next) => updateStyles({ width: next })}
          />
          <DimensionPresetField
            label="Min height"
            presets={MIN_HEIGHT_PRESETS}
            value={minH || undefined}
            onChange={(next) => updateStyles({ minHeight: next })}
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Style" icon={Palette} defaultOpen={false}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="npb-settings-label text-sm font-medium">Colors</Label>
            <ColorField
              ariaLabel="Container color"
              defaultProperty="backgroundColor"
              targets={[
                {
                  property: "backgroundColor",
                  label: "Background",
                  entry: block.other?.tokenMap?.backgroundColor,
                  styleValue: styles?.backgroundColor as string | undefined,
                },
                {
                  property: "color",
                  label: "Text",
                  entry: block.other?.tokenMap?.color,
                  styleValue: styles?.color as string | undefined,
                },
              ]}
              onChange={handleColorTokenChange}
              onTheme={followTheme}
            />
          </div>
          <DimensionPresetField
            label="Padding"
            presets={SPACING_PRESETS}
            value={(styles?.padding as string) || undefined}
            onChange={(next) => updateStyles({ padding: next })}
            customPlaceholder="e.g. 24"
          />
          <DimensionPresetField
            label="Border radius"
            presets={BORDER_RADIUS_PRESETS}
            value={(styles?.borderRadius as string) || undefined}
            onChange={(next) => updateStyles({ borderRadius: next })}
            customPlaceholder="e.g. 8"
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}
