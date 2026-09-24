import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { HeaderBar } from "@shared/header-view";
import {
	HEADER_BLOCKS_ROW_STYLES,
	headerHasBlocksSlot,
	type HeaderContent,
} from "@shared/header-model";
import { useHeaderScroll } from "@shared/use-header-scroll";
import { ContainerChildren } from "../../BlockRenderer";

/** Room for an empty drop area so there is something to aim at while the row has no blocks yet. */
const EMPTY_DROP_MIN_WIDTH = "14rem";

/**
 * Canvas header — same bar as publish, links do not leave the editor. In the blocks layout the
 * right side is a real drop area: drag any block onto it.
 */
export function HeaderCanvas({
	content,
	hostBlock,
	isPreview = false,
	onNestedBlockChange,
}: {
	content: HeaderContent;
	hostBlock?: BlockConfig;
	isPreview?: boolean;
	onNestedBlockChange?: (updated: BlockConfig) => void;
}) {
	const children = hostBlock?.children ?? [];
	const containerRef = React.useRef<HTMLDivElement>(null);
	useHeaderScroll({
		containerRef,
		enabled: content.sticky && content.onScroll !== undefined,
		refreshKey: content,
	});
	const blocks =
		hostBlock && headerHasBlocksSlot(content.variant) ? (
			<div style={{ minWidth: children.length === 0 && !isPreview ? EMPTY_DROP_MIN_WIDTH : undefined }}>
				<ContainerChildren
					block={{
						...hostBlock,
						styles: { ...HEADER_BLOCKS_ROW_STYLES } as BlockConfig["styles"],
						children,
					}}
					isPreview={isPreview}
					stackClassName="wp-block-header__blocks"
					onBlockChange={onNestedBlockChange}
				/>
			</div>
		) : undefined;

	return (
		<div ref={containerRef} style={{ display: "contents" }}>
			<HeaderBar content={content} disableLinks={true} blocks={blocks} />
		</div>
	);
}
