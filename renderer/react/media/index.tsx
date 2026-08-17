import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { buildGalleryRenderModel } from "@shared/gallery-render";
import { sanitizeHtml } from "@shared/sanitize-html";
import { isYouTubeUrl, buildYouTubeEmbedUrl } from "@shared/video-embed";
import { getRenderProps, parseMediaContent, parseStructuredContent, renderChildBlocks } from "../render-helpers";

/**
 * Image Block Component
 * Renders an image with optional caption, width, height, and object-fit
 */
export function ImageBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseMediaContent(block.content);

	const url = content.url as string;
	const alt = (content.alt as string) || "";
	const caption = content.caption as string | undefined;
	const width = content.width as number | string | undefined;
	const height = content.height as number | string | undefined;
	const objectFit = content.objectFit as string | undefined;
	const href = content.href as string | undefined;
	const linkTarget = (content.linkTarget as string) || (content.target as string) || undefined;
	const linkDestination = content.linkDestination as string | undefined;
	const rel = content.rel as string | undefined;
	const title = content.title as string | undefined;

	if (!url) {
		return null;
	}

	const mergedClassName = ["wp-block-image", className]
		.filter(Boolean)
		.join(" ");

	const imageStyle: React.CSSProperties = {
		...style,
		maxWidth: style.maxWidth ?? "100%",
		height: style.height ?? (width ? undefined : "auto"),
		...(width ? { width } : {}),
		...(height ? { height } : {}),
		...(objectFit
			? { objectFit: objectFit as React.CSSProperties["objectFit"] }
			: {}),
	};

	const imageAlt = alt.trim();
	const image = (
		<img
			src={url}
			alt={imageAlt}
			style={imageStyle}
			role={imageAlt ? undefined : 'presentation'}
		/>
	);

	// Determine link href based on linkDestination
	const linkHref =
		linkDestination === "custom" && href
			? href
			: linkDestination === "media"
			? url
			: undefined;

	// Wrap image in <a> if there's a link
	const imageContent = linkHref ? (
		<a
			href={linkHref}
			target={linkTarget}
			rel={linkTarget === "_blank" ? rel || "noopener noreferrer" : rel}
			title={title}
		>
			{image}
		</a>
	) : (
		image
	);

	if (caption) {
		return (
			<figure
				className={mergedClassName || undefined}
				style={style}
				{...attributes}
			>
				{imageContent}
				<figcaption>{caption}</figcaption>
			</figure>
		);
	}

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			{imageContent}
		</div>
	);
}

/**
 * Video Block Component
 * Renders a responsive video element or YouTube iframe with optional controls, autoplay, loop, and poster
 */
export function VideoBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseMediaContent(block.content);

	const url = content.url as string;
	const alt = (content.alt as string) || "";
	const caption = content.caption as string | undefined;
	const autoplay = content.autoplay as boolean | undefined;
	const loop = content.loop as boolean | undefined;
	const controls = content.controls as boolean | undefined;
	const muted = content.muted as boolean | undefined;
	const poster = content.poster as string | undefined;

	if (!url) {
		return null;
	}

	if (isYouTubeUrl(url)) {
		const embedUrl = buildYouTubeEmbedUrl(url, {
			autoplay,
			controls,
			loop,
			muted,
		}) || url;

		const embedClasses = [
			"wp-block-embed",
			"wp-block-embed-youtube",
			"is-type-video",
			"is-provider-youtube",
			className,
		]
			.filter(Boolean)
			.join(" ");

		const aspectWidth = 16;
		const aspectHeight = 9;
		const paddingBottom = `${(aspectHeight / aspectWidth) * 100}%`;
		const hasExplicitHeight = typeof style?.height === "string" && style.height !== "";

		const iframeEmbed = (
			<div
				className="wp-block-embed__wrapper"
				style={{
					position: "relative",
					width: "100%",
					height: hasExplicitHeight ? "100%" : 0,
					paddingBottom: hasExplicitHeight ? undefined : paddingBottom,
				}}
			>
				<iframe
					src={embedUrl}
					title={caption || "YouTube video player"}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
					style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
				/>
			</div>
		);

		if (caption) {
			return (
				<figure className={embedClasses || undefined} style={style} {...attributes}>
					{iframeEmbed}
					<figcaption className="wp-element-caption">{caption}</figcaption>
				</figure>
			);
		}

		return (
			<figure className={embedClasses || undefined} style={style} {...attributes}>
				{iframeEmbed}
			</figure>
		);
	}

	const mergedClassName = ["wp-block-video", className]
		.filter(Boolean)
		.join(" ");

	const video = (
		<video
			src={url}
			controls={controls !== false}
			autoPlay={autoplay}
			loop={loop}
			poster={poster}
			style={style}
			{...attributes}
		>
			{alt && <track kind="captions" label={alt} />}
		</video>
	);

	if (caption) {
		return (
			<figure className={mergedClassName || undefined}>
				{video}
				<figcaption className="wp-element-caption">{caption}</figcaption>
			</figure>
		);
	}

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			{video}
		</div>
	);
}

