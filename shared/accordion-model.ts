import type { BlockConfig, BlockContent } from "./schema-types.js";
import { safeCssBox, safeCssColor, safeCssLength } from "./css-safe.js";

/**
 * Accordion (Layout): a list of items, each a title that opens to show any blocks.
 * Published as native `<details>` / `<summary>`, so it works without JavaScript, with the
 * keyboard, and with screen readers. "One at a time" uses the `name` attribute browsers share
 * between details. Editor and published page use the same class names and the same CSS.
 */

export const ACCORDION_BLOCK_NAME = "core/accordion";
export const ACCORDION_ITEM_BLOCK_NAME = "core/accordion-item";

export const ACCORDION_LOOKS = ["cards", "lines", "plain"] as const;
export type AccordionLook = (typeof ACCORDION_LOOKS)[number];

export const ACCORDION_ICON_PRESETS = ["plus-minus", "chevron", "arrow", "custom"] as const;
export type AccordionIconPreset = (typeof ACCORDION_ICON_PRESETS)[number];

export const ACCORDION_ICON_MOTIONS = ["swap", "turn"] as const;
export type AccordionIconMotion = (typeof ACCORDION_ICON_MOTIONS)[number];

/** The icon fields an accordion keeps for Custom (any picker icon, brand logo or upload). */
export type AccordionIconRef = {
	iconSet: string;
	iconName: string;
	svg?: string;
	url?: string;
	label?: string;
	tint?: boolean;
};

export type AccordionContent = {
	/** `one`: opening an item closes the others. */
	openMode: "one" | "many";
	/** Open the first item when the page loads. */
	firstOpen: boolean;
	look: AccordionLook;
	icon: {
		preset: AccordionIconPreset;
		/**
		 * Custom only. `open` is optional: without it the closed icon turns when opening.
		 * `null` clears a saved pick (saving deep-merges, so a missing key would keep it).
		 */
		closed?: AccordionIconRef | null;
		open?: AccordionIconRef | null;
		position: "start" | "end";
		size: string;
		/** `null` hands the colour back to the title's colour. */
		color?: string | null;
	};
	/** Adds FAQ structured data (search engines can show the questions). Off by default. */
	faqSchema: boolean;
	gap: string;
	itemPadding: string;
	itemRadius: string;
	itemBackground?: string;
	itemBorderColor?: string;
	titleSize: string;
	titleWeight: string;
	titleColor?: string;
};

export type AccordionItemContent = {
	title: string;
	/** Open when the page loads (in addition to "first item open"). */
	open: boolean;
};

export const DEFAULT_ACCORDION_CONTENT: AccordionContent = {
	openMode: "one",
	firstOpen: true,
	look: "cards",
	icon: { preset: "plus-minus", position: "start", size: "18px" },
	faqSchema: false,
	gap: "12px",
	itemPadding: "20px 24px",
	itemRadius: "14px",
	titleSize: "16px",
	titleWeight: "500",
};

export const DEFAULT_ACCORDION_ITEM_CONTENT: AccordionItemContent = { title: "Question", open: false };

/** Built-in icon pairs, all Lucide (always available on published pages). */
export const ACCORDION_PRESET_ICONS: Record<
	Exclude<AccordionIconPreset, "custom">,
	{ closed: string; open?: string; motion: AccordionIconMotion; turn: number }
> = {
	"plus-minus": { closed: "plus", open: "minus", motion: "swap", turn: 0 },
	chevron: { closed: "chevron-down", motion: "turn", turn: 180 },
	arrow: { closed: "arrow-right", motion: "turn", turn: 90 },
};

type Loose = { [key: string]: string | number | boolean | object | null | undefined };

const isLoose = (value: object | string | number | boolean | null | undefined): value is Loose =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const pick = <T extends string>(options: readonly T[], value: Loose[string], fallback: T): T =>
	options.find((option) => option === value) ?? fallback;

const text = (value: Loose[string]): string | undefined => (typeof value === "string" && value.trim() ? value : undefined);

const readIconRef = (raw: Loose[string]): AccordionIconRef | undefined => {
	if (!isLoose(raw ?? null)) return undefined;
	const ref = raw as Loose;
	const iconSet = text(ref.iconSet);
	const iconName = text(ref.iconName);
	if (!iconSet || !iconName) return undefined;
	return {
		iconSet,
		iconName,
		...(text(ref.svg) ? { svg: text(ref.svg) } : {}),
		...(text(ref.url) ? { url: text(ref.url) } : {}),
		...(text(ref.label) ? { label: text(ref.label) } : {}),
		...(ref.tint === true ? { tint: true } : {}),
	};
};

