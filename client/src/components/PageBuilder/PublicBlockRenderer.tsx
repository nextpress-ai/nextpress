import type { CSSProperties } from "react";
import * as React from "react";
import { Suspense } from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { DeviceView } from "@shared/block-device-styles";
import { resolveBlockForSurface } from "@shared/resolve-block-for-surface";
import { generateBlockAnimationCSS, getEntryAnimationAttributes } from "@shared/animation-utils";
import {
	getBlockSiblingFlexItemStyles,
	getBlockStackLayerWrapperStyles,
	stripBlockContainerPlacementStyles,
	type BlockStackDirection,
} from "@shared/block-container-placement";
import { BLOCK_COMPONENTS } from "../../../../renderer/react/block-components";
import { registerClientBlockComponents } from "../../../../renderer/react/render-helpers";
import { ClientIconBlock } from "./blocks/ClientIconBlock";
import { CLIENT_POST_COMPONENTS } from "./client-post-blocks";

type PublicBlockRendererProps = {
	block: BlockConfig;
	stackDirection?: BlockStackDirection;
	deviceView?: DeviceView;
};

const CLIENT_COMPONENTS: Record<string, React.FC<BlockConfig>> = {
	"core/icon": ClientIconBlock,
	...CLIENT_POST_COMPONENTS,
};

registerClientBlockComponents(CLIENT_COMPONENTS);

function getPublicBlockStyles(block: BlockConfig, deviceView?: DeviceView) {
	const resolved = resolveBlockForSurface({
		block,
		surface: deviceView ? "canvas" : "publish",
		deviceView,
	});

	const styles = stripBlockContainerPlacementStyles(resolved.inlineStyles);
	const cssParts = [...resolved.cssFragments].filter(Boolean);
	const animationCSS = block.other?.animation ? generateBlockAnimationCSS(block.id, block.other.animation) : "";
	if (animationCSS) cssParts.push(animationCSS);

	return {
		css: cssParts.join("\n"),
		styles,
		classNames: resolved.classNames,
	};
}

function BlockWrapper({
	block,
	styles,
	classNames,
	stackDirection,
	children,
}: {
	block: BlockConfig;
	styles: CSSProperties;
	classNames: string[];
	stackDirection: BlockStackDirection;
	children: React.ReactNode;
}) {
	const flexItemPlacement = getBlockSiblingFlexItemStyles(block.styles, stackDirection);
	const animationAttributes = block.other?.animation?.entry
		? getEntryAnimationAttributes(block.other.animation.entry)
		: {};
	return (
		<div className="block-container w-full">
			<div style={{ width: "100%", minWidth: 0, ...flexItemPlacement, ...getBlockStackLayerWrapperStyles(block) }}>
				<div
					className={classNames.join(" ")}
					style={{
						width: styles.width || "100%",
						minWidth: 0,
						boxSizing: "border-box",
					}}
					{...animationAttributes}
				>
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
export default function PublicBlockRenderer({
	block,
	stackDirection = "column",
	deviceView,
}: PublicBlockRendererProps) {
	const { styles, css, classNames } = getPublicBlockStyles(block, deviceView);
	const patchedBlock: BlockConfig = { ...block, styles };
	const Component = CLIENT_COMPONENTS[block.name] || BLOCK_COMPONENTS[block.name];

	if (!Component) {
		return (
			<BlockWrapper block={block} styles={styles} classNames={classNames} stackDirection={stackDirection}>
				<div className="rounded border border-dashed border-npb-border-strong p-4 text-sm text-npb-text-muted">
					{block.label || block.name} block is not available in the public renderer yet.
				</div>
			</BlockWrapper>
		);
	}

	return (
		<>
			<BlockWrapper block={block} styles={styles} classNames={classNames} stackDirection={stackDirection}>
				<Suspense fallback={<div style={{ minHeight: "20px" }} />}>
					<Component {...patchedBlock} />
				</Suspense>
			</BlockWrapper>
			{css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
		</>
	);
}
