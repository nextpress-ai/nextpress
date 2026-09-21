import { useEffect, useState } from "react";
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
import { SettingsLabel } from "./shared";

import {
  Palette,
  Type,
  Layout,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Target,
  Square,
  Hash,
  Move,
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
import ColorField, { type ColorTarget } from "./ColorField";
import { ButtonLookCard } from "./blocks/button/button-look-card";
import TokenColorPicker from "./TokenColorPicker"
import AnimationPicker from "./AnimationPicker"
import type { TokenEntry, BlockAnimation } from "@shared/schema-types"
import { DimensionPresetField } from "./dimension-preset-field";
import { SpacingSidesField } from "./spacing-sides-field";
import { SettingsDisclosure } from "./shared/settings-disclosure";
import {
  buildSpacingStyles,
  readSpacingSides,
  spacingSideKeys,
  type SpacingSideKey,
} from "./spacing-styles";
import { anyStyleSet, anyTokenSet } from "./style-set";
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
	FONT_WEIGHT_PRESETS,
	LINE_HEIGHT_PRESETS,
  BORDER_RADIUS_PRESETS,
} from "@shared/dimension-presets";
import { BLOCK_FONT_CATALOG } from "@shared/font-catalog";

interface BlockSettingsProps {
  block: BlockConfig;
  onUpdate: (updates: Partial<BlockConfig>) => void;
  onHoverArea?: (area: 'padding' | 'margin' | null) => void;
  /** Immediate parent — pin card only shows when this is a flex/grid stack. */
  parentBlock?: BlockConfig | null;
}

