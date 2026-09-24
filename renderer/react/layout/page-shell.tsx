import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, getBlockComponent } from "../render-helpers";
import { readPageShellContent } from "@shared/page-shell-model";
import { buildPageShellOuterStyle, getPageShellChildItemStyle, readPageColumnInset } from "@shared/page-shell-styles";
import { PageColumnProvider } from "@shared/page-column-context";
import { headerFloatWrapperStyles } from "@shared/header-model";

export function PageShellBlock(block: BlockConfig) {
	const { className, attributes } = getRenderProps(block);
	const content = readPageShellContent(block.content);
	const childBlocks = block.children ?? [];
	const mergedClassName = ["wp-block-page-shell", className].filter(Boolean).join(" ");

	return (
		<div
			className={mergedClassName || undefined}
			{...attributes}
			style={buildPageShellOuterStyle({ content })}
		>
			<PageColumnProvider value={readPageColumnInset(content)}>
				{childBlocks.map((child) => {
					const ChildComponent = getBlockComponent(child.name);
					if (!ChildComponent) return null;
					return (
						<div
							key={child.id}
							style={{
								...getPageShellChildItemStyle({ child, content, siblings: childBlocks }),
								...headerFloatWrapperStyles(child),
							}}
						>
							<ChildComponent {...child} />
						</div>
					);
				})}
			</PageColumnProvider>
		</div>
	);
}
