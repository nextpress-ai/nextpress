import { fresh, structured } from "./content.js";
import { TABLE_DEFAULT_DATA } from "./table-defaults.js";
import type { WrittenBlockEntry } from "./types.js";

/** Editor model and stored shape are the same for text-kind blocks. */
export const HEADING_DEFAULT_CONTENT = {
	kind: "text" as const,
	value: "Your heading here",
	level: 2,
	anchor: "",
	className: "",
};

export const BUTTON_DEFAULT_CONTENT = {
	kind: "text" as const,
	value: "Click Me",
	url: "#",
	linkTarget: "_self" as const,
	rel: "",
	title: "",
	className: "",
};

export const PARAGRAPH_DEFAULT_CONTENT = {
	kind: "text" as const,
	value: "Add your text content here. You can edit this text and customize its appearance.",
	dropCap: false,
	anchor: "",
	className: "",
};

export const LIST_DEFAULT_CONTENT = {
	ordered: false,
	values: "<li>List item 1</li><li>List item 2</li><li>List item 3</li>",
	/** Bullet shape for unordered lists: "default", "check", "arrow", "dash" or "none". */
	marker: "default",
	anchor: "",
	className: "",
};

export const QUOTE_DEFAULT_CONTENT = {
	value: "<p>Add a quote</p>",
	citation: "",
	anchor: "",
	className: "",
};

export const PULLQUOTE_DEFAULT_CONTENT = {
	value: "<p>Add a quote that stands out from the rest of your content.</p>",
	citation: "",
	className: "",
};

export const CODE_DEFAULT_CONTENT = {
	content: '// Write your code here\nfunction hello() {\n  console.log("Hello, World!");\n}',
	language: "javascript",
	/** A file name or caption shown above the code. */
	title: "",
	/** Lines to mark, e.g. "2, 4-6". */
	highlightLines: "",
	className: "",
	showLineNumbers: false,
	wrapLines: true,
	showCopyButton: true,
};

export const PREFORMATTED_DEFAULT_CONTENT = {
	content: "This is preformatted text.\nIt preserves    spacing   and\n\teven\ttabs!",
	className: "",
};

export const HTML_DEFAULT_CONTENT = {
	content: '<div class="custom-element">\n  <!-- Your HTML here -->\n</div>',
	className: "",
};

export const MARKDOWN_DEFAULT_CONTENT = {
	content: "",
	/** Read the text as MDX, so docs components like `<Callout>` work. Nothing in it is ever run. */
	mdx: false,
	className: "",
};

export const ICON_DEFAULT_CONTENT = {
	icon: {
		iconSet: "lucide" as const,
		iconName: "star",
		size: 24,
		color: "currentColor",
		strokeWidth: 2,
	},
	link: "",
	linkTarget: "_self" as const,
	label: "",
};

export const SPACER_DEFAULT_CONTENT = {
	height: "100px",
	anchor: "",
	className: "",
};

export const SEPARATOR_DEFAULT_CONTENT = {
	className: "",
	lineStyle: "solid" as const,
};

export const DIVIDER_DEFAULT_CONTENT = {
	style: "solid" as const,
	width: 100,
	color: "#cccccc",
};

