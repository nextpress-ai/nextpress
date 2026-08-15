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
  isEditing?: boolean;
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
  /** Optional: parse persisted content into the editor model. Defaults to structured unwrap. */
  parseContent?: (raw: BlockConfig["content"]) => TContent;
  /** Optional: serialize the editor model back to persisted content. Defaults to structured wrap. */
  serializeContent?: (content: TContent) => BlockContent;
};

// ─── Default parse / serialize ──────────────────────────────────────────────

/**
 * Default parse: unwrap `{ kind: "structured", data }` → `data`.
 * Pass through everything else (text, media, etc.) as-is.
 */
export function defaultParseContent<TContent>(raw: BlockConfig["content"]): TContent {
	if (!raw || typeof raw !== "object") return raw as TContent;
	const r = raw as Record<string, unknown>;
	if (r.kind === "structured" && "data" in r && typeof r.data === "object") {
		return r.data as TContent;
	}
	return raw as TContent;
}

/**
 * Default serialize: wrap plain objects as `{ kind: "structured", data }`.
 * Content that already carries a `kind` discriminator (text, media, etc.)
 * is returned as-is — it already conforms to `BlockContent`.
 */
export function defaultSerializeContent<TContent>(content: TContent): BlockContent {
	if (content && typeof content === "object" && "kind" in content) {
		return content as BlockContent;
	}
	return { kind: "structured", data: content as Record<string, unknown> };
}

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
		parseContent: customParse,
		serializeContent: customSerialize,
		...meta
	} = config;

	const parse = customParse ?? defaultParseContent<TContent>;
	const serialize = customSerialize ?? defaultSerializeContent<TContent>;

	function BlockComponent({
		value,
		onChange,
		onNestedBlockChange,
		isPreview,
		isSelected,
		isEditing,
	}: BlockComponentProps) {
		const { content, styles, settings: st, setContent, setStyles, setSettings } =
			useBlockState<TContent>({
				value,
				getDefaultContent: () => defaultContent,
				onChange,
				parseContent: parse,
				serializeContent: serialize,
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
					isEditing,
					onNestedBlockChange,
				})}
			</>
		);
	}

	return {
		...meta,
		defaultContent: serialize(defaultContent),
		defaultStyles: (defaultStyles ?? {}) as Record<string, any>,
		settings,
		component: BlockComponent,
		parseContent: parse as BlockDefinition["parseContent"],
		serializeContent: serialize as BlockDefinition["serializeContent"],
	};
}