import type { IconSetId } from "./icon-types.js";
import { ICON_SET_IDS, isReactIconsPrefix } from "./icon-types.js";
import { LUCIDE_ICONS } from "./icons/lucide-icons.js";
import { REACT_ICONS_SETS } from "./icons/react-icons-index.js";
import {
	ICON_SVG_MAX_CHARS,
	isCleanSvgMarkup,
	isLocalIconFileUrl,
} from "./icon-drawing.js";

export type ValidatedIconReference = {
	iconSet: IconSetId;
	iconName: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
	/** react-icons: the drawing saved when it was picked (see shared/icon-drawing.ts). */
	svg?: string;
	/** svgl / custom: the picture in this site's media library. */
	url?: string;
	/** Name read out by screen readers when the icon stands alone. */
	label?: string;
	/** Paint a one-colour picture in the icon colour instead of its own colours. */
	tint?: boolean;
};

export type IconValidationResult =
	| { ok: true; value: ValidatedIconReference }
	| { ok: false; message: string };

const lucideSet = new Set(LUCIDE_ICONS);

const ICON_NAME_MAX_CHARS = 120;
const ICON_LABEL_MAX_CHARS = 120;

/** Lucide index uses kebab-case; SDK/editor may send PascalCase. */
const normalizeLucideIconName = (name: string): string =>
	name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/_/g, "-")
		.toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validates an icon reference against known icon indexes.
 * WHY: reject saves with unknown icon sets or names so published pages don't render broken icons.
 */
export function validateIconReference(raw: unknown): IconValidationResult {
	if (!isRecord(raw)) {
		return { ok: false, message: "Icon reference must be an object" };
	}

	const iconSetRaw = raw.iconSet;
	if (typeof iconSetRaw !== "string" || !(ICON_SET_IDS as readonly string[]).includes(iconSetRaw)) {
		return {
			ok: false,
			message: `iconSet must be one of: ${ICON_SET_IDS.join(", ")}`,
		};
	}
	const iconSet = iconSetRaw as IconSetId;

	const iconNameRaw = raw.iconName;
	if (typeof iconNameRaw !== "string" || iconNameRaw.trim() === "") {
		return { ok: false, message: "iconName is required" };
	}

	if (iconSet === "lucide") {
		const normalized = normalizeLucideIconName(iconNameRaw);
		if (!lucideSet.has(normalized)) {
			return { ok: false, message: `Unknown lucide icon: ${iconNameRaw}` };
		}
		return {
			ok: true,
			value: {
				iconSet,
				iconName: normalized,
				size: typeof raw.size === "number" ? raw.size : undefined,
				color: typeof raw.color === "string" ? raw.color : undefined,
				strokeWidth: typeof raw.strokeWidth === "number" ? raw.strokeWidth : undefined,
			},
		};
	}

	if (iconNameRaw.length > ICON_NAME_MAX_CHARS) {
		return { ok: false, message: "iconName is too long" };
	}

	const extras = readIconExtras(raw);
	if (!extras.ok) return extras;

	if (iconSet === "svgl" || iconSet === "custom") {
		// Brand logos saved before logos were real files have no url; they keep painting a placeholder.
		if (iconSet === "custom" && !extras.value.url) {
			return { ok: false, message: "An uploaded icon needs its picture (url)" };
		}
		if (extras.value.url && !isLocalIconFileUrl(extras.value.url, iconSet === "svgl" ? [".svg"] : undefined)) {
			return { ok: false, message: "Icon picture must be an svg, png or webp in this site's uploads" };
		}
		if (extras.value.svg) {
			return { ok: false, message: "Only react-icons carry an inline drawing" };
		}
		return {
			ok: true,
			value: {
				iconSet,
				iconName: iconSet === "svgl" ? iconNameRaw.toLowerCase() : iconNameRaw,
				size: typeof raw.size === "number" ? raw.size : undefined,
				color: typeof raw.color === "string" ? raw.color : undefined,
				...extras.value,
			},
		};
	}

	// react-icons: "prefix:ComponentName"
	const colonIndex = iconNameRaw.indexOf(":");
	if (colonIndex <= 0) {
		return {
			ok: false,
			message: 'react-icons iconName must be "prefix:ComponentName" (e.g. lu:LuSearch)',
		};
	}
	const prefix = iconNameRaw.slice(0, colonIndex);
	const componentName = iconNameRaw.slice(colonIndex + 1);
	if (!isReactIconsPrefix(prefix) || componentName.trim() === "") {
		return {
			ok: false,
			message: `Invalid react-icons reference: ${iconNameRaw}`,
		};
	}
	const prefixIcons = REACT_ICONS_SETS[prefix];
	if (!prefixIcons?.includes(componentName)) {
		return { ok: false, message: `Unknown react-icons icon: ${iconNameRaw}` };
	}

	return {
		ok: true,
		value: {
			iconSet,
			iconName: iconNameRaw,
			size: typeof raw.size === "number" ? raw.size : undefined,
			color: typeof raw.color === "string" ? raw.color : undefined,
			strokeWidth: typeof raw.strokeWidth === "number" ? raw.strokeWidth : undefined,
			...extras.value,
		},
	};
}

type IconExtras = Pick<ValidatedIconReference, "svg" | "url" | "label" | "tint">;

/** Reads and checks the optional drawing / picture / label fields shared by every set. */
function readIconExtras(
	raw: Record<string, unknown>,
): { ok: true; value: IconExtras } | { ok: false; message: string } {
	const value: IconExtras = {};

	if (raw.svg !== undefined && raw.svg !== null) {
		if (typeof raw.svg !== "string" || raw.svg.length > ICON_SVG_MAX_CHARS) {
			return { ok: false, message: "Icon drawing is not valid" };
		}
		if (!isCleanSvgMarkup(raw.svg)) {
			return { ok: false, message: "Icon drawing contains markup that is not allowed" };
		}
		value.svg = raw.svg.trim();
	}

	if (raw.url !== undefined && raw.url !== null) {
		if (typeof raw.url !== "string") return { ok: false, message: "Icon url must be text" };
		value.url = raw.url;
	}

	if (raw.label !== undefined && raw.label !== null) {
		if (typeof raw.label !== "string" || raw.label.length > ICON_LABEL_MAX_CHARS) {
			return { ok: false, message: "Icon label is not valid" };
		}
		value.label = raw.label;
	}

	if (raw.tint !== undefined && raw.tint !== null) {
		if (typeof raw.tint !== "boolean") return { ok: false, message: "Icon tint must be on or off" };
		value.tint = raw.tint;
	}

	return { ok: true, value };
}
