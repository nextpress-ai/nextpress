import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, getBlockComponent } from "../render-helpers";
import { readPageShellContent } from "@shared/page-shell-model";
import { buildPageShellOuterStyle, getPageShellChildItemStyle } from "@shared/page-shell-styles";

export function PageShellBlock(block: BlockConfig) {
	const { className, attributes } = getRenderProps(block);
	const content = readPageShellContent(block.content);
	const childBlocks = block.children ?? [];
	const mergedClassName = ["wp-block-page-shell", className].filter(Boolean).join(" ");

	return (
		<div
			className={mergedClassName || undefined}
			style={buildPageShellOuterStyle({ content })}
			{...attributes}
		>
			{childBlocks.map((child) => {
				const ChildComponent = getBlockComponent(child.name);
				if (!ChildComponent) return null;
				return (
					<div key={child.id} style={getPageShellChildItemStyle({ child, content })}>
						<ChildComponent {...child} />
					</div>
				);
			})}
		</div>
	);
}
