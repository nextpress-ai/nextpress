// Load the renderer entry first: the renderer modules import each other through the block table.
import "../../renderer/react/render-helpers";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render as renderMermaid } from "pele";
import { describe, expect, it } from "vitest";
import type { BlockConfig } from "../schema-types.js";
import { DiagramSsrBlock } from "../../renderer/react/docs/diagram-ssr";
import { UpdateBlock } from "../../renderer/react/docs/update";
import { docsHeadingId } from "../blocks/docs-heading-id.js";
import { UpdateView } from "../blocks/update-view.js";
import { collectHeadingsFromBlocks } from "../page-headings.js";
import { DIAGRAM_RENDER_OPTIONS } from "./diagram-view.js";
import { MarkdownView } from "./markdown-view.js";

const renderDiagram = (source: string): string => renderMermaid(source, DIAGRAM_RENDER_OPTIONS).svg;

const diagram = (data: { code: string; caption: string }): BlockConfig => ({
	id: "d1",
	name: "docs/diagram",
	type: "block",
	parentId: null,
	content: { kind: "structured", data },
	styles: {},
	settings: {},
});

const update = (data: { label: string; description: string }, children: BlockConfig[] = []): BlockConfig => ({
	id: "u1",
	name: "docs/update",
	type: "container",
	parentId: null,
	content: { kind: "structured", data },
	styles: {},
	settings: {},
	children,
});

const paragraph = (text: string): BlockConfig => ({
	id: "p1",
	name: "core/paragraph",
	type: "block",
	parentId: "u1",
	content: { kind: "text", value: text, format: "html" },
	styles: {},
	settings: {},
});

/** The label column of an update: from its opening tag up to the content column, so two renders can be compared. */
const labelColumn = (markup: string): string => markup.slice(markup.indexOf('<div class="np-update__side">'), markup.indexOf('<div class="np-update__body">'));

describe("a diagram on a published page", () => {
	it("is drawn as an SVG picture with its caption", () => {
		const html = renderToStaticMarkup(<DiagramSsrBlock {...diagram({ code: "flowchart LR\n  A --> B", caption: "Flow" })} />);
		expect(html).toContain("<svg");
		expect(html).toContain('class="np-diagram"');
		expect(html).toContain("<figcaption>Flow</figcaption>");
		expect(html).not.toContain("couldn't be drawn");
	});

	it("shows a plain message in place of the picture when the diagram is invalid, and keeps its text", () => {
		const html = renderToStaticMarkup(<DiagramSsrBlock {...diagram({ code: "this is not a diagram", caption: "" })} />);
		expect(html).not.toContain("<svg");
		expect(html).toContain("This diagram couldn&#x27;t be drawn. Check the text below for a typo or a missing arrow.");
		expect(html).toContain("this is not a diagram");
	});

	it("is drawn the same way by a mermaid fence in MDX, caption included", () => {
		const html = renderToStaticMarkup(<MarkdownView text={'```mermaid title="Flow"\nflowchart LR\n  A --> B\n```\n'} renderDiagram={renderDiagram} />);
		expect(html).toContain("<svg");
		expect(html).toContain("<figcaption>Flow</figcaption>");
	});
});

describe("a changelog entry on a published page", () => {
	it("draws the label beside the content, with the id the contents list gives it", () => {
		const block = update({ label: "October 2026", description: "Two things" }, [paragraph("Body text.")]);
		const html = renderToStaticMarkup(<UpdateBlock {...block} />);
		const [heading] = collectHeadingsFromBlocks([block]);
		expect(heading).toEqual({ id: docsHeadingId("October 2026"), text: "October 2026", level: 2 });
		expect(html).toContain(`<h2 class="np-update__label" id="${heading.id}">October 2026`);
		expect(html).toContain(`href="#${heading.id}"`);
		expect(html).toContain('<p class="np-update__description">Two things</p>');
		expect(html).toContain('<div class="np-update__body">');
		expect(html).toContain("Body text.");
	});

	it("has no contents entry when it has no label", () => {
		expect(collectHeadingsFromBlocks([update({ label: "  ", description: "" })])).toEqual([]);
	});

	it("is drawn with the same label column by the MDX tag and the block", () => {
		const fromBlock = renderToStaticMarkup(<UpdateBlock {...update({ label: "October 2026", description: "Two things" })} />);
		const fromMdx = renderToStaticMarkup(<MarkdownView text={'<Update label="October 2026" description="Two things">\n\nBody text.\n\n</Update>\n'} mdx />);
		expect(labelColumn(fromMdx)).not.toBe("");
		expect(labelColumn(fromMdx)).toBe(labelColumn(fromBlock));
		expect(labelColumn(fromMdx)).toContain(`id="${docsHeadingId("October 2026")}"`);
	});

	it("leaves out the description line when there is none, for the view the editor's canvas shares", () => {
		const fromView = renderToStaticMarkup(<UpdateView label="v1.4.2" description="">{null}</UpdateView>);
		expect(fromView).toContain(`<h2 class="np-update__label" id="${docsHeadingId("v1.4.2")}">v1.4.2`);
		expect(fromView).not.toContain("np-update__description");
	});
});
