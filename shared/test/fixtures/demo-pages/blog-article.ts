import type { BlockConfig } from "@shared/schema-types";
import {
	demoBlock,
	demoButtons,
	demoHeading,
	demoImage,
	demoOther,
	demoParagraph,
	demoSeparator,
} from "./helpers.js";

/** Long-form blog article — editorial layout with pullquote, list, and inline image. */
export const blogArticleFixture: BlockConfig[] = [
	demoHeading({
		id: "blog-title",
		level: 1,
		value: "Why async work beats endless standups",
	}),
	demoParagraph({
		id: "blog-byline",
		value: "By Jordan Lee · 8 min read · Updated March 2026",
		styles: { color: "#64748b", fontSize: "0.95rem" },
	}),
	demoImage({
		id: "blog-hero-img",
		url: "https://placehold.co/1200x630/0f172a/e2e8f0?text=Remote+team",
		alt: "Team collaborating remotely",
	}),
	demoParagraph({
		id: "blog-intro",
		value:
			"Most teams do not have a meeting problem. They have a clarity problem. When status lives in calendars instead of written updates, everyone waits for the room to know what changed.",
	}),
	demoBlock({
		id: "blog-pullquote",
		name: "core/pullquote",
		label: "Pullquote",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value: "The best standup is the one you can read in two minutes on your own schedule.",
		},
		styles: { fontSize: "1.25rem", fontStyle: "italic", margin: "1.5em 0" },
		settings: {},
		other: demoOther,
	}),
	demoHeading({ id: "blog-h2-1", level: 2, value: "Write it down first" }),
	demoParagraph({
		id: "blog-p2",
		value:
			"Start with a short template: what shipped, what is blocked, what you need. Post it where the work lives. Meetings become optional clarifiers, not the primary channel.",
	}),
	demoBlock({
		id: "blog-list",
		name: "core/list",
		label: "Tips list",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			ordered: true,
			values:
				"<li>Default to public threads over DMs</li><li>Record decisions in the ticket</li><li>Batch questions into one update</li><li>Review async before scheduling sync time</li>",
		},
		styles: {},
		settings: {},
		other: demoOther,
	}),
	demoBlock({
		id: "blog-media-text",
		name: "core/media-text",
		label: "Inline example",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				mediaUrl: "https://placehold.co/480x320/334155/f8fafc?text=Async+update",
				mediaType: "image",
				isStackedOnMobile: true,
				mediaPosition: "left",
			},
		},
		styles: { margin: "2em 0" },
		settings: {},
		other: demoOther,
		children: [
			demoHeading({ id: "blog-mt-h", level: 3, value: "A sample weekly update", parentId: "blog-media-text" }),
			demoParagraph({
				id: "blog-mt-p",
				value:
					"Shipped checkout fix (PR #842). Blocked on legal review for EU copy. Need design sign-off on email template by Thursday.",
				parentId: "blog-media-text",
			}),
		],
	}),
	demoSeparator("blog-sep"),
	demoParagraph({
		id: "blog-outro",
		value:
			"Try one async week with your team. Keep the standup slot on the calendar but make attendance optional. You will be surprised how much gets resolved before anyone joins the call.",
	}),
	demoButtons({
		id: "blog-cta",
		buttons: [
			{ id: "blog-subscribe", text: "Subscribe to the newsletter", url: "#subscribe" },
			{ id: "blog-share", text: "Share this article", url: "#share" },
		],
	}),
];