/**
 * Audio Block Component
 * Renders an audio element with optional controls, autoplay, and loop
 */
export function AudioBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseMediaContent(block.content);

	const url = content.url as string;
	const alt = (content.alt as string) || "";
	const caption = content.caption as string | undefined;
	const autoplay = content.autoplay as boolean | undefined;
	const loop = content.loop as boolean | undefined;
	const controls = content.controls as boolean | undefined;

	if (!url) {
		return null;
	}

	const mergedClassName = ["wp-block-audio", className]
		.filter(Boolean)
		.join(" ");

	const audio = (
		<audio
			src={url}
			controls={controls !== false}
			autoPlay={autoplay}
			loop={loop}
			style={style}
			{...attributes}
		>
			{alt && <track kind="captions" label={alt} />}
		</audio>
	);

	if (caption) {
		return (
			<figure className={mergedClassName || undefined}>
				{audio}
				<figcaption>{caption}</figcaption>
			</figure>
		);
	}

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			{audio}
		</div>
	);
}

/**
 * Gallery Block Component
 * Renders a grid of images
 */
export function GalleryBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const model = buildGalleryRenderModel({
		content: block.content,
		styles: style as Record<string, string | undefined>,
	});

	if (model.images.length === 0) {
		return null;
	}

	const mergedClassName = [model.className, className].filter(Boolean).join(" ");

	return (
		<figure
			className={mergedClassName || undefined}
			style={{ ...model.shellStyle, ...style }}
			{...attributes}
		>
			<div className="blocks-gallery-grid" style={model.gridStyle}>
				{model.images.map((image, index) => {
					const imgElement = (
						<img
							src={image.url}
							alt={image.alt}
							style={model.imageStyle}
						/>
					);

					const linkContent =
						model.linkTo === "media" ? (
							<a href={image.url} target="_blank" rel="noopener noreferrer">
								{imgElement}
							</a>
						) : (
							imgElement
						);

					return (
						<div key={image.id ?? index} className="wp-block-image">
							{linkContent}
							{image.caption ? (
								<div className="blocks-gallery-item__caption">{image.caption}</div>
							) : null}
						</div>
					);
				})}
			</div>
			{model.caption ? (
				<figcaption className="blocks-gallery-caption">{model.caption}</figcaption>
			) : null}
		</figure>
	);
}

/**
 * Cover Block Component
 * Renders an image with overlay and optional text content
 */
