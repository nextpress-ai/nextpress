import type { BlockConfig } from "@shared/schema-types";
import {
	demoBlock,
	demoButtons,
	demoHeading,
	demoImage,
	demoOther,
	demoParagraph,
} from "./helpers.js";

const menuImages = [
	{ id: "cafe-g1", text: "Latte" },
	{ id: "cafe-g2", text: "Pastry" },
	{ id: "cafe-g3", text: "Sandwich" },
	{ id: "cafe-g4", text: "Salad" },
];

/** Local café — neighborhood coffee shop with hours, menu gallery, and contact form. */
export const cafeLocalFixture: BlockConfig[] = [
	demoBlock({
		id: "cafe-hero",
		name: "core/cover",
		label: "Hero",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "media",
			url: "https://placehold.co/1400x600/78350f/fef3c7?text=Oak+%26+Ember",
			alt: "Oak and Ember Coffee interior",
			mediaType: "image",
			overlayColor: "rgba(67,20,7,0.55)",
			minHeight: "420px",
		},
		styles: {},
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "cafe-hero-h1",
				level: 1,
				value: "Oak & Ember Coffee",
				parentId: "cafe-hero",
				styles: { color: "#fffbeb", textAlign: "center" },
			}),
			demoParagraph({
				id: "cafe-hero-tag",
				value: "Small-batch roasts · River North · Since 2018",
				parentId: "cafe-hero",
				styles: { color: "#fde68a", textAlign: "center" },
			}),
		],
	}),
	demoBlock({
		id: "cafe-hours-row",
		name: "core/columns",
		label: "Hours",
		type: "container",
		parentId: null,
		category: "layout",
		content: {
			kind: "structured",
			data: { layoutMode: "flex", minColumnWidth: "260px", direction: "row" },
		},
		styles: { margin: "2em 0", gap: "24px", width: "100%" },
		settings: {
			columnLayout: [
				{ columnId: "hours-col", blockIds: ["cafe-hours-h", "cafe-hours-list"] },
				{ columnId: "visit-col", blockIds: ["cafe-visit-h", "cafe-visit-p"] },
			],
		},
		other: demoOther,
		children: [
			demoHeading({ id: "cafe-hours-h", level: 2, value: "Hours", parentId: "cafe-hours-row" }),
			demoBlock({
				id: "cafe-hours-list",
				name: "core/list",
				label: "Hours list",
				type: "block",
				parentId: "cafe-hours-row",
				category: "basic",
				content: {
					kind: "list",
					ordered: false,
					values:
						"<li>Mon–Fri: 7am – 6pm</li><li>Saturday: 8am – 5pm</li><li>Sunday: 8am – 2pm</li>",
				},
				styles: {},
				settings: {},
				other: demoOther,
			}),
			demoHeading({ id: "cafe-visit-h", level: 2, value: "Visit us", parentId: "cafe-hours-row" }),
			demoParagraph({
				id: "cafe-visit-p",
				value: "412 River Street, Chicago IL. Metered street parking on Oak. The red door behind the bike racks.",
				parentId: "cafe-hours-row",
			}),
		],
	}),
	demoHeading({
		id: "cafe-menu-title",
		level: 2,
		value: "From the counter",
		styles: { textAlign: "center" },
	}),
	demoBlock({
		id: "cafe-gallery",
		name: "core/gallery",
		label: "Menu gallery",
		type: "block",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				images: menuImages.map((item, i) => ({
					id: item.id,
					url: `https://placehold.co/480x360/92400e/fef3c7?text=${encodeURIComponent(item.text)}`,
					alt: item.text,
				})),
				columns: 2,
				imageCrop: true,
			},
		},
		styles: { width: "100%" },
		settings: {},
		other: demoOther,
	}),
	demoImage({
		id: "cafe-interior",
		url: "https://placehold.co/1200x500/451a03/ffedd5?text=Seating+area",
		alt: "Cafe seating area",
	}),
	demoHeading({ id: "cafe-contact-h", level: 2, value: "Catering inquiries" }),
	demoParagraph({
		id: "cafe-contact-lead",
		value: "Planning an office breakfast or pop-up? Tell us the date and headcount.",
	}),
	demoBlock({
		id: "cafe-email",
		name: "core/input",
		label: "Email",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: {
				label: "Email",
				name: "email",
				type: "email",
				placeholder: "you@company.com",
			},
		},
		styles: {},
		settings: {},
		other: demoOther,
	}),
	demoBlock({
		id: "cafe-message",
		name: "core/textarea",
		label: "Message",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: {
				label: "Event details",
				name: "details",
				placeholder: "Date, guest count, dietary notes…",
			},
		},
		styles: {},
		settings: {},
		other: demoOther,
	}),
	demoButtons({
		id: "cafe-submit",
		buttons: [{ id: "cafe-send", text: "Send inquiry", url: "#contact" }],
	}),
];
