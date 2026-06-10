import type { CSSProperties } from "react";
import * as React from "react";
import { Suspense } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { generateBlockAnimationCSS, getEntryAnimationAttributes } from "@shared/animation-utils";
import { getBlockSiblingFlexItemStyles, getBlockStackLayerWrapperStyles, stripBlockContainerPlacementStyles, type BlockStackDirection } from "@shared/block-container-placement";
import { generateBlockModifierCSS, resolveTokenMap } from "@/lib/tailwind-tokens";
import { BLOCK_COMPONENTS } from "../../../../renderer/react/block-components";
import { ClientIconBlock } from "./blocks/ClientIconBlock";

type PublicBlockRendererProps = {
	block: BlockConfig;
	stackDirection?: BlockStackDirection;
};

const CLIENT_COMPONENTS: Record<string, React.FC<BlockConfig>> = {
	"core/icon": ClientIconBlock,
};

function getPublicBlockStyles(block: BlockConfig) {
	const tokenResolution = block.other?.tokenMap
		? resolveTokenMap(block.other.tokenMap, block.other?.units || {})
		: null;
	const styles = stripBlockContainerPlacementStyles({ ...block.styles, ...(tokenResolution?.style || {}) });
	const modifierCSS = tokenResolution?.modifierEntries?.length
		? generateBlockModifierCSS(block.id, tokenResolution.modifierEntries) : "";
	const animationCSS = block.other?.animation ? generateBlockAnimationCSS(block.id, block.other.animation) : "";
	return { css: [modifierCSS, animationCSS].filter(Boolean).join("\n"), styles };
}

function BlockWrapper({ block, styles, stackDirection, children }: {
	block: BlockConfig;
	styles: CSSProperties;
	stackDirection: BlockStackDirection;
	children: React.ReactNode;
}) {
	const flexItemPlacement = getBlockSiblingFlexItemStyles(block.styles, stackDirection);
	const animationAttributes = block.other?.animation?.entry ? getEntryAnimationAttributes(block.other.animation.entry) : {};
	return (
		<div className="block-container w-full">
			<div style={{ width: "100%", minWidth: 0, ...flexItemPlacement, ...getBlockStackLayerWrapperStyles(block) }}>
				<div className={`block-${block.id}`} style={{ width: styles.width || "100%" }} {...animationAttributes}>
					{children}
				</div>
			</div>
		</div>
	);
}

/**
 * Thin public block renderer wrapper.
 * Delegates to renderer/react/* components and adds client-specific concerns:
 * - Container wrapper with flex item placement and stack layer
 * - Animation/modifier CSS injection
 * - Stack direction handling
 * - Lazy-loaded heavy deps (icons, markdown)
 */
export default function PublicBlockRenderer({ block, stackDirection = "column" }: PublicBlockRendererProps) {
	const { styles, css } = getPublicBlockStyles(block);
	const Component = CLIENT_COMPONENTS[block.name] || BLOCK_COMPONENTS[block.name];

	if (!Component) {
		return (
			<BlockWrapper block={block} styles={styles} stackDirection={stackDirection}>
				<div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500">
					{block.label || block.name} block is not available in the public renderer yet.
				</div>
			</BlockWrapper>
		);
	}

	return (
		<>
			<BlockWrapper block={block} styles={styles} stackDirection={stackDirection}>
				<Suspense fallback={<div style={{ minHeight: "20px" }} />}>
					<Component {...block} />
				</Suspense>
			</BlockWrapper>
			{css && <style dangerouslySetInnerHTML={{ __html: css }} />}
		</>
	);
}
