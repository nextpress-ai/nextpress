import type { IconSetId } from "./icon-types.js";
import { ICON_SET_IDS, isReactIconsPrefix } from "./icon-types.js";
import { LUCIDE_ICONS } from "./icons/lucide-icons.js";
import { REACT_ICONS_SETS } from "./icons/react-icons-index.js";
import { SVGL_ICONS } from "./icons/svgl-icons.js";

export type ValidatedIconReference = {
	iconSet: IconSetId;
	iconName: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
};

export type IconValidationResult =
	| { ok: true; value: ValidatedIconReference }
	| { ok: false; message: string };

const lucideSet = new Set(LUCIDE_ICONS);
const svglSet = new Set(SVGL_ICONS);

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

	if (iconSet === "svgl") {
		const slug = iconNameRaw.toLowerCase();
		if (!svglSet.has(slug)) {
			return { ok: false, message: `Unknown SVGL icon: ${iconNameRaw}` };
		}
		return {
			ok: true,
			value: {
				iconSet,
				iconName: slug,
				size: typeof raw.size === "number" ? raw.size : undefined,
				color: typeof raw.color === "string" ? raw.color : undefined,
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
		},
	};
}
