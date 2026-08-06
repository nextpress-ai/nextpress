import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types.js";
import { resolveBlockDeviceStyles, type DeviceView } from "./block-device-styles.js";
import { collectBlockDeviceStylesCSS } from "./collect-device-styles-css.js";
import { applyResponsiveDefaults, type ResponsiveWarning } from "./render-defaults.js";
import { deviceViewToTier, type ViewportTier } from "./responsive-scales.js";
import { resolveTokenMapForSSR } from "./token-resolution.js";
import { getEntryAnimationAttributes } from "./animation-utils.js";

export type RenderSurface = "canvas" | "preview" | "publish";

export type ResolveBlockForSurfaceParams = {
	block: BlockConfig;
	surface: RenderSurface;
	deviceView?: DeviceView;
	viewportTier?: ViewportTier;
	viewportWidthPx?: number;
};

export type ResolvedBlockRender = {
	inlineStyles: CSSProperties;
	classNames: string[];
	attributes: Record<string, string>;
	cssFragments: string[];
	warnings: ResponsiveWarning[];
	tokenStyles: Record<string, string>;
};

/** Resolves tier from params — device view takes precedence on canvas. */
function resolveTier(params: ResolveBlockForSurfaceParams): ViewportTier {
	if (params.viewportTier) return params.viewportTier;
	if (params.deviceView) return deviceViewToTier(params.deviceView);
	if (params.viewportWidthPx != null) {
		if (params.viewportWidthPx < 768) return "mobile";
		if (params.viewportWidthPx < 1024) return "medium";
		return "large";
	}
	return "large";
}

/**
 * Single render contract for canvas, preview, and publish surfaces.
 * Applies responsive defaults, device overrides (canvas), tokens, and emits CSS fragments.
 */
export function resolveBlockForSurface(params: ResolveBlockForSurfaceParams): ResolvedBlockRender {
	const { block, surface } = params;
	const tier = resolveTier(params);

	const defaults = applyResponsiveDefaults({ block, tier });

	let mergedStyles: CSSProperties = { ...defaults.styles };

	if (surface === "canvas" && params.deviceView) {
		const deviceMerged = resolveBlockDeviceStyles({ block, device: params.deviceView });
		mergedStyles = { ...mergedStyles, ...deviceMerged };
	}

	const tokenResult = block.other?.tokenMap
		? resolveTokenMapForSSR(block.id, block.other.tokenMap, block.other?.units || {})
		: { style: {}, modifierCSS: "" };

	mergedStyles = { ...mergedStyles, ...tokenResult.style };

	const classNames = [
		`block-${block.id}`,
		block.other?.classNames,
		...defaults.classNames,
	].filter(Boolean) as string[];

	const animationAttrs = block.other?.animation?.entry
		? getEntryAnimationAttributes(block.other.animation.entry)
		: {};

	const attributes: Record<string, string> = {};
	for (const [key, val] of Object.entries(block.other?.attributes ?? {})) {
		if (val != null) attributes[key] = String(val);
	}
	for (const [key, val] of Object.entries(animationAttrs)) {
		if (val != null) attributes[key] = String(val);
	}

	const cssFragments: string[] = [];
	if (tokenResult.modifierCSS) cssFragments.push(tokenResult.modifierCSS);

	if (surface !== "canvas") {
		const deviceCss = collectBlockDeviceStylesCSS(block);
		if (deviceCss) cssFragments.push(deviceCss);
	}

	return {
		inlineStyles: mergedStyles,
		classNames,
		attributes,
		cssFragments,
		warnings: defaults.warnings,
		tokenStyles: tokenResult.style,
	};
}

/** Walks block tree and aggregates CSS fragments + warnings. */
export function resolveBlockTreeForSurface({
	blocks,
	surface,
	deviceView,
	viewportTier,
}: {
	blocks: BlockConfig[];
	surface: RenderSurface;
	deviceView?: DeviceView;
	viewportTier?: ViewportTier;
}): { css: string; warnings: ResponsiveWarning[] } {
	const walk = (nodes: BlockConfig[]): { css: string[]; warnings: ResponsiveWarning[] } =>
		nodes.reduce(
			(acc, block) => {
				const resolved = resolveBlockForSurface({ block, surface, deviceView, viewportTier });
				acc.css.push(...resolved.cssFragments);
				acc.warnings.push(...resolved.warnings);
				if (block.children?.length) {
					const child = walk(block.children);
					acc.css.push(...child.css);
					acc.warnings.push(...child.warnings);
				}
				return acc;
			},
			{ css: [] as string[], warnings: [] as ResponsiveWarning[] },
		);

	const result = walk(blocks);
	return { css: result.css.filter(Boolean).join("\n"), warnings: result.warnings };
}
