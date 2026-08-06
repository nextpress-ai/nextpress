import type { BlockConfig } from "@shared/schema-types";

const units = {
	spacing: "px" as const,
	font: "rem" as const,
	dimension: "px" as const,
	border: "px" as const,
};

const baseOther = { tokenMap: {}, units };

const block = (partial: BlockConfig): BlockConfig => partial;

/** Layout stress: container → columns (3) + group row with image, button, icon. */
export const layoutStressFixture: BlockConfig[] = [
	block({
		id: "layout-container",
		name: "core/container",
		label: "Container",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: { tagName: "div" } },
		styles: {
			padding: "24px",
			width: "100%",
			maxWidth: "100%",
			backgroundColor: "#f8fafc",
		},
		settings: {},
		other: baseOther,
		children: [
			block({
				id: "layout-columns",
				name: "core/columns",
				label: "Columns",
				type: "container",
				parentId: "layout-container",
				category: "layout",
				content: {
					kind: "structured",
					data: { layoutMode: "flex", minColumnWidth: 220, direction: "row" },
				},
				styles: { margin: "1em 0", gap: "16px", width: "100%" },
				settings: {
					columnLayout: [
						{ columnId: "col-1", blockIds: ["layout-col-image"] },
						{ columnId: "col-2", blockIds: ["layout-col-button"] },
						{ columnId: "col-3", blockIds: ["layout-col-icon"] },
					],
				},
				other: baseOther,
				children: [
					block({
						id: "layout-col-image",
						name: "core/image",
						label: "Image",
						type: "block",
						parentId: "layout-columns",
						category: "media",
						content: {
							kind: "media",
							url: "https://placehold.co/400x300",
							alt: "Column image",
							mediaType: "image",
						},
						styles: { width: "100%", maxWidth: "100%", height: "auto" },
						settings: {},
						other: baseOther,
					}),
					block({
						id: "layout-col-button",
						name: "core/button",
						label: "Button",
						type: "block",
						parentId: "layout-columns",
						category: "basic",
						content: { kind: "text", value: "Action" },
						styles: {},
						settings: {},
						other: baseOther,
					}),
					block({
						id: "layout-col-icon",
						name: "core/icon",
						label: "Icon",
						type: "block",
						parentId: "layout-columns",
						category: "basic",
						content: {
							kind: "structured",
							data: {
								icon: { iconName: "star", iconSet: "lucide" },
								label: "Star",
							},
						},
						styles: { width: "24px", height: "24px" },
						settings: {},
						other: baseOther,
					}),
				],
			}),
			block({
				id: "layout-group",
				name: "core/group",
				label: "Group",
				type: "container",
				parentId: "layout-container",
				category: "layout",
				content: { kind: "structured", data: { tagName: "div" } },
				styles: {
					display: "flex",
					flexDirection: "row",
					flexWrap: "wrap",
					gap: "12px",
					width: "100%",
				},
				settings: {},
				other: baseOther,
				children: [
					block({
						id: "layout-group-image",
						name: "core/image",
						label: "Image",
						type: "block",
						parentId: "layout-group",
						category: "media",
						content: {
							kind: "media",
							url: "https://placehold.co/320x200",
							alt: "Group image",
							mediaType: "image",
						},
						styles: { width: "280px", maxWidth: "100%", height: "auto" },
						settings: {},
						other: baseOther,
					}),
					block({
						id: "layout-group-button",
						name: "core/button",
						label: "Button",
						type: "block",
						parentId: "layout-group",
						category: "basic",
						content: { kind: "text", value: "Group CTA" },
						settings: {},
						styles: {},
						other: baseOther,
					}),
					block({
						id: "layout-group-icon",
						name: "core/icon",
						label: "Icon",
						type: "block",
						parentId: "layout-group",
						category: "basic",
						content: {
							kind: "structured",
							data: {
								icon: { iconName: "heart", iconSet: "lucide" },
								label: "Like",
							},
						},
						styles: { width: "24px", height: "24px" },
						settings: {},
						other: baseOther,
					}),
				],
			}),
		],
	}),
];

/** Legacy fixed-width image for runtime fallback tests. */
export const legacyFixedWidthFixture: BlockConfig[] = [
	block({
		id: "image-legacy",
		name: "core/image",
		label: "Image",
		type: "block",
		parentId: null,
		category: "media",
		content: {
			kind: "media",
			url: "https://placehold.co/800x450",
			alt: "Test",
			mediaType: "image",
		},
		styles: { width: "500px", height: "auto" },
		settings: {},
		other: baseOther,
	}),
];

const galleryImages = Array.from({ length: 6 }, (_, i) => ({
	id: `gallery-img-${i + 1}`,
	url: `https://placehold.co/400x300?text=${i + 1}`,
	alt: `Gallery ${i + 1}`,
}));

