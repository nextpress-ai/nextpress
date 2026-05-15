import type React from "react";

/**
 * Base type with common properties for all blocks
 */
interface BaseBlockData {
	blockName: string;
	interactive?: boolean;
	style?: React.CSSProperties;
	className?: string;
	customCss?: string;
	userCss?: string;
	attributes?: Record<string, any>;
	children?: BlockData[]; // For container blocks
	htmlOverride?: string; // If other.html is set, use this instead of component
}

// ============================================================================
// BASIC BLOCKS
// ============================================================================

interface HeadingConfig extends BaseBlockData {
	blockName: "core/heading";
	content: string;
	level: 1 | 2 | 3 | 4 | 5 | 6;
	anchor?: string;
	textAlign?: "left" | "center" | "right" | "justify";
}

interface ParagraphConfig extends BaseBlockData {
	blockName: "core/paragraph";
	content: string;
	textAlign?: "left" | "center" | "right" | "justify";
	dropCap?: boolean;
}

interface ButtonConfig extends BaseBlockData {
	blockName: "core/button";
	content: string;
	link?: string;
	target?: "_blank" | "_self";
	variant?: "primary" | "secondary" | "outline";
	// Icon support
	iconSet?: "lucide" | "react-icons" | "svgl";
	iconName?: string;
	iconSize?: number;
	iconColor?: string;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
}

interface ButtonsConfig extends BaseBlockData {
	blockName: "core/buttons";
	buttons?: Array<{
		id?: string;
		text?: string;
		url?: string;
		linkTarget?: string;
		target?: string;
		rel?: string;
		title?: string;
		className?: string;
	}>;
	layout?: string;
	orientation?: string;
}

// ============================================================================
// MEDIA BLOCKS
// ============================================================================

interface ImageConfig extends BaseBlockData {
	blockName: "core/image";
	url: string;
	alt?: string;
	caption?: string;
	width?: number | string;
	height?: number | string;
	objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

interface VideoConfig extends BaseBlockData {
	blockName: "core/video";
	url: string;
	alt?: string;
	caption?: string;
	autoplay?: boolean;
	loop?: boolean;
	controls?: boolean;
	poster?: string;
}

interface AudioConfig extends BaseBlockData {
	blockName: "core/audio";
	url: string;
	alt?: string;
	caption?: string;
	autoplay?: boolean;
	loop?: boolean;
	controls?: boolean;
}

interface GalleryConfig extends BaseBlockData {
	blockName: "core/gallery";
	images?: Array<{
		url: string;
		alt?: string;
		caption?: string;
	}>;
	columns?: number;
}

interface CoverConfig extends BaseBlockData {
	blockName: "core/cover";
	url: string;
	alt?: string;
	caption?: string;
	overlayColor?: string;
	overlayOpacity?: number;
	minHeight?: string;
}

interface FileConfig extends BaseBlockData {
	blockName: "core/file";
	url: string;
	filename?: string;
	fileSize?: string;
}

interface MediaTextConfig extends BaseBlockData {
	blockName: "core/media-text";
	url: string;
	alt?: string;
	caption?: string;
	mediaPosition?: "left" | "right";
	verticalAlignment?: "top" | "center" | "bottom";
}

// ============================================================================
// LAYOUT BLOCKS
// ============================================================================

interface ColumnsConfig extends BaseBlockData {
	blockName: "core/columns";
	gap?: string;
	minColumnWidth?: string;
	verticalAlignment?: "top" | "center" | "bottom" | "stretch";
	horizontalAlignment?: "left" | "center" | "right" | "space-between" | "space-around";
	direction?: "row" | "column";
	columnLayout?: Array<{
		columnId: string;
		width?: string;
		blockIds?: string[];
	}>;
}

interface GroupConfig extends BaseBlockData {
	blockName: "core/group";
	layout?: string;
	tagName?: string;
}

interface ContainerConfig extends BaseBlockData {
	blockName: "core/container";
	tagName?: string;
}

interface SpacerConfig extends BaseBlockData {
	blockName: "core/spacer";
	height?: string;
}

interface SeparatorConfig extends BaseBlockData {
	blockName: "core/separator";
	separatorStyle?: "default" | "wide" | "dots";
}

interface DividerConfig extends BaseBlockData {
	blockName: "core/divider";
	dividerStyle?: "solid" | "dashed" | "dotted";
}

// ============================================================================
// ADVANCED BLOCKS
// ============================================================================

interface QuoteConfig extends BaseBlockData {
	blockName: "core/quote";
	content: string;
	citation?: string;
}

interface ListConfig extends BaseBlockData {
	blockName: "core/list";
	content: string;
	ordered?: boolean;
	start?: number;
}

interface CodeConfig extends BaseBlockData {
	blockName: "core/code";
	content: string;
	language?: string;
}

interface HtmlConfig extends BaseBlockData {
	blockName: "core/html";
	content: string;
	sanitized?: boolean;
}

interface PullquoteConfig extends BaseBlockData {
	blockName: "core/pullquote";
	content: string;
	citation?: string;
}

interface PreformattedConfig extends BaseBlockData {
	blockName: "core/preformatted";
	content: string;
}

interface TableConfig extends BaseBlockData {
	blockName: "core/table";
	headers?: string[];
	rows?: string[][];
	hasFixedLayout?: boolean;
}

interface MarkdownConfig extends BaseBlockData {
	blockName: "core/markdown";
	content: string;
}

interface IconConfig extends BaseBlockData {
	blockName: "core/icon";
	iconSet: "lucide" | "react-icons" | "svgl";
	iconName: string;
	iconSize?: number;
	iconSizeUnit?: string;
	iconColor?: string;
	iconStrokeWidth?: number;
	iconStrokeWidthUnit?: string;
	link?: string;
	linkTarget?: "_blank" | "_self";
	label?: string;
}

// ============================================================================
// LEGACY/SPECIAL BLOCKS
// ============================================================================

interface CounterConfig extends BaseBlockData {
	blockName: "core/counter";
	initialCount: number;
}

/**
 * Union type of all block data configurations
 */
export type BlockData =
	| HeadingConfig
	| ParagraphConfig
	| ButtonConfig
	| ButtonsConfig
	| ImageConfig
	| VideoConfig
	| AudioConfig
	| GalleryConfig
	| CoverConfig
	| FileConfig
	| MediaTextConfig
	| ColumnsConfig
	| GroupConfig
	| ContainerConfig
	| SpacerConfig
	| SeparatorConfig
	| DividerConfig
	| QuoteConfig
	| ListConfig
	| CodeConfig
	| HtmlConfig
	| PullquoteConfig
	| PreformattedConfig
	| TableConfig
	| MarkdownConfig
	| IconConfig
	| CounterConfig;
