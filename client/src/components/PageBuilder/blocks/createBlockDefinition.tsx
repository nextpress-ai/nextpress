import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps, BlockCategory } from "./types";
import { useBlockState } from "./useBlockState";

/**
 * Arguments handed to a block's pure `render` function. Mirrors the
 * `useBlockState` result plus the component props the renderer commonly needs
 * (preview/selection flags, nested-child propagation, and the raw `value` for
 * container blocks that read `children`).
 */
export type BlockRenderArgs<TContent> = {
  value: BlockConfig;
  content: TContent;
  styles?: React.CSSProperties;
  settings?: Record<string, unknown>;
  setContent: (next: TContent | ((prev: TContent) => TContent)) => void;
  setStyles: (next: React.CSSProperties | undefined) => void;
  setSettings: (next: Record<string, unknown> | undefined) => void;
  isPreview?: boolean;
  isSelected?: boolean;
  onNestedBlockChange?: (updated: BlockConfig) => void;
};

export type CreateBlockDefinitionConfig<TContent> = {
  id: string;
  label: string;
  icon: BlockDefinition["icon"];
  description: string;
  category: BlockCategory;
  defaultContent: TContent;
  defaultStyles?: Record<string, unknown>;
  isContainer?: boolean;
  handlesOwnChildren?: boolean;
  hasSettings?: boolean;
  settings?: BlockDefinition["settings"];
  /** Pure renderer — receives derived state + props, returns the block's JSX. */
  render: (args: BlockRenderArgs<TContent>) => React.ReactNode;
  /** Optional: parse persisted content into the editor model (structured blocks, e.g. icon). */
  parseContent?: (raw: BlockConfig["content"]) => TContent;
  /** Optional: serialize the editor model back to persisted content. */
  serializeContent?: (content: TContent) => BlockContent;
};

/**
 * Builds a `BlockDefinition` whose `component` is generated from a pure `render`
 * function, absorbing the per-block `useBlockState` wiring. Returns a standard
 * `BlockDefinition`, so the registry and renderer are unchanged.
 *
 * Opt-in: blocks with bespoke component logic can still declare `component`
 * directly instead of using this factory.
 */
export function createBlockDefinition<TContent>(
  config: CreateBlockDefinitionConfig<TContent>,
): BlockDefinition {
  const {
    defaultContent,
    defaultStyles,
    settings,
    render,
    parseContent,
    serializeContent,
    ...meta
  } = config;

  function BlockComponent({
    value,
    onChange,
    onNestedBlockChange,
    isPreview,
    isSelected,
  }: BlockComponentProps) {
    // Structured blocks parse persisted content into the editor model and
    // serialize it back on change; flat blocks pass through unchanged.
    const valueForState = React.useMemo(
      () =>
        parseContent
          ? { ...value, content: parseContent(value.content) as unknown as BlockContent }
          : value,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [value],
    );

    const handleChange = React.useCallback(
      (block: BlockConfig) => {
        if (serializeContent) {
          const parsed = parseContent
            ? parseContent(block.content)
            : (block.content as unknown as TContent);
          onChange({ ...block, content: serializeContent(parsed) });
        } else {
          onChange(block);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onChange],
    );

    const { content, styles, settings: st, setContent, setStyles, setSettings } =
      useBlockState<TContent>({
        value: valueForState,
        getDefaultContent: () => defaultContent,
        onChange: handleChange,
      });

    return (
      <>
        {render({
          value,
          content,
          styles,
          settings: st as Record<string, unknown> | undefined,
          setContent,
          setStyles,
          setSettings: setSettings as BlockRenderArgs<TContent>["setSettings"],
          isPreview,
          isSelected,
          onNestedBlockChange,
        })}
      </>
    );
  }

  return {
    ...meta,
    defaultContent,
    defaultStyles: (defaultStyles ?? {}) as Record<string, any>,
    settings,
    component: BlockComponent,
  };
}
