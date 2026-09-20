import type { BlockContent, TokenEntry } from "./schema-types.js";
import { BORDER_RADIUS_PRESETS } from "./dimension-presets.js";
import { unwrapStructured } from "./page-shell-model.js";

export const HEADER_BLOCK_NAME = "core/header";

export type HeaderSlot = "left" | "middle" | "right";
export type HeaderVariant = "links-and-actions" | "links-only" | "split" | "actions-only";
export type HeaderActionStyle = "ghost" | "solid";
export type HeaderBrandKind = "wordmark" | "logo";

export type HeaderBrand = {
	kind: HeaderBrandKind;
	text: string;
	logoUrl?: string;
	href?: string;
	logoSize: string;
	logoRadius: string;
	showName: boolean;
};

export const HEADER_LOGO_SIZE_PRESETS = [
	{ value: "1.25rem", label: "SM" },
	{ value: "1.75rem", label: "MD" },
	{ value: "2.25rem", label: "LG" },
	{ value: "2.75rem", label: "XL" },
] as const;

export const HEADER_LOGO_RADIUS_PRESETS = BORDER_RADIUS_PRESETS;

export const DEFAULT_HEADER_LOGO_SIZE = "1.75rem";
export const DEFAULT_HEADER_LOGO_RADIUS = "0";

export type HeaderLogoMarkStyle = {
	height: string;
	width: string;
	borderRadius: string;
	objectFit: "contain" | "cover";
};

export function readHeaderLogoSize(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) return DEFAULT_HEADER_LOGO_SIZE;
	return value.trim();
}

export function readHeaderLogoRadius(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) return DEFAULT_HEADER_LOGO_RADIUS;
	return value.trim();
}

/** Size, corners, and crop for the logo mark (image or empty placeholder). */
export function headerLogoMarkStyle(brand: HeaderBrand): HeaderLogoMarkStyle {
	const height = readHeaderLogoSize(brand.logoSize);
	const borderRadius = readHeaderLogoRadius(brand.logoRadius);
	const isCircle = borderRadius === "50%";
	return {
		height,
		width: isCircle ? height : "auto",
		borderRadius,
		objectFit: isCircle ? "cover" : "contain",
	};
}

export type HeaderNavChild = {
	id: string;
	label: string;
	href: string;
};

export type HeaderNavItem = {
	id: string;
	label: string;
	href: string;
	children?: HeaderNavChild[];
};

export type HeaderActionSize = "sm" | "md" | "lg" | "xl";

export type HeaderAction = {
	id: string;
	label: string;
	href: string;
	style: HeaderActionStyle;
	size: HeaderActionSize;
	radius: string;
	color?: TokenEntry;
};

export const HEADER_ACTION_SIZE_PRESETS = [
	{ value: "sm", label: "SM" },
	{ value: "md", label: "MD" },
	{ value: "lg", label: "LG" },
	{ value: "xl", label: "XL" },
] as const;

export const HEADER_ACTION_RADIUS_PRESETS = BORDER_RADIUS_PRESETS;
export const DEFAULT_HEADER_ACTION_SIZE: HeaderActionSize = "md";
export const DEFAULT_HEADER_ACTION_RADIUS = "9999px";

const HEADER_ACTION_SIZE_LOOK: Record<
	HeaderActionSize,
	{ minHeight: string; padding: string; fontSize: string }
> = {
	sm: { minHeight: "1.5rem", padding: "0.2rem 0.65rem", fontSize: "0.6875rem" },
	md: { minHeight: "1.75rem", padding: "0.3rem 0.8rem", fontSize: "0.75rem" },
	lg: { minHeight: "2.25rem", padding: "0.45rem 1rem", fontSize: "0.8125rem" },
	xl: { minHeight: "2.75rem", padding: "0.55rem 1.2rem", fontSize: "0.875rem" },
};

export type HeaderActionLookStyle = {
	minHeight: string;
	padding: string;
	fontSize: string;
	borderRadius: string;
	backgroundColor?: string;
	borderColor?: string;
	color?: string;
};

export function readHeaderActionSize(value: unknown): HeaderActionSize {
	if (value === "sm" || value === "md" || value === "lg" || value === "xl") return value;
	return DEFAULT_HEADER_ACTION_SIZE;
}

export function readHeaderActionRadius(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) return DEFAULT_HEADER_ACTION_RADIUS;
	return value.trim();
}

