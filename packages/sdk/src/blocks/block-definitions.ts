/** All canonical block names registered in the NextPress page builder. */
export const BLOCK_NAMES = [
	"core/heading",
	"core/paragraph",
	"core/button",
	"core/buttons",
	"core/image",
	"core/gallery",
	"core/video",
	"core/audio",
	"core/spacer",
	"core/separator",
	"core/columns",
	"core/container",
	"core/group",
	"core/quote",
	"core/list",
	"core/media-text",
	"core/cover",
	"core/file",
	"core/code",
	"core/html",
	"core/pullquote",
	"core/preformatted",
	"core/table",
	"core/markdown",
	"core/icon",
	"core/divider",
	"core/input",
	"core/textarea",
	"core/select",
	"post/title",
	"post/excerpt",
	"post/featured-image",
	"post/list",
	"post/toc",
	"post/author-box",
	"post/comments",
	"post/navigation",
	"post/info",
	"post/progress",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

export type BlockDefinitionMeta = {
	name: BlockName;
	label: string;
	type: "block" | "container";
	category: "basic" | "form" | "layout" | "media" | "advanced" | "post";
	defaultContent: () => import("../types/domain.js").BlockContent;
	defaultStyles?: Record<string, string>;
};

const structured = (data: Record<string, unknown>) => ({ kind: "structured", data }) as const;

const text = (value: string, extra: Record<string, unknown> = {}) =>
	({ kind: "text", value, ...extra }) as const;

/** Default block payloads aligned with the dashboard block registry. */
export const BLOCK_DEFINITIONS: Record<BlockName, BlockDefinitionMeta> = {
	"core/heading": {
		name: "core/heading",
		label: "Heading",
		type: "block",
		category: "basic",
		defaultContent: () => text("Your heading here", { level: 2 }),
		defaultStyles: {
			fontWeight: "700",
			margin: "0",
		},
	},
	"core/paragraph": {
		name: "core/paragraph",
		label: "Paragraph",
		type: "block",
		category: "basic",
		defaultContent: () => text("Start writing…"),
	},
	"core/button": {
		name: "core/button",
		label: "Button",
		type: "block",
		category: "basic",
		defaultContent: () =>
			({
				kind: "text",
				value: "Click me",
				url: "#",
				linkTarget: "_self",
			}) as import("../types/domain.js").BlockContent,
		defaultStyles: {
			backgroundColor: "#007cba",
			color: "#ffffff",
			padding: "12px 24px",
			borderRadius: "4px",
		},
	},
	"core/buttons": {
		name: "core/buttons",
		label: "Buttons",
		type: "container",
		category: "basic",
		defaultContent: () => structured({ layout: "horizontal", gap: "8px" }),
	},
	"core/image": {
		name: "core/image",
		label: "Image",
		type: "block",
		category: "media",
		defaultContent: () =>
			({
				kind: "media",
				url: "https://placehold.co/800x450",
				alt: "",
				mediaType: "image",
			}) as const,
		defaultStyles: {
			width: "100%",
			maxWidth: "100%",
			height: "auto",
		},
	},
	"core/gallery": {
		name: "core/gallery",
		label: "Gallery",
		type: "block",
		category: "media",
		defaultContent: () =>
			structured({
				images: [],
				columns: 3,
				imageCrop: true,
				linkTo: "none",
				sizeSlug: "large",
				caption: "",
				className: "",
			}),
		defaultStyles: {
			margin: "1em 0",
			width: "100%",
		},
	},
	"core/video": {
		name: "core/video",
		label: "Video",
		type: "block",
		category: "media",
		defaultContent: () =>
			({
				kind: "media",
				url: "",
				mediaType: "video",
			}) as const,
	},
	"core/audio": {
		name: "core/audio",
		label: "Audio",
		type: "block",
		category: "media",
		defaultContent: () =>
			({
				kind: "media",
				url: "",
				mediaType: "audio",
			}) as const,
	},
	"core/spacer": {
		name: "core/spacer",
		label: "Spacer",
		type: "block",
		category: "layout",
		defaultContent: () => structured({ height: "48px" }),
	},
	"core/separator": {
		name: "core/separator",
		label: "Separator",
		type: "block",
		category: "layout",
		defaultContent: () => structured({ style: "default" }),
	},
	"core/columns": {
		name: "core/columns",
		label: "Columns",
		type: "container",
		category: "layout",
		defaultContent: () =>
			structured({
				layoutMode: "flex",
				minColumnWidth: "220px",
				verticalAlignment: "top",
				horizontalAlignment: "left",
				direction: "row",
				columnVerticalAlignment: "top",
				columnHorizontalAlignment: "stretch",
			}),
		defaultStyles: {
			margin: "1em 0",
		},
	},
	"core/container": {
		name: "core/container",
		label: "Container",
		type: "container",
		category: "layout",
		defaultContent: () => structured({ tagName: "div" }),
		defaultStyles: {
			padding: "24px",
			width: "100%",
			maxWidth: "100%",
			marginLeft: "auto",
			marginRight: "auto",
			boxSizing: "border-box",
		},
	},
	"core/group": {
		name: "core/group",
		label: "Group",
		type: "container",
		category: "layout",
		defaultContent: () => structured({ tagName: "div" }),
		defaultStyles: {
			padding: "1.25em 2.375em",
		},
	},
	"core/quote": {
		name: "core/quote",
		label: "Quote",
		type: "block",
		category: "basic",
		defaultContent: () => text("Quote text"),
	},
	"core/list": {
		name: "core/list",
		label: "List",
		type: "block",
		category: "basic",
		defaultContent: () => structured({ ordered: false, items: ["Item one", "Item two"] }),
	},
	"core/media-text": {
		name: "core/media-text",
		label: "Media & Text",
		type: "block",
		category: "media",
		defaultContent: () =>
			structured({
				mediaUrl: "",
				mediaType: "image",
				text: "Content…",
				mediaPosition: "left",
			}),
	},
	"core/cover": {
		name: "core/cover",
		label: "Cover",
		type: "block",
		category: "media",
		defaultContent: () =>
			structured({
				url: "",
				alt: "",
				minHeight: 400,
				dimRatio: 50,
				innerContent: "<p>Write title…</p>",
			}),
	},
	"core/file": {
		name: "core/file",
		label: "File",
		type: "block",
		category: "media",
		defaultContent: () => structured({ url: "", filename: "", showDownloadButton: true }),
	},
	"core/code": {
		name: "core/code",
		label: "Code",
		type: "block",
		category: "advanced",
		defaultContent: () => text("// code"),
	},
	"core/html": {
		name: "core/html",
		label: "HTML",
		type: "block",
		category: "advanced",
		defaultContent: () => ({ kind: "html", value: "<p>HTML</p>", sanitized: true }),
	},
	"core/pullquote": {
		name: "core/pullquote",
		label: "Pullquote",
		type: "block",
		category: "basic",
		defaultContent: () => text("Pullquote"),
	},
	"core/preformatted": {
		name: "core/preformatted",
		label: "Preformatted",
		type: "block",
		category: "basic",
		defaultContent: () => text("Preformatted text"),
	},
	"core/table": {
		name: "core/table",
		label: "Table",
		type: "block",
		category: "advanced",
		defaultContent: () =>
			structured({
				headers: ["Column 1", "Column 2"],
				rows: [["Cell", "Cell"]],
			}),
	},
	"core/markdown": {
		name: "core/markdown",
		label: "Markdown",
		type: "block",
		category: "advanced",
		defaultContent: () => ({ kind: "markdown", value: "## Markdown" }),
	},
	"core/icon": {
		name: "core/icon",
		label: "Icon",
		type: "block",
		category: "media",
		defaultContent: () => structured({ iconSet: "lucide", iconName: "Star", size: 24 }),
	},
	"core/divider": {
		name: "core/divider",
		label: "Divider",
		type: "block",
		category: "layout",
		defaultContent: () => structured({ style: "solid" }),
	},
	"core/input": {
		name: "core/input",
		label: "Text field",
		type: "block",
		category: "form",
		defaultContent: () =>
			structured({
				type: "text",
				name: "field",
				placeholder: "Enter text",
				defaultValue: "",
			}),
		defaultStyles: {
			width: "100%",
			padding: "8px 12px",
			fontSize: "16px",
			lineHeight: "1.5",
			border: "1px solid #d1d5db",
			borderRadius: "0.375rem",
			backgroundColor: "#ffffff",
			color: "#111827",
			boxSizing: "border-box",
		},
	},
	"core/textarea": {
		name: "core/textarea",
		label: "Text area",
		type: "block",
		category: "form",
		defaultContent: () =>
			structured({
				name: "message",
				placeholder: "Enter your message",
				rows: 4,
			}),
		defaultStyles: {
			width: "100%",
			padding: "8px 12px",
			fontSize: "16px",
			lineHeight: "1.5",
			border: "1px solid #d1d5db",
			borderRadius: "0.375rem",
			backgroundColor: "#ffffff",
			color: "#111827",
			boxSizing: "border-box",
		},
	},
	"core/select": {
		name: "core/select",
		label: "Dropdown",
		type: "block",
		category: "form",
		defaultContent: () =>
			structured({
				name: "choice",
				placeholder: "Choose an option",
				options: [
					{ label: "Option one", value: "option-1" },
					{ label: "Option two", value: "option-2" },
				],
			}),
		defaultStyles: {
			width: "100%",
			padding: "8px 12px",
			fontSize: "16px",
			lineHeight: "1.5",
			border: "1px solid #d1d5db",
			borderRadius: "0.375rem",
			backgroundColor: "#ffffff",
			color: "#111827",
			boxSizing: "border-box",
		},
	},
	"post/title": {
		name: "post/title",
		label: "Post Title",
		type: "block",
		category: "post",
		defaultContent: () => structured({ showLink: true }),
	},
	"post/excerpt": {
		name: "post/excerpt",
		label: "Post Excerpt",
		type: "block",
		category: "post",
		defaultContent: () => structured({}),
	},
	"post/featured-image": {
		name: "post/featured-image",
		label: "Featured Image",
		type: "block",
		category: "post",
		defaultContent: () => structured({ aspectRatio: "16/9", objectFit: "cover" }),
	},
	"post/list": {
		name: "post/list",
		label: "Post List",
		type: "block",
		category: "post",
		defaultContent: () =>
			structured({
				layout: "cards",
				postsPerPage: 6,
				showExcerpt: true,
				showFeaturedImage: true,
				showDate: true,
				showAuthor: true,
				blogId: "",
				orderBy: "date",
				order: "desc",
			}),
	},
	"post/toc": {
		name: "post/toc",
		label: "Table of Contents",
		type: "block",
		category: "post",
		defaultContent: () => structured({ title: "Contents", maxDepth: 3 }),
	},
	"post/author-box": {
		name: "post/author-box",
		label: "Author Box",
		type: "block",
		category: "post",
		defaultContent: () => structured({ showAvatar: true, showBio: true }),
	},
	"post/comments": {
		name: "post/comments",
		label: "Comments",
		type: "block",
		category: "post",
		defaultContent: () => structured({}),
	},
	"post/navigation": {
		name: "post/navigation",
		label: "Post Navigation",
		type: "block",
		category: "post",
		defaultContent: () => structured({ showPrevious: true, showNext: true }),
	},
	"post/info": {
		name: "post/info",
		label: "Post Info",
		type: "block",
		category: "post",
		defaultContent: () => structured({ showDate: true, showAuthor: true, showCategories: true }),
	},
	"post/progress": {
		name: "post/progress",
		label: "Reading Progress",
		type: "block",
		category: "post",
		defaultContent: () => structured({ position: "top" }),
	},
};

/** Returns true when a string is a registered dashboard block name. */
export function isBlockName(value: string): value is BlockName {
	return (BLOCK_NAMES as readonly string[]).includes(value);
}
