import type { BlockConfig } from "@shared/schema-types";

export const demoUnits = {
	spacing: "px" as const,
	font: "rem" as const,
	dimension: "px" as const,
	border: "px" as const,
};

export const demoOther = { tokenMap: {}, units: demoUnits };

/** Shorthand for demo fixture blocks. */
export function demoBlock(partial: BlockConfig): BlockConfig {
	return partial;
}

export function demoHeading({
	id,
	level,
	value,
	parentId = null,
	styles = {},
}: {
	id: string;
	level: 1 | 2 | 3 | 4 | 5 | 6;
	value: string;
	parentId?: string | null;
	styles?: Record<string, string>;
}): BlockConfig {
	return demoBlock({
		id,
		name: "core/heading",
		label: "Heading",
		type: "block",
		parentId,
		category: "basic",
		content: { kind: "text", value, level },
		styles,
		settings: {},
		other: demoOther,
	});
}

export function demoParagraph({
	id,
	value,
	parentId = null,
	styles = {},
}: {
	id: string;
	value: string;
	parentId?: string | null;
	styles?: Record<string, string>;
}): BlockConfig {
	return demoBlock({
		id,
		name: "core/paragraph",
		label: "Paragraph",
		type: "block",
		parentId,
		category: "basic",
		content: { kind: "text", value },
		styles,
		settings: {},
		other: demoOther,
	});
}

export function demoButtons({
	id,
	buttons,
	parentId = null,
	orientation = "horizontal",
}: {
	id: string;
	buttons: Array<{ id: string; text: string; url: string }>;
	parentId?: string | null;
	orientation?: "horizontal" | "vertical";
}): BlockConfig {
	return demoBlock({
		id,
		name: "core/buttons",
		label: "Buttons",
		type: "block",
		parentId,
		category: "basic",
		content: {
			kind: "structured",
			data: {
				orientation,
				buttons: buttons.map((btn) => ({
					...btn,
					linkTarget: "_self",
					rel: "",
					title: "",
					className: "",
				})),
			},
		},
		styles: { margin: "1em 0", justifyContent: "center" },
		settings: {},
		other: demoOther,
	});
}

export function demoImage({
	id,
	url,
	alt,
	parentId = null,
	styles = { width: "100%", maxWidth: "100%", height: "auto" },
}: {
	id: string;
	url: string;
	alt: string;
	parentId?: string | null;
	styles?: Record<string, string>;
}): BlockConfig {
	return demoBlock({
		id,
		name: "core/image",
		label: "Image",
		type: "block",
		parentId,
		category: "media",
		content: { kind: "media", url, alt, mediaType: "image" },
		styles,
		settings: {},
		other: demoOther,
	});
}

export function demoSeparator(id: string, parentId: string | null = null): BlockConfig {
	return demoBlock({
		id,
		name: "core/separator",
		label: "Separator",
		type: "block",
		parentId,
		category: "layout",
		content: { kind: "structured", data: {} },
		styles: { margin: "2em 0" },
		settings: {},
		other: demoOther,
	});
}
