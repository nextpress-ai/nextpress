import { useState } from "react";
import type { CSSProperties } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { getBlockStateAccessor } from "./blockStateRegistry";

/**
 * Unifies the settings-panel state boilerplate that every block's settings
 * component repeats: resolve the live accessor, read content/styles/settings,
 * and write updates through the accessor (with a local force-render so the
 * panel reflects the change) — falling back to the parent `onUpdate` when no
 * accessor is registered (e.g. server render or detached panel).
 *
 * WHY: the accessor's underlying state mutates outside React, and
 * `registerBlockState` only notifies on new registrations — not on
 * `setContent`/`setStyles` — so a manual re-render is required after a write.
 *
 * Replaces the per-block "Pattern A" (`setUpdateTrigger`) and "Pattern B"
 * (stale `block.content` reads) with one source of truth.
 */
export function useSettingsState<TContent>(args: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
  defaultContent?: TContent;
}) {
  const { block, onUpdate, defaultContent } = args;
  const accessor = getBlockStateAccessor(block.id);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const content = (
    accessor
      ? accessor.getContent()
      : { ...((defaultContent ?? {}) as object), ...(block.content as object | undefined) }
  ) as TContent;

  const styles = accessor ? accessor.getStyles() : block.styles;
  const settings = accessor ? accessor.getSettings?.() : block.settings;

  const updateContent = (updates: Partial<TContent>) => {
    if (accessor) {
      const current = (accessor.getContent() ?? {}) as Record<string, unknown>;
      accessor.setContent({ ...current, ...updates });
      rerender();
    } else if (onUpdate) {
      onUpdate({ content: { ...(content as object), ...updates } as unknown as BlockContent });
    }
  };

  const updateStyles = (updates: Partial<CSSProperties>) => {
    if (accessor) {
      const current = (accessor.getStyles() ?? {}) as CSSProperties;
      accessor.setStyles({ ...current, ...updates });
      rerender();
    } else if (onUpdate) {
      onUpdate({ styles: { ...block.styles, ...updates } as BlockConfig["styles"] });
    }
  };

  const updateSettings = (updates: Record<string, unknown>) => {
    if (accessor) {
      const current = (accessor.getSettings?.() ?? {}) as Record<string, unknown>;
      accessor.setSettings({ ...current, ...updates });
      rerender();
    } else if (onUpdate) {
      onUpdate({ settings: { ...(block.settings ?? {}), ...updates } });
    }
  };

  return { accessor, content, styles, settings, updateContent, updateStyles, updateSettings, rerender };
}
