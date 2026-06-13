import * as React from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent, renderChildBlocks } from "../render-helpers";
import { BLOCK_COMPONENTS } from "../block-components";
import {
	buildColumnStyle,
	buildColumnsContainerStyle,
	readColumnLayoutFromBlock,
	readColumnsData,
} from "@shared/columns-layout";
import {
	getBlockSiblingFlexItemStyles,
	getBlockStackLayerWrapperStyles,
	getContainerChildrenStackStyle,
	getContainerOuterShellStyle,
	getContainerParentDisplayMode,
	getContainerSiblingStackDirection,
	readContainerLayoutFromBlock,
} from "@shared/block-container-placement";
import { buildGroupShellStyles, readGroupShellContent } from "@shared/group-shell-styles";

/**
 * Columns Block Component
 * Renders a flexible column layout with nested children
 */
export function ColumnsBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = readColumnsData(block.content);
	const layoutMode = data.layoutMode || "flex";
	const direction = data.direction || "row";
	const columnVerticalAlignment = data.columnVerticalAlignment || "top";
	const columnHorizontalAlignment = data.columnHorizontalAlignment || "stretch";
	const columnLayout = readColumnLayoutFromBlock(block);

	const mergedClassName = [
		"wp-block-columns",
		data.verticalAlignment ? `is-vertically-aligned-${data.verticalAlignment}` : "",
		data.horizontalAlignment ? `is-horizontally-aligned-${data.horizontalAlignment}` : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const columnsStyle = buildColumnsContainerStyle(data, columnLayout, style);

	const columnAlignItems = {
		stretch: "stretch",
		left: "flex-start",
		center: "center",
		right: "flex-end",
	}[columnHorizontalAlignment];

	const columnJustifyContent = {
		top: "flex-start",
		center: "center",
		bottom: "flex-end",
		stretch: "stretch",
	}[columnVerticalAlignment];

	const renderChild = (child: BlockConfig): React.ReactNode => {
		const ChildComponent = BLOCK_COMPONENTS[child.name];
		if (!ChildComponent) {
			return null;
		}
		return <ChildComponent key={child.id} {...child} />;
	};

	return (
		<div
			className={mergedClassName || undefined}
			style={columnsStyle}
			{...attributes}
		>
			{columnLayout.map((column, index) => {
				const columnChildren =
					block.children?.filter((child) => column.blockIds?.includes(child.id)) || [];
				const columnKey = column.columnId || `column-${index}`;
				const columnStyle = buildColumnStyle(data, layoutMode, direction, column, columnLayout);

				return (
					<div
						key={columnKey}
						className="wp-block-column"
						style={{
							...columnStyle,
							display: "flex",
							flexDirection: "column",
							alignItems: columnAlignItems,
							justifyContent: columnJustifyContent,
							minWidth: 0,
						}}
					>
						{columnChildren.map((child) => (
							<div
								key={child.id}
								style={{
									width: "100%",
									minWidth: 0,
									...getBlockSiblingFlexItemStyles(child.styles, "column"),
									...getBlockStackLayerWrapperStyles(child),
								}}
							>
								{renderChild(child)}
							</div>
						))}
					</div>
				);
			})}
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

	const shellContent = readGroupShellContent(block.content);
	const { outerStyle, innerStackStyle, stackDirection, isHorizontal } = buildGroupShellStyles({
		styles: style,
		content: shellContent,
		children: block.children?.map((child) => ({ styles: child.styles })),
	});

	const renderChild = (child: BlockConfig): React.ReactNode => {
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
					...getBlockStackLayerWrapperStyles(child),
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
				<div className="wp-block-group__inner-container" style={innerStackStyle}>
					{block.children.map((child) => renderChild(child))}
				</div>
			</Tag>
		);
	}

	return (
		<Tag className={mergedClassName || undefined} style={outerStyle} {...attributes}>
			<div className="wp-block-group__inner-container" style={innerStackStyle} />
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
					...getBlockStackLayerWrapperStyles(child),
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
			<div className="wp-block-container__inner" style={innerStackStyle} />
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