export const TEXT_BLOCKS: readonly WrittenBlockEntry[] = [
	{
		name: "core/heading",
		alsoIn: ["docs"],
		label: "Heading",
		description: "Add a heading text",
		category: "basic",
		kind: "block",
		defaultContent: () => fresh(HEADING_DEFAULT_CONTENT),
		defaultStyles: { margin: "0" },
	},
	{
		name: "core/button",
		label: "Button",
		description: "Add a clickable button",
		category: "basic",
		kind: "block",
		defaultContent: () => fresh(BUTTON_DEFAULT_CONTENT),
		defaultStyles: {
			backgroundColor: "#007cba",
			color: "#ffffff",
			padding: "12px 24px",
			borderRadius: "4px",
			border: "none",
			fontSize: "16px",
			textAlign: "center",
			display: "inline-block",
			cursor: "pointer",
		},
	},
	{
		name: "core/paragraph",
		alsoIn: ["docs"],
		label: "Paragraph",
		description: "Add a paragraph of text",
		category: "basic",
		kind: "block",
		defaultContent: () => fresh(PARAGRAPH_DEFAULT_CONTENT),
		defaultStyles: { fontSize: "16px", lineHeight: "1.6" },
	},
	{
		name: "core/list",
		alsoIn: ["docs"],
		label: "List",
		description: "Add a bulleted or numbered list",
		category: "advanced",
		kind: "block",
		defaultContent: () => structured(LIST_DEFAULT_CONTENT),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/quote",
		label: "Quote",
		description: "Add a blockquote",
		category: "advanced",
		// MDX writes it as `> ` lines, so docs pages take it as well.
		alsoIn: ["docs"],
		kind: "block",
		defaultContent: () => structured(QUOTE_DEFAULT_CONTENT),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/pullquote",
		label: "Pullquote",
		description: "Give special visual emphasis to a quote from your text",
		category: "advanced",
		kind: "block",
		defaultContent: () => structured(PULLQUOTE_DEFAULT_CONTENT),
		defaultStyles: { backgroundColor: "#f8f9fa", color: "#000000", textAlign: "center" },
	},
	{
		name: "core/code",
		label: "Code",
		description: "Display code with language tagging and line numbers",
		category: "advanced",
		alsoIn: ["docs"],
		kind: "block",
		defaultContent: () => structured(CODE_DEFAULT_CONTENT),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/preformatted",
		label: "Preformatted",
		description: "Add text that respects your spacing and tabs",
		category: "advanced",
		kind: "block",
		defaultContent: () => structured(PREFORMATTED_DEFAULT_CONTENT),
		defaultStyles: { backgroundColor: "#f8f9fa", color: "#000000", fontSize: "14px" },
	},
	{
		name: "core/html",
		label: "Custom HTML",
		description: "Add custom HTML code",
		category: "advanced",
		kind: "block",
		defaultContent: () => structured(HTML_DEFAULT_CONTENT),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/markdown",
		label: "Markdown",
		description: "Add rich text using Markdown format",
		category: "advanced",
		alsoIn: ["docs"],
		kind: "block",
		defaultContent: () => structured(MARKDOWN_DEFAULT_CONTENT),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/table",
		label: "Table",
		description: "Create a table to display data",
		category: "advanced",
		alsoIn: ["docs"],
		kind: "block",
		defaultContent: () => structured(TABLE_DEFAULT_DATA),
		defaultStyles: { margin: "1em 0" },
	},
	{
		name: "core/icon",
		label: "Icon",
		description: "Add an icon from various icon sets",
		category: "basic",
		kind: "block",
		defaultContent: () => structured(ICON_DEFAULT_CONTENT),
		defaultStyles: { display: "inline-flex", alignItems: "center", justifyContent: "center" },
	},
	{
		name: "core/spacer",
		label: "Spacer",
		description: "Add vertical spacing",
		category: "layout",
		kind: "block",
		defaultContent: () => structured(SPACER_DEFAULT_CONTENT),
		defaultStyles: { padding: "0px", margin: "0px" },
	},
	{
		name: "core/separator",
		label: "Separator",
		description: "A line across the content, solid, dashed, or dotted.",
		category: "layout",
		alsoIn: ["docs"],
		kind: "block",
		defaultContent: () => structured(SEPARATOR_DEFAULT_CONTENT),
		defaultStyles: { color: "#000000", width: "100px", margin: "2.5em auto" },
	},
	{
		name: "core/divider",
		label: "Divider",
		description: "Add a horizontal line",
		category: "layout",
		kind: "block",
		defaultContent: () => structured(DIVIDER_DEFAULT_CONTENT),
		defaultStyles: { padding: "20px 0px" },
	},
];
