import * as React from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent, renderChildBlocks } from "../render-helpers";
import { BLOCK_COMPONENTS } from "../block-components";
import { buildFlexRowColumnStyle } from "@shared/columns-flex-style";
import {
	getBlockSiblingFlexItemStyles,
	getContainerChildrenStackStyle,
	getContainerOuterShellStyle,
	getContainerParentDisplayMode,
	getContainerSiblingStackDirection,
	readContainerLayoutFromBlock,
} from "@shared/block-container-placement";

/**
 * Columns Block Component
 * Renders a flexible column layout with nested children
 */
export function ColumnsBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);

	const gap = data.gap as string | undefined;
	const minColumnWidth = data.minColumnWidth as string | undefined;
	const verticalAlignment = data.verticalAlignment as string | undefined;
	const horizontalAlignment = data.horizontalAlignment as string | undefined;
	const direction = (data.direction as string) || "row";
	const layoutMode = data.layoutMode as string | undefined;
	const columnLayout = data.columnLayout as Array<{ columnId: string; width?: string; blockIds?: string[] }> | undefined;

	const mergedClassName = [
		"wp-block-columns",
		verticalAlignment ? `is-vertically-aligned-${verticalAlignment}` : "",
		horizontalAlignment ? `is-horizontally-aligned-${horizontalAlignment}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const columnsStyle: React.CSSProperties = {
		...style,
		display: "flex",
		flexDirection: direction,
		...(gap ? { gap } : {}),
		...(verticalAlignment
			? {
					alignItems: {
						top: "flex-start",
						center: "center",
						bottom: "flex-end",
						stretch: "stretch",
					}[verticalAlignment],
				}
			: {}),
		...(horizontalAlignment
			? {
					justifyContent: {
						left: "flex-start",
						center: "center",
						right: "flex-end",
						"space-between": "space-between",
						"space-around": "space-around",
					}[horizontalAlignment],
				}
			: {}),
	};

	// Helper to render a single child block
	const renderChild = (child: BlockConfig): React.ReactNode => {
		const ChildComponent = BLOCK_COMPONENTS[child.name];
		if (!ChildComponent) {
			return null;
		}
		return <ChildComponent key={child.id} {...child} />;
	};

	// If columnLayout is provided, use it to structure columns
	if (columnLayout && columnLayout.length > 0) {
		const gapCss = (gap && String(gap).trim()) || "20px";
		const columnCount = columnLayout.length;

		return (
			<div
				className={mergedClassName || undefined}
				style={columnsStyle}
				{...attributes}
			>
				{columnLayout.map((column, index) => {
					const columnChildren =
						block.children?.filter((child) =>
							column.blockIds?.includes(child.id)
						) || [];

					const columnKey = column.columnId || `column-${index}`;
					return (
						<div
							key={columnKey}
							className="wp-block-column"
							style={
								direction === "row"
									? (buildFlexRowColumnStyle(column.width, minColumnWidth, {
											gap: gapCss,
											columnCount,
										}) as React.CSSProperties)
									: { minWidth: 0, width: "100%" }
							}
						>
							{columnChildren.map((child) => renderChild(child))}
						</div>
					);
				})}
			</div>
		);
	}

	// Fallback: render children directly if no columnLayout
	if (block.children && block.children.length > 0) {
		return (
			<div
				className={mergedClassName || undefined}
				style={columnsStyle}
				{...attributes}
			>
				{block.children.map((child) => (
					<div
						key={child.id}
						className="wp-block-column"
						style={{ flex: "1" }}
					>
						{renderChild(child)}
					</div>
				))}
			</div>
		);
	}

	// Empty columns container
	return (
		<div
			className={mergedClassName || undefined}
			style={columnsStyle}
			{...attributes}
		>
			{/* Empty columns */}
		</div>
	);
}

/**
 * Group Block Component
 * Renders a container group with nested children
 */
export function GroupBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const layout = data.layout as string | undefined;
	const tagName = (data.tagName as string) || "div";

	const Tag = tagName as "div" | "section" | "article" | "main" | "header" | "footer" | "aside" | "nav" | "span" | "p";

	const mergedClassName = [
		"wp-block-group",
		layout ? `is-layout-${layout}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const renderedChildren = renderChildBlocks(block.children || []);

	if (block.children && block.children.length > 0) {
		return (
			<Tag
				className={mergedClassName || undefined}
				style={style}
				{...attributes}
			>
				{renderedChildren}
			</Tag>
		);
	}

	return (
		<Tag className={mergedClassName || undefined} style={style} {...attributes}>
			{/* Empty group */}
		</Tag>
	);
}

