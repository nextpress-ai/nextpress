import { randomUUID } from "node:crypto";
import { models } from "./storage.js";

type StarterBlock = {
	id: string;
	name: string;
	label: string;
	type: "block" | "container";
	parentId: string | null;
	category: string;
	content: Record<string, unknown>;
	styles: Record<string, string>;
	settings: Record<string, unknown>;
	other: Record<string, unknown>;
	children?: StarterBlock[];
};

/** Builds a minimal starter layout editors can extend. */
function buildStarterBlocks({ kind }: { kind: "page" | "post" }): StarterBlock[] {
	const headingId = randomUUID();
	const paragraphId = randomUUID();
	const buttonId = randomUUID();

	const title =
		kind === "page" ? "Welcome to your page" : "Your post title";
	const body =
		kind === "page"
			? "Replace this starter layout with your own blocks, or edit it in place."
			: "Start writing your post. This layout comes from the default post template.";

	return [
		{
			id: headingId,
			name: "core/heading",
			label: "Heading",
			type: "block",
			parentId: null,
			category: "basic",
			content: { kind: "text", value: title },
			styles: { padding: "20px", margin: "0px", fontSize: "2rem", fontWeight: "700" },
			settings: {},
			other: {
				tokenMap: {},
				units: { spacing: "px", font: "rem", dimension: "px", border: "px" },
			},
		},
		{
			id: paragraphId,
			name: "core/paragraph",
			label: "Paragraph",
			type: "block",
			parentId: null,
			category: "basic",
			content: { kind: "text", value: body },
			styles: { padding: "20px", margin: "0px" },
			settings: {},
			other: {
				tokenMap: {},
				units: { spacing: "px", font: "rem", dimension: "px", border: "px" },
			},
		},
		{
			id: buttonId,
			name: "core/button",
			label: "Button",
			type: "block",
			parentId: null,
			category: "basic",
			content: {
				kind: "text",
				value: kind === "page" ? "Get started" : "Read more",
				url: "#",
				linkTarget: "_self",
			},
			styles: {
				padding: "20px",
				margin: "0px",
				backgroundColor: "var(--npb-accent)",
				color: "var(--npb-text-inverse)",
			},
			settings: {},
			other: {
				tokenMap: {},
				units: { spacing: "px", font: "rem", dimension: "px", border: "px" },
			},
		},
	];
}

/**
 * Seeds starter page/post templates when none exist (setup wizard or CLI upgrade).
 */
export async function initializeDefaultTemplates({
	authorId,
}: {
	authorId: string;
}): Promise<void> {
	const existing = await models.templates.findMany();
	if (existing.length > 0) {
		return;
	}

	const pageTemplate = await models.templates.create({
		name: "Basic Page",
		type: "page",
		description: "Heading, paragraph, and call-to-action — a simple starting layout for pages.",
		authorId,
		blocks: buildStarterBlocks({ kind: "page" }),
		settings: {},
	});

	const postTemplate = await models.templates.create({
		name: "Basic Post",
		type: "post",
		description: "Title, intro paragraph, and button — a simple starting layout for blog posts.",
		authorId,
		blocks: buildStarterBlocks({ kind: "post" }),
		settings: {},
	});

	console.log("Default templates initialized:", pageTemplate.name, postTemplate.name);
}
