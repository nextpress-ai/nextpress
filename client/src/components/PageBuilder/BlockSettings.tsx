import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SettingsChipGroup } from "./settings-chip-group";

import { 
  Palette, 
  Type, 
  Layout, 
  Code, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Bold,
  Italic,
  ExternalLink,
  Target,
  Ruler,
  Square,
  Circle,
  Hash,
  Move,
  Columns,
  Rows,
  Minus,
  Sparkles,
  Layers,
  MoveHorizontal,
} from "lucide-react";
import type { BlockConfig, DisplayCondition } from "@shared/schema-types";
import { blockRegistry } from "./blocks";
import { ConditionBuilder } from "@/components/Templates/ConditionBuilder";
import { VariablePicker } from "@/components/Templates/VariablePicker";
import { getBlockStateAccessor } from "./blocks/blockStateRegistry";
import type { CSSProperties } from "react";
import TokenColorPicker from "./TokenColorPicker"
import AnimationPicker from "./AnimationPicker"
import type { TokenEntry, BlockAnimation } from "@shared/schema-types"
import { FreeformSpacingSideRow } from "./freeform-spacing-side-row";
import { DimensionPresetField } from "./dimension-preset-field";
import { AutoLayoutPanel } from "./auto-layout-panel";
import { ChildPinCard } from "./child-pin-card";
import { parentAllowsChildPin, readResizeFromLength } from "@shared/auto-layout-model";
import {
	readContainerLayoutFromBlock,
	getContainerSiblingStackDirection,
	getContainerParentDisplayMode,
} from "@shared/block-container-placement";
import { readStackTypeFromContent, type StackType } from "@shared/stack-model";
import { STACK_MODE_STARTER_STYLES } from "./blocks/stack/stack-model";
import {
	MAX_WIDTH_PRESETS,
	MIN_HEIGHT_PRESETS,
	WIDTH_PRESETS,
	HEIGHT_PRESETS,
	FONT_SIZE_PRESETS,
  BORDER_RADIUS_PRESETS,
  SPACING_PRESETS,
} from "@shared/dimension-presets";
import { BLOCK_FONT_CATALOG } from "@shared/font-catalog";

type SpacingSideQuad = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

/**
 * WHY: Matches CSS box shorthand expansion so sidebar sides align with serialized `padding` / `margin`.
 */
function expandSpacingShorthand(raw: unknown): SpacingSideQuad {
  if (raw == null || raw === "") {
    return { top: "", right: "", bottom: "", left: "" };
  }
  const str = typeof raw === "string" ? raw : String(raw);
  const values = str
    .split(/\s+/)
    .map((v: string) => v.trim())
    .filter((v) => v.length > 0);
  if (values.length === 0) return { top: "", right: "", bottom: "", left: "" };
  if (values.length === 1) {
    const v = values[0]!;
    return { top: v, right: v, bottom: v, left: v };
  }
  if (values.length === 2) {
    const [a, b] = values as [string, string];
    return { top: a, right: b, bottom: a, left: b };
  }
  if (values.length === 3) {
    const [a, b, c] = values as [string, string, string];
    return { top: a, right: b, bottom: c, left: b };
  }
  const [a, b, c, d] = values as [string, string, string, string];
  return { top: a, right: b, bottom: c, left: d };
}

/**
 * WHY: Longhands win over shorthand in the UI when both appear after merges (accessor vs tree styles).
 */
function overlaySpacingLonghands(
  st: Record<string, unknown>,
  expanded: SpacingSideQuad,
  prefix: "padding" | "margin",
): SpacingSideQuad {
  const pick = (longSuffix: string, side: keyof SpacingSideQuad): string => {
    const longKey = `${prefix}${longSuffix}`;
    const v = st[longKey];
    if (v != null && String(v).trim() !== "") return String(v);
    return expanded[side];
  };
  return {
    top: pick("Top", "top"),
    right: pick("Right", "right"),
    bottom: pick("Bottom", "bottom"),
    left: pick("Left", "left"),
  };
}

interface BlockSettingsProps {
  block: BlockConfig;
  onUpdate: (updates: Partial<BlockConfig>) => void;
  onHoverArea?: (area: 'padding' | 'margin' | null) => void;
  /** Immediate parent — pin card only shows when this is a flex/grid stack. */
  parentBlock?: BlockConfig | null;
}

