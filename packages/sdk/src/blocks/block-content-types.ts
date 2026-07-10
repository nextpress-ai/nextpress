import type {
	ContainerHtmlTagName,
	GroupHtmlTagName,
} from "../types/page-other.js";
import type { IconReference } from "../types/domain.js";

/**
 * Content-tab shapes aligned with dashboard block models (`client/.../blocks/*-model.ts`).
 * Persisted as `{ kind: "structured", data }` unless the block uses text/media/html kinds.
 */

/** Group block — Content tab: tagName, layoutPreset (semantics). Style tab: flex/grid layout. */
export type GroupContent = {
	tagName?: GroupHtmlTagName;
	className?: string;
	layoutPreset?: string;
};

/** Container block — Content tab: semantic tag only. Style tab: maxWidth, padding, background. */
export type ContainerContent = {
	tagName?: ContainerHtmlTagName;
	className?: string;
};

/** Buttons container — Content tab: row layout. Child CTAs use `core/button` in `children`. */
export type ButtonsContent = {
	layout?: string;
	orientation?: "horizontal" | "vertical";
	className?: string;
};

/** Icon block — Content tab: icon ref, link, label. Style tab: padding, colors. */
export type IconContent = {
	icon: IconReference;
	link: string;
	linkTarget: "_self" | "_blank";
	label: string;
};

export type GalleryImage = {
	id: string | number;
	url: string;
	alt: string;
	caption?: string;
	sizeSlug?: string;
};

export type GalleryContent = {
	images?: GalleryImage[];
	columns?: number;
	imageCrop?: boolean;
	linkTo?: "none" | "media" | "attachment";
	sizeSlug?: string;
	caption?: string;
	className?: string;
};

export type CoverContent = {
	url?: string;
	alt?: string;
	hasParallax?: boolean;
	dimRatio?: number;
	overlayColor?: string;
	minHeight?: number;
	contentPosition?: string;
	customOverlayColor?: string;
	backgroundType?: "image" | "video";
	focalPoint?: { x: number; y: number };
	innerContent?: string;
	className?: string;
};

export type SpacerContent = {
	height?: string;
};

export type SeparatorContent = {
	style?: string;
};

export type DividerContent = {
	style?: string;
};

export type ColumnsContent = {
	layoutMode?: "flex" | "grid";
	minColumnWidth?: string;
	verticalAlignment?: string;
	horizontalAlignment?: string;
	columnVerticalAlignment?: string;
	columnHorizontalAlignment?: string;
	columns?: number;
};

export type ListContent = {
	ordered?: boolean;
	items?: string[];
};

export type MediaTextContent = {
	mediaUrl?: string;
	mediaType?: "image" | "video";
	text?: string;
	mediaPosition?: "left" | "right";
};

export type FileContent = {
	url?: string;
	filename?: string;
	showDownloadButton?: boolean;
};

export type TableContent = {
	headers?: string[];
	rows?: string[][];
};

export type PostListContent = {
	layout?: string;
	postsPerPage?: number;
	showExcerpt?: boolean;
	showFeaturedImage?: boolean;
	showDate?: boolean;
	showAuthor?: boolean;
	blogId?: string;
	orderBy?: string;
	order?: string;
};

export type PostTitleContent = {
	showLink?: boolean;
};

export type PostFeaturedImageContent = {
	aspectRatio?: string;
	objectFit?: string;
};

export type PostTocContent = {
	title?: string;
	maxDepth?: number;
};

export type PostAuthorBoxContent = {
	showAvatar?: boolean;
	showBio?: boolean;
};

export type PostNavigationContent = {
	showPrevious?: boolean;
	showNext?: boolean;
};

export type PostInfoContent = {
	showDate?: boolean;
	showAuthor?: boolean;
	showCategories?: boolean;
};

export type PostProgressContent = {
	position?: string;
};

export type InputFieldContent = {
	type?: "text" | "email" | "search" | "password" | "number" | "tel" | "url";
	name?: string;
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
};

export type TextareaFieldContent = {
	name?: string;
	placeholder?: string;
	defaultValue?: string;
	rows?: number;
	required?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
};

export type SelectFieldContent = {
	name?: string;
	placeholder?: string;
	defaultValue?: string;
	options?: Array<{ label: string; value: string }>;
	required?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
};