export function CoverBlock(block: BlockConfig) {
	const { style, className, attributes, children } = getRenderProps(block);
	const data = parseStructuredContent(block.content);

	const url = (data.url as string) || "";
	const alt = (data.alt as string) || "";
	const innerContent = (data.innerContent as string) || "";
	const customOverlayColor = (data.customOverlayColor as string) || "";
	const overlayColor = (data.overlayColor as string) || "rgba(0,0,0,0.5)";
	const dimRatio = typeof data.dimRatio === "number" ? data.dimRatio : 50;
	const minHeightValue =
		typeof data.minHeight === "number"
			? data.minHeight
			: typeof data.minHeight === "string" && data.minHeight
				? Number.parseInt(data.minHeight, 10) || 400
				: 400;
	const contentPosition = (data.contentPosition as string) || "center center";
	const backgroundType = (data.backgroundType as string) || "image";
	const hasParallax = Boolean(data.hasParallax);
	const focalPoint = data.focalPoint as { x?: number; y?: number } | undefined;

	if (!url) {
		return null;
	}

	const mergedClassName = [
		"wp-block-cover",
		hasParallax ? "has-parallax" : "",
		backgroundType === "video" ? "has-background-video" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const [vertical, horizontal] = contentPosition.split(" ");
	const contentAlignment: React.CSSProperties = {
		display: "flex",
		alignItems:
			vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center",
		justifyContent:
			horizontal === "left"
				? "flex-start"
				: horizontal === "right"
					? "flex-end"
					: "center",
	};

	const coverStyle: React.CSSProperties = {
		...style,
		position: "relative",
		minHeight: `${minHeightValue}px`,
		overflow: "hidden",
		...(backgroundType === "image"
			? {
					backgroundImage: `url(${url})`,
					backgroundSize: "cover",
					backgroundPosition: focalPoint
						? `${(focalPoint.x ?? 0.5) * 100}% ${(focalPoint.y ?? 0.5) * 100}%`
						: "center",
					backgroundRepeat: "no-repeat",
					backgroundAttachment: hasParallax ? "fixed" : "scroll",
				}
			: {}),
	};

	const overlayStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: customOverlayColor || overlayColor,
		opacity: dimRatio / 100,
	};

	return (
		<div className={mergedClassName || undefined} style={coverStyle} {...attributes}>
			{backgroundType === "video" && url ? (
				<video
					autoPlay
					muted
					loop
					playsInline
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
						zIndex: 1,
					}}
				>
					<source src={url} type="video/mp4" />
				</video>
			) : null}
			<div className="wp-block-cover__background" style={{ ...overlayStyle, zIndex: 2 }} />
			<div
				className="wp-block-cover__inner-container"
				style={{
					position: "relative",
					zIndex: 3,
					width: "100%",
					height: "100%",
					padding: "1.25em 2.375em",
					color: "white",
					...contentAlignment,
				}}
			>
				{block.children && block.children.length > 0 ? (
					children
				) : innerContent ? (
					<div
						className="cover-content"
						dangerouslySetInnerHTML={{ __html: sanitizeHtml(innerContent) }}
					/>
				) : alt ? (
					<div>{alt}</div>
				) : null}
			</div>
		</div>
	);
}

/**
 * File Block Component
 * Renders a rich file download link with preview and download button.
 * Matches the legacy PublicBlockRenderer output for visual parity.
 */