export default function BlockSettings({ block, onUpdate, onHoverArea, parentBlock = null }: BlockSettingsProps) {
  const [customCss, setCustomCss] = useState(block.customCss || '');
  const [paddingLinked, setPaddingLinked] = useState(true);
  const accessor = getBlockStateAccessor(block.id);

  // Display conditions from block settings
  const displayConditions: DisplayCondition[] =
    (block.settings?.displayConditions as DisplayCondition[]) ?? [];

  const updateDisplayConditions = (conditions: DisplayCondition[]) => {
    updateSettings({ displayConditions: conditions.length > 0 ? conditions : undefined });
  };

  const updateContent = (contentUpdates: any) => {
    if (accessor) {
      const current = accessor.getContent();
      accessor.setContent({
        ...(typeof current === "object" && current !== null ? current : {}),
        ...contentUpdates,
      });
    } else {
      onUpdate({
        content: {
          ...block.content,
          ...contentUpdates,
        },
      });
    }
  };

  const updateStyles = (styleUpdates: any) => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      accessor.setStyles({
        ...current,
        ...styleUpdates,
      });
    } else {
      onUpdate({
        styles: {
          ...block.styles,
          ...styleUpdates,
        },
      });
    }
  };

  // Stack mode lives in structured content; the Auto Layout direction chip writes
  // through to it (plus the mode's starter styles) so panel and Content tab agree.
  const isStackBlock = block.name === "core/stack";
  const setStackMode = (next: StackType) => {
    const current = block.content;
    const isStructured =
      current && typeof current === "object" && "kind" in current && current.kind === "structured";
    const data = isStructured
      ? { ...((current as { data?: Record<string, unknown> }).data ?? {}), stackType: next }
      : { stackType: next };
    const structuredContent = { kind: "structured", data } as BlockConfig["content"];
    const modeStyles = STACK_MODE_STARTER_STYLES[next];
    if (accessor) {
      accessor.setContent(structuredContent);
      accessor.setStyles({ ...(accessor.getStyles() || {}), ...modeStyles });
    } else {
      onUpdate({
        content: structuredContent,
        styles: { ...(block.styles ?? {}), ...modeStyles } as BlockConfig["styles"],
      });
    }
  };

  const updateSettings = (settingUpdates: any) => {
    if (accessor) {
      const current = accessor.getSettings() || {};
      accessor.setSettings({
        ...current,
        ...settingUpdates,
      });
    } else {
      onUpdate({
        settings: {
          ...block.settings,
          ...settingUpdates,
        },
      });
    }
  };

  const handleCustomCssChange = (css: string) => {
    setCustomCss(css);
    onUpdate({ customCss: css });
  };

  // Token system helpers
  const getTokenMapKey = (property: string, modifier?: string): string =>
    modifier ? `${property}:${modifier}` : property

  const getTokenEntry = (property: string, modifier?: string): TokenEntry | undefined => {
    return block.other?.tokenMap?.[getTokenMapKey(property, modifier)]
  }

  const updateTokenEntry = (entry: TokenEntry) => {
    const currentOther = block.other || {}
    const currentTokenMap = currentOther.tokenMap || {}
    const key = getTokenMapKey(entry.property, entry.modifier)
    onUpdate({
      other: {
        ...currentOther,
        tokenMap: {
          ...currentTokenMap,
          [key]: entry,
        },
      },
    })
  }

  // Animation system helper
  // Uses null (not undefined) to clear animation, because deepMerge skips undefined values
  const updateAnimation = (animation: BlockAnimation | undefined) => {
    const currentOther = block.other || {}
    onUpdate({
      other: {
        ...currentOther,
        animation: animation ?? null,
      },
    })
  }

  const purgeTokenMapKeys = (keys: string[]) => {
    const cur = block.other?.tokenMap;
    if (!cur) return;
    let changed = false;
    const next = { ...cur };
    for (const k of keys) {
      if (next[k] != null) {
        delete next[k];
        changed = true;
      }
    }
    if (!changed) return;
    onUpdate({
      other: {
        ...block.other,
        tokenMap: next,
      },
    });
  };

  /**
   * Live styles for spacing controls: block tree + in-memory accessor (when present) so fields
   * stay in sync while typing.
   */
  const getResolvedStylesForSpacing = (): Record<string, unknown> => ({
    ...(block.styles as Record<string, unknown> | undefined),
    ...(accessor?.getStyles() as Record<string, unknown> | undefined),
  });

  const getResolvedPlacementStyles = (): Record<string, unknown> =>
    getResolvedStylesForSpacing();

  /** Writes one padding/margin side as raw CSS, clears conflicting tokenMap entry, drops shorthand `padding`/`margin` when needed. */
  const commitSpacingSide = (cssKey: keyof CSSProperties, fullValue: string | null) => {
    purgeTokenMapKeys([String(cssKey)]);
    const shorthand =
      String(cssKey).startsWith("padding") && cssKey !== "padding"
        ? ("padding" as const)
        : String(cssKey).startsWith("margin") && cssKey !== "margin"
          ? ("margin" as const)
          : null;
    const key = String(cssKey);
    /** Merged tree + accessor — shorthand may live only on `block.styles` while edits apply via accessor. */
    const resolved = getResolvedStylesForSpacing();

    const buildNextStyles = (prev: Record<string, unknown>): Record<string, unknown> => {
      const s = { ...prev };
      // Dropping shorthand only in the patch object is not enough: updateBlockDeep deep-merges
      // nested `styles` and keeps stale margin/padding unless explicitly cleared with null.
      if (shorthand && resolved[shorthand] != null) {
        delete s[shorthand];
        s[shorthand] = null;
      }
      // WHY: `updateBlockDeep` deep-merges `styles`; omitted keys keep old values. Explicit `null`
      // clears longhands the same way shorthand uses `padding: null` above.
      if (fullValue == null || fullValue === "") {
        s[key] = null;
      } else {
        s[key] = fullValue;
      }
      return s;
    };

    if (accessor) {
      const prev = (accessor.getStyles() || {}) as Record<string, unknown>;
      accessor.setStyles(buildNextStyles(prev) as CSSProperties);
    } else {
      const prev = (block.styles || {}) as Record<string, unknown>;
      onUpdate({ styles: buildNextStyles(prev) as BlockConfig["styles"] });
    }
  };

  // Get individual spacing values with fallbacks
  const getPaddingValues = (): SpacingSideQuad => {
    const st = getResolvedStylesForSpacing();
    const expanded = expandSpacingShorthand(st.padding);
    return overlaySpacingLonghands(st, expanded, "padding");
  };

  const getMarginValues = (): SpacingSideQuad => {
    const st = getResolvedStylesForSpacing();
    const expanded = expandSpacingShorthand(st.margin);
    return overlaySpacingLonghands(st, expanded, "margin");
  };

  const renderContentSettings = () => {
    const def = blockRegistry[block.name];
    
    // For component pattern blocks, use the legacy settings function if available
    // This allows settings to be shown in sidebar while block manages its own state
    if (def?.component && def?.settings) {
      const SettingsComp = def.settings;
      return <SettingsComp block={block} onUpdate={onUpdate} />;
    }
    
    // Legacy pattern: use block's settings component
    if (def?.settings) {
      const SettingsComp = def.settings;
      return <SettingsComp block={block} onUpdate={onUpdate} />;
    }

    if (block.name === "core/markdown") {
      return (
        <p className="npb-settings-hint-muted py-4 text-center text-xs leading-relaxed">
          Edit markdown on the canvas. Use the sidebar <span className="font-semibold">Advanced</span> tab for CSS
          classes, anchor, animations, and display conditions.
        </p>
      );
    }

    return (
      <div className="npb-settings-hint-muted py-8 text-center">
        No content settings available for this block type.
      </div>
    );
  };



  const renderStyleSettings = () => {
    const isColumnsBlock = block.name === "core/columns";
    const isPageShell = block.name === "core/page-shell";
    const ownsOwnLook = isPageShell || block.name === "core/header";
    const isLayoutBlock = [
      "core/group",
      "core/container",
      "container",
      "core/columns",
      "core/stack",
    ].includes(block.name);
    const showTypographyStyles = [
      "heading",
      "core/heading",
      "text",
      "core/paragraph",
      "button",
      "core/button",
    ].includes(block.name);
    const showFlowTextAlign = ["heading", "core/heading", "text", "core/paragraph", "core/pullquote"].includes(
      block.name,
    );
    const showButtonLabelAlign = ["button", "core/button"].includes(block.name);
    const isFormFieldBlock = ["core/input", "core/textarea", "core/select"].includes(block.name);
    const sideLabel: Record<string, string> = {
      paddingTop: "Top",
      paddingRight: "Right",
      paddingBottom: "Bottom",
      paddingLeft: "Left",
      marginTop: "Top",
      marginRight: "Right",
      marginBottom: "Bottom",
      marginLeft: "Left",
    };
    return (
      <div className="space-y-6">
        {isPageShell ? (
          <p className="npb-settings-hint-muted text-xs">
            Font, width, padding, and colors are on the Content tab. Those are the
            only page-look controls — Style width, spacing, and colors do not apply
            to the page shell.
          </p>
        ) : null}
        {block.name === "core/header" ? (
          <p className="npb-settings-hint-muted text-xs">
            Header layout, links, and buttons are on the Content tab.
          </p>
        ) : null}
        {/* Typography */}
        {showTypographyStyles && (
          <CollapsibleCard title="Typography" icon={Type} defaultOpen={true}>
            {/* Font Family */}
            <div>
              <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
                <Type className="w-3 h-3" />
                Font Family
              </Label>
              <Select
                value={
                  block.styles?.fontFamily != null && block.styles.fontFamily !== ""
                    ? block.styles.fontFamily
                    : "__inherit"
                }
                onValueChange={(v) =>
                  updateStyles({ fontFamily: v === "__inherit" ? undefined : v })
                }
              >
                <SelectTrigger
                  className={cn(
                    "mt-2 h-9 w-full rounded-none text-sm focus-visible:outline-none",
                    "npb-settings-select-trigger",
                  )}
                >
                  <SelectValue placeholder="Default (Inherit)" />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_FONT_CATALOG.map((opt) => (
                    <SelectItem
                      key={opt.value === "" ? "__inherit" : opt.value}
                      value={opt.value === "" ? "__inherit" : opt.value}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <SettingsChipGroup
              label="Font Size"
              icon={Ruler}
              options={FONT_SIZE_PRESETS.map((preset) => ({
                value: preset.value,
                label: preset.label,
              }))}
              value={
                block.styles?.fontSize != null ? String(block.styles.fontSize) : ""
              }
              onChange={(value) => updateStyles({ fontSize: value || undefined })}
            />
            <Input
              value={
                block.styles?.fontSize !== undefined && block.styles.fontSize !== null
                  ? String(block.styles.fontSize)
                  : ""
              }
              onChange={(e) => updateStyles({ fontSize: e.target.value })}
              placeholder="Custom size, e.g. 18px"
              className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
            />
            
            {/* Line Height - Full Width */}
            <div>
              <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
                <Rows className="w-3 h-3" />
                Line Height
              </Label>
              <Input
                value={
                  block.styles?.lineHeight !== undefined && block.styles.lineHeight !== null
                    ? String(block.styles.lineHeight)
                    : ""
                }
                onChange={(e) => updateStyles({ lineHeight: e.target.value })}
                placeholder="1.6"
                className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
              />
            </div>
            
            {/* Font Weight - Chip Grid */}
            <SettingsChipGroup
              label="Font Weight"
              icon={Bold}
              options={[
                { value: '300', label: 'Light', icon: Minus },
                { value: 'normal', label: 'Normal', icon: Circle },
                { value: '500', label: 'Medium', icon: Square },
                { value: 'bold', label: 'Bold', icon: Bold },
              ]}
              value={String(block.styles?.fontWeight ?? 'normal')}
              onChange={(value) => updateStyles({ fontWeight: String(value) })}
            />

            {/* Paragraph / heading: flowing block text */}
            {showFlowTextAlign && (
              <SettingsChipGroup
                label="Text alignment"
                icon={AlignCenter}
                options={[
                  { value: "left", label: "Left", icon: AlignLeft },
                  { value: "center", label: "Center", icon: AlignCenter },
                  { value: "right", label: "Right", icon: AlignRight },
                  { value: "justify", label: "Justify", icon: AlignJustify },
                ]}
                value={block.styles?.textAlign || "left"}
                onChange={(value) => updateStyles({ textAlign: value })}
              />
            )}

            {showButtonLabelAlign && (
              <div className="space-y-2">
                <p className="npb-settings-hint text-xs">
                  Aligns the label inside the button. Use{' '}
                  <span className="font-semibold">Position in container</span>
                  {' '}below to move the whole button in the layout.
                </p>
                <SettingsChipGroup
                  label="Label alignment (inside button)"
                  icon={AlignCenter}
                  options={[
                    { value: "left", label: "Left", icon: AlignLeft },
                    { value: "center", label: "Center", icon: AlignCenter },
                    { value: "right", label: "Right", icon: AlignRight },
                  ]}
                  value={block.styles?.textAlign || "center"}
                  onChange={(value) => updateStyles({ textAlign: value })}
                />
              </div>
            )}
          </CollapsibleCard>
        )}

        {/* Colors — page shell paints these from Content, not block.styles */}
        {!ownsOwnLook && (
        <CollapsibleCard title="Colors" icon={Palette} defaultOpen={true}>
          {/* Text Color */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Type className="w-3 h-3" />
              Text Color
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="color"
                currentEntry={getTokenEntry("color")}
                currentStyleValue={block.styles?.color as string | undefined}
                onChange={updateTokenEntry}
              />
            </div>
          </div>
          
          {/* Background Color */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Square className="w-3 h-3" />
              Background Color
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="backgroundColor"
                currentEntry={getTokenEntry("backgroundColor")}
                currentStyleValue={block.styles?.backgroundColor as string | undefined}
                onChange={updateTokenEntry}
              />
            </div>
          </div>

          {/* Hover text color */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Type className="w-3 h-3" />
              Hover text color
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="color"
                modifier="hover"
                currentEntry={getTokenEntry("color", "hover")}
                onChange={updateTokenEntry}
              />
            </div>
          </div>

          {/* Hover background */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Square className="w-3 h-3" />
              Hover background
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="backgroundColor"
                modifier="hover"
                currentEntry={getTokenEntry("backgroundColor", "hover")}
                onChange={updateTokenEntry}
              />
            </div>
          </div>
        </CollapsibleCard>
        )}

        {/* Spacing */}
        {!ownsOwnLook && (
        <CollapsibleCard title="Spacing" icon={Move} defaultOpen={true}>
          <p className="npb-settings-hint mb-3 text-xs">
            Each side is freeform CSS spacing. Use lengths with <span className="font-semibold">no space</span> between
            the number and unit (<span className="font-mono">120px</span>,{' '}
            <span className="font-mono">20rem</span>). You can also use <span className="font-mono">auto</span>,
            percentages, or <span className="font-mono">calc(…)</span>.
          </p>

          {/* Padding */}
          <div className="mb-8">
            <div className="mb-3">
              <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                <Square className="w-3 h-3" />
                Padding
              </Label>
            </div>
            <SettingsChipGroup
              label="Quick padding (all sides)"
              options={SPACING_PRESETS.map((preset) => ({
                value: preset.value,
                label: preset.label,
              }))}
              value={(() => {
                const sides = getPaddingValues();
                const allMatch =
                  sides.top === sides.right &&
                  sides.top === sides.bottom &&
                  sides.top === sides.left;
                return allMatch ? sides.top : '';
              })()}
              onChange={(value) => {
                commitSpacingSide('paddingTop', value);
                commitSpacingSide('paddingRight', value);
                commitSpacingSide('paddingBottom', value);
                commitSpacingSide('paddingLeft', value);
              }}
              className="mb-4"
            />
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs text-npb-text-muted">
                {paddingLinked ? 'All sides stay linked' : 'Each side edits independently'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPaddingLinked((linked) => !linked)}>
                {paddingLinked ? 'Edit sides separately' : 'Link all sides'}
              </Button>
            </div>
            {paddingLinked ? (
              <FreeformSpacingSideRow
                label="All sides"
                value={(() => {
                  const sides = getPaddingValues();
                  const allMatch =
                    sides.top === sides.right &&
                    sides.top === sides.bottom &&
                    sides.top === sides.left;
                  return allMatch ? sides.top : sides.top || '';
                })()}
                hoverArea="padding"
                onHoverArea={onHoverArea}
                onCommit={(full) => {
                  commitSpacingSide('paddingTop', full);
                  commitSpacingSide('paddingRight', full);
                  commitSpacingSide('paddingBottom', full);
                  commitSpacingSide('paddingLeft', full);
                }}
              />
            ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["paddingTop", "top"],
                  ["paddingRight", "right"],
                  ["paddingBottom", "bottom"],
                  ["paddingLeft", "left"],
                ] as const
              ).map(([prop, corner]) => (
                <FreeformSpacingSideRow
                  key={prop}
                  label={sideLabel[prop]}
                  value={getPaddingValues()[corner]}
                  hoverArea="padding"
                  onHoverArea={onHoverArea}
                  onCommit={(full) => commitSpacingSide(prop, full)}
                />
              ))}
            </div>
            )}
          </div>

          {/* Margin */}
          <div>
            <div className="mb-3">
              <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                <Square className="w-3 h-3" />
                Margin
              </Label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["marginTop", "top"],
                  ["marginRight", "right"],
                  ["marginBottom", "bottom"],
                  ["marginLeft", "left"],
                ] as const
              ).map(([prop, corner]) => (
                <FreeformSpacingSideRow
                  key={prop}
                  label={sideLabel[prop]}
                  value={getMarginValues()[corner]}
                  hoverArea="margin"
                  onHoverArea={onHoverArea}
                  onCommit={(full) => commitSpacingSide(prop, full)}
                />
              ))}
            </div>
          </div>
        </CollapsibleCard>
        )}

        {!ownsOwnLook && parentAllowsChildPin(parentBlock) ? (
          <ChildPinCard
            horizontal={
              (getResolvedPlacementStyles().contentAlignHorizontal ?? "__unset") as string
            }
            vertical={
              (getResolvedPlacementStyles().contentAlignVertical ?? "__unset") as string
            }
            onChange={(patch) => updateStyles(patch)}
          />
        ) : null}

        {(() => {
          if (!parentBlock) return null;
          const parentLayout = readContainerLayoutFromBlock({
            styles: parentBlock.styles,
            content: parentBlock.content as Record<string, unknown>,
          });
          if (getContainerParentDisplayMode(parentLayout) !== "flex") return null;
          if (getContainerSiblingStackDirection(parentLayout) !== "row") return null;
          if (readResizeFromLength(block.styles?.width) !== "fixed") return null;
          return (
            <CollapsibleCard title="Shrink when tight" icon={MoveHorizontal} defaultOpen={false}>
              <SettingsChipGroup
                label="Fixed width behavior"
                ariaLabel="Fixed width behavior"
                options={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
                value={block.settings?.stackShrink === true ? "on" : "off"}
                onChange={(value) => updateSettings({ stackShrink: value === "on" })}
              />
              <p className="npb-settings-hint-muted mt-2 text-xs">
                On: this block compresses below its fixed width when the row runs out of room.
              </p>
            </CollapsibleCard>
          );
        })()}

        {!ownsOwnLook && isLayoutBlock ? (
          <>
            <AutoLayoutPanel
              block={block}
              hideDisplay={isColumnsBlock}
              stackMode={isStackBlock ? readStackTypeFromContent(block.content) : undefined}
              onStackModeChange={isStackBlock ? setStackMode : undefined}
              onStylesChange={(next) => updateStyles(next)}
            />
            <CollapsibleCard title="Max size" icon={Layout} defaultOpen={false}>
              <DimensionPresetField
                label="Max width"
                value={
                  block.styles?.maxWidth != null && block.styles.maxWidth !== ""
                    ? String(block.styles.maxWidth)
                    : undefined
                }
                presets={MAX_WIDTH_PRESETS}
                onChange={(next) => updateStyles({ maxWidth: next })}
                customPlaceholder="e.g. 1200px, 90rem"
              />
              <div className="mt-4">
                <DimensionPresetField
                  label="Min height"
                  value={
                    block.styles?.minHeight != null && block.styles.minHeight !== ""
                      ? String(block.styles.minHeight)
                      : undefined
                  }
                  presets={MIN_HEIGHT_PRESETS}
                  onChange={(next) => updateStyles({ minHeight: next })}
                  customPlaceholder="e.g. 24rem, 100dvh"
                />
              </div>
            </CollapsibleCard>
          </>
        ) : !ownsOwnLook ? (
        <CollapsibleCard title="Layout & Dimensions" icon={Layout} defaultOpen={false}>
            <DimensionPresetField
              label="Width"
              value={
                block.styles?.width != null && block.styles.width !== ""
                  ? String(block.styles.width)
                  : undefined
              }
              presets={WIDTH_PRESETS}
              onChange={(next) => updateStyles({ width: next ?? "auto" })}
              customPlaceholder="e.g. 320px, 50%, 80dvh"
            />

            <div className="mt-4">
              <DimensionPresetField
                label="Max width"
                value={
                  block.styles?.maxWidth != null && block.styles.maxWidth !== ""
                    ? String(block.styles.maxWidth)
                    : undefined
                }
                presets={MAX_WIDTH_PRESETS}
                onChange={(next) => updateStyles({ maxWidth: next })}
                customPlaceholder="e.g. 1200px, 90rem"
              />
            </div>

            <div className="mt-4">
              <DimensionPresetField
                label="Min height"
                value={
                  block.styles?.minHeight != null && block.styles.minHeight !== ""
                    ? String(block.styles.minHeight)
                    : undefined
                }
                presets={MIN_HEIGHT_PRESETS}
                onChange={(next) => updateStyles({ minHeight: next })}
                customPlaceholder="e.g. 24rem, 100dvh"
              />
            </div>

            <div className="mt-4">
              <DimensionPresetField
                label="Height"
                value={
                  block.styles?.height != null && block.styles.height !== ""
                    ? String(block.styles.height)
                    : undefined
                }
                presets={HEIGHT_PRESETS}
                onChange={(next) => updateStyles({ height: next ?? "auto" })}
                customPlaceholder="e.g. 400px, 50dvh"
              />
            </div>
            {block.name === "core/image" && (
              <div>
                <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                  <Square className="w-3 h-3" />
                  Object fit
                </Label>
                <Select
                  value={(block.styles?.objectFit as string) || "contain"}
                  onValueChange={(value) =>
                    updateStyles({ objectFit: value as CSSProperties["objectFit"] })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "mt-2 h-9 w-full rounded-none text-sm focus-visible:outline-none",
                      "npb-settings-select-trigger",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="fill">Fill</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="scale-down">Scale down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
        </CollapsibleCard>
        ) : null}

        {/* Border */}
        {!ownsOwnLook && (
        <CollapsibleCard title="Border & Radius" icon={Square} defaultOpen={isFormFieldBlock}>
          {isFormFieldBlock ? (
            <p className="npb-settings-hint mb-3 text-xs">
              Border and radius apply to the field control. Use{' '}
              <span className="font-semibold">Colors</span> above for hover text and background.
            </p>
          ) : null}
          {/* Border - Full Width */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Square className="w-3 h-3" />
              Border
            </Label>
            <Input
              value={
                block.styles?.border !== undefined && block.styles.border !== null
                  ? String(block.styles.border)
                  : ""
              }
              onChange={(e) => updateStyles({ border: e.target.value })}
              placeholder="none — e.g. 1px solid #ccc"
              className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
            />
          </div>
          
          {/* Border Radius */}
          <SettingsChipGroup
            label="Corner shape"
            icon={Circle}
            options={BORDER_RADIUS_PRESETS.map((preset) => ({
              value: preset.value,
              label: preset.label,
            }))}
            value={
              block.styles?.borderRadius != null
                ? String(block.styles.borderRadius)
                : ""
            }
            onChange={(value) =>
              updateStyles({ borderRadius: value || undefined })
            }
          />
          <Input
            value={
              block.styles?.borderRadius !== undefined &&
              block.styles.borderRadius !== null
                ? String(block.styles.borderRadius)
                : ""
            }
            onChange={(e) => updateStyles({ borderRadius: e.target.value })}
            placeholder="Custom radius, e.g. 6px"
            className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
          />
        </CollapsibleCard>
        )}

        <CollapsibleCard title="Custom CSS" icon={Code} defaultOpen={false}>
          <div className="space-y-3">
            <Textarea
              value={customCss}
              onChange={(e) => handleCustomCssChange(e.target.value)}
              placeholder="/* Add your custom CSS here */&#10;.my-block {&#10;  /* styles */&#10;}"
              rows={8}
              className="font-mono text-sm resize-none"
            />
            <p className="npb-settings-hint-muted text-xs">
              CSS will be applied to this block only. Use standard CSS syntax.
            </p>
          </div>
        </CollapsibleCard>
      </div>
    );
  };

  return (
    <div className="npb-block-settings space-y-4">
      <div className="npb-settings-hero">
        <h3 className="npb-settings-hero-title mb-1 text-sm font-semibold">Block Settings</h3>
        <p className="npb-settings-hint-muted text-xs">{blockRegistry[block.name]?.label || block.name}</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid h-auto min-h-10 w-full grid-cols-3 gap-1 rounded-[var(--npb-radius-surface)] bg-npb-surface-inset p-1">
          <TabsTrigger
            value="content"
            className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs font-medium text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active transition-colors">
            <Type className="h-3 w-3" /> Content
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs font-medium text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active transition-colors">
            <Palette className="h-3 w-3" /> Style
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs font-medium text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active transition-colors">
            <Code className="h-3 w-3" /> Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="npb-settings-panel">
            {/* Variable insertion for blocks with text content */}
            {typeof (block.content as Record<string, unknown>)?.value === 'string' && (
              <div className="mb-4 npb-settings-divider-b pb-4">
                <div className="flex items-center justify-between">
                  <Label className="npb-settings-label text-sm font-semibold">Insert Variable</Label>
                  <VariablePicker
                    onInsert={(variable) => {
                      const currentValue = (block.content as Record<string, unknown>)?.value as string || '';
                      updateContent({ value: currentValue + variable });
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] npb-settings-hint-muted">
                  Click a variable to append it to the block content below
                </p>
              </div>
            )}
            {renderContentSettings()}
          </div>
        </TabsContent>

        <TabsContent value="style" className="mt-4 space-y-4">
          <div className="npb-settings-panel">
            {renderStyleSettings()}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-4 space-y-4">
          <div className="npb-settings-panel">
            {/* Animation Section */}
            <CollapsibleCard title="Animations" icon={Sparkles} defaultOpen={false}>
              <AnimationPicker
                animation={block.other?.animation}
                blockId={block.id}
                onChange={updateAnimation}
              />
            </CollapsibleCard>

            {/* Anchor ID & CSS Classes — available for all blocks */}
            <div className="mt-4">
              <CollapsibleCard title="HTML Anchor & Classes" icon={Hash} defaultOpen={false}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="block-anchor" className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                      <Target className="w-3 h-3" />
                      Anchor ID
                    </Label>
                    <Input
                      id="block-anchor"
                      value={(block.content as Record<string, unknown>)?.anchor as string || ''}
                      onChange={(e) => updateContent({ anchor: e.target.value })}
                      placeholder="Add an anchor (without #)"
                      className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
                    />
                    <p className="npb-settings-hint-muted mt-1 text-xs">
                      Used for linking directly to this block via #anchor
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="block-classes" className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                      <Code className="w-3 h-3" />
                      CSS Classes
                    </Label>
                    <Input
                      id="block-classes"
                      value={(block.content as Record<string, unknown>)?.className as string || ''}
                      onChange={(e) => updateContent({ className: e.target.value })}
                      placeholder="e.g. my-custom-class"
                      className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
                    />
                  </div>
                </div>
              </CollapsibleCard>
            </div>

            {block.parentId != null && (
              <div className="mt-4">
                <CollapsibleCard title="Stack layer" icon={Layers} defaultOpen={false}>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium npb-settings-label">
                      Paint order among siblings
                    </Label>
                    <p className="npb-settings-hint-muted text-xs">
                      Only applies inside a layout parent (container, group, columns). Higher draws on top;
                      negative sends behind. Flow overlap still needs margins or positioning to separate.
                    </p>
                    <Input
                      type="number"
                      className="h-8 rounded-none text-sm focus-visible:outline-none"
                      placeholder="default — clear to reset"
                      value={
                        block.other?.stackLayer !== undefined && block.other?.stackLayer !== null
                          ? String(block.other.stackLayer)
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        const currentOther = block.other || {};
                        if (raw === "") {
                          const { stackLayer: _removed, ...restOther } = currentOther as Record<
                            string,
                            unknown
                          >;
                          onUpdate({ other: restOther as typeof block.other });
                          return;
                        }
                        const n = Number.parseInt(raw, 10);
                        onUpdate({
                          other: {
                            ...currentOther,
                            stackLayer: Number.isNaN(n) ? undefined : n,
                          },
                        });
                      }}
                    />
                  </div>
                </CollapsibleCard>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <Label className="npb-settings-label text-sm font-semibold">
                  Display Conditions
                </Label>
                <p className="npb-settings-hint-muted mt-0.5 text-xs">
                  Control when this block is visible. Add conditions to show or
                  hide the block based on page type, user status, or URL.
                </p>
              </div>
              <ConditionBuilder
                conditions={displayConditions}
                onChange={updateDisplayConditions}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}