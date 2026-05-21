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
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Ruler,
  Square,
  Circle,
  Hash,
  Move,
  RotateCw,
  Columns,
  Rows,
  Grid3X3,
  Minus,
  Sparkles,
  Layers,
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

/** Font options matching PageSettings — same fonts available at block level */
const FONT_OPTIONS = [
  { value: '', label: 'Default (Inherit)' },
  { value: 'system-ui', label: 'System Default' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Merriweather, serif', label: 'Merriweather' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: '"Playfair Display", serif', label: 'Playfair Display' },
  { value: '"Source Sans Pro", sans-serif', label: 'Source Sans Pro' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
] as const;

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
}

export default function BlockSettings({ block, onUpdate, onHoverArea }: BlockSettingsProps) {
  const [customCss, setCustomCss] = useState(block.customCss || '');
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
  const getTokenEntry = (property: string): TokenEntry | undefined => {
    return block.other?.tokenMap?.[property]
  }

  const updateTokenEntry = (entry: TokenEntry) => {
    const currentOther = block.other || {}
    const currentTokenMap = currentOther.tokenMap || {}
    onUpdate({
      other: {
        ...currentOther,
        tokenMap: {
          ...currentTokenMap,
          [entry.property]: entry,
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
    const showTypographyStyles = [
      "heading",
      "core/heading",
      "text",
      "core/paragraph",
      "button",
      "core/button",
    ].includes(block.name);
    const showFlowTextAlign = ["heading", "core/heading", "text", "core/paragraph"].includes(
      block.name,
    );
    const showButtonLabelAlign = ["button", "core/button"].includes(block.name);
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
    const widthRaw = block.styles?.width;
    const widthLayoutMode =
      widthRaw == null || widthRaw === "" || widthRaw === "auto"
        ? "auto"
        : widthRaw === "100%"
          ? "fill"
          : widthRaw === "fit-content"
            ? "fit"
            : "custom";
    const heightRaw = block.styles?.height;
    const heightLayoutMode =
      heightRaw == null || heightRaw === "" || heightRaw === "auto"
        ? "auto"
        : heightRaw === "min-content"
          ? "min-content"
          : heightRaw === "max-content"
            ? "max-content"
            : "custom";
    return (
      <div className="space-y-6">
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
                  {FONT_OPTIONS.map((opt) => (
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
            <div>
              <Label className="npb-settings-label flex items-center gap-2 text-sm font-semibold">
                <Ruler className="w-3 h-3" />
                Font Size
              </Label>
              <Input
                value={
                  block.styles?.fontSize !== undefined && block.styles.fontSize !== null
                    ? String(block.styles.fontSize)
                    : ""
                }
                onChange={(e) => updateStyles({ fontSize: e.target.value })}
                placeholder="16px"
                className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
              />
            </div>
            
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

        {/* Colors */}
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
        </CollapsibleCard>

        {/* Spacing */}
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

        <CollapsibleCard title="Position in container" icon={Layout} defaultOpen={false}>
          <p className="npb-settings-hint mb-3 text-xs">
            Where this block sits among siblings (canvas, columns, flex row/column stacks). Uses flex layout;
            vertical center/bottom shows when extra space exists in the parent.
          </p>
          <SettingsChipGroup
            label="Horizontal"
            icon={AlignLeft}
            options={[
              { value: "__unset", label: "Default", icon: Circle },
              { value: "left", label: "Left", icon: AlignLeft },
              { value: "center", label: "Center", icon: AlignCenter },
              { value: "right", label: "Right", icon: AlignRight },
            ]}
            value={
              (getResolvedPlacementStyles().contentAlignHorizontal ??
                "__unset") as string
            }
            onChange={(v) =>
              updateStyles({
                contentAlignHorizontal:
                  v === "__unset"
                    ? null
                    : (v as "left" | "center" | "right"),
              })
            }
          />
          <SettingsChipGroup
            label="Vertical"
            icon={AlignCenter}
            className="mt-4"
            options={[
              { value: "__unset", label: "Default", icon: Circle },
              { value: "top", label: "Top", icon: ChevronUp },
              { value: "middle", label: "Middle", icon: AlignCenter },
              { value: "bottom", label: "Bottom", icon: ChevronDown },
            ]}
            value={
              (getResolvedPlacementStyles().contentAlignVertical ?? "__unset") as string
            }
            onChange={(v) =>
              updateStyles({
                contentAlignVertical:
                  v === "__unset" ? null : (v as "top" | "middle" | "bottom"),
              })
            }
          />
        </CollapsibleCard>

        {/* Layout & Dimensions */}
        <CollapsibleCard title="Layout & Dimensions" icon={Layout} defaultOpen={false}>
            {/* Width */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                  <Columns className="w-3 h-3" />
                  Width
                </Label>
                <Select
                  value={widthLayoutMode}
                  onValueChange={(val) => {
                    if (val === "auto") updateStyles({ width: "auto" });
                    else if (val === "fill") updateStyles({ width: "100%" });
                    else if (val === "fit") updateStyles({ width: "fit-content" });
                    else if (val === "custom") {
                      const current = block.styles?.width;
                      const isAlreadyCustom =
                        current != null &&
                        current !== "" &&
                        current !== "auto" &&
                        current !== "100%" &&
                        current !== "fit-content";
                      updateStyles({
                        width: isAlreadyCustom ? String(current) : "200px",
                      });
                    }
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-7 w-[7.5rem] rounded-none px-2 text-xs focus-visible:outline-none",
                      "npb-settings-select-trigger",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="fill">Fill</SelectItem>
                    <SelectItem value="fit">Fit</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={
                  block.styles?.width !== undefined && block.styles.width !== null
                    ? String(block.styles.width)
                    : ""
                }
                onChange={(e) => updateStyles({ width: e.target.value })}
                placeholder="auto"
                className="h-8 rounded-none text-sm focus-visible:outline-none"
              />
            </div>

            {/* Max Width */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                  <Columns className="w-3 h-3" />
                  Max Width
                </Label>
              </div>
              <Input
                value={
                  block.styles?.maxWidth !== undefined && block.styles.maxWidth !== null
                    ? String(block.styles.maxWidth)
                    : ""
                }
                onChange={(e) => updateStyles({ maxWidth: e.target.value || undefined })}
                placeholder="none"
                className="h-8 rounded-none text-sm focus-visible:outline-none"
              />
            </div>
            
            {/* Display Type for Layout-capable Blocks
                NOTE: `core/columns` layout is controlled via its own Content settings to avoid conflicts.
             */}
            {['container', 'core/group', 'core/container'].includes(block.name) && (
              <>
                  <div>
                    <Label className="text-sm font-semibold npb-settings-label mb-3 flex items-center gap-2">
                      <Grid3X3 className="w-3 h-3" />
                      Display
                    </Label>
                  <SettingsChipGroup
                    label=""
                    options={[
                      { value: 'block', label: 'Block' },
                      { value: 'flex', label: 'Flex' },
                      { value: 'grid', label: 'Grid' },
                      { value: 'inline', label: 'Inline' },
                    ]}
                    value={block.styles?.display || 'block'}
                    onChange={(value) => updateStyles({ display: value })}
                  />
                </div>

                {/* Flex Direction (if display is flex) */}
                {(block.styles?.display === 'flex' || block.styles?.display === 'inline-flex') && (
                  <div>
                    <Label className="text-sm font-semibold npb-settings-label mb-3 flex items-center gap-2">
                      <RotateCw className="w-3 h-3" />
                      Direction
                    </Label>
                    <SettingsChipGroup
                      label=""
                      options={[
                        { value: 'row', label: 'Row' },
                        { value: 'column', label: 'Column' },
                        { value: 'row-reverse', label: 'Row Rev' },
                        { value: 'column-reverse', label: 'Col Rev' },
                      ]}
                      value={block.styles?.flexDirection || 'row'}
                      onChange={(value) => updateStyles({ flexDirection: value })}
                    />
                  </div>
                )}

                {/* Flex Wrap (if display is flex) */}
                {(block.styles?.display === 'flex' || block.styles?.display === 'inline-flex') && (
                  <div>
                    <Label className="text-sm font-semibold npb-settings-label mb-3 flex items-center gap-2">
                      <Rows className="w-3 h-3" />
                      Wrap
                    </Label>
                    <SettingsChipGroup
                      label=""
                      options={[
                        { value: 'nowrap', label: 'No Wrap' },
                        { value: 'wrap', label: 'Wrap' },
                        { value: 'wrap-reverse', label: 'Wrap Rev' },
                      ]}
                      value={block.styles?.flexWrap || 'nowrap'}
                      onChange={(value) => updateStyles({ flexWrap: value })}
                    />
                  </div>
                )}

                {/* Justify Content */}
                <div>
                  <Label className="text-sm font-semibold npb-settings-label mb-3 flex items-center gap-2">
                    <AlignCenter className="w-3 h-3" />
                    Justify
                  </Label>
                  <SettingsChipGroup
                    label=""
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'space-between', label: 'Between' },
                      { value: 'space-around', label: 'Around' },
                    ]}
                    value={block.styles?.justifyContent || 'flex-start'}
                    onChange={(value) => updateStyles({ justifyContent: value })}
                  />
                </div>

                {/* Align Items */}
                <div>
                  <Label className="text-sm font-semibold npb-settings-label mb-3 flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" />
                    Align
                  </Label>
                  <SettingsChipGroup
                    label=""
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'stretch', label: 'Stretch' },
                    ]}
                    value={block.styles?.alignItems || 'flex-start'}
                    onChange={(value) => updateStyles({ alignItems: value })}
                  />
                </div>

                {/* Gap */}
                {!isColumnsBlock && (
                  <div>
                  <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                    <Move className="w-3 h-3" />
                    Gap
                  </Label>
                  <Input
                    value={
                      block.styles?.gap !== undefined && block.styles.gap !== null
                        ? String(block.styles.gap)
                        : ""
                    }
                    onChange={(e) => updateStyles({ gap: e.target.value || undefined })}
                    placeholder="e.g. 16px, 1rem"
                    className="mt-2 h-8 rounded-none text-sm focus-visible:outline-none"
                  />
                  </div>
                )}
              </>
            )}

            {/* Height for specific blocks */}
            {['image', 'video', 'container', 'core/group', 'core/container'].includes(block.name) && (
              <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                      <Rows className="w-3 h-3" />
                      Height
                    </Label>
                  <Select
                    value={heightLayoutMode}
                    onValueChange={(val) => {
                      if (val === "auto") updateStyles({ height: "auto" });
                      else if (val === "min-content") updateStyles({ height: "min-content" });
                      else if (val === "max-content") updateStyles({ height: "max-content" });
                      else if (val === "custom") {
                        const current = block.styles?.height;
                        const isAlreadyCustom =
                          current != null &&
                          current !== "" &&
                          current !== "auto" &&
                          current !== "min-content" &&
                          current !== "max-content";
                        updateStyles({
                          height: isAlreadyCustom ? String(current) : "200px",
                        });
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-7 w-[9.5rem] rounded-none px-2 text-xs focus-visible:outline-none",
                        "npb-settings-select-trigger",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="min-content">Min Content</SelectItem>
                      <SelectItem value="max-content">Max Content</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={
                    block.styles?.height !== undefined && block.styles.height !== null
                      ? String(block.styles.height)
                      : ""
                  }
                  onChange={(e) => updateStyles({ height: e.target.value })}
                  placeholder="auto"
                  className="h-8 rounded-none text-sm focus-visible:outline-none"
                />
              </div>
            )}

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

            {/* Overflow */}
            {['container', 'core/group', 'core/container'].includes(block.name) && (
              <div>
                <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                  <Square className="w-3 h-3" />
                  Overflow
                </Label>
                <SettingsChipGroup
                  label=""
                  options={[
                    { value: 'visible', label: 'Visible' },
                    { value: 'hidden', label: 'Hidden' },
                    { value: 'auto', label: 'Auto' },
                    { value: 'scroll', label: 'Scroll' },
                  ]}
                  value={block.styles?.overflow || 'visible'}
                  onChange={(value) => updateStyles({ overflow: value })}
                />
              </div>
            )}

            {/* For Columns, keep true dimensions here, but avoid duplicating layout controls. */}
            {isColumnsBlock && (
              <div>
                <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
                  <Square className="w-3 h-3" />
                  Overflow
                </Label>
                <SettingsChipGroup
                  label=""
                  options={[
                    { value: 'visible', label: 'Visible' },
                    { value: 'hidden', label: 'Hidden' },
                    { value: 'auto', label: 'Auto' },
                    { value: 'scroll', label: 'Scroll' },
                  ]}
                  value={block.styles?.overflow || 'visible'}
                  onChange={(value) => updateStyles({ overflow: value })}
                />
              </div>
            )}
        </CollapsibleCard>

        {/* Border */}
        <CollapsibleCard title="Border & Radius" icon={Square} defaultOpen={false}>
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
          
          {/* Border Radius - Full Width */}
          <div>
            <Label className="text-sm font-semibold npb-settings-label flex items-center gap-2">
              <Circle className="w-3 h-3" />
              Border Radius
            </Label>
            <Input
              value={
                block.styles?.borderRadius !== undefined &&
                block.styles.borderRadius !== null
                  ? String(block.styles.borderRadius)
                  : ""
              }
              onChange={(e) => updateStyles({ borderRadius: e.target.value })}
              placeholder="e.g. 0px, 4px"
              className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
            />
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
        <TabsList className="grid w-full grid-cols-3 gap-1 rounded-lg p-1">
          <TabsTrigger
            value="content"
            className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors">
            <Type className="h-3 w-3" /> Content
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors">
            <Palette className="h-3 w-3" /> Style
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors">
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

            <div className="mt-4">
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