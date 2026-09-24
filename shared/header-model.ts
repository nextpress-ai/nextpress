import type { BlockContent, TokenEntry } from "./schema-types.js";
import { BORDER_RADIUS_PRESETS, isCssLength } from "./dimension-presets.js";
import { unwrapStructured } from "./page-shell-model.js";
import { readHeaderScrollLook, type HeaderScrollLook } from "./header-scroll-model.js";

export const HEADER_BLOCK_NAME = "core/header";

export type HeaderSlot = "left" | "middle" | "right";
export type HeaderVariant =
	| "links-and-actions"
	| "links-only"
	| "split"
	| "actions-only"
	/** Brand on the left, any blocks you drop in on the right. No menu, no built-in links or buttons. */
	| "brand-and-blocks";

/** One thing a header can paint in a slot. `blocks` is the drop area for the blocks layout. */
export type HeaderSlotPart = "brand" | "nav" | "actions" | "blocks";
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

export type HeaderActionSizePreset = "sm" | "md" | "lg" | "xl";
/** A preset name, or a custom CSS font size such as `0.95rem` (height and padding follow it). */
export type HeaderActionSize = string;

export type HeaderAction = {
	id: string;
	label: string;
	href: string;
	style: HeaderActionStyle;
	size: HeaderActionSize;
	radius: string;
	/** Solid: the button's background. Ghost: its outline (and its text, unless `textColor` is set). */
	color?: TokenEntry;
	/** Text colour. Solid buttons are white without it; ghost buttons follow `color`. */
	textColor?: TokenEntry;
};

export const HEADER_ACTION_SIZE_PRESETS = [
	{ value: "sm", label: "SM" },
	{ value: "md", label: "MD" },
	{ value: "lg", label: "LG" },
	{ value: "xl", label: "XL" },
] as const;

export const HEADER_ACTION_RADIUS_PRESETS = BORDER_RADIUS_PRESETS;
export const DEFAULT_HEADER_ACTION_SIZE: HeaderActionSizePreset = "md";
export const DEFAULT_HEADER_ACTION_RADIUS = "9999px";

type HeaderActionSizeLook = { minHeight: string; padding: string; fontSize: string };

const HEADER_ACTION_SIZE_LOOK: Record<HeaderActionSizePreset, HeaderActionSizeLook> = {
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

function isHeaderActionSizePreset(value: string): value is HeaderActionSizePreset {
	return value in HEADER_ACTION_SIZE_LOOK;
}

/**
 * Keeps a preset name or whatever custom text was typed. Text is not checked here so the
 * settings box never fights the person mid-typing; `headerActionSizeLook` is where a bad value
 * falls back.
 */
export function readHeaderActionSize(value: unknown): HeaderActionSize {
	if (typeof value !== "string") return DEFAULT_HEADER_ACTION_SIZE;
	return value.trim() || DEFAULT_HEADER_ACTION_SIZE;
}

/**
 * Custom sizes set the font size and scale height and padding from it in `em`, keeping the
 * same proportions as the MD preset. Anything that is not a real length paints as MD.
 */
export function headerActionSizeLook(size: HeaderActionSize): HeaderActionSizeLook {
	if (isHeaderActionSizePreset(size)) return HEADER_ACTION_SIZE_LOOK[size];
	if (!isCssLength(size)) return HEADER_ACTION_SIZE_LOOK[DEFAULT_HEADER_ACTION_SIZE];
	return { fontSize: size, minHeight: "2.33em", padding: "0.4em 1.07em" };
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
	const look: HeaderActionLookStyle = {
		...headerActionSizeLook(readHeaderActionSize(action.size)),
		borderRadius: readHeaderActionRadius(action.radius),
	};
	const paint = action.color?.style?.trim();
	const text = action.textColor?.style?.trim();
	if (action.style === "solid") {
		if (paint) {
			look.backgroundColor = paint;
			look.borderColor = "transparent";
			look.color = "#fff";
		}
		if (text) look.color = text;
		return look;
	}
	if (paint) {
		look.borderColor = paint;
		look.color = paint;
	}
	if (text) look.color = text;
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
	/** How the bar looks once the page has scrolled under it. Only used while `sticky` is on. */
	onScroll?: HeaderScrollLook;
	/** When on, the bar follows the page column so it lines up with the content. Off stays edge to edge. */
	matchPagePadding?: boolean;
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
	{ value: "brand-and-blocks", label: "Blocks", accessibleName: "Brand left, your own blocks right" },
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
	matchPagePadding: false,
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
		matchPagePadding: partial.matchPagePadding === true,
	};
}

/** Maps a variant to which slots show and where they sit. */
export function slotsForHeaderVariant(variant: HeaderVariant): {
	showNav: boolean;
	showActions: boolean;
	showBlocks: boolean;
	brandSlot: HeaderSlot;
	navSlot: HeaderSlot;
	actionsSlot: HeaderSlot;
} {
	if (variant === "links-only") {
		return { showNav: true, showActions: false, showBlocks: false, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
	}
	if (variant === "split") {
		return { showNav: true, showActions: true, showBlocks: false, brandSlot: "left", navSlot: "middle", actionsSlot: "right" };
	}
	if (variant === "actions-only") {
		return { showNav: false, showActions: true, showBlocks: false, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
	}
	if (variant === "brand-and-blocks") {
		return { showNav: false, showActions: false, showBlocks: true, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
	}
	return { showNav: true, showActions: true, showBlocks: false, brandSlot: "left", navSlot: "right", actionsSlot: "right" };
}

/**
 * Only layouts with links fold into a menu on narrow screens. With no links there is nothing to
 * hide, so buttons or blocks on the right stay in view — no hamburger.
 */
export function headerCollapsesToMenu(variant: HeaderVariant): boolean {
	return slotsForHeaderVariant(variant).showNav;
}

/** True when the right side is a drop area for child blocks. */
export function headerHasBlocksSlot(variant: HeaderVariant): boolean {
	return slotsForHeaderVariant(variant).showBlocks;
}

/**
 * How the child blocks in the blocks layout are laid out: one row, right-aligned, wrapping on
 * narrow screens. The editor feeds this to the container helpers; publish gets the same
 * arrangement from the `.wp-block-header__blocks` CSS rule.
 */
export const HEADER_BLOCKS_ROW_STYLES = {
	display: "flex",
	flexDirection: "row",
	flexWrap: "wrap",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: "0.5rem",
} as const;

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
	value === "actions-only" ||
	value === "brand-and-blocks";

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
	const textColor = readHeaderActionColor(row.textColor);
	return {
		id: row.id,
		label: row.label,
		href: sanitizeHeaderHref(typeof row.href === "string" ? row.href : undefined),
		style: row.style === "ghost" ? "ghost" : "solid",
		size: readHeaderActionSize(row.size),
		radius: readHeaderActionRadius(row.radius),
		...(color ? { color } : {}),
		...(textColor ? { textColor } : {}),
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
		onScroll: readHeaderScrollLook(data.onScroll),
		matchPagePadding: data.matchPagePadding === true,
	};
}

export function visibleHeaderSlots(content: HeaderContent): {
	left: HeaderSlotPart[];
	middle: HeaderSlotPart[];
	right: HeaderSlotPart[];
} {
	const slots = slotsForHeaderVariant(content.variant);
	const left: HeaderSlotPart[] = [];
	const middle: HeaderSlotPart[] = [];
	const right: HeaderSlotPart[] = [];
	const place = (name: HeaderSlotPart, slot: HeaderSlot) => {
		if (slot === "middle") middle.push(name);
		else if (slot === "right") right.push(name);
		else left.push(name);
	};
	place("brand", content.brandSlot);
	if (slots.showNav) place("nav", content.navSlot);
	if (slots.showActions) place("actions", content.actionsSlot);
	if (slots.showBlocks) place("blocks", "right");
	return { left, middle, right };
}

export function headerBarClassName({
	sticky,
	variant,
	matchPagePadding,
}: {
	sticky: boolean;
	variant?: HeaderVariant;
	matchPagePadding?: boolean;
}): string {
	const noMenu = variant !== undefined && !headerCollapsesToMenu(variant);
	return [
		"wp-block-header",
		sticky ? "is-sticky" : "",
		noMenu ? "is-no-menu" : "",
		matchPagePadding ? "is-page-inset" : "",
	]
		.filter(Boolean)
		.join(" ");
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

/**
 * "Float on scroll" — the header stays at the top while the page scrolls under it.
 *
 * WHY this is on the wrapper, not the `<header>`: `position: sticky` only moves an element within
 * its parent's box. The header always sits inside wrapper divs exactly as tall as itself, so a
 * sticky `<header>` has no room to travel and just scrolls away. The outermost wrapper — the direct
 * child of the tall page column — is the element that has to stick.
 */
export function headerFloatWrapperStyles(block: { name?: string; content?: BlockContent }): {
	position?: "sticky";
	top?: number;
	zIndex?: number;
} {
	if (block.name !== HEADER_BLOCK_NAME) return {};
	return readHeaderContent(block.content).sticky ? { position: "sticky", top: 0, zIndex: 40 } : {};
}
