import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent } from "../render-helpers";

/**
 * Post Author Box — SSR placeholder.
 * Shows avatar circle, name, and bio when configured.
 */
export function PostAuthorBoxBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showAvatar = data.showAvatar !== false;
	const showName = data.showName !== false;
	const showBio = data.showBio !== false;
	const isVertical = (data.layout as string) === "vertical";
	const avatarSize = (data.avatarSize as number) || 48;
	const name = (data.name as string) || "Author Name";
	const bio = (data.bio as string) || "Author bio placeholder.";
	const avatar = typeof data.avatar === "string" ? data.avatar : "";

	const mergedClassName = ["wp-block-post-author-box", className].filter(Boolean).join(" ");

	return (
		<div className={mergedClassName || undefined} style={{ display: "flex", flexDirection: isVertical ? "column" : "row", alignItems: isVertical ? "center" : "flex-start", gap: "12px", ...style }} {...attributes}>
			{showAvatar && (
				avatar ? (
					<img
						className="wp-block-post-author-box__avatar"
						src={avatar}
						alt={name}
						style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
					/>
				) : (
					<div className="wp-block-post-author-box__avatar" style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", backgroundColor: "var(--npb-border-default)", flexShrink: 0 }} />
				)
			)}
			<div className="wp-block-post-author-box__info">
				{showName && <strong className="wp-block-post-author-box__name">{name}</strong>}
				{showBio && <p className="wp-block-post-author-box__bio" style={{ margin: "4px 0 0", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>{bio}</p>}
			</div>
		</div>
	);
}

/**
 * Post Comments — SSR placeholder.
 * Shows heading and placeholder comment list.
 */
export function PostCommentsBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showCount = data.showCount !== false;
	const showForm = data.showForm !== false;

	const mergedClassName = ["wp-block-post-comments", className]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			<h3 className="wp-block-post-comments__title">
				Comments{showCount ? " (3)" : ""}
			</h3>
			<div className="wp-block-post-comments__list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
				{["Jane Doe", "John Smith"].map((author, i) => (
					<div key={i} className="wp-block-post-comments__comment" style={{ padding: "8px 0", borderBottom: "1px solid var(--npb-border-default)" }}>
						<strong>{author}</strong>
						<p style={{ margin: "4px 0 0", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>
							Comment placeholder text.
						</p>
					</div>
				))}
			</div>
			{showForm && (
				<p className="wp-block-post-comments__form-note" style={{ marginTop: "16px", fontSize: "0.875rem", color: "var(--npb-text-muted)" }}>
					Leave a reply
				</p>
			)}
		</div>
	);
}

/**
 * Post Info — SSR placeholder.
 * Shows date, categories, tags, and read time inline or stacked.
 */
export function PostInfoBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showDate = data.showDate !== false;
	const showCategories = data.showCategories !== false;
	const showTags = data.showTags !== false;
	const showReadTime = data.showReadTime !== false;
	const layout = (data.layout as string) || "inline";

	const mergedClassName = ["wp-block-post-info", className]
		.filter(Boolean)
		.join(" ");

	const isInline = layout === "inline";
	const separator = isInline ? " · " : undefined;

	const hasBoundMeta =
		typeof data.publishedAt === "string" ||
		Array.isArray(data.categories) ||
		Array.isArray(data.tags);

	const items: string[] = [];
	const publishedAt = typeof data.publishedAt === "string" ? data.publishedAt : "";
	const categories = Array.isArray(data.categories)
		? data.categories.filter((item): item is string => typeof item === "string")
		: [];
	const tags = Array.isArray(data.tags)
		? data.tags.filter((item): item is string => typeof item === "string")
		: [];
	if (showDate) {
		if (publishedAt) {
			items.push(
				new Date(publishedAt).toLocaleDateString(undefined, {
					year: "numeric",
					month: "long",
					day: "numeric",
				}),
			);
		} else if (!hasBoundMeta) {
			items.push("January 15, 2025");
		}
	}
	if (showCategories) {
		if (categories.length > 0) items.push(categories.join(", "));
		else if (!hasBoundMeta) items.push("Technology, Design");
	}
	if (showTags) {
		if (tags.length > 0) items.push(tags.map((tag) => `#${tag}`).join(" "));
		else if (!hasBoundMeta) items.push("#react #nextpress #cms");
	}
	if (showReadTime) items.push("5 min read");

	return (
		<div
			className={mergedClassName || undefined}
			style={{
				display: isInline ? "flex" : "flex",
				flexDirection: isInline ? "row" : "column",
				flexWrap: "wrap",
				gap: isInline ? "0" : "4px",
				color: "var(--npb-text-secondary)",
				fontSize: "0.875rem",
				...style,
			}}
			{...attributes}
		>
			{items.map((item, i) => (
				<React.Fragment key={i}>
					<span className="wp-block-post-info__meta">{item}</span>
					{separator && i < items.length - 1 && <span>{separator}</span>}
				</React.Fragment>
			))}
		</div>
	);
}

