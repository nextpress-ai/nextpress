import type { BlockConfig } from "@shared/schema-types";
import { demoBlock, demoButtons, demoHeading, demoOther, demoParagraph } from "./helpers.js";

const INK = "#202124";
const MUTED = "#5f6368";
const HAIRLINE = "#dadce0";

/**
 * Search engine home — the whitespace-first layout every search page uses.
 * Deliberately a fictional brand ("Northstar"): this page ships in a public
 * release demo, so it borrows the genre, not anybody's actual marks.
 */
export const searchEngineFixture: BlockConfig[] = [
	demoBlock({
		id: "search-stage",
		name: "core/group",
		label: "Search stage",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: {
			width: "100%",
			minHeight: "560px",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: "0",
			padding: "4rem 1.5rem 3rem",
			backgroundColor: "#ffffff",
		},
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "search-wordmark",
				level: 1,
				value: "Northstar",
				parentId: "search-stage",
				styles: {
					fontSize: "5.5rem",
					lineHeight: "1",
					letterSpacing: "-0.055em",
					fontWeight: "700",
					color: "#1a73e8",
					textAlign: "center",
					margin: "0 0 0.5rem",
				},
			}),
			demoParagraph({
				id: "search-tagline",
				value: "Search the open web. No trackers, no upsells.",
				parentId: "search-stage",
				styles: {
					color: MUTED,
					textAlign: "center",
					fontSize: "0.95rem",
					margin: "0 0 2.25rem",
				},
			}),
			demoBlock({
				id: "search-field",
				name: "core/input",
				label: "Search field",
				type: "block",
				parentId: "search-stage",
				category: "form",
				content: {
					kind: "structured",
					data: {
						label: "",
						name: "q",
						type: "search",
						placeholder: "Search or type a URL",
					},
				},
				styles: {
					width: "100%",
					maxWidth: "580px",
					margin: "0 auto",
					padding: "0.75rem 1.25rem",
					border: `1px solid ${HAIRLINE}`,
					borderRadius: "999px",
					backgroundColor: "#ffffff",
					boxShadow: "0 1px 6px rgba(32,33,36,0.14)",
				},
				settings: {},
				other: demoOther,
			}),
			demoButtons({
				id: "search-actions",
				parentId: "search-stage",
				buttons: [
					{ id: "search-go", text: "Northstar Search", url: "#results" },
					{ id: "search-lucky", text: "I'm feeling curious", url: "#surprise" },
				],
			}),
			demoParagraph({
				id: "search-suggestions",
				value: "Popular right now — river restoration · open transit data · slow travel journals",
				parentId: "search-stage",
				styles: {
					color: MUTED,
					textAlign: "center",
					fontSize: "0.875rem",
					margin: "2rem 0 0",
				},
			}),
		],
	}),
	demoBlock({
		id: "search-footer",
		name: "core/group",
		label: "Footer",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: {
			width: "100%",
			padding: "1.25rem 2rem",
			backgroundColor: "#f2f2f2",
			borderTop: `1px solid ${HAIRLINE}`,
		},
		settings: {},
		other: demoOther,
		children: [
			demoParagraph({
				id: "search-footer-country",
				value: "Reykjavík, Iceland — carbon-neutral since 2021",
				parentId: "search-footer",
				styles: { color: MUTED, fontSize: "0.875rem", margin: "0 0 0.75rem" },
			}),
			demoParagraph({
				id: "search-footer-links",
				value: "About · How results rank · Privacy · Settings",
				parentId: "search-footer",
				styles: { color: MUTED, fontSize: "0.875rem", margin: "0" },
			}),
		],
	}),
	demoParagraph({
		id: "search-note",
		value: "Built with NextPress — every element on this page is an editable block.",
		styles: { textAlign: "center", color: INK, fontSize: "0.8rem", margin: "1.5rem 0" },
	}),
];
