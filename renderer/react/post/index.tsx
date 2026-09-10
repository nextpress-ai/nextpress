import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent } from "../render-helpers";
import { isSafePublicMediaUrl } from "@shared/bind-post-list";

export { PostCommentsBlock } from "./comments";

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
	const name = typeof data.name === "string" ? data.name : "";
	const bio = typeof data.bio === "string" ? data.bio : "";
	const avatar = typeof data.avatar === "string" ? data.avatar : "";

	const mergedClassName = ["wp-block-post-author-box", className].filter(Boolean).join(" ");
	const displayName = name || "Author";
	const displayBio = bio || "Author bio placeholder.";

	return (
		<div className={mergedClassName || undefined} style={{ display: "flex", flexDirection: isVertical ? "column" : "row", alignItems: isVertical ? "center" : "flex-start", gap: "12px", ...style }} {...attributes}>
			{showAvatar && (
				avatar ? (
					<img
						className="wp-block-post-author-box__avatar"
						src={avatar}
						alt={displayName || "Author"}
						style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
					/>
				) : (
					<div className="wp-block-post-author-box__avatar" style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", backgroundColor: "var(--npb-border-default)", flexShrink: 0 }} />
				)
			)}
			<div className="wp-block-post-author-box__info">
				{showName && displayName ? (
					<strong className="wp-block-post-author-box__name">{displayName}</strong>
				) : null}
				{showBio && displayBio ? (
					<p className="wp-block-post-author-box__bio" style={{ margin: "4px 0 0", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>{displayBio}</p>
				) : null}
			</div>
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
 * Post Navigation — bound prev/next from SSR, empty when the blog has no siblings.
 */
export function PostNavigationBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showLabel = data.showLabel !== false;
	const prevLabel = (data.prevLabel as string) || "Previous Post";
	const nextLabel = (data.nextLabel as string) || "Next Post";
	const isBound = Boolean(data.postId) || "prev" in data || "next" in data;
	const prev = isBound && data.prev && typeof data.prev === "object"
		? (data.prev as Record<string, unknown>)
		: null;
	const next = isBound && data.next && typeof data.next === "object"
		? (data.next as Record<string, unknown>)
		: null;

	const mergedClassName = ["wp-block-post-navigation", className]
		.filter(Boolean)
		.join(" ");

	if (isBound && !prev && !next) {
		return (
			<nav className={mergedClassName || undefined} style={style} {...attributes}>
				<p style={{ margin: 0, color: "var(--npb-text-muted)", fontSize: "0.875rem", textAlign: "center" }}>
					Previous and next posts appear here when more posts in this blog are published.
				</p>
			</nav>
		);
	}

	const prevHref = typeof prev?.slug === "string" ? `/post/${prev.slug}` : "#";
	const nextHref = typeof next?.slug === "string" ? `/post/${next.slug}` : "#";
	const prevTitle = typeof prev?.title === "string" ? prev.title : "Previous Post Title";
	const nextTitle = typeof next?.title === "string" ? next.title : "Next Post Title";

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
			{(!isBound || prev) ? (
				<a
					className="wp-block-post-navigation__link wp-block-post-navigation__link--prev"
					href={prevHref}
					style={{ textDecoration: "none", color: "var(--npb-accent)" }}
				>
					{showLabel && <small style={{ display: "block", color: "var(--npb-text-secondary)" }}>{prevLabel}</small>}
					<span>{prevTitle}</span>
				</a>
			) : <span />}
			{(!isBound || next) ? (
				<a
					className="wp-block-post-navigation__link wp-block-post-navigation__link--next"
					href={nextHref}
					style={{ textDecoration: "none", color: "var(--npb-accent)", textAlign: "right" }}
				>
					{showLabel && <small style={{ display: "block", color: "var(--npb-text-secondary)" }}>{nextLabel}</small>}
					<span>{nextTitle}</span>
				</a>
			) : <span />}
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
 * Post List — published posts when bound; otherwise empty (no dummy titles).
 */
export function PostListBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const layout = (data.layout as string) || "grid";
	const showExcerpt = data.showExcerpt !== false;
	const showFeaturedImage = data.showFeaturedImage !== false;
	const showDate = data.showDate !== false;
	const showAuthor = data.showAuthor !== false;
	const openIn = data.openIn === "page" ? "page" : "overlay";
	const posts = Array.isArray(data.posts) ? data.posts : [];
	const isGrid = layout === "grid" || layout === "cards";
	const layoutClass =
		layout === "list" ? "np-post-list--list" : layout === "cards" ? "np-post-list--cards" : "np-post-list--grid";

	const mergedClassName = ["wp-block-post-list", "np-post-list", layoutClass, className]
		.filter(Boolean)
		.join(" ");

	if (posts.length === 0) {
		return (
			<div className={mergedClassName || undefined} style={style} {...attributes}>
				<p className="np-post-list__empty" style={{ margin: 0, color: "var(--npb-text-muted)", textAlign: "center", padding: "2rem 0" }}>
					No published posts yet.
				</p>
			</div>
		);
	}

	return (
		<div
			className={mergedClassName || undefined}
			style={style}
			data-np-open={openIn}
			{...attributes}
		>
			{posts.map((raw) => {
				const post = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
				const slug = typeof post.slug === "string" ? post.slug : "";
				const title = typeof post.title === "string" ? post.title : "Untitled";
				const excerpt = typeof post.excerpt === "string" ? post.excerpt : "";
				const image = typeof post.featuredImage === "string" ? post.featuredImage : "";
				const publishedAt = typeof post.publishedAt === "string" ? post.publishedAt : "";
				const authorName = typeof post.authorName === "string" ? post.authorName : "";
				const href = slug ? `/post/${slug}` : "#";
				return (
					<article key={slug || title} className="np-post-list__card">
						<a
							className="np-post-list__link"
							href={href}
							data-np-post-slug={slug}
							data-np-open={openIn}
							style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: isGrid ? "column" : "row", gap: isGrid ? 0 : "1rem" }}
						>
							{showFeaturedImage && image && isSafePublicMediaUrl(image) ? (
								<img className="np-post-list__image" src={image} alt="" />
							) : null}
							<div className="np-post-list__body">
								<strong className="np-post-list__title">{title}</strong>
								{showExcerpt && excerpt ? (
									<p className="np-post-list__excerpt">{excerpt}</p>
								) : null}
								{(showDate || showAuthor) && (publishedAt || authorName) ? (
									<small className="np-post-list__meta">
										{showDate && publishedAt
											? new Date(publishedAt).toLocaleDateString(undefined, {
													year: "numeric",
													month: "short",
													day: "numeric",
												})
											: null}
										{showDate && showAuthor && publishedAt && authorName ? " · " : null}
										{showAuthor ? authorName : null}
									</small>
								) : null}
							</div>
						</a>
					</article>
				);
			})}
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