/** Content stress: headings, paragraph, media-text, gallery, cover, form fields. */
export const contentStressFixture: BlockConfig[] = [
	...([1, 2, 3, 4, 5, 6] as const).map((level) =>
		block({
			id: `content-h${level}`,
			name: "core/heading",
			label: "Heading",
			type: "block",
			parentId: null,
			category: "basic",
			content: { kind: "text", value: `Heading level ${level}`, level },
			styles: {},
			settings: {},
			other: baseOther,
		}),
	),
	block({
		id: "content-paragraph",
		name: "core/paragraph",
		label: "Paragraph",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value:
				"Prose paragraph with enough text to test line length and word breaking on narrow viewports without horizontal scroll.",
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "content-media-text",
		name: "core/media-text",
		label: "Media & Text",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: {
				mediaUrl: "https://placehold.co/400x300",
				mediaType: "image",
				isStackedOnMobile: true,
				mediaPosition: "left",
			},
		},
		styles: {},
		settings: {},
		other: baseOther,
		children: [],
	}),
	block({
		id: "content-gallery",
		name: "core/gallery",
		label: "Gallery",
		type: "block",
		parentId: null,
		category: "media",
		content: {
			kind: "structured",
			data: { images: galleryImages, columns: 3, imageCrop: true },
		},
		styles: { width: "100%" },
		settings: {},
		other: baseOther,
	}),
	block({
		id: "content-cover",
		name: "core/cover",
		label: "Cover",
		type: "container",
		parentId: null,
		category: "media",
		content: {
			kind: "media",
			url: "https://placehold.co/1200x600",
			alt: "Cover background",
			mediaType: "image",
			overlayColor: "rgba(0,0,0,0.45)",
			minHeight: "320px",
		},
		styles: {},
		settings: {},
		other: baseOther,
		children: [
			block({
				id: "content-cover-heading",
				name: "core/heading",
				label: "Cover title",
				type: "block",
				parentId: "content-cover",
				category: "basic",
				content: { kind: "text", value: "Cover headline", level: 2 },
				styles: { color: "#ffffff" },
				settings: {},
				other: baseOther,
			}),
		],
	}),
	block({
		id: "content-input",
		name: "core/input",
		label: "Input",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "content-textarea",
		name: "core/textarea",
		label: "Textarea",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: { label: "Message", name: "message", placeholder: "Your message" },
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "content-select",
		name: "core/select",
		label: "Select",
		type: "block",
		parentId: null,
		category: "form",
		content: {
			kind: "structured",
			data: {
				label: "Topic",
				name: "topic",
				options: [
					{ label: "General", value: "general" },
					{ label: "Support", value: "support" },
				],
			},
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
];

/** Typography stress: long heading, pullquote, wide table, code block. */
export const typographyStressFixture: BlockConfig[] = [
	block({
		id: "typo-long-heading",
		name: "core/heading",
		label: "Long heading",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			level: 1,
			value:
				"An exceptionally long editorial headline that must wrap cleanly on mobile without forcing horizontal scroll or breaking layout rhythm",
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "typo-pullquote",
		name: "core/pullquote",
		label: "Pullquote",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value: "Responsive typography should feel intentional at every breakpoint, not like a shrunk desktop page.",
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "typo-table",
		name: "core/table",
		label: "Table",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "structured",
			data: {
				hasFixedLayout: false,
				head: [
					{ content: "Column A", tag: "th" },
					{ content: "Column B", tag: "th" },
					{ content: "Column C", tag: "th" },
					{ content: "Column D", tag: "th" },
				],
				body: [
					[
						{ content: "Alpha", tag: "td" },
						{ content: "Bravo", tag: "td" },
						{ content: "Charlie", tag: "td" },
						{ content: "Delta", tag: "td" },
					],
					[
						{ content: "One", tag: "td" },
						{ content: "Two", tag: "td" },
						{ content: "Three", tag: "td" },
						{ content: "Four", tag: "td" },
					],
				],
			},
		},
		styles: { width: "100%" },
		settings: {},
		other: baseOther,
	}),
	block({
		id: "typo-code",
		name: "core/code",
		label: "Code",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value:
				"const responsiveLayout = () => ({ width: '100%', maxWidth: '100%', overflowX: 'auto' }); // long line for horizontal scroll test",
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
	block({
		id: "typo-quote",
		name: "core/quote",
		label: "Quote",
		type: "block",
		parentId: null,
		category: "basic",
		content: {
			kind: "text",
			value: "Design for the smallest screen first; scale up with intent.",
		},
		styles: {},
		settings: {},
		other: baseOther,
	}),
];

/** All golden fixtures keyed for Gate 3 browser matrix seeding. */
export const responsiveGoldenFixtures = {
	layout: layoutStressFixture,
	content: contentStressFixture,
	typography: typographyStressFixture,
	legacy: legacyFixedWidthFixture,
} as const;
