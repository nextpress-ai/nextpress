import type { BlockConfig } from "@shared/schema-types";
import {
	demoBlock,
	demoButtons,
	demoHeading,
	demoOther,
	demoParagraph,
	demoSeparator,
} from "./helpers.js";

/** SaaS landing — Linear/Notion-style product page with hero, features, and pricing columns. */
export const saasLandingFixture: BlockConfig[] = [
	demoBlock({
		id: "saas-hero",
		name: "core/cover",
		label: "Hero",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "media",
			url: "https://placehold.co/1600x720/1e1b4b/eef2ff?text=Nimbus",
			alt: "Nimbus dashboard preview",
			mediaType: "image",
			overlayColor: "rgba(15,23,42,0.72)",
			minHeight: "520px",
		},
		styles: { width: "100%" },
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "saas-hero-h1",
				level: 1,
				value: "Ship projects without the chaos",
				parentId: "saas-hero",
				styles: { color: "#ffffff", textAlign: "center" },
			}),
			demoParagraph({
				id: "saas-hero-lead",
				value:
					"Nimbus brings tasks, docs, and timelines into one calm workspace. Built for teams who outgrew spreadsheets.",
				parentId: "saas-hero",
				styles: { color: "#e2e8f0", textAlign: "center", maxWidth: "52ch", margin: "0 auto" },
			}),
			demoButtons({
				id: "saas-hero-cta",
				parentId: "saas-hero",
				buttons: [
					{ id: "saas-cta-primary", text: "Start free trial", url: "#signup" },
					{ id: "saas-cta-secondary", text: "Watch demo", url: "#demo" },
				],
			}),
		],
	}),
	demoHeading({
		id: "saas-features-title",
		level: 2,
		value: "Everything your team needs",
		styles: { textAlign: "center", marginTop: "2rem" },
	}),
	demoBlock({
		id: "saas-features",
		name: "core/columns",
		label: "Features",
		type: "container",
		parentId: null,
		category: "layout",
		content: {
			kind: "structured",
			data: { layoutMode: "flex", minColumnWidth: "220px", direction: "row" },
		},
		styles: { margin: "1.5em 0", gap: "24px", width: "100%" },
		settings: {
			columnLayout: [
				{ columnId: "saas-col-1", blockIds: ["saas-f1-h", "saas-f1-p"] },
				{ columnId: "saas-col-2", blockIds: ["saas-f2-h", "saas-f2-p"] },
				{ columnId: "saas-col-3", blockIds: ["saas-f3-h", "saas-f3-p"] },
			],
		},
		other: demoOther,
		children: [
			demoHeading({ id: "saas-f1-h", level: 3, value: "Roadmaps", parentId: "saas-features" }),
			demoParagraph({
				id: "saas-f1-p",
				value: "Plan quarters in minutes. Drag milestones, link docs, and share read-only views with stakeholders.",
				parentId: "saas-features",
			}),
			demoHeading({ id: "saas-f2-h", level: 3, value: "Async updates", parentId: "saas-features" }),
			demoParagraph({
				id: "saas-f2-p",
				value: "Weekly standups without meetings. Status threads stay attached to the work they describe.",
				parentId: "saas-features",
			}),
			demoHeading({ id: "saas-f3-h", level: 3, value: "Integrations", parentId: "saas-features" }),
			demoParagraph({
				id: "saas-f3-p",
				value: "Connect Slack, GitHub, and Figma. Changes sync both ways so nobody copies links by hand.",
				parentId: "saas-features",
			}),
		],
	}),
	demoBlock({
		id: "saas-media-text",
		name: "core/media-text",
		label: "Product shot",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				mediaUrl: "https://placehold.co/640x480/312e81/ffffff?text=Board+view",
				mediaType: "image",
				isStackedOnMobile: true,
				mediaPosition: "left",
			},
		},
		styles: { margin: "2em 0" },
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "saas-mt-h",
				level: 2,
				value: "See the whole picture",
				parentId: "saas-media-text",
			}),
			demoParagraph({
				id: "saas-mt-p",
				value:
					"Board, timeline, and table views share one source of truth. Switch layouts without rebuilding the project.",
				parentId: "saas-media-text",
			}),
		],
	}),
	demoSeparator("saas-sep-1"),
	demoHeading({
		id: "saas-pricing-title",
		level: 2,
		value: "Simple pricing",
		styles: { textAlign: "center" },
	}),
	demoBlock({
		id: "saas-pricing",
		name: "core/columns",
		label: "Pricing",
		type: "container",
		parentId: null,
		category: "layout",
		content: {
			kind: "structured",
			data: { layoutMode: "flex", minColumnWidth: "240px", direction: "row" },
		},
		styles: { margin: "1em 0 2em", gap: "20px", width: "100%" },
		settings: {
			columnLayout: [
				{ columnId: "price-1", blockIds: ["saas-p1-h", "saas-p1-p"] },
				{ columnId: "price-2", blockIds: ["saas-p2-h", "saas-p2-p"] },
				{ columnId: "price-3", blockIds: ["saas-p3-h", "saas-p3-p"] },
			],
		},
		other: demoOther,
		children: [
			demoHeading({ id: "saas-p1-h", level: 3, value: "Free — $0", parentId: "saas-pricing" }),
			demoParagraph({
				id: "saas-p1-p",
				value: "Up to 3 projects, unlimited viewers, 7-day history.",
				parentId: "saas-pricing",
			}),
			demoHeading({ id: "saas-p2-h", level: 3, value: "Team — $12/user", parentId: "saas-pricing" }),
			demoParagraph({
				id: "saas-p2-p",
				value: "Unlimited projects, guest access, priority support.",
				parentId: "saas-pricing",
			}),
			demoHeading({ id: "saas-p3-h", level: 3, value: "Enterprise", parentId: "saas-pricing" }),
			demoParagraph({
				id: "saas-p3-p",
				value: "SSO, audit logs, dedicated success manager.",
				parentId: "saas-pricing",
			}),
		],
	}),
	demoButtons({
		id: "saas-footer-cta",
		buttons: [{ id: "saas-footer-btn", text: "Create your workspace", url: "#signup" }],
	}),
];
