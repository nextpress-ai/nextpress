import type { BlockConfig } from "@shared/schema-types";
import {
	demoBlock,
	demoHeading,
	demoImage,
	demoOther,
	demoParagraph,
	demoSeparator,
} from "./helpers.js";

const photo = (id: number, w: number, h: number) => `https://picsum.photos/id/${id}/${w}/${h}`;

const INK = "#1c1917";
const MUTED = "#78716c";
const RULE = "#e7e5e4";

function relatedPost({
	id,
	kicker,
	title,
	blurb,
}: {
	id: string;
	kicker: string;
	title: string;
	blurb: string;
}): BlockConfig[] {
	return [
		demoParagraph({
			id: `${id}-k`,
			value: kicker,
			parentId: "blogx-related",
			styles: {
				color: "#b45309",
				fontSize: "0.75rem",
				letterSpacing: "0.14em",
				textTransform: "uppercase",
				margin: "0 0 0.4rem",
			},
		}),
		demoHeading({
			id: `${id}-t`,
			level: 3,
			value: title,
			parentId: "blogx-related",
			styles: { fontSize: "1.15rem", lineHeight: "1.35", color: INK, margin: "0 0 0.4rem" },
		}),
		demoParagraph({
			id: `${id}-b`,
			value: blurb,
			parentId: "blogx-related",
			styles: { color: MUTED, fontSize: "0.9rem", margin: "0" },
		}),
	];
}

/** Personal blog — editorial single-column essay with masthead, pullquote, and archive. */
export const personalBlogFixture: BlockConfig[] = [
	demoBlock({
		id: "blogx-masthead",
		name: "core/group",
		label: "Masthead",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: {
			width: "100%",
			padding: "1.5rem 2rem",
			borderBottom: `1px solid ${RULE}`,
			textAlign: "center",
			backgroundColor: "#fffdf9",
		},
		settings: {},
		other: demoOther,
		children: [
			demoHeading({
				id: "blogx-brand",
				level: 2,
				value: "Field Notes",
				parentId: "blogx-masthead",
				styles: {
					fontSize: "1.35rem",
					letterSpacing: "0.28em",
					textTransform: "uppercase",
					color: INK,
					margin: "0",
				},
			}),
			demoParagraph({
				id: "blogx-nav",
				value: "Essays · Reading · Photos · About",
				parentId: "blogx-masthead",
				styles: { color: MUTED, fontSize: "0.85rem", margin: "0.5rem 0 0" },
			}),
		],
	}),
	demoHeading({
		id: "blogx-title",
		level: 1,
		value: "The quiet hours before a launch",
		styles: {
			maxWidth: "20ch",
			margin: "3rem auto 0",
			textAlign: "center",
			fontSize: "3rem",
			lineHeight: "1.12",
			letterSpacing: "-0.02em",
			color: INK,
		},
	}),
	demoParagraph({
		id: "blogx-byline",
		value: "Ana Reyes · 4 March 2026 · 6 min read",
		styles: {
			textAlign: "center",
			color: MUTED,
			fontSize: "0.9rem",
			margin: "1rem auto 2rem",
		},
	}),
	demoImage({
		id: "blogx-hero",
		url: photo(180, 1400, 700),
		alt: "Notebook, pen and laptop on a wooden desk",
		styles: {
			width: "100%",
			maxWidth: "100%",
			height: "auto",
			borderRadius: "10px",
			margin: "0 0 2.5rem",
		},
	}),
	demoParagraph({
		id: "blogx-p1",
		value:
			"Nobody writes about the morning of a launch. They write about the launch — the graph, the thread, the number of signups by lunchtime. But the part I keep returning to is the two hours before any of that, when the work is finished and the world has not seen it yet.",
		styles: { maxWidth: "34rem", margin: "0 auto 1.4rem", fontSize: "1.08rem", lineHeight: "1.75" },
	}),
	demoParagraph({
		id: "blogx-p2",
		value:
			"I make coffee. I read the copy one more time, out loud, which is the only reliable way I have found to catch a sentence that is technically correct and completely dead. I fix two words. I stop fixing words.",
		styles: { maxWidth: "34rem", margin: "0 auto 1.4rem", fontSize: "1.08rem", lineHeight: "1.75" },
	}),
	demoBlock({
		id: "blogx-pullquote",
		name: "core/pullquote",
		label: "Pullquote",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value: "Shipping is just the moment you stop being the only person who can see it.",
		},
		styles: {
			maxWidth: "30rem",
			margin: "2.25rem auto",
			padding: "0 0 0 1.5rem",
			borderLeft: "3px solid #b45309",
			fontSize: "1.5rem",
			lineHeight: "1.4",
			fontStyle: "italic",
			color: INK,
		},
		settings: {},
		other: demoOther,
	}),
	demoParagraph({
		id: "blogx-p3",
		value:
			"The honest reason I love those hours is that the work is still entirely mine. Once it is out, it belongs to whoever uses it — their edge cases, their expectations, their much better ideas. That is the whole point, and it is also the trade.",
		styles: { maxWidth: "34rem", margin: "0 auto 1.4rem", fontSize: "1.08rem", lineHeight: "1.75" },
	}),
	demoImage({
		id: "blogx-inline",
		url: photo(42, 1200, 560),
		alt: "Empty café table by the window in early light",
		styles: {
			width: "100%",
			maxWidth: "100%",
			height: "auto",
			borderRadius: "10px",
			margin: "2rem 0",
		},
	}),
	demoParagraph({
		id: "blogx-p4",
		value:
			"So: make the coffee. Read it out loud. Then press the button and go for a walk, because the graph will still be there when you get back.",
		styles: { maxWidth: "34rem", margin: "0 auto 2rem", fontSize: "1.08rem", lineHeight: "1.75" },
	}),
	demoSeparator("blogx-sep"),
	demoHeading({
		id: "blogx-related-h",
		level: 2,
		value: "More from Field Notes",
		styles: { textAlign: "center", margin: "2rem 0 1.5rem", color: INK },
	}),
	demoBlock({
		id: "blogx-related",
		name: "core/columns",
		label: "Archive",
		type: "container",
		parentId: null,
		category: "layout",
		content: {
			kind: "structured",
			data: { layoutMode: "flex", minColumnWidth: "220px", direction: "row" },
		},
		styles: { width: "100%", gap: "32px", margin: "0 0 3rem" },
		settings: {
			columnLayout: [
				{ columnId: "r1", blockIds: ["blogx-r1-k", "blogx-r1-t", "blogx-r1-b"] },
				{ columnId: "r2", blockIds: ["blogx-r2-k", "blogx-r2-t", "blogx-r2-b"] },
				{ columnId: "r3", blockIds: ["blogx-r3-k", "blogx-r3-t", "blogx-r3-b"] },
			],
		},
		other: demoOther,
		children: [
			...relatedPost({
				id: "blogx-r1",
				kicker: "Craft",
				title: "Reading your own copy out loud",
				blurb: "A two-minute habit that catches the sentences spellcheck cannot.",
			}),
			...relatedPost({
				id: "blogx-r2",
				kicker: "Notebooks",
				title: "Six years of the same paper notebook",
				blurb: "What survives the move from paper to screen, and what should not.",
			}),
			...relatedPost({
				id: "blogx-r3",
				kicker: "Travel",
				title: "Working from a train for a month",
				blurb: "Tunnels, tethering, and the surprising upside of a bad connection.",
			}),
		],
	}),
];
