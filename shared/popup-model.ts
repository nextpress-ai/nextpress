import type { BlockConfig, BlockContent } from "./schema-types.js";
import { safeCssBox, safeCssColor, safeCssLength } from "./css-safe.js";

/**
 * Popup (Layout): blocks shown in a window over the page. Any link to `#popup-<name>` opens it —
 * buttons, header buttons, icons, text links — and a page address ending in `#popup-<name>`
 * opens it on arrival, so it can be shared.
 *
 * Published pages are plain HTML, so the popup is the browser's own `<dialog>` (focus stays
 * inside, Esc closes, screen readers announce it) with a small script, styled to match the
 * editor's `ui/dialog`: dark backdrop, rounded card with a shadow, close button top-right,
 * 200ms fade and zoom.
 */

export const POPUP_BLOCK_NAME = "core/popup";
export const POPUP_HASH_PREFIX = "#popup-";

export const POPUP_SIZES = ["sm", "md", "lg", "full"] as const;
export type PopupSize = (typeof POPUP_SIZES)[number];

export const POPUP_SIZE_WIDTH: Record<PopupSize, string> = {
	sm: "24rem",
	md: "32rem",
	lg: "48rem",
	full: "72rem",
};

export const POPUP_ANIMATIONS = ["scale", "fade", "slide-up"] as const;
export type PopupAnimation = (typeof POPUP_ANIMATIONS)[number];

export type PopupContent = {
	/** Shown in pickers and read out by screen readers. */
	name: string;
	/** The link name: `#popup-<slug>`. Letters, digits and dashes. */
	slug: string;
	size: PopupSize;
	/** On phones, slide up from the bottom edge instead of sitting in the middle. */
	bottomOnPhones: boolean;
	closeButton: boolean;
	closeOnBackdrop: boolean;
	backdropColor?: string;
	/** Pixels of blur behind the popup (0–24). */
	backdropBlur: number;
	animation: PopupAnimation;
	background?: string;
	radius: string;
	padding: string;
};

export const DEFAULT_POPUP_CONTENT: PopupContent = {
	name: "Popup",
	slug: "popup",
	size: "md",
	bottomOnPhones: false,
	closeButton: true,
	closeOnBackdrop: true,
	backdropBlur: 0,
	animation: "scale",
	radius: "12px",
	padding: "24px",
};

type Loose = { [key: string]: string | number | boolean | object | null | undefined };

const structuredData = (content: BlockContent | undefined): Loose => {
	if (!content || typeof content !== "object") return {};
	if ("kind" in content && content.kind === "structured" && content.data && typeof content.data === "object") {
		return content.data as Loose;
	}
	return {};
};

/** "Get updates" → "get-updates". Always gives something usable. */
export function slugifyPopupName(name: string): string {
	const slug = name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug || "popup";
}

const readSlug = (value: Loose[string], name: string): string =>
	typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,59}$/.test(value) ? value : slugifyPopupName(name);

export function readPopupContent(content: BlockContent | undefined): PopupContent {
	const d = structuredData(content);
	const base = DEFAULT_POPUP_CONTENT;
	const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 80) : base.name;
	const blur = typeof d.backdropBlur === "number" && Number.isFinite(d.backdropBlur) ? d.backdropBlur : 0;
	return {
		name,
		slug: readSlug(d.slug, name),
		size: POPUP_SIZES.find((size) => size === d.size) ?? base.size,
		bottomOnPhones: d.bottomOnPhones === true,
		closeButton: d.closeButton !== false,
		closeOnBackdrop: d.closeOnBackdrop !== false,
		backdropColor: safeCssColor(d.backdropColor),
		backdropBlur: Math.min(24, Math.max(0, Math.round(blur))),
		animation: POPUP_ANIMATIONS.find((animation) => animation === d.animation) ?? base.animation,
		background: safeCssColor(d.background),
		radius: safeCssLength(d.radius) ?? base.radius,
		padding: safeCssBox(d.padding) ?? base.padding,
	};
}