/**
 * Container Block — single column wrapper with styles from block config
 */
export function ContainerBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const tagName = (data.tagName as string) || "div";
	const dataClassName = data.className as string | undefined;

	const Tag = tagName as "div" | "section" | "article" | "aside";

	const mergedClassName = ["wp-block-container", dataClassName, className].filter(Boolean).join(" ");
	const layout = readContainerLayoutFromBlock({ styles: style });
	const parentDisplay = getContainerParentDisplayMode(layout);
	const stackDirection = getContainerSiblingStackDirection(layout);
	const isHorizontal = parentDisplay === "flex" && layout.flexDirection === "row";
	const innerStackStyle = getContainerChildrenStackStyle(layout, {
		shellStyles: style,
		children: block.children?.map((child) => ({ styles: child.styles })),
	});
	const outerStyle = getContainerOuterShellStyle(style, {
		children: block.children?.map((child) => ({ styles: child.styles })),
	});

	const renderChild = (child: BlockConfig, index: number): React.ReactNode => {
		const ChildComponent = BLOCK_COMPONENTS[child.name];
		if (!ChildComponent) {
			return null;
		}
		return (
			<div
				key={child.id}
				style={{
					minWidth: 0,
					flex: isHorizontal ? "1 1 auto" : undefined,
					...getBlockSiblingFlexItemStyles(child.styles, stackDirection),
				}}
			>
				<ChildComponent {...child} />
			</div>
		);
	};

	if (block.children && block.children.length > 0) {
		return (
			<Tag
				className={mergedClassName || undefined}
				style={outerStyle}
				{...attributes}
			>
				<div className="wp-block-container__inner" style={innerStackStyle}>
					{block.children.map((child, index) => renderChild(child, index))}
				</div>
			</Tag>
		);
	}

	return (
		<Tag
			className={mergedClassName || undefined}
			style={outerStyle}
			{...attributes}
		>
			<div className="wp-block-container__inner" style={innerStackStyle}>{/* Empty container */}</div>
		</Tag>
	);
}

/**
 * Spacer Block Component
 * Renders a vertical spacer with configurable height
 */
export function SpacerBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const height = (data.height as string) || "40px";

	const mergedClassName = ["wp-block-spacer", className]
		.filter(Boolean)
		.join(" ");

	const spacerStyle: React.CSSProperties = {
		...style,
		height,
	};

	return (
		<div
			className={mergedClassName || undefined}
			style={spacerStyle}
			{...attributes}
		/>
	);
}

/**
 * Separator Block Component
 * Renders a horizontal separator line
 */
export function SeparatorBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const separatorStyle = data.separatorStyle as string | undefined;

	const mergedClassName = [
		"wp-block-separator",
		separatorStyle ? `is-style-${separatorStyle}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<hr
			className={mergedClassName || undefined}
			style={style}
			{...(attributes as Record<string, unknown>)}
		/>
	);
}

/**
 * Divider Block Component
 * Renders a divider line with optional styling
 */
export function DividerBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const dividerStyle = data.dividerStyle as string | undefined;

	const mergedClassName = [
		"wp-block-divider",
		dividerStyle ? `is-style-${dividerStyle}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const dividerElementStyle: React.CSSProperties = {
		...style,
	};
	if (dividerStyle) {
		dividerElementStyle.borderStyle = dividerStyle;
	} else if (!style?.borderStyle) {
		dividerElementStyle.borderStyle = "solid";
	}

	return (
		<hr
			className={mergedClassName || undefined}
			style={dividerElementStyle}
			{...(attributes as Record<string, unknown>)}
		/>
	);
}