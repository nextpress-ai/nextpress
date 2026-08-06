import type { BlockConfig } from "@shared/schema-types";
import {
	demoBlock,
	demoButtons,
	demoHeading,
	demoOther,
	demoParagraph,
} from "./helpers.js";

/** Newsletter landing — Substack-style signup with benefit columns. */
export const newsletterLandingFixture: BlockConfig[] = [
	demoBlock({
		id: "news-hero",
		name: "core/group",
		label: "Hero group",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: {
			width: "100%",
			maxWidth: "720px",
			margin: "3rem auto 2rem",
			padding: "2rem",
			textAlign: "center",
			backgroundColor: "#fafafa",
			borderRadius: "12px",
		},
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "news-h1",
				level: 1,
				value: "The Daily Brief",
				parentId: "news-hero",
				styles: { textAlign: "center" },
			}),
			demoParagraph({
				id: "news-lead",
				value: "One thoughtful email each morning. Product strategy, no hype.",
				parentId: "news-hero",
				styles: { textAlign: "center", color: "#52525b" },
			}),
		],
	}),
	demoBlock({
		id: "news-benefits",
		name: "core/columns",
		label: "Benefits",
		type: "container",
		parentId: null,
		category: "layout",
		content: {
			kind: "structured",
			data: { layoutMode: "flex", minColumnWidth: "200px", direction: "row" },
		},
		styles: { margin: "1em 0 2em", gap: "20px", width: "100%" },
		settings: {
			columnLayout: [
				{ columnId: "b1", blockIds: ["news-b1-h", "news-b1-p"] },
				{ columnId: "b2", blockIds: ["news-b2-h", "news-b2-p"] },
				{ columnId: "b3", blockIds: ["news-b3-h", "news-b3-p"] },
			],
		},
		other: demoOther,
		children: [
			demoHeading({ id: "news-b1-h", level: 3, value: "5-minute read", parentId: "news-benefits" }),
			demoParagraph({
				id: "news-b1-p",
				value: "Curated links and one original essay. Inbox zero friendly.",
				parentId: "news-benefits",
			}),
			demoHeading({ id: "news-b2-h", level: 3, value: "No spam", parentId: "news-benefits" }),
			demoParagraph({
				id: "news-b2-p",
				value: "Unsubscribe in one click. We never sell your address.",
				parentId: "news-benefits",
			}),
			demoHeading({ id: "news-b3-h", level: 3, value: "Free forever", parentId: "news-benefits" }),
			demoParagraph({
				id: "news-b3-p",
				value: "Optional paid tier for deep dives and office hours.",
				parentId: "news-benefits",
			}),
		],
	}),
	demoBlock({
		id: "news-email",
		name: "core/input",
		label: "Email signup",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: {
				label: "Email address",
				name: "email",
				type: "email",
				placeholder: "you@example.com",
			},
		},
		styles: { maxWidth: "480px", margin: "0 auto" },
		settings: {},
		other: demoOther,
	}),
	demoButtons({
		id: "news-subscribe-btn",
		buttons: [{ id: "news-sub", text: "Subscribe free", url: "#subscribe" }],
	}),
	demoParagraph({
		id: "news-social-proof",
		value: "Join 12,400 readers at startups, agencies, and Fortune 500 teams.",
		styles: { textAlign: "center", color: "#71717a", fontSize: "0.9rem", marginTop: "1.5em" },
	}),
];