export const popupHref = (slug: string): string => `${POPUP_HASH_PREFIX}${slug}`;

/** The popup a link opens, or nothing when it is an ordinary link. */
export function readPopupSlugFromHref(href: string | undefined): string | undefined {
	if (!href?.startsWith(POPUP_HASH_PREFIX)) return undefined;
	const slug = href.slice(POPUP_HASH_PREFIX.length);
	return /^[a-z0-9][a-z0-9-]{0,59}$/.test(slug) ? slug : undefined;
}

export type PopupSummary = { id: string; name: string; slug: string };

/** Every popup on the page, in order (for "Open a popup" pickers). */
export function collectPopups(blocks: readonly BlockConfig[]): PopupSummary[] {
	return blocks.flatMap((block) => [
		...(block.name === POPUP_BLOCK_NAME ? [{ id: block.id, ...pickSummary(block) }] : []),
		...collectPopups(block.children ?? []),
	]);
}

const pickSummary = (block: BlockConfig): { name: string; slug: string } => {
	const { name, slug } = readPopupContent(block.content);
	return { name, slug };
};

const KEYFRAMES: Record<PopupAnimation, string> = {
	scale: "@keyframes np-popup-in-scale{from{opacity:0;transform:scale(.95)}}",
	fade: "@keyframes np-popup-in-fade{from{opacity:0}}",
	"slide-up": "@keyframes np-popup-in-slide-up{from{opacity:0;transform:translateY(16px)}}",
};

/**
 * CSS for one popup. The dialog carries the block class (published); on the canvas the block
 * class is on a wrapper, so the card is matched as a descendant too.
 */
export function buildPopupCss({ blockId, content }: { blockId: string; content: PopupContent }): string {
	const dialog = `dialog.np-popup.block-${blockId}`;
	const panel = `:is(${dialog},.block-${blockId}) .np-popup__panel`;
	const width = POPUP_SIZE_WIDTH[content.size];
	const backdrop = content.backdropColor ?? "rgb(0 0 0 / 0.5)";
	const blur = content.backdropBlur > 0 ? `backdrop-filter:blur(${content.backdropBlur}px);` : "";
	const animation = content.animation;
	return [
		`${dialog}{padding:0;border:0;background:transparent;color:inherit;width:min(${width},calc(100vw - 2rem));max-width:none;max-height:none;overflow:visible}`,
		`${dialog}::backdrop{background:${backdrop};${blur}}`,
		`${panel}{position:relative;box-sizing:border-box;width:100%;max-width:${width};max-height:calc(100dvh - 2rem);overflow:auto;background:${content.background ?? "#ffffff"};color:#0f172a;border:1px solid rgba(15,23,42,.08);border-radius:${content.radius};box-shadow:0 24px 60px -16px rgba(15,23,42,.4);padding:${content.padding}}`,
		`${panel} > .np-popup__close{position:absolute;top:12px;right:12px;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.7;cursor:pointer;z-index:1}`,
		`${panel} > .np-popup__close:hover{opacity:1}`,
		`${panel} > .np-popup__close:focus-visible{outline:2px solid var(--npb-accent,#2563eb);outline-offset:2px}`,
		content.bottomOnPhones
			? `@media (max-width:640px){${dialog}{margin:auto 0 0;width:100vw}${dialog} .np-popup__panel{border-radius:${content.radius} ${content.radius} 0 0;max-height:85dvh}}`
			: "",
		"@media (prefers-reduced-motion: no-preference){",
		KEYFRAMES[animation],
		"@keyframes np-popup-backdrop-in{from{opacity:0}}",
		`${dialog}[open] .np-popup__panel{animation:np-popup-in-${animation} 200ms cubic-bezier(0.23,1,0.32,1)}`,
		`${dialog}[open]::backdrop{animation:np-popup-backdrop-in 200ms ease-out}`,
		"}",
	]
		.filter(Boolean)
		.join("\n");
}
