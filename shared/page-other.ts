import type {
	PageDesignSettings,
	PageIconSettings,
	PageOther,
	PageSeoSettings,
	MetaTagEntry,
} from "./schema-types.js";
import { isPageIconDefaultSet, isReactIconsPrefix } from "./icon-types.js";
import { isValidMetaTagName } from "./meta-tag-names.js";

/** Page design defaults — same as Page Settings UI initial state. */
export const DEFAULT_PAGE_DESIGN: PageDesignSettings = {
	fontFamily: "system-ui",
	containerWidth: "1200px",
	padding: "2rem 1rem",
};

/** Icon defaults — same as Page Settings / PageContext. */
export const DEFAULT_PAGE_ICONS: PageIconSettings = {
	defaultSet: "lucide",
	defaultSize: 24,
};

/** Baseline page.other applied on create when none is supplied. */
export const DEFAULT_PAGE_OTHER: PageOther = {
	design: { ...DEFAULT_PAGE_DESIGN },
	icons: { ...DEFAULT_PAGE_ICONS },
	seo: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const parseSeoSettings = (raw: unknown): PageSeoSettings | undefined => {
	if (!isRecord(raw)) return undefined;
	const seo: PageSeoSettings = {};

	if (typeof raw.metaTitle === "string") seo.metaTitle = raw.metaTitle;
	if (typeof raw.metaDescription === "string") seo.metaDescription = raw.metaDescription;
	if (typeof raw.canonicalUrl === "string") seo.canonicalUrl = raw.canonicalUrl;
	if (typeof raw.noIndex === "boolean") seo.noIndex = raw.noIndex;

	if (Array.isArray(raw.customMeta)) {
		const customMeta: MetaTagEntry[] = [];
		for (const entry of raw.customMeta) {
			if (!isRecord(entry)) continue;
			if (typeof entry.content !== "string") continue;
			if (!isValidMetaTagName(entry.name)) continue;
			customMeta.push({ name: entry.name, content: entry.content });
		}
		if (customMeta.length > 0) seo.customMeta = customMeta;
	}

	return Object.keys(seo).length > 0 ? seo : undefined;
};

const parseDesignSettings = (raw: unknown): PageDesignSettings | undefined => {
	if (!isRecord(raw)) return undefined;
	const design: PageDesignSettings = {};
	if (typeof raw.fontFamily === "string") design.fontFamily = raw.fontFamily;
	if (typeof raw.containerWidth === "string") design.containerWidth = raw.containerWidth;
	if (typeof raw.padding === "string") design.padding = raw.padding;
if (isRecord(raw.backgroundColor)) design.backgroundColor = raw.backgroundColor as unknown as PageDesignSettings["backgroundColor"];
			if (isRecord(raw.textColor)) design.textColor = raw.textColor as unknown as PageDesignSettings["textColor"];
	return Object.keys(design).length > 0 ? design : undefined;
};

const parseIconSettings = (raw: unknown): PageIconSettings | undefined => {
	if (!isRecord(raw)) return undefined;
	if (!isPageIconDefaultSet(raw.defaultSet)) return undefined;

	const icons: PageIconSettings = { defaultSet: raw.defaultSet };

	if (typeof raw.defaultSize === "number" && Number.isFinite(raw.defaultSize)) {
		icons.defaultSize = raw.defaultSize;
	}

	if (Array.isArray(raw.allowedSets)) {
		const allowed = raw.allowedSets.filter(isReactIconsPrefix);
		if (allowed.length > 0) icons.allowedSets = allowed;
	}

	return icons;
};

/**
 * Normalizes page.other from DB/API input. Strips invalid nested fields.
 */
export const parsePageOther = (other: unknown): PageOther => {
	if (!isRecord(other)) {
		return { ...DEFAULT_PAGE_OTHER };
	}

	const parsed: PageOther = {
		seo: parseSeoSettings(other.seo),
		design: parseDesignSettings(other.design),
		icons: parseIconSettings(other.icons),
	};

	if (other.isBlogPage === true) parsed.isBlogPage = true;
	if (typeof other.blogId === "string") parsed.blogId = other.blogId;

	if (Array.isArray(other.categories)) {
		const categories = other.categories.filter((item): item is string => typeof item === "string");
		if (categories.length > 0) parsed.categories = categories;
	}
	if (Array.isArray(other.tags)) {
		const tags = other.tags.filter((item): item is string => typeof item === "string");
		if (tags.length > 0) parsed.tags = tags;
	}

	if (isRecord(other.import)) parsed.import = other.import;

	return parsed;
};

/**
 * Merges editor/API input with sensible defaults (design shell + icon defaults).
 * Used on page create so editor pages match SDK/import baseline.
 */
export const mergePageOtherWithDefaults = (other?: unknown): PageOther => {
	const parsed = parsePageOther(other ?? {});
	return {
		...parsed,
		design: { ...DEFAULT_PAGE_DESIGN, ...parsed.design },
		icons: { ...DEFAULT_PAGE_ICONS, ...parsed.icons },
		seo: parsed.seo ?? {},
	};
};

export type PageOtherValidationResult =
	| { ok: true; value: PageOther }
	| { ok: false; message: string };

/** Strict validation for save payloads — rejects invalid icon/meta settings. */
export const validatePageOtherForSave = (other: unknown): PageOtherValidationResult => {
	if (other !== undefined && other !== null && !isRecord(other)) {
		return { ok: false, message: "page.other must be an object" };
	}

	const merged = mergePageOtherWithDefaults(other);

	if (isRecord(other) && other.icons !== undefined && !parseIconSettings(other.icons)) {
		return {
			ok: false,
			message: "page.other.icons.defaultSet must be lucide, react-icons, svgl, or all",
		};
	}

	if (isRecord(other) && isRecord(other.seo) && Array.isArray(other.seo.customMeta)) {
		for (const entry of other.seo.customMeta) {
			if (!isRecord(entry)) {
				return { ok: false, message: "Each custom meta tag must be an object" };
			}
			if (!isValidMetaTagName(entry.name)) {
				return { ok: false, message: `Invalid meta tag name: ${String(entry.name)}` };
			}
			if (typeof entry.content !== "string") {
				return { ok: false, message: "Each custom meta tag must have string content" };
			}
		}
	}

	return { ok: true, value: merged };
};

/** API response helper — applies design/icon defaults when other is empty or partial. */
export const enrichPageForApi = <T extends { other?: unknown }>(
	page: T,
): T & { other: PageOther } => ({
	...page,
	other: mergePageOtherWithDefaults(page.other),
});
