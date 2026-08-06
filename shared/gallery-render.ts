import type { CSSProperties } from "react";
import {
	type GalleryData,
	type GalleryImage,
	DEFAULT_DATA,
	readGalleryData,
} from "@shared/gallery-model";

export type GalleryRenderModel = {
	images: GalleryImage[];
	columns: number;
	imageCrop: boolean;
	linkTo: GalleryData["linkTo"];
	caption: string;
	/** Modifier classes without the base `wp-block-gallery` token. */
	modifierClassName: string;
	/** Full class string including `wp-block-gallery`. */
	className: string;
	shellStyle: CSSProperties | undefined;
	gridStyle: CSSProperties;
	imageStyle: CSSProperties;
};

/** Single source for editor + preview + publish gallery layout. */
export const buildGalleryRenderModel = ({
	content,
	styles,
}: {
	content: unknown;
	styles?: Record<string, string | undefined>;
}): GalleryRenderModel => {
	const galleryData = readGalleryData(content as GalleryData);
	const images = Array.isArray(galleryData.images) ? galleryData.images : [];
	const columns = galleryData.columns ?? DEFAULT_DATA.columns ?? 3;
	const imageCrop = galleryData.imageCrop !== false;
	const linkTo = galleryData.linkTo ?? "none";
	const caption = galleryData.caption ?? "";

	const modifierClassName = [
		"has-nested-images",
		`columns-${columns}`,
		imageCrop ? "is-cropped" : "",
		galleryData.className,
	]
		.filter(Boolean)
		.join(" ");

	const className = ["wp-block-gallery", modifierClassName].filter(Boolean).join(" ");

	return {
		images,
		columns,
		imageCrop,
		linkTo,
		caption,
		modifierClassName,
		className,
		shellStyle: styles as CSSProperties | undefined,
		gridStyle: {
			display: "grid",
			gridTemplateColumns: `repeat(auto-fit, minmax(min(200px, 100%), 1fr))`,
			gap: "16px",
			width: "100%",
		},
		imageStyle: {
			width: "100%",
			height: imageCrop ? "200px" : "auto",
			objectFit: imageCrop ? "cover" : "contain",
			borderRadius: "4px",
			display: "block",
		},
	};
};

/** SSR-safe CSS for published pages (inline styles still primary; this is fallback). */
export const GALLERY_PUBLISH_CSS = `
.wp-block-gallery .blocks-gallery-grid {
  display: grid;
  gap: 16px;
  width: 100%;
}
.wp-block-gallery.columns-1 .blocks-gallery-grid { grid-template-columns: repeat(1, 1fr); }
.wp-block-gallery.columns-2 .blocks-gallery-grid { grid-template-columns: repeat(2, 1fr); }
.wp-block-gallery.columns-3 .blocks-gallery-grid { grid-template-columns: repeat(3, 1fr); }
.wp-block-gallery.columns-4 .blocks-gallery-grid { grid-template-columns: repeat(4, 1fr); }
.wp-block-gallery.columns-5 .blocks-gallery-grid { grid-template-columns: repeat(5, 1fr); }
.wp-block-gallery.columns-6 .blocks-gallery-grid { grid-template-columns: repeat(6, 1fr); }
.wp-block-gallery.is-cropped .blocks-gallery-grid img {
  height: 200px;
  object-fit: cover;
}
.blocks-gallery-caption,
.blocks-gallery-item__caption {
  margin-top: 0.5em;
  font-size: 0.875em;
  color: #666;
  text-align: center;
}
@media (max-width: 640px) {
  .wp-block-gallery .blocks-gallery-grid { grid-template-columns: 1fr !important; }
}
`.trim();
