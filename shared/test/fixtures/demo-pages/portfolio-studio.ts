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

const portfolioImages = Array.from({ length: 6 }, (_, i) => ({
	id: `port-g-${i + 1}`,
	label: ["Brand refresh", "App launch", "Editorial", "Packaging", "Web redesign", "Campaign"][i],
}));

/** Creative studio portfolio — agency-style gallery, testimonial, and about section. */
export const portfolioStudioFixture: BlockConfig[] = [
	demoHeading({
		id: "port-hero-h",
		level: 1,
		value: "Studio Meridian",
		styles: { textAlign: "center", marginTop: "2rem" },
	}),
	demoParagraph({
		id: "port-hero-p",
		value: "Brand and digital design for founders who care about craft.",
		styles: { textAlign: "center", color: "#64748b" },
	}),
	demoBlock({
		id: "port-gallery",
		name: "core/gallery",
		label: "Work gallery",
		type: "block",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				images: portfolioImages.map((item) => ({
					id: item.id,
					url: `https://placehold.co/600x450/18181b/fafafa?text=${encodeURIComponent(item.label ?? "Work")}`,
					alt: item.label,
				})),
				columns: 3,
				imageCrop: true,
			},
		},
		styles: { width: "100%", margin: "2em 0" },
		settings: {},
		other: demoOther,
	}),
	demoBlock({
		id: "port-quote",
		name: "core/quote",
		label: "Testimonial",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			value:
				"Meridian rebuilt our identity in six weeks. The site finally matches how we pitch in the room.",
			citation: "Lena Ortiz, CEO at Harbor Labs",
		},
		styles: { margin: "2em auto", maxWidth: "48ch", padding: "1.5rem", borderLeft: "4px solid #18181b" },
		settings: {},
		other: demoOther,
	}),
	demoSeparator("port-sep"),
	demoBlock({
		id: "port-about",
		name: "core/media-text",
		label: "About",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				mediaUrl: "https://placehold.co/560x420/27272a/e4e4e7?text=Studio",
				mediaType: "image",
				isStackedOnMobile: true,
				mediaPosition: "right",
			},
		},
		styles: {},
		settings: {},
		other: demoOther,
		children: [
			demoHeading({ id: "port-about-h", level: 2, value: "How we work", parentId: "port-about" }),
			demoParagraph({
				id: "port-about-p",
				value:
					"Two-week sprints, async feedback in Figma, and a single Slack channel. You get partner-level attention without agency bloat.",
				parentId: "port-about",
			}),
			demoButtons({
				id: "port-about-cta",
				parentId: "port-about",
				buttons: [{ id: "port-book", text: "Book intro call", url: "#contact" }],
			}),
		],
	}),
	demoImage({
		id: "port-team",
		url: "https://placehold.co/1000x400/3f3f46/fafafa?text=Team+workshop",
		alt: "Studio workshop",
	}),
];
