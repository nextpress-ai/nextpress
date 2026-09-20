import React from "react";
import type { BlockConfig, BlockContent, TokenEntry } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { DimensionPresetField } from "../../dimension-preset-field";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Layout, Palette, Ruler } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { cn } from "@/lib/utils";
import TokenColorPicker from "../../TokenColorPicker";
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

  const clearBackgroundStyleWhileToken = () => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      const { backgroundColor: _b, ...rest } = current;
      accessor.setStyles(rest);
      rerender();
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
            <Label htmlFor="container-bg-token" className="npb-settings-label text-sm font-medium">
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
