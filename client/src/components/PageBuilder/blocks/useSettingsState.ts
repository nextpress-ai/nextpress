import { useState } from "react";
import type { CSSProperties } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { getBlockStateAccessor } from "./blockStateRegistry";
import { defaultParseContent, defaultSerializeContent } from "./createBlockDefinition";

/**
 * A cleared field arrives as `undefined`. The page tree deep-merges updates and
 * skips `undefined`, so the old value would stay (Standard scrollbar, a reset
 * scrolled look). `null` is the clear the tree understands.
 */
function withNullsForClearedKeys<T>(updates: Partial<T>): Partial<T> {
  const source = updates as Record<string, T[keyof T] | null | undefined>;
  const next: Record<string, T[keyof T] | null> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    next[key] = value === undefined ? null : value;
  }
  return next as Partial<T>;
}

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
 *
 * parseContent/serializeContent handle the structured ↔ plain-object boundary
 * so settings components always work with TContent and storage conforms to BlockContent.
 */
export function useSettingsState<TContent>(args: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
  defaultContent?: TContent;
  /** Parse persisted BlockContent into the editor model. Defaults to structured unwrap. */
  parseContent?: (raw: BlockConfig["content"]) => TContent;
  /** Serialize the editor model back to persisted BlockContent. Defaults to structured wrap. */
  serializeContent?: (content: TContent) => BlockContent;
}) {
  const { block, onUpdate, defaultContent, parseContent, serializeContent } = args;
  const parse = parseContent ?? defaultParseContent<TContent>;
  const serialize = serializeContent ?? defaultSerializeContent<TContent>;
  const accessor = getBlockStateAccessor(block.id);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  // Read: live accessor when present, else parse the block's own content,
  // falling back to defaults only when there is none. Does NOT merge defaults
  // over existing content — that would inject default fields into the saved payload.
  const rawContent = (
    accessor ? accessor.getContent() : parse(block.content) ?? defaultContent
  ) as TContent;
  const content = (
    accessor && parseContent
      ? parseContent(serialize(rawContent))
      : rawContent
  ) as TContent;

  const styles = accessor ? accessor.getStyles() : block.styles;
  const settings = accessor ? accessor.getSettings?.() : block.settings;

  const updateContent = (updates: Partial<TContent>) => {
    const patch = withNullsForClearedKeys(updates);
    if (accessor) {
      accessor.setContent((prev) => {
        const current = (prev ?? {}) as Record<string, unknown>;
        return { ...current, ...patch } as TContent;
      });
      rerender();
    } else if (onUpdate) {
      const parsed = parse(block.content);
      const merged = { ...parsed, ...patch };
      onUpdate({ content: serialize(merged as TContent) });
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