function readHeaderActionColor(value: unknown): TokenEntry | undefined {
	if (!value || typeof value !== "object") return undefined;
	const row = value as Record<string, unknown>;
	if (typeof row.style !== "string" || !row.style.trim()) return undefined;
	return {
		property: typeof row.property === "string" ? row.property : "backgroundColor",
		value: typeof row.value === "string" ? row.value : "",
		variant: typeof row.variant === "string" ? row.variant : null,
		alias: typeof row.alias === "string" ? row.alias : "bg",
		style: row.style.trim(),
	};
}

/** Size, corners, and optional paint for a header button. */
export function headerActionLookStyle(action: HeaderAction): HeaderActionLookStyle {
	const size = readHeaderActionSize(action.size);
	const look: HeaderActionLookStyle = {
		...HEADER_ACTION_SIZE_LOOK[size],
		borderRadius: readHeaderActionRadius(action.radius),
	};
	const paint = action.color?.style?.trim();
	if (!paint) return look;
	if (action.style === "solid") {
		look.backgroundColor = paint;
		look.borderColor = "transparent";
		look.color = "#fff";
		return look;
	}
	look.borderColor = paint;
	look.color = paint;
	return look;
}

export type HeaderContent = {
	variant: HeaderVariant;
	brand: HeaderBrand;
	brandSlot: HeaderSlot;
	nav: HeaderNavItem[];
	navSlot: HeaderSlot;
	actions: HeaderAction[];
	actionsSlot: HeaderSlot;
	sticky: boolean;
};

export const HEADER_VARIANT_OPTIONS: readonly {
	value: HeaderVariant;
	label: string;
	accessibleName: string;
}[] = [
	{ value: "links-and-actions", label: "Links + buttons", accessibleName: "Brand left, links and buttons right" },
	{ value: "links-only", label: "Links", accessibleName: "Brand left, links right" },
	{ value: "split", label: "Split", accessibleName: "Brand left, links middle, buttons right" },
	{ value: "actions-only", label: "Buttons", accessibleName: "Brand left, buttons right" },
] as const;

/** Empty-field hints in settings. Starter content below is what a new header paints. */
export const HEADER_PLACEHOLDERS = {
	brandName: "Your site",
	brandHref: "/",
	logoUrl: "https://example.com/logo.svg",
	linkLabel: "About",
	linkHref: "/about",
	menuItemLabel: "Overview",
	menuItemHref: "/overview",
	buttonLabel: "Get started",
	buttonHref: "/start",
} as const;

/** Header links use paths only — never `#` or hash fragments as the whole URL. */
export function sanitizeHeaderHref(value: string | undefined): string {
	if (typeof value !== "string") return "";
	const trimmed = value.trim();
	if (!trimmed || trimmed === "#" || trimmed.startsWith("#")) return "";
	return trimmed;
}

/** Canvas/publish fallback when a row URL is still empty in settings. */
export function resolveHeaderHref(value: string | undefined, fallback: string): string {
	const sanitized = sanitizeHeaderHref(value);
	return sanitized || fallback;
}

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
	variant: "links-and-actions",
	brand: {
		kind: "wordmark",
		text: "Site",
		href: "/",
		logoSize: DEFAULT_HEADER_LOGO_SIZE,
		logoRadius: DEFAULT_HEADER_LOGO_RADIUS,
		showName: false,
	},
	brandSlot: "left",
	nav: [
		{
			id: "nav-dropdown",
			label: "Products",
			href: "/products",
			children: [
				{ id: "nav-dropdown-1", label: "Overview", href: "/products" },
				{ id: "nav-dropdown-2", label: "Pricing", href: "/pricing" },
			],
		},
		{ id: "nav-1", label: "About", href: "/about" },
		{ id: "nav-2", label: "Blog", href: "/blog" },
		{ id: "nav-3", label: "Contact", href: "/contact" },
	],
	navSlot: "right",
	actions: [
		{
			id: "action-1",
			label: "Sign in",
			href: "/signin",
			style: "ghost",
			size: DEFAULT_HEADER_ACTION_SIZE,
			radius: DEFAULT_HEADER_ACTION_RADIUS,
		},
		{
			id: "action-2",
			label: "Get started",
			href: "/start",
			style: "solid",
			size: DEFAULT_HEADER_ACTION_SIZE,
			radius: DEFAULT_HEADER_ACTION_RADIUS,
		},
	],
	actionsSlot: "right",
	sticky: false,
};

