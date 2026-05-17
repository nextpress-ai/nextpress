import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { nanoid } from "nanoid";
import {
	registerBlockState,
	unregisterBlockState,
} from "./blockStateRegistry";

function useMountEffect(effect: () => void | (() => void)) {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(effect, []);
}

/**
 * WHY: `updateBlockDeep` deep-merges `styles`; keys missing from the patch keep old values.
 * Callers often build the next sheet by spreading `prev` and **dropping** cleared keys.
 * Emitting explicit `null` for those keys matches `deepMerge`’s clear contract (see `treeUtils.ts`).
 */
function withNullsForRemovedStyleKeys(
	prev: React.CSSProperties | undefined,
	next: React.CSSProperties | undefined,
): React.CSSProperties | undefined {
	if (next === undefined) {
		return undefined;
	}
	const merged: Record<string, string | number | null | undefined> = {
		...(next as Record<string, string | number | null | undefined>),
	};
	if (!prev) {
		return merged as React.CSSProperties;
	}
	const prevRec = prev as Record<string, string | number | null | undefined>;
	for (const key of Object.keys(prevRec)) {
		if (!Object.prototype.hasOwnProperty.call(next, key)) {
			merged[key] = null;
		}
	}
	return merged as React.CSSProperties;
}

interface UseBlockStateOptions<TContent> {
	value: BlockConfig;
	getDefaultContent: () => TContent;
	onChange: (block: BlockConfig) => void;
}

interface UseBlockStateResult<TContent> {
	clientId: string;
	content: TContent;
	setContent: React.Dispatch<React.SetStateAction<TContent>>;
	styles: React.CSSProperties | undefined;
	setStyles: React.Dispatch<
		React.SetStateAction<React.CSSProperties | undefined>
	>;
	settings: Record<string, any> | undefined;
	setSettings: React.Dispatch<
		React.SetStateAction<Record<string, any> | undefined>
	>;
}

/**
 * Custom hook for managing block state in the PageBuilder.
 *
 * Design decisions (no-use-effect compliant):
 * - State is DERIVED from props (Rule 1) — no local useState for content/styles/settings
 * - onChange is called PROCEDURALLY in setters (Rule 3/7) — not via effect
 * - Refs hold latest value/onChange for stable callback identity — this is NOT
 *   the "Effect-Ref Debt Spiral" (Rule 6). We're using refs for stable event
 *   handler identity, not to patch a broken effect.
 * - Registry is updated synchronously every render, cleanup via useMountEffect
 */
export function useBlockState<TContent>({
	value,
	getDefaultContent,
	onChange,
}: UseBlockStateOptions<TContent>): UseBlockStateResult<TContent> {
	const [clientId] = useState(() => value.id || nanoid());

	// Derive state from props — Rule 1
	const content = (value.content as TContent) ?? getDefaultContent();
	const styles = value.styles;
	const settings = value.settings;

	// Refs for stable callback identity.
	// Updated synchronously every render so setters always have latest values.
	const valueRef = useRef(value);
	valueRef.current = value;

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const contentRef = useRef(content);
	contentRef.current = content;

	const stylesRef = useRef(styles);
	stylesRef.current = styles;

	const settingsRef = useRef(settings);
	settingsRef.current = settings;

	/**
	 * Stable setter for content — empty deps means identity never changes.
	 * Reads from refs inside to get the latest value and onChange.
	 * Follows "Parent Notification" pattern: calls onChange procedurally.
	 */
	const setContent = useCallback(
		(update: TContent | ((prev: TContent) => TContent)) => {
			const prev = contentRef.current;
			const next =
				typeof update === "function"
					? (update as (prev: TContent) => TContent)(prev)
					: update;
			// Eagerly update refs so getters return fresh values immediately,
			// preventing stale content when settings components force re-render
			contentRef.current = next;
			const updatedBlock = {
				...valueRef.current,
				content: next as BlockConfig["content"],
			};
			valueRef.current = updatedBlock;
			onChangeRef.current(updatedBlock);
		},
		[],
	);

	/** Stable setter for styles. */
	const setStyles = useCallback(
		(
			update:
				| React.CSSProperties
				| undefined
				| ((
						prev: React.CSSProperties | undefined,
				  ) => React.CSSProperties | undefined),
		) => {
			const prev = stylesRef.current;
			const next =
				typeof update === "function"
					? (
							update as (
								prev: React.CSSProperties | undefined,
							) => React.CSSProperties | undefined
						)(prev)
					: update;
			const stylesForTree = withNullsForRemovedStyleKeys(prev, next);
			// Eagerly update refs before notifying parent
			stylesRef.current = stylesForTree;
			const updatedBlock = { ...valueRef.current, styles: stylesForTree };
			valueRef.current = updatedBlock;
			onChangeRef.current(updatedBlock);
		},
		[],
	);

	/** Stable setter for settings. */
	const setSettings = useCallback(
		(
			update:
				| Record<string, any>
				| undefined
				| ((
						prev: Record<string, any> | undefined,
				  ) => Record<string, any> | undefined),
		) => {
			const prev = settingsRef.current;
			const next =
				typeof update === "function"
					? (
							update as (
								prev: Record<string, any> | undefined,
							) => Record<string, any> | undefined
						)(prev)
					: update;
			// Eagerly update refs before notifying parent
			settingsRef.current = next;
			const updatedBlock = { ...valueRef.current, settings: next };
			valueRef.current = updatedBlock;
			onChangeRef.current(updatedBlock);
		},
		[],
	);

	// Register accessor in the registry synchronously during render.
	// Getters read from refs so they always return current values.
	// Setters have stable identity (empty deps useCallback above).
	registerBlockState(clientId, {
		getContent: () => contentRef.current,
		getStyles: () => stylesRef.current,
		getSettings: () => settingsRef.current,
		setContent,
		setStyles,
		setSettings,
		getFullState: () => valueRef.current,
	});

	// Cleanup: unregister from registry on unmount only
	useMountEffect(() => {
		return () => unregisterBlockState(clientId);
	});

	return {
		clientId,
		content,
		setContent,
		styles,
		setStyles,
		settings,
		setSettings,
	};
}