export function FileBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);

	const url = (data.href as string) || (data.url as string) || "";
	const fileName = (data.fileName as string) || (data.filename as string) || "";
	const textLinkHref = (data.textLinkHref as string) || url;
	const textLinkTarget = (data.textLinkTarget as string) || "_self";
	const showDownloadButton = data.showDownloadButton !== false;
	const downloadButtonText = (data.downloadButtonText as string) || "Download";
	const displayPreview = data.displayPreview !== false;
	const fileSize = (data.fileSize as string) || "";

	if (!url) {
		return null;
	}

	const mergedClassName = ["wp-block-file", className]
		.filter(Boolean)
		.join(" ");

	const fileExtension = fileName ? fileName.split(".").pop()?.toUpperCase() : "";

	const fileIconSvg = (
		<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: "12px" }}>
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);

	const downloadIconSvg = (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			<div className="wp-block-file__content-wrapper">
				{displayPreview ? (
					<div className="wp-block-file__preview">
						<div style={{ alignItems: "center", display: "flex", marginBottom: "1em" }}>
							{fileIconSvg}
							<div>
								<div className="file-name font-medium">
									<a
										href={textLinkHref}
										rel={textLinkTarget === "_blank" ? "noopener noreferrer" : undefined}
										style={{ color: "var(--npb-accent)", textDecoration: "none" }}
										target={textLinkTarget}
									>
										{fileName || "Download File"}
									</a>
									</div>
									{(fileExtension || fileSize) && (
										<div className="file-details text-sm text-gray-500">
											{fileExtension ? <span>{fileExtension}</span> : null}
											{fileExtension && fileSize ? <span> • </span> : null}
											{fileSize ? <span>{fileSize}</span> : null}
										</div>
									)}
								</div>
							</div>
						</div>
					) : null}

					{showDownloadButton ? (
						<div className="wp-block-file__button-container">
							<a
								className="wp-block-file__button"
								download={fileName}
								href={url}
								style={{
									alignItems: "center",
									backgroundColor: "var(--npb-accent)",
									borderRadius: "4px",
									color: "#ffffff",
									display: "inline-flex",
									fontSize: "16px",
									fontWeight: "600",
									gap: "8px",
									padding: "12px 24px",
									textDecoration: "none",
								}}
							>
								{downloadIconSvg}
								{downloadButtonText}
							</a>
						</div>
					) : null}
				</div>
			</div>
		);
	}

/**
 * Media Text Block Component
 * Renders media (image/video) alongside text content
 */
export function MediaTextBlock(block: BlockConfig) {
	const { style, className, attributes, children } = getRenderProps(block);
	const data = parseStructuredContent(block.content);

	const url = (data.mediaUrl as string) || (data.url as string) || "";
	const alt = ((data.mediaAlt as string) || "").trim();
	const mediaPosition = (data.mediaPosition as string) || "left";
	const verticalAlignment = data.verticalAlignment as string | undefined;
	const isStackedOnMobile = data?.isStackedOnMobile !== false;
	const href = data?.href as string | undefined;
	const linkTarget = (data?.linkTarget as string) || undefined;
	const rel = data?.rel as string | undefined;
	const title = data?.title as string | undefined;
	const textContent = (data.content as string) || "";
	const hasChildren = Boolean(block.children && block.children.length > 0);

	if (!url && !textContent && !hasChildren) {
		return null;
	}

	const mergedClassName = [
		"wp-block-media-text",
		mediaPosition === "right" ? "has-media-on-the-right" : "",
		verticalAlignment ? `is-vertically-aligned-${verticalAlignment}` : "",
		isStackedOnMobile ? "is-stacked-on-mobile" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const mediaStyle: React.CSSProperties = url
		? {
				backgroundImage: `url(${url})`,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}
		: {};

	const mediaContent = url ? (
		<img
			src={url}
			alt={alt}
			className="sr-only"
			aria-hidden={alt ? undefined : true}
		/>
	) : null;

	const mediaElement =
		url &&
		(href ? (
			<a
				href={href}
				target={linkTarget}
				rel={linkTarget === "_blank" ? rel || "noopener noreferrer" : rel}
				title={title}
				className="wp-block-media-text__media"
				style={mediaStyle}
			>
				{mediaContent}
			</a>
		) : (
			<figure className="wp-block-media-text__media" style={mediaStyle}>
				{mediaContent}
			</figure>
		));

	const textElement =
		hasChildren ? (
			children
		) : textContent ? (
			<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }} />
		) : null;

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			{mediaPosition === "right" ? (
				<>
					<div className="wp-block-media-text__content">{textElement}</div>
					{mediaElement}
				</>
			) : (
				<>
					{mediaElement}
					<div className="wp-block-media-text__content">{textElement}</div>
				</>
			)}
		</div>
	);
}