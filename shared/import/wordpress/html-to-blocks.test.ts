import { describe, it, expect } from "vitest";
import { htmlToBlocks, collectImageUrls } from "./html-to-blocks";

describe("htmlToBlocks", () => {
	it("returns no blocks for empty input", () => {
		expect(htmlToBlocks("")).toEqual([]);
		expect(htmlToBlocks("   ")).toEqual([]);
	});

	it("maps headings with their level and plain text", () => {
		const [block] = htmlToBlocks("<h2>Section Title</h2>");
		expect(block.name).toBe("core/heading");
		expect(block.content).toMatchObject({
			kind: "text",
			value: "Section Title",
			level: 2,
		});
	});

	it("maps a plain paragraph to a plain text block", () => {
		const [block] = htmlToBlocks("<p>Just some text.</p>");
		expect(block.name).toBe("core/paragraph");
		expect(block.content).toMatchObject({ kind: "text", value: "Just some text." });
		expect((block.content as { format?: string }).format).toBeUndefined();
	});

	it("preserves inline formatting as html paragraphs", () => {
		const [block] = htmlToBlocks(
			'<p>Read the <a href="https://x.com">docs</a> and <strong>note</strong>.</p>',
		);
		expect(block.name).toBe("core/paragraph");
		const content = block.content as { format?: string; value: string };
		expect(content.format).toBe("html");
		expect(content.value).toContain('<a href="https://x.com">docs</a>');
		expect(content.value).toContain("<strong>note</strong>");
	});

	it("skips empty paragraphs", () => {
		expect(htmlToBlocks("<p></p><p>&nbsp;</p>")).toEqual([]);
	});

	it("maps unordered and ordered lists with values html", () => {
		const [ul] = htmlToBlocks("<ul><li>One</li><li>Two</li></ul>");
		expect(ul.name).toBe("core/list");
		expect(ul.content).toMatchObject({ ordered: false });
		expect((ul.content as unknown as { values: string }).values).toContain(
			"<li>One</li>",
		);

		const [ol] = htmlToBlocks('<ol start="3"><li>A</li></ol>');
		expect(ol.content).toMatchObject({ ordered: true, start: 3 });
	});

	it("maps blockquotes to quote blocks", () => {
		const [block] = htmlToBlocks("<blockquote><p>Wise words</p></blockquote>");
		expect(block.name).toBe("core/quote");
		expect((block.content as { value: string }).value).toContain("Wise words");
	});

	it("maps images and figures to native image blocks", () => {
		const [img] = htmlToBlocks('<img src="https://x.com/a.jpg" alt="A">');
		expect(img.name).toBe("core/image");
		expect(img.content).toMatchObject({
			kind: "media",
			url: "https://x.com/a.jpg",
			alt: "A",
			mediaType: "image",
		});

		const [fig] = htmlToBlocks(
			'<figure><img src="https://x.com/b.png" alt="B"><figcaption>Cap</figcaption></figure>',
		);
		expect(fig.name).toBe("core/image");
		expect(fig.content).toMatchObject({ url: "https://x.com/b.png", caption: "Cap" });
	});

	it("resolves image urls via the injected resolver (sideloading)", () => {
		const [img] = htmlToBlocks('<img src="https://x.com/a.jpg">', {
			resolveImageUrl: (u) => (u === "https://x.com/a.jpg" ? "/uploads/a.jpg" : u),
		});
		expect((img.content as { url: string }).url).toBe("/uploads/a.jpg");
	});

	it("keeps unknown/complex markup as a lossless html block", () => {
		const [block] = htmlToBlocks(
			'<figure class="wp-block-embed"><iframe src="https://yt.com/x"></iframe></figure>',
		);
		expect(block.name).toBe("core/html");
		expect(
			(block.content as unknown as { data: { content: string } }).data.content,
		).toContain("iframe");
	});

	it("strips script tags from preserved html", () => {
		const blocks = htmlToBlocks('<p>Hi <a href="#">x</a><script>alert(1)</script></p>');
		const joined = JSON.stringify(blocks);
		expect(joined).not.toContain("<script>");
	});

	it("produces multiple discrete blocks for a real-world article", () => {
		const html = [
			"<h2>Intro</h2>",
			'<p>Some <a href="#">link</a> text.</p>',
			"<ul><li>a</li><li>b</li></ul>",
			'<figure><img src="https://x.com/i.jpg" alt=""></figure>',
			"<blockquote><p>q</p></blockquote>",
		].join("");
		const blocks = htmlToBlocks(html);
		expect(blocks.map((b) => b.name)).toEqual([
			"core/heading",
			"core/paragraph",
			"core/list",
			"core/image",
			"core/quote",
		]);
	});

	it("attaches class, style, id, and passthrough attrs to native blocks", () => {
		const [heading, paragraph, image] = htmlToBlocks(
			[
				'<h2 id="section" class="has-text-align-center" style="margin-top:2em">Title</h2>',
				'<p class="has-drop-cap is-style-lead" data-track="1">Lead</p>',
				'<figure class="alignwide wp-block-image"><img class="size-large" src="https://x.com/a.jpg" width="400" data-id="99"></figure>',
			].join(""),
		);

		expect(heading.content).toMatchObject({
			anchor: "section",
			textAlign: "center",
		});
		expect(heading.styles).toMatchObject({ marginTop: "2em" });

		expect(paragraph.content).toMatchObject({ dropCap: true, className: "is-style-lead" });
		expect(paragraph.other?.attributes).toMatchObject({ "data-track": "1" });

		expect(image.content).toMatchObject({
			align: "wide",
			sizeSlug: "large",
		});
		expect(image.styles).toMatchObject({ width: "400px" });
		expect(image.other?.attributes).toMatchObject({ "data-id": "99" });
	});
});

describe("collectImageUrls", () => {
	it("collects unique image srcs", () => {
		const urls = collectImageUrls(
			'<img src="https://x.com/a.jpg"><figure><img src="https://x.com/b.jpg"></figure><img src="https://x.com/a.jpg">',
		);
		expect(urls).toEqual(["https://x.com/a.jpg", "https://x.com/b.jpg"]);
	});
});