const structuredData = (content: BlockContent | undefined): Loose => {
	if (!content || typeof content !== "object") return {};
	if ("kind" in content && content.kind === "structured" && isLoose(content.data ?? null)) {
		return content.data as Loose;
	}
	return {};
};

/** Reads saved accordion settings, filling gaps with defaults and dropping anything unsafe. */
export function readAccordionContent(content: BlockContent | undefined): AccordionContent {
	const d = structuredData(content);
	const icon: Loose = isLoose(d.icon ?? null) ? (d.icon as Loose) : {};
	const base = DEFAULT_ACCORDION_CONTENT;
	return {
		openMode: d.openMode === "many" ? "many" : "one",
		firstOpen: d.firstOpen !== false,
		look: pick(ACCORDION_LOOKS, d.look, base.look),
		icon: {
			preset: pick(ACCORDION_ICON_PRESETS, icon.preset, base.icon.preset),
			closed: readIconRef(icon.closed),
			open: readIconRef(icon.open),
			position: icon.position === "end" ? "end" : "start",
			size: safeCssLength(icon.size) ?? base.icon.size,
			color: safeCssColor(icon.color),
		},
		faqSchema: d.faqSchema === true,
		gap: safeCssLength(d.gap) ?? base.gap,
		itemPadding: safeCssBox(d.itemPadding) ?? base.itemPadding,
		itemRadius: safeCssLength(d.itemRadius) ?? base.itemRadius,
		itemBackground: safeCssColor(d.itemBackground),
		itemBorderColor: safeCssColor(d.itemBorderColor),
		titleSize: safeCssLength(d.titleSize) ?? base.titleSize,
		titleWeight: /^[1-9]00$/.test(String(d.titleWeight ?? "")) ? String(d.titleWeight) : base.titleWeight,
		titleColor: safeCssColor(d.titleColor),
	};
}

export function readAccordionItemContent(content: BlockContent | undefined): AccordionItemContent {
	const d = structuredData(content);
	return {
		title: typeof d.title === "string" ? d.title : DEFAULT_ACCORDION_ITEM_CONTENT.title,
		open: d.open === true,
	};
}

/** Whether an item starts open: its own switch, or being first when "first item open" is on. */
export const isItemOpenAtStart = ({
	accordion,
	item,
	index,
}: {
	accordion: AccordionContent;
	item: AccordionItemContent;
	index: number;
}): boolean => item.open || (accordion.firstOpen && index === 0);

/** The icons to paint: the preset's Lucide pair, or the owner's custom picks. */
export function resolveAccordionIcons(icon: AccordionContent["icon"]): {
	closed: AccordionIconRef;
	open?: AccordionIconRef;
	motion: AccordionIconMotion;
	turn: number;
} {
	if (icon.preset === "custom" && icon.closed) {
		// Two icons swap; a single icon turns (swapping to nothing would make it vanish).
		return icon.open
			? { closed: icon.closed, open: icon.open, motion: "swap", turn: 0 }
			: { closed: icon.closed, motion: "turn", turn: 180 };
	}
	const preset = ACCORDION_PRESET_ICONS[icon.preset === "custom" ? "plus-minus" : icon.preset];
	return {
		closed: { iconSet: "lucide", iconName: preset.closed },
		open: preset.open ? { iconSet: "lucide", iconName: preset.open } : undefined,
		motion: preset.motion,
		turn: preset.turn,
	};
}

/**
 * CSS for one accordion. Items read as open from `[open]` (published `<details>`) or
 * `[data-open="true"]` (editor), so both surfaces share it. Opening glides where the browser can
 * animate to `auto` height, and is instant elsewhere or for people who ask for less motion.
 */
export function buildAccordionCss({ blockId, content }: { blockId: string; content: AccordionContent }): string {
	// Published: the block class and `np-accordion` sit on one element. Editor: the block class is
	// on a wrapper and items sit a few wrappers deep, so items are matched as descendants.
	const root = `:is(.block-${blockId}.np-accordion,.block-${blockId} .np-accordion)`;
	const item = `${root} .np-accordion__item`;
	const scoped = (suffix: string) => `${item}${suffix}`;
	const isOpen = (suffix: string) =>
		`${root} .np-accordion__item:is([open],[data-open="true"])${suffix}`;
	const isClosed = (suffix: string) =>
		`${root} .np-accordion__item:not([open]):not([data-open="true"])${suffix}`;

	const border = content.itemBorderColor ?? "rgba(15,23,42,.14)";
	const look: Record<AccordionLook, string> = {
		cards: `${item}{background:${content.itemBackground ?? "#ffffff"};border:1px solid ${border};border-radius:${content.itemRadius};box-shadow:0 2px 2px rgba(15,23,42,.04),0 0 0 1px rgba(15,23,42,.02);overflow:hidden}`,
		lines: `${item}{border-bottom:1px solid ${border};${content.itemBackground ? `background:${content.itemBackground};` : ""}}`,
		plain: content.itemBackground ? `${item}{background:${content.itemBackground}}` : "",
	};
	const icons = resolveAccordionIcons(content.icon);

	return [
		`${root}{display:flex;flex-direction:column;gap:${content.look === "lines" ? "0" : content.gap}}`,
		look[content.look],
		`${scoped(" > .np-accordion__title")}{display:flex;align-items:center;gap:14px;cursor:pointer;list-style:none;padding:${content.itemPadding};font-size:${content.titleSize};font-weight:${content.titleWeight};line-height:1.5;${content.titleColor ? `color:${content.titleColor};` : ""}${content.icon.position === "end" ? "flex-direction:row-reverse;justify-content:space-between;" : ""}}`,
		`${scoped(" > .np-accordion__title::-webkit-details-marker")}{display:none}`,
		`${scoped(" > .np-accordion__title:focus-visible")}{outline:2px solid var(--npb-accent,#2563eb);outline-offset:-2px}`,
		`${scoped(" .np-accordion__icon")}{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;width:${content.icon.size};height:${content.icon.size};${content.icon.color ? `color:${content.icon.color};` : ""}}`,
		`${scoped(" > .np-accordion__body")}{padding:0 ${content.itemPadding.split(/\s+/)[1] ?? content.itemPadding} ${content.itemPadding.split(/\s+/)[0]}}`,
		icons.motion === "swap"
			? `${isOpen(" .np-accordion__icon-closed")},${isClosed(" .np-accordion__icon-open")}{display:none}`
			: `${isOpen(" .np-accordion__icon")}{transform:rotate(${icons.turn}deg)}`,
		`@media (prefers-reduced-motion: no-preference){${scoped(" .np-accordion__icon")}{transition:transform 200ms cubic-bezier(0.23,1,0.32,1)}}`,
		"@supports (interpolate-size: allow-keywords){",
		`@media (prefers-reduced-motion: no-preference){${root}{interpolate-size:allow-keywords}`,
		`${scoped("::details-content")}{block-size:0;overflow:hidden;transition:block-size 240ms cubic-bezier(0.23,1,0.32,1),content-visibility 240ms allow-discrete}`,
		`${isOpen("::details-content")}{block-size:auto}}`,
		"}",
	].join("\n");
}

type TextLike = { value?: string; content?: string; title?: string };

/** Plain words inside a block and its children (for FAQ answers). */
export function collectBlockText(block: BlockConfig): string {
	const c = (block.content ?? {}) as BlockContent & TextLike & { data?: TextLike };
	const own = [c.value, c.data?.content, c.data?.value].filter((part): part is string => typeof part === "string");
	const children = (block.children ?? []).map(collectBlockText);
	return [...own, ...children]
		.join(" ")
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * FAQ structured data for search engines, as script text. `<` is escaped so an answer can never
 * close the script tag early.
 */
export function buildFaqJsonLd(items: readonly BlockConfig[]): string {
	const entries = items
		.filter((item) => item.name === ACCORDION_ITEM_BLOCK_NAME)
		.map((item) => ({
			question: readAccordionItemContent(item.content).title.trim(),
			answer: (item.children ?? []).map(collectBlockText).join(" ").trim(),
		}))
		.filter((entry) => entry.question && entry.answer);
	if (entries.length === 0) return "";
	return JSON.stringify({
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: entries.map((entry) => ({
			"@type": "Question",
			name: entry.question,
			acceptedAnswer: { "@type": "Answer", text: entry.answer },
		})),
	}).replace(/</g, "\\u003c");
}