export function createHeaderNavItem(id: string): HeaderNavItem {
	return { id, label: "", href: "" };
}

export function createHeaderNavChild(id: string): HeaderNavChild {
	return { id, label: "", href: "" };
}

export function createHeaderAction(id: string, style: HeaderActionStyle): HeaderAction {
	return {
		id,
		label: "",
		href: "",
		style,
		size: DEFAULT_HEADER_ACTION_SIZE,
		radius: DEFAULT_HEADER_ACTION_RADIUS,
	};
}

/** Quiet first button; the next one is solid unless a solid already exists. */
export function nextHeaderActionStyle(actions: readonly HeaderAction[]): HeaderActionStyle {
	if (actions.some((action) => action.style === "solid")) return "ghost";
	return actions.length === 0 ? "ghost" : "solid";
}

export function applyHeaderBrandKind(
	brand: HeaderBrand,
	kind: HeaderBrandKind,
): HeaderBrand {
	if (kind === "wordmark") {
		return {
			kind: "wordmark",
			text: brand.text,
			href: brand.href,
			logoSize: readHeaderLogoSize(brand.logoSize),
			logoRadius: readHeaderLogoRadius(brand.logoRadius),
			showName: brand.showName === true,
		};
	}
	return {
		...brand,
		kind: "logo",
		logoSize: readHeaderLogoSize(brand.logoSize),
		logoRadius: readHeaderLogoRadius(brand.logoRadius),
		showName: brand.showName === true,
	};
}

/** Editor/canvas merge — shallow spread drops nested brand fields otherwise. */
export function normalizeHeaderContent(partial: HeaderContent): HeaderContent {
	const brandKind = partial.brand?.kind === "logo" ? "logo" : "wordmark";
	const brand: HeaderBrand = {
		...DEFAULT_HEADER_CONTENT.brand,
		...partial.brand,
		kind: brandKind,
		logoUrl:
			brandKind === "logo" && partial.brand?.logoUrl?.trim()
				? partial.brand.logoUrl.trim()
				: undefined,
		logoSize: readHeaderLogoSize(partial.brand?.logoSize),
		logoRadius: readHeaderLogoRadius(partial.brand?.logoRadius),
		showName: partial.brand?.showName === true,
	};
	return {
		...DEFAULT_HEADER_CONTENT,
		...partial,
		brand,
		nav: partial.nav?.length ? partial.nav : DEFAULT_HEADER_CONTENT.nav,
		actions: (partial.actions?.length ? partial.actions : DEFAULT_HEADER_CONTENT.actions).map(
			(action) => ({
				...action,
				size: readHeaderActionSize(action.size),
				radius: readHeaderActionRadius(action.radius),
			}),
		),
	};
}

/** Maps a variant to which slots show and where they sit. */
export function slotsForHeaderVariant(variant: HeaderVariant): {
	showNav: boolean;
	showActions: boolean;
	brandSlot: HeaderSlot;
	navSlot: HeaderSlot;
	actionsSlot: HeaderSlot;
} {
	if (variant === "links-only") {
		return { showNav: true, showActions: false, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
	}
	if (variant === "split") {
		return { showNav: true, showActions: true, brandSlot: "left", navSlot: "middle", actionsSlot: "right" };
	}
	if (variant === "actions-only") {
		return { showNav: false, showActions: true, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
	}
	return { showNav: true, showActions: true, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
}

export function applyHeaderVariant(content: HeaderContent, variant: HeaderVariant): HeaderContent {
	const slots = slotsForHeaderVariant(variant);
	return {
		...content,
		variant,
		brandSlot: slots.brandSlot,
		navSlot: slots.navSlot,
		actionsSlot: slots.actionsSlot,
	};
}

const isSlot = (value: unknown): value is HeaderSlot =>
	value === "left" || value === "middle" || value === "right";

const isVariant = (value: unknown): value is HeaderVariant =>
	value === "links-and-actions" ||
	value === "links-only" ||
	value === "split" ||
	value === "actions-only";

const readNavChild = (value: unknown): HeaderNavChild | null => {
	if (!value || typeof value !== "object") return null;
	const row = value as Record<string, unknown>;
	if (typeof row.id !== "string" || typeof row.label !== "string") return null;
	return {
		id: row.id,
		label: row.label,
		href: sanitizeHeaderHref(typeof row.href === "string" ? row.href : undefined),
	};
};

const readNavItem = (value: unknown): HeaderNavItem | null => {
	const base = readNavChild(value);
	if (!base) return null;
	const row = value as Record<string, unknown>;
	const children = Array.isArray(row.children)
		? row.children.map(readNavChild).filter((child): child is HeaderNavChild => child !== null)
		: undefined;
	return { ...base, children: children && children.length > 0 ? children : undefined };
};

const readAction = (value: unknown): HeaderAction | null => {
	if (!value || typeof value !== "object") return null;
	const row = value as Record<string, unknown>;
	if (typeof row.id !== "string" || typeof row.label !== "string") return null;
	const color = readHeaderActionColor(row.color);
	return {
		id: row.id,
		label: row.label,
		href: sanitizeHeaderHref(typeof row.href === "string" ? row.href : undefined),
		style: row.style === "ghost" ? "ghost" : "solid",
		size: readHeaderActionSize(row.size),
		radius: readHeaderActionRadius(row.radius),
		...(color ? { color } : {}),
	};
};

export function readHeaderContent(content: BlockContent | undefined): HeaderContent {
	const data = unwrapStructured(content);
	const variant = isVariant(data.variant) ? data.variant : DEFAULT_HEADER_CONTENT.variant;
	const slots = slotsForHeaderVariant(variant);
	const brandRaw = data.brand && typeof data.brand === "object" ? (data.brand as Record<string, unknown>) : {};
	const nav = Array.isArray(data.nav)
		? data.nav.map(readNavItem).filter((item): item is HeaderNavItem => item !== null)
		: DEFAULT_HEADER_CONTENT.nav;
	const actions = Array.isArray(data.actions)
		? data.actions.map(readAction).filter((item): item is HeaderAction => item !== null)
		: DEFAULT_HEADER_CONTENT.actions;
	const brandKind = brandRaw.kind === "logo" ? "logo" : "wordmark";
	return {
		variant,
		brand: {
			kind: brandKind,
			text: typeof brandRaw.text === "string" ? brandRaw.text : DEFAULT_HEADER_CONTENT.brand.text,
			logoUrl:
				brandKind === "logo" && typeof brandRaw.logoUrl === "string" && brandRaw.logoUrl.trim()
					? brandRaw.logoUrl.trim()
					: undefined,
			href: sanitizeHeaderHref(typeof brandRaw.href === "string" ? brandRaw.href : undefined) || "/",
			logoSize: readHeaderLogoSize(brandRaw.logoSize),
			logoRadius: readHeaderLogoRadius(brandRaw.logoRadius),
			showName: brandRaw.showName === true,
		},
		brandSlot: isSlot(data.brandSlot) ? data.brandSlot : slots.brandSlot,
		nav,
		navSlot: isSlot(data.navSlot) ? data.navSlot : slots.navSlot,
		actions,
		actionsSlot: isSlot(data.actionsSlot) ? data.actionsSlot : slots.actionsSlot,
		sticky: data.sticky === true,
	};
}

export function visibleHeaderSlots(content: HeaderContent): {
	left: Array<"brand" | "nav" | "actions">;
	middle: Array<"brand" | "nav" | "actions">;
	right: Array<"brand" | "nav" | "actions">;
} {
	const slots = slotsForHeaderVariant(content.variant);
	const left: Array<"brand" | "nav" | "actions"> = [];
	const middle: Array<"brand" | "nav" | "actions"> = [];
	const right: Array<"brand" | "nav" | "actions"> = [];
	const place = (name: "brand" | "nav" | "actions", slot: HeaderSlot) => {
		if (slot === "middle") middle.push(name);
		else if (slot === "right") right.push(name);
		else left.push(name);
	};
	place("brand", content.brandSlot);
	if (slots.showNav) place("nav", content.navSlot);
	if (slots.showActions) place("actions", content.actionsSlot);
	return { left, middle, right };
}

export function headerBarClassName({ sticky }: { sticky: boolean }): string {
	return ["wp-block-header", sticky ? "is-sticky" : ""].filter(Boolean).join(" ");
}

/**
 * Overlay stacks share one cell. Header menus must paint above later siblings
 * (the wrapper stacking context would otherwise hide an open menu).
 */
export function headerOverlayPaintStyles(block: { name?: string }): {
	position?: "relative";
	zIndex?: number;
} {
	if (block.name !== HEADER_BLOCK_NAME) return {};
	return { position: "relative", zIndex: 40 };
}
