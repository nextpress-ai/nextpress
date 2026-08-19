import type { BlockConfig } from "@shared/schema-types";
import { demoBlock, demoButtons, demoHeading, demoOther, demoParagraph } from "./helpers.js";

const photo = (id: number, w: number, h: number) => `https://picsum.photos/id/${id}/${w}/${h}`;

const DEEP = "#0f3d2e";
const MOSS = "#1b5e43";
const SAND = "#f5f3ec";
const CREAM = "#fdfcf7";

function stat({ id, value, label }: { id: string; value: string; label: string }): BlockConfig[] {
	return [
		demoHeading({
			id: `${id}-n`,
			level: 3,
			value,
			parentId: "ngo-stats",
			styles: {
				fontSize: "2.25rem",
				lineHeight: "1.15",
				whiteSpace: "nowrap",
				color: DEEP,
				textAlign: "center",
				margin: "0",
			},
		}),
		demoParagraph({
			id: `${id}-l`,
			value: label,
			parentId: "ngo-stats",
			styles: {
				textAlign: "center",
				color: MOSS,
				fontSize: "0.9rem",
				letterSpacing: "0.06em",
				textTransform: "uppercase",
				margin: "0.35rem 0 0",
			},
		}),
	];
}

/** Conservation nonprofit — photo-led hero, impact numbers, programmes, donate CTA. */
export const ngoConservationFixture: BlockConfig[] = [
	demoBlock({
		id: "ngo-hero",
		name: "core/cover",
		label: "Hero",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "media",
			url: photo(1039, 1600, 900),
			alt: "Waterfall feeding a forested river valley",
			mediaType: "image",
			overlayColor: "rgb(8,38,27)",
			minHeight: "520px",
		},
		styles: {},
		settings: {},
		other: demoOther,
		// core/cover renders its inner container as a flex ROW, so direct children
		// would sit side by side. Stack the hero content in one column group.
		children: [
			demoBlock({
				id: "ngo-hero-stack",
				name: "core/group",
				label: "Hero stack",
				type: "container",
				parentId: "ngo-hero",
				category: "layout",
				content: { kind: "structured", data: { tagName: "div" } },
				styles: {
					width: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "2.5rem 1.5rem",
				},
				settings: {},
				other: demoOther,
				children: [
					demoParagraph({
						id: "ngo-eyebrow",
						value: "RIVERMOUTH TRUST",
						parentId: "ngo-hero-stack",
						styles: {
							color: "#a7f3d0",
							textAlign: "center",
							letterSpacing: "0.22em",
							fontSize: "0.8rem",
							margin: "0 0 1rem",
						},
					}),
					demoHeading({
						id: "ngo-hero-h1",
						level: 1,
						value: "Protect the river. Restore the delta.",
						parentId: "ngo-hero-stack",
						styles: {
							color: "#ffffff",
							textAlign: "center",
							fontSize: "3.25rem",
							lineHeight: "1.12",
							maxWidth: "20ch",
							margin: "0 auto",
						},
					}),
					demoParagraph({
						id: "ngo-hero-p",
						value:
							"We buy back floodplain, pull out the old levees, and let the water find its own way home.",
						parentId: "ngo-hero-stack",
						styles: {
							color: "#d1fae5",
							textAlign: "center",
							maxWidth: "52ch",
							margin: "1.25rem auto 0",
							fontSize: "1.05rem",
						},
					}),
					demoButtons({
						id: "ngo-hero-cta",
						parentId: "ngo-hero-stack",
						buttons: [
							{ id: "ngo-donate", text: "Donate monthly", url: "#donate" },
							{ id: "ngo-volunteer", text: "Volunteer with us", url: "#volunteer" },
						],
					}),
				],
			}),
		],
	}),
	demoBlock({
		id: "ngo-stats-band",
		name: "core/group",
		label: "Impact band",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: { width: "100%", backgroundColor: SAND, padding: "3rem 2rem" },
		settings: {},
		other: demoOther,
		children: [
			demoBlock({
				id: "ngo-stats",
				name: "core/columns",
				label: "Impact numbers",
				type: "container",
				parentId: "ngo-stats-band",
				category: "layout",
				content: {
					kind: "structured",
					data: { layoutMode: "flex", minColumnWidth: "240px", direction: "row" },
				},
				styles: { width: "100%", gap: "32px", margin: "0" },
				settings: {
					columnLayout: [
						{ columnId: "s1", blockIds: ["ngo-s1-n", "ngo-s1-l"] },
						{ columnId: "s2", blockIds: ["ngo-s2-n", "ngo-s2-l"] },
						{ columnId: "s3", blockIds: ["ngo-s3-n", "ngo-s3-l"] },
					],
				},
				other: demoOther,
				children: [
					...stat({ id: "ngo-s1", value: "128 km", label: "River reopened" }),
					...stat({ id: "ngo-s2", value: "3,400", label: "Volunteers" }),
					...stat({ id: "ngo-s3", value: "62", label: "Species returning" }),
				],
			}),
		],
	}),
	demoHeading({
		id: "ngo-programs-h",
		level: 2,
		value: "Where your gift goes",
		styles: { textAlign: "center", marginTop: "3rem", color: DEEP },
	}),
	demoParagraph({
		id: "ngo-programs-p",
		value: "Three programmes, one watershed. Every pound is tied to a hectare you can walk to.",
		styles: { textAlign: "center", color: MOSS, maxWidth: "56ch", margin: "0.5rem auto 2rem" },
	}),
	demoBlock({
		id: "ngo-gallery",
		name: "core/gallery",
		label: "Programmes",
		type: "block",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				images: [
					{ id: "ngo-g1", url: photo(1015, 800, 600), alt: "Braided river between cliffs" },
					{ id: "ngo-g2", url: photo(1043, 800, 600), alt: "Old-growth forest and granite" },
					{ id: "ngo-g3", url: photo(1084, 800, 600), alt: "Wildlife back on the sandbar" },
				],
				columns: 3,
				imageCrop: true,
			},
		},
		styles: { width: "100%", margin: "0 0 3rem" },
		settings: {},
		other: demoOther,
	}),
	demoBlock({
		id: "ngo-plan",
		name: "core/media-text",
		label: "Delta plan",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				mediaUrl: photo(1050, 900, 700),
				mediaType: "image",
				isStackedOnMobile: true,
				mediaPosition: "left",
			},
		},
		styles: { margin: "0 0 3rem" },
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "ngo-plan-h",
				level: 2,
				value: "The 2026 delta plan",
				parentId: "ngo-plan",
				styles: { color: DEEP },
			}),
			demoParagraph({
				id: "ngo-plan-p",
				value:
					"Forty hectares of saltmarsh come back this winter. We have the permits and the diggers — we need the last third of the funding.",
				parentId: "ngo-plan",
				styles: { color: "#334155" },
			}),
			demoButtons({
				id: "ngo-plan-cta",
				parentId: "ngo-plan",
				buttons: [{ id: "ngo-plan-read", text: "Read the plan", url: "#plan" }],
			}),
		],
	}),
	demoBlock({
		id: "ngo-quote",
		name: "core/quote",
		label: "Partner quote",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value:
				"The otters were back within a season. You do not often get to watch a river forgive you that quickly.",
			citation: "Dr. Iris Ferrand, river ecologist",
		},
		styles: {
			margin: "0 auto 3rem",
			maxWidth: "52ch",
			padding: "1.5rem 2rem",
			borderLeft: `4px solid ${MOSS}`,
			backgroundColor: CREAM,
			fontStyle: "italic",
			color: DEEP,
		},
		settings: {},
		other: demoOther,
	}),
	demoBlock({
		id: "ngo-cta-band",
		name: "core/group",
		label: "Donate band",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: { width: "100%", backgroundColor: DEEP, padding: "3.5rem 2rem" },
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "ngo-cta-h",
				level: 2,
				value: "£12 a month reopens a metre of river",
				parentId: "ngo-cta-band",
				styles: { color: "#ffffff", textAlign: "center", margin: "0" },
			}),
			demoParagraph({
				id: "ngo-cta-p",
				value: "Cancel any time. 94p in every pound goes straight to the watershed.",
				parentId: "ngo-cta-band",
				styles: { color: "#a7f3d0", textAlign: "center", margin: "0.75rem 0 0" },
			}),
			demoButtons({
				id: "ngo-cta-buttons",
				parentId: "ngo-cta-band",
				buttons: [{ id: "ngo-cta-give", text: "Give monthly", url: "#donate" }],
			}),
		],
	}),
];