/**
 * Post Navigation — SSR placeholder.
 * Shows prev/next navigation links.
 */
export function PostNavigationBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showLabel = data.showLabel !== false;
	const prevLabel = (data.prevLabel as string) || "Previous Post";
	const nextLabel = (data.nextLabel as string) || "Next Post";

	const mergedClassName = ["wp-block-post-navigation", className]
		.filter(Boolean)
		.join(" ");

	return (
		<nav
			className={mergedClassName || undefined}
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: "16px",
				...style,
			}}
			{...attributes}
		>
			<a
				className="wp-block-post-navigation__link wp-block-post-navigation__link--prev"
				href="#"
				style={{ textDecoration: "none", color: "var(--npb-accent)" }}
			>
				{showLabel && <small style={{ display: "block", color: "var(--npb-text-secondary)" }}>{prevLabel}</small>}
				<span>Previous Post Title</span>
			</a>
			<a
				className="wp-block-post-navigation__link wp-block-post-navigation__link--next"
				href="#"
				style={{ textDecoration: "none", color: "var(--npb-accent)", textAlign: "right" }}
			>
				{showLabel && <small style={{ display: "block", color: "var(--npb-text-secondary)" }}>{nextLabel}</small>}
				<span>Next Post Title</span>
			</a>
		</nav>
	);
}

/**
 * Post Table of Contents — SSR placeholder.
 * Shows heading and placeholder list.
 */
export function PostTocBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const title = (data.title as string) || "Table of Contents";
	const ordered = data.ordered as boolean | undefined;

	const mergedClassName = ["wp-block-post-toc", className]
		.filter(Boolean)
		.join(" ");

	const ListTag = ordered ? "ol" : "ul";

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			<strong className="wp-block-post-toc__title">{title}</strong>
			<ListTag className="wp-block-post-toc__list" style={{ margin: "8px 0 0", paddingLeft: "20px", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>
				<li>Section One</li>
				<li>Section Two</li>
				<li>Section Three</li>
			</ListTag>
		</div>
	);
}

/**
 * Post List — SSR placeholder.
 * Shows grid/list of placeholder post cards.
 */
export function PostListBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const layout = (data.layout as string) || "cards";
	const showExcerpt = data.showExcerpt !== false;
	const showFeaturedImage = data.showFeaturedImage !== false;
	const showDate = data.showDate !== false;
	const showAuthor = data.showAuthor !== false;
	const isGrid = layout === "grid" || layout === "cards";

	const mergedClassName = ["wp-block-post-list", className].filter(Boolean).join(" ");

	return (
		<div className={mergedClassName || undefined} style={{ display: isGrid ? "grid" : "flex", gridTemplateColumns: isGrid ? "repeat(auto-fill, minmax(250px, 1fr))" : undefined, flexDirection: isGrid ? undefined : "column", gap: "16px", ...style }} {...attributes}>
			{[1, 2, 3].map((i) => (
				<article key={i} className="wp-block-post-list__card" style={{ border: "1px solid var(--npb-border-default)", borderRadius: "4px", overflow: "hidden" }}>
					{showFeaturedImage && <div style={{ backgroundColor: "var(--npb-surface-raised)", height: "140px" }} />}
					<div style={{ padding: "12px" }}>
						<strong style={{ display: "block", marginBottom: "4px" }}>Post Title {i}</strong>
						{showExcerpt && <p style={{ margin: "0 0 8px", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>Post excerpt placeholder text for card {i}.</p>}
						{(showDate || showAuthor) && <small style={{ color: "var(--npb-text-muted)" }}>{showDate && "Jan 15, 2025"}{showDate && showAuthor && " · "}{showAuthor && "Author"}</small>}
					</div>
				</article>
			))}
		</div>
	);
}

/**
 * Post Progress — SSR placeholder.
 * Static progress bar at 0% (no scroll position in SSR).
 */
export function PostProgressBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const color = (data.color as string) || "var(--npb-accent)";
	const height = (data.height as number) || 4;
	const position = (data.position as string) || "top";
	const backgroundColor = (data.backgroundColor as string) || "transparent";

	const mergedClassName = ["wp-block-post-progress", className]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={mergedClassName || undefined}
			role="progressbar"
			aria-valuenow={0}
			aria-valuemin={0}
			aria-valuemax={100}
			style={{
				position: position === "top" ? "sticky" : "fixed",
				top: position === "top" ? 0 : undefined,
				bottom: position === "bottom" ? 0 : undefined,
				left: 0,
				right: 0,
				width: "100%",
				height,
				backgroundColor: backgroundColor === "transparent" ? "var(--npb-border-default)" : backgroundColor,
				zIndex: 50,
				...style,
			}}
			{...attributes}
		>
			<div
				className="wp-block-post-progress__bar"
				style={{
					width: "0%",
					height: "100%",
					backgroundColor: color,
					transition: "width 0.1s linear",
				}}
			/>
		</div>
	);
}