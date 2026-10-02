/**
 * Title, description, and link-preview fields for a published page.
 * One place so the HTML document and the in-browser page say the same thing.
 */

import { resolvePublishedDescription } from "./description-from.js";
import { readBlockFills, readFill } from "./fill-model.js";
import { PLACEHOLDER_IMAGE_URL } from "./placeholder-image.js";
import { readBlockContentData } from "./read-block-content.js";
import type { BlockConfig } from "./schema-types.js";

const UNSET_SITE_NAMES = new Set(["", "NextPress Site", "NextPress", "Your Site"]);
const UNSET_SITE_DESCRIPTIONS = new Set(["", "WordPress-Compatible CMS"]);

export type PublishedDocumentMeta = {
	title: string;
	description: string;
	canonicalUrl: string;
	siteName: string;
	imageUrl: string;
	type: "website" | "article";
};

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

export { escapeHtml };

const stripQueryAndHash = (value: string): string => {
	const hash = value.split("#")[0] ?? value;
	return hash.split("?")[0] ?? hash;
};

/** Origin of a configured site address, or null when it is not a usable URL. */
export function publicOrigin(siteUrl: string | null | undefined): string | null {
	const raw = siteUrl?.trim() ?? "";
	if (!raw) return null;
	try {
		const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
		return new URL(withProtocol).origin;
	} catch {
		return null;
	}
}

const hostLabel = (siteUrl: string | null | undefined): string => {
	const origin = publicOrigin(siteUrl);
	if (!origin) return "";
	try {
		const host = new URL(origin).hostname.replace(/^www\./, "");
		if (host === "localhost" || host === "127.0.0.1") return "";
		return host;
	} catch {
		return "";
	}
};

/**
 * The name a visitor should see. A name nobody set falls through to the site
 * record, then to the domain, so a configured domain is not labeled "Your Site".
 */
export function publicSiteName({
	settingsName,
	recordName,
	siteUrl,
}: {
	settingsName?: string | null;
	recordName?: string | null;
	siteUrl?: string | null;
}): string {
	const settings = settingsName?.trim() ?? "";
	const record = recordName?.trim() ?? "";
	if (settings && !UNSET_SITE_NAMES.has(settings)) return settings;
	if (record && !UNSET_SITE_NAMES.has(record)) return record;
	return hostLabel(siteUrl) || settings || record;
}

/** Drops the stock description so a link preview is not "WordPress-Compatible CMS". */
export function publicSiteDescription(value: string | null | undefined): string {
	const text = value?.trim() ?? "";
	if (UNSET_SITE_DESCRIPTIONS.has(text)) return "";
	return text;
}

const pathnameOf = (requestUrl: string): string => {
	try {
		return new URL(requestUrl).pathname || "/";
	} catch {
		const path = stripQueryAndHash(requestUrl);
		if (path.startsWith("/")) return path || "/";
		const slash = path.indexOf("/");
		return slash >= 0 ? path.slice(slash) || "/" : "/";
	}
};

const originOf = (requestUrl: string): string => {
	try {
		return new URL(requestUrl).origin;
	} catch {
		return "";
	}
};

/**
 * Absolute address for the canonical link. A full page address wins.
 * Otherwise the configured site domain plus the path, so the preview domain
 * matches the site even when the request host is different.
 */
export function publishedCanonicalUrl({
	requestUrl,
	siteUrl,
	pageCanonical,
}: {
	requestUrl: string;
	siteUrl?: string | null;
	pageCanonical?: string;
}): string {
	const explicit = pageCanonical?.trim() ?? "";
	if (/^https?:\/\//i.test(explicit)) return stripQueryAndHash(explicit);
	const path = explicit.startsWith("/") ? stripQueryAndHash(explicit) || "/" : pathnameOf(requestUrl);
	const origin = publicOrigin(siteUrl) ?? originOf(requestUrl);
	if (!origin) return stripQueryAndHash(requestUrl);
	return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

const usablePreviewImage = (value: string | undefined | null): string => {
	const url = value?.trim() ?? "";
	if (!url || url === PLACEHOLDER_IMAGE_URL) return "";
	if (url.startsWith("data:") || url.startsWith("blob:")) return "";
	if (url.includes("example.com")) return "";
	if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) return url;
	return "";
};

const IMAGE_FILE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i;

const readString = (value: object, key: string): string => {
	const record = value as Record<string, string | undefined>;
	return typeof record[key] === "string" ? record[key] : "";
};

type PictureRole = "image" | "video" | "audio" | "";

const pictureRole = (value: string): PictureRole =>
	value === "image" || value === "video" || value === "audio" ? value : "";

/**
 * Buttons store the page they open in `url`, the same field name as a picture.
 * A field that is a picture can be any address. Any other address has to look
 * like an image file, so a page link is left for export and is not the card.
 */
const pictureAddress = (value: string | undefined | null, role: PictureRole): string => {
	if (role === "video" || role === "audio") return "";
	const url = usablePreviewImage(value);
	if (!url) return "";
	if (role === "image" || IMAGE_FILE.test(url)) return url;
	return "";
};

const imageFillUrl = (fill: ReturnType<typeof readFill>): string =>
	fill?.kind === "image" ? usablePreviewImage(fill.url) : "";

/**
 * Picture for the link card. The page's featured image wins. Otherwise the first
 * real picture in the page, then a background picture, then the header mark, then the site logo.
 */
export function publishedPreviewImageUrl({
	featuredImage,
	blocks,
	logoUrl,
}: {
	featuredImage?: string | null;
	blocks?: BlockConfig[];
	logoUrl?: string | null;
}): string {
	const featured = usablePreviewImage(featuredImage);
	if (featured) return featured;

	let contentImage = "";
	let fillImage = "";
	let headerFillImage = "";
	let brandImage = "";
	const visit = (list: BlockConfig[]): void => {
		for (const block of list) {
			if (contentImage) return;
			const data = readBlockContentData(block.content);
			const backgroundType = readString(data, "backgroundType");
			if (backgroundType !== "video") {
				const role = backgroundType === "image" ? "image" : pictureRole(readString(data, "mediaType"));
				contentImage = pictureAddress(readString(data, "url"), role);
			}
			if (!contentImage) {
				const role = pictureRole(readString(data, "mediaType"));
				contentImage = pictureAddress(readString(data, "mediaUrl"), role === "" ? "image" : role);
			}
			const images = data.images;
			if (!contentImage && Array.isArray(images)) {
				for (const image of images) {
					if (!image || typeof image !== "object") continue;
					contentImage = pictureAddress(readString(image, "url"), "image");
					if (contentImage) break;
				}
			}
			if (!contentImage) contentImage = pictureAddress(readString(data, "poster"), "image");

			const blockFill = imageFillUrl(readBlockFills(block.other?.fills).background);
			const contentFill = imageFillUrl(readFill(data.backgroundFill));
			const foundFill = blockFill || contentFill;
			if (foundFill && block.name === "core/header") headerFillImage = headerFillImage || foundFill;
			if (foundFill && block.name !== "core/header") fillImage = fillImage || foundFill;

			if (!brandImage && data.brand && typeof data.brand === "object") {
				brandImage = pictureAddress(readString(data.brand, "logoUrl"), "image");
			}
			if (block.children?.length) visit(block.children);
		}
	};
	if (blocks?.length) visit(blocks);
	return contentImage || fillImage || headerFillImage || brandImage || usablePreviewImage(logoUrl);
}

const absoluteAsset = (url: string | undefined, origin: string): string => {
	const raw = url?.trim() ?? "";
	if (!raw) return "";
	if (/^https?:\/\//i.test(raw)) return raw;
	if (raw.startsWith("//")) return `https:${raw}`;
	if (!origin) return raw;
	if (raw.startsWith("/")) return `${origin}${raw}`;
	return `${origin}/${raw}`;
};

export function buildPublishedDocumentMeta({
	pageTitle,
	metaTitle,
	metaDescription,
	excerpt,
	siteName,
	siteDescription,
	canonicalUrl,
	imageUrl,
	kind,
	pageDescriptionFrom,
	siteDescriptionFrom,
}: {
	pageTitle?: string;
	metaTitle?: string;
	metaDescription?: string;
	excerpt?: string;
	siteName?: string;
	siteDescription?: string;
	canonicalUrl: string;
	imageUrl?: string;
	kind: "website" | "article";
	pageDescriptionFrom?: string | null;
	siteDescriptionFrom?: string | null;
}): PublishedDocumentMeta {
	const page = pageTitle?.trim() || "";
	const explicitTitle = metaTitle?.trim() || "";
	const site = siteName?.trim() || "";
	const title = explicitTitle
		? explicitTitle
		: site && page && site.toLowerCase() !== page.toLowerCase()
			? `${page} | ${site}`
			: page || site || "Untitled";
	const description = resolvePublishedDescription({
		metaDescription,
		excerpt,
		siteDescription: publicSiteDescription(siteDescription),
		pageFrom: pageDescriptionFrom,
		siteFrom: siteDescriptionFrom,
	});
	const origin = originOf(canonicalUrl);
	return {
		title,
		description,
		canonicalUrl,
		siteName: site,
		imageUrl: absoluteAsset(imageUrl, origin),
		type: kind,
	};
}

/** Open Graph and Twitter tags. Values are escaped for an HTML attribute. */
export function renderPublishedSocialMeta(meta: PublishedDocumentMeta): string {
	const tags = [
		`<meta property="og:title" content="${escapeHtml(meta.title)}">`,
		`<meta property="og:type" content="${meta.type}">`,
		`<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">`,
	];
	if (meta.siteName) tags.push(`<meta property="og:site_name" content="${escapeHtml(meta.siteName)}">`);
	if (meta.description) tags.push(`<meta property="og:description" content="${escapeHtml(meta.description)}">`);
	if (meta.imageUrl) tags.push(`<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">`);
	tags.push(`<meta name="twitter:card" content="${meta.imageUrl ? "summary_large_image" : "summary"}">`);
	tags.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}">`);
	if (meta.description) tags.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}">`);
	if (meta.imageUrl) tags.push(`<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}">`);
	return tags.join("\n      ");
}
