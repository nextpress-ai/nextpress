import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { AppWindow } from "lucide-react";
import { ContainerChildren } from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import {
	DEFAULT_PAGE_SHELL_CONTENT,
	readPageShellContent,
	type PageShellContent,
} from "./page-shell-model";
import { buildPageShellOuterStyle, getPageShellChildItemStyle, readPageColumnInset } from "@shared/page-shell-styles";
import { PageColumnProvider } from "@shared/page-column-context";
import { PageShellSettings } from "./page-shell-settings";
import { buildScrollbarCss } from "@shared/scrollbar-model";

/** The editor's scrolling area, so the page's scrollbar look shows while you edit. */
const CANVAS_SCROLLER_SELECTOR = "[data-npb-canvas-scroller]";

function PageShellRenderer({
	hostBlock,
	content,
	isPreview,
	onNestedBlockChange,
}: {
	hostBlock: BlockConfig;
	content: PageShellContent;
	isPreview?: boolean;
	onNestedBlockChange?: (updated: BlockConfig) => void;
}) {
	const resolved = { ...DEFAULT_PAGE_SHELL_CONTENT, ...content };
	const blockForChildren: BlockConfig = {
		...hostBlock,
		content: hostBlock.content,
		children: hostBlock.children ?? [],
	};

	const scrollbarCss = buildScrollbarCss({ selector: CANVAS_SCROLLER_SELECTOR, settings: resolved.scrollbar });

	return (
		<div
			className={`wp-block-page-shell ${isPreview ? "" : "min-h-full flex-1"}`}
			style={buildPageShellOuterStyle({ content: resolved })}
		>
			{scrollbarCss ? <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} /> : null}
			<PageColumnProvider value={readPageColumnInset(resolved)}>
				<ContainerChildren
					block={blockForChildren}
					isPreview={isPreview ?? false}
					stackClassName="wp-block-page-shell__inner"
					onBlockChange={onNestedBlockChange}
					itemStyle={(child) =>
						getPageShellChildItemStyle({
							child,
							content: resolved,
							siblings: blockForChildren.children,
						})
					}
				/>
			</PageColumnProvider>
		</div>
	);
}

const PageShellBlock = createBlockDefinition<PageShellContent>({
	id: "core/page-shell",
	label: "Page shell",
	icon: AppWindow,
	description: "Page-wide canvas: padding, font, width, and colors",
	category: "layout",
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_PAGE_SHELL_CONTENT,
	defaultStyles: {
		width: "100%",
		boxSizing: "border-box",
		padding: "0px",
		margin: "0px",
	},
	settings: PageShellSettings,
	hasSettings: true,
	parseContent: (raw) => readPageShellContent(raw),
	render: ({ content, value, isPreview, onNestedBlockChange }) => (
		<PageShellRenderer
			hostBlock={value}
			content={content}
			isPreview={isPreview}
			onNestedBlockChange={onNestedBlockChange}
		/>
	),
});

export default PageShellBlock;