export default function BlockSettings({ block, onUpdate, onHoverArea, parentBlock = null }: BlockSettingsProps) {
  const [customCss, setCustomCss] = useState(block.customCss || '');
  // The sidebar is not remounted when another block is selected, so re-seed the textarea.
  useEffect(() => {
    setCustomCss(block.customCss || '');
  }, [block.id]);
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

  /**
   * `undefined` means "clear this style". The in-memory accessor drops the key; the tree path
   * deep-merges (which skips `undefined`), so it gets an explicit `null` instead.
   */
  const updateStyles = (styleUpdates: any) => {
    if (accessor) {
      const merged = { ...(accessor.getStyles() || {}), ...styleUpdates } as Record<string, unknown>;
      Object.keys(merged).forEach((key) => {
        if (merged[key] === undefined) delete merged[key];
      });
      accessor.setStyles(merged as CSSProperties);
    } else {
      const patch = Object.fromEntries(
        Object.entries(styleUpdates as Record<string, unknown>).map(([key, value]) => [
          key,
          value === undefined ? null : value,
        ]),
      );
      onUpdate({
        styles: {
          ...block.styles,
          ...patch,
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

  /** Background and text, each with the token (if any) and the plain style value behind it. */
  const colorTargets = (modifier?: 'hover'): ColorTarget[] => [
    {
      property: 'backgroundColor',
      label: 'Background',
      entry: getTokenEntry('backgroundColor', modifier),
      styleValue: modifier ? undefined : (block.styles?.backgroundColor as string | undefined),
      modifier,
    },
    {
      property: 'color',
      label: 'Text',
      entry: getTokenEntry('color', modifier),
      styleValue: modifier ? undefined : (block.styles?.color as string | undefined),
      modifier,
    },
  ];

  /** Sets or removes several colour tokens in one update (`null` removes one). */
  const setTokens = (tokens: Record<string, TokenEntry | null>) => {
    const currentOther = block.other || {};
    onUpdate({
      other: {
        ...currentOther,
        tokenMap: { ...(currentOther.tokenMap || {}), ...tokens } as Record<string, TokenEntry>,
      },
    });
  };

  const clearColor = (target: ColorTarget) => {
    purgeTokenMapKeys([getTokenMapKey(target.property, target.modifier)]);
    if (!target.modifier) updateStyles({ [target.property]: undefined });
  };

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

  /**
   * Removes color tokens. A deep merge cannot delete a key that is missing from the patch, so a
   * removed token is written as an explicit `null` (the token resolvers skip nulls).
   */
  const purgeTokenMapKeys = (keys: string[]) => {
    const cur = block.other?.tokenMap;
    if (!cur) return;
    const present = keys.filter((key) => cur[key] != null);
    if (present.length === 0) return;
    const next = { ...cur } as Record<string, TokenEntry | null>;
    for (const key of present) next[key] = null;
    onUpdate({
      other: {
        ...block.other,
        tokenMap: next as Record<string, TokenEntry>,
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

  /** Writes one value (or `null` to clear) to the listed padding/margin sides in a single update. */
  const commitSpacingSides = (cssKeys: readonly SpacingSideKey[], fullValue: string | null) => {
    purgeTokenMapKeys([...cssKeys]);
    const resolved = getResolvedStylesForSpacing();
    if (accessor) {
      const prev = (accessor.getStyles() || {}) as Record<string, unknown>;
      accessor.setStyles(
        buildSpacingStyles({ resolved, previous: prev, cssKeys, value: fullValue }) as CSSProperties,
      );
    } else {
      const prev = (block.styles || {}) as Record<string, unknown>;
      onUpdate({
        styles: buildSpacingStyles({
          resolved,
          previous: prev,
          cssKeys,
          value: fullValue,
        }) as BlockConfig["styles"],
      });
    }
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
    const isButtonBlock = ["button", "core/button"].includes(block.name);
    const prefersTextColor = ["heading", "core/heading", "text", "core/paragraph", "core/pullquote", "core/quote"].includes(block.name);
    const isFormFieldBlock = ["core/input", "core/textarea", "core/select"].includes(block.name);
    // Progressive disclosure: a card opens by itself only when it already holds saved values,
    // so nobody has to hunt for what they changed. Everything else waits for a click.
    const styleNow = getResolvedStylesForSpacing();
    const tokenMap = block.other?.tokenMap as Record<string, TokenEntry> | undefined;
    const colorProps = ["color", "backgroundColor"] as const;
    const hasHoverColors = anyTokenSet({ tokenMap, properties: colorProps, modifier: "hover" });
    const hasColors =
      hasHoverColors ||
      anyTokenSet({ tokenMap, properties: colorProps }) ||
      anyStyleSet({ styles: styleNow, keys: colorProps });
    const marginKeys = spacingSideKeys("margin");
    const hasMargin = anyStyleSet({ styles: styleNow, keys: ["margin", ...marginKeys], keepAuto: true });
    const hasSpacing =
      hasMargin ||
      anyStyleSet({ styles: styleNow, keys: ["padding", ...spacingSideKeys("padding")], keepAuto: true });
    const hasDimensions = anyStyleSet({
      styles: styleNow,
      keys: ["width", "maxWidth", "minHeight", "height", "objectFit"],
    });
    const hasMaxSize = anyStyleSet({ styles: styleNow, keys: ["maxWidth", "minHeight"] });
    const hasBorder = anyStyleSet({ styles: styleNow, keys: ["border", "borderRadius"] });
    const hasSecondaryTypography = anyStyleSet({
      styles: styleNow,
      keys: ["fontWeight", "lineHeight"],
    });
    const styleText = (value: unknown): string | undefined =>
      value != null && String(value).trim() !== "" ? String(value) : undefined;
    return (
      <div>
        {isPageShell ? (
          <p className="npb-settings-hint-muted px-4 pt-4 text-xs">
            Font, width, padding, and colors are on the Content tab. Those are the
            only page-look controls — Style width, spacing, and colors do not apply
            to the page shell.
          </p>
        ) : null}
        {block.name === "core/header" ? (
          <p className="npb-settings-hint-muted px-4 pt-4 text-xs">
            Header layout, links, and buttons are on the Content tab.
          </p>
        ) : null}
        {isButtonBlock && (
          <ButtonLookCard
            styles={styleNow}
            tokenMap={tokenMap}
            onStyles={(patch) => updateStyles(patch)}
            onTokens={setTokens}
            onAccent={updateTokenEntry}
          />
        )}

        {/* Typography — primary card for text blocks, so it opens right away */}
        {showTypographyStyles && (
          <CollapsibleCard title="Typography" icon={Type} defaultOpen={!isButtonBlock}>
            {/* Font Family */}
            <div>
              <SettingsLabel>Font Family</SettingsLabel>
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

            <DimensionPresetField
              label="Font size"
              presets={FONT_SIZE_PRESETS}
              value={styleText(block.styles?.fontSize)}
              onChange={(next) => updateStyles({ fontSize: next })}
              customPlaceholder="e.g. 18px, 1.2rem"
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

            <SettingsDisclosure title="Weight & line height" defaultOpen={hasSecondaryTypography}>
              <DimensionPresetField
                label="Line height"
                presets={LINE_HEIGHT_PRESETS}
                kind="number"
                value={styleText(block.styles?.lineHeight)}
                onChange={(next) => updateStyles({ lineHeight: next })}
                customPlaceholder="e.g. 1.6 or 24px"
              />

              <DimensionPresetField
                label="Font weight"
                presets={FONT_WEIGHT_PRESETS}
                kind="text"
                value={styleText(block.styles?.fontWeight)}
                onChange={(next) => updateStyles({ fontWeight: next })}
                customPlaceholder="e.g. 600 or 800"
              />
            </SettingsDisclosure>
          </CollapsibleCard>
        )}

        {/* Colors — page shell paints these from Content, not block.styles */}
        {!ownsOwnLook && (
        <CollapsibleCard title="Colors" icon={Palette} defaultOpen={hasColors}>
          <ColorField
            ariaLabel="Color"
            defaultProperty={prefersTextColor ? 'color' : 'backgroundColor'}
            targets={colorTargets()}
            onChange={updateTokenEntry}
            onTheme={clearColor}
          />
          <SettingsDisclosure title="Hover colors" defaultOpen={hasHoverColors}>
            <ColorField
              ariaLabel="Hover color"
              defaultProperty={prefersTextColor ? 'color' : 'backgroundColor'}
              targets={colorTargets('hover')}
              onChange={updateTokenEntry}
              onTheme={clearColor}
            />
          </SettingsDisclosure>
        </CollapsibleCard>
        )}

        {/* Spacing — padding first; margin folds away until asked for or already set */}
        {!ownsOwnLook && (
        <CollapsibleCard title="Spacing" icon={Move} defaultOpen={hasSpacing}>
          <SpacingSidesField
            label="Padding"
            kind="padding"
            sides={readSpacingSides({ styles: styleNow, kind: "padding" })}
            onHoverArea={onHoverArea}
            onCommit={commitSpacingSides}
          />
          <SettingsDisclosure title="Margin" defaultOpen={hasMargin}>
            <SpacingSidesField
              label="Margin"
              kind="margin"
              sides={readSpacingSides({ styles: styleNow, kind: "margin" })}
              onHoverArea={onHoverArea}
              onCommit={commitSpacingSides}
            />
          </SettingsDisclosure>
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
            <CollapsibleCard title="Max size" icon={Layout} defaultOpen={hasMaxSize}>
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
              <div>
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
        <CollapsibleCard title="Layout & Dimensions" icon={Layout} defaultOpen={hasDimensions}>
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

            <div>
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

            <div>
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

            <div>
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
                <SettingsLabel>Object fit</SettingsLabel>
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
        <CollapsibleCard title="Border & Radius" icon={Square} defaultOpen={isFormFieldBlock || hasBorder}>
          {isFormFieldBlock ? (
            <p className="npb-settings-hint mb-3 text-xs">
              Border and radius apply to the field control. Use{' '}
              <span className="font-semibold">Colors</span> above for hover text and background.
            </p>
          ) : null}
          {/* Border - Full Width */}
          <div>
            <SettingsLabel>Border</SettingsLabel>
            <Input
              value={
                block.styles?.border !== undefined && block.styles.border !== null
                  ? String(block.styles.border)
                  : ""
              }
              onChange={(e) => updateStyles({ border: e.target.value || undefined })}
              placeholder="none — e.g. 1px solid #ccc"
              className="mt-2 h-9 rounded-none text-sm focus-visible:outline-none"
            />
          </div>
          
          <DimensionPresetField
            label="Corner shape"
            presets={BORDER_RADIUS_PRESETS}
            value={styleText(block.styles?.borderRadius)}
            onChange={(next) => updateStyles({ borderRadius: next })}
            customPlaceholder="e.g. 6px, 0.5rem"
          />
        </CollapsibleCard>
        )}

        <CollapsibleCard title="Custom CSS" icon={Code} defaultOpen={customCss.trim() !== ""}>
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

  const blockDef = blockRegistry[block.name];
  const BlockIcon = blockDef?.icon;
  const tabTriggerClass =
    "flex min-h-9 items-center justify-center rounded-md border border-transparent px-3 py-2 text-xs font-medium text-npb-text-muted transition-colors hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active";

  return (
    <div className="npb-block-settings">
      <Tabs defaultValue="content" className="w-full">
        {/* One header: which block, then the tabs. Stays put while the sections scroll. */}
        <div className="sticky top-0 z-10 border-b border-npb-divider bg-npb-surface-base">
          <div className="flex items-center gap-2 px-4 pb-3 pt-4">
            {BlockIcon ? (
              <BlockIcon className="h-4 w-4 shrink-0 text-npb-text-muted" aria-hidden />
            ) : null}
            <h3 className="min-w-0 truncate text-sm font-semibold text-npb-text-primary">
              {blockDef?.label || block.name}
            </h3>
          </div>
          <TabsList className="mx-4 mb-3 grid h-auto min-h-10 w-[calc(100%-2rem)] grid-cols-3 gap-1 rounded-[var(--npb-radius-surface)] bg-npb-surface-inset p-1">
            <TabsTrigger value="content" className={tabTriggerClass}>
              Content
            </TabsTrigger>
            <TabsTrigger value="style" className={tabTriggerClass}>
              Style
            </TabsTrigger>
            <TabsTrigger value="advanced" className={tabTriggerClass}>
              Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="content" className="mt-0">
          <div key={block.id}>
            {/* Variable insertion for blocks with text content */}
            {typeof (block.content as Record<string, unknown>)?.value === 'string' && (
              <div className="flex items-center justify-between border-b border-npb-divider px-4 py-3">
                <SettingsLabel>Insert variable</SettingsLabel>
                <VariablePicker
                  onInsert={(variable) => {
                    const currentValue = (block.content as Record<string, unknown>)?.value as string || '';
                    updateContent({ value: currentValue + variable });
                  }}
                />
              </div>
            )}
            {renderContentSettings()}
          </div>
        </TabsContent>

        <TabsContent value="style" className="mt-0">
          <div key={block.id}>{renderStyleSettings()}</div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <div key={block.id}>
            {/* Animation Section */}
            <CollapsibleCard title="Animations" icon={Sparkles} defaultOpen={Boolean(block.other?.animation)}>
              <AnimationPicker
                animation={block.other?.animation}
                blockId={block.id}
                onChange={updateAnimation}
              />
            </CollapsibleCard>

            {/* Anchor ID & CSS Classes — available for all blocks */}
            <div>
              <CollapsibleCard
                title="HTML Anchor & Classes"
                icon={Hash}
                defaultOpen={Boolean(
                  (block.content as Record<string, unknown>)?.anchor ||
                    (block.content as Record<string, unknown>)?.className,
                )}
              >
                <div className="space-y-4">
                  <div>
                    <SettingsLabel htmlFor="block-anchor">Anchor ID</SettingsLabel>
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
                    <SettingsLabel htmlFor="block-classes">CSS Classes</SettingsLabel>
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
              <div>
                <CollapsibleCard title="Stack layer" icon={Layers} defaultOpen={block.other?.stackLayer != null}>
                  <div className="space-y-2">
                    <SettingsLabel>Paint order among siblings</SettingsLabel>
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

            <div>
              <CollapsibleCard
                title="Display conditions"
                icon={Target}
                defaultOpen={displayConditions.length > 0}
              >
                <p className="npb-settings-hint-muted text-xs">
                  Show or hide this block based on page type, user status, or URL.
                </p>
                <ConditionBuilder
                  conditions={displayConditions}
                  onChange={updateDisplayConditions}
                />
              </CollapsibleCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}