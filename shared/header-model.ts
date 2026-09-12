import type { BlockContent } from "./schema-types.js";
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
};

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

export type HeaderAction = {
	id: string;
	label: string;
	href: string;
	style: HeaderActionStyle;
};

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

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
	variant: "links-and-actions",
	brand: { kind: "wordmark", text: "Site", href: "/" },
	brandSlot: "left",
	nav: [
		{
			id: "nav-dropdown",
			label: "Dropdown",
			href: "#",
			children: [
				{ id: "nav-dropdown-1", label: "Overview", href: "#" },
				{ id: "nav-dropdown-2", label: "Pricing", href: "#" },
			],
		},
		{ id: "nav-1", label: "Link one", href: "#" },
		{ id: "nav-2", label: "Link two", href: "#" },
		{ id: "nav-3", label: "Link three", href: "#" },
	],
	navSlot: "right",
	actions: [
		{ id: "action-1", label: "Button", href: "#", style: "ghost" },
		{ id: "action-2", label: "Buy now", href: "#", style: "solid" },
	],
	actionsSlot: "right",
	sticky: false,
};

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
		href: typeof row.href === "string" ? row.href : "#",
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
	return {
		id: row.id,
		label: row.label,
		href: typeof row.href === "string" ? row.href : "#",
		style: row.style === "ghost" ? "ghost" : "solid",
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
	return {
		variant,
		brand: {
			kind: brandRaw.kind === "logo" ? "logo" : "wordmark",
			text: typeof brandRaw.text === "string" ? brandRaw.text : DEFAULT_HEADER_CONTENT.brand.text,
			logoUrl: typeof brandRaw.logoUrl === "string" ? brandRaw.logoUrl : undefined,
			href: typeof brandRaw.href === "string" ? brandRaw.href : "/",
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
