import { describe, expect, it } from "vitest";
import type { BlockConfig } from "../schema-types.js";
import { DEFAULT_BLOG_HOME_LIST, readBlogHomeList, readBlogHomeListPatch } from "./blog-home-list.js";
import { DEFAULT_BLOG_POST_LOOK, readBlogPostLook, writeBlogPostLook } from "./blog-post-look.js";
import { composeBlogPost, findPostBody, isWrittenPost, newPostBody, writtenPostBlocks } from "./compose-blog-post.js";

const ids = () => {
	let n = 0;
	return () => `id-${++n}`;
};

const names = (blocks: BlockConfig[]): string[] => blocks.flatMap((block) => [block.name, ...names(block.children ?? [])]);

describe("a written post", () => {
	it("starts as one post body holding one empty paragraph", () => {
		const blocks = newPostBody({ newId: ids() });
		expect(isWrittenPost(blocks)).toBe(true);
		expect(names(blocks)).toEqual(["post/body", "core/paragraph"]);
		expect(blocks[0].children?.[0].parentId).toBe(blocks[0].id);
	});

	it("is not a post designed in the page builder", () => {
		expect(isWrittenPost([{ id: "s", name: "core/page-shell", label: "", type: "container", parentId: null, content: { kind: "empty" }, children: [] }])).toBe(false);
		expect(isWrittenPost([])).toBe(false);
	});
});

describe("putting a written post in its blog's look", () => {
	const body = newPostBody({ newId: ids() })[0];

	it("draws title, subtitle, date line, cover, the body, author, previous/next and comments around the body", () => {
		const page = composeBlogPost({ body, look: DEFAULT_BLOG_POST_LOOK });
		expect(page).toHaveLength(1);
		expect(page[0].name).toBe("core/page-shell");
		expect(page[0].children?.map((block) => block.name)).toEqual([
			"post/title",
			"post/excerpt",
			"post/info",
			"post/featured-image",
			"post/body",
			"post/author-box",
			"post/navigation",
			"post/comments",
		]);
		expect(findPostBody(page)?.id).toBe(body.id);
	});

	it("leaves out what the look turns off, and the date line when it has nothing to show", () => {
		const page = composeBlogPost({ body, look: { ...DEFAULT_BLOG_POST_LOOK, cover: false, comments: false, author: false, prevNext: false, date: false, readingTime: false } });
		expect(page[0].children?.map((block) => block.name)).toEqual(["post/title", "post/excerpt", "post/body"]);
	});

	it("draws the same tree every time (the frame's ids come from the body's), so the editor and the page agree", () => {
		expect(composeBlogPost({ body, look: DEFAULT_BLOG_POST_LOOK })).toEqual(composeBlogPost({ body, look: DEFAULT_BLOG_POST_LOOK }));
	});

	it("starts the title and subtitle empty (the post's own fill them in) and shows no read-more link", () => {
		const children = composeBlogPost({ body, look: DEFAULT_BLOG_POST_LOOK })[0].children ?? [];
		const dataOf = (name: string) => {
			const block = children.find((child) => child.name === name);
			return block?.content && "kind" in block.content && block.content.kind === "structured" ? block.content.data : {};
		};
		expect(dataOf("post/title").text).toBe("");
		expect(dataOf("post/excerpt")).toMatchObject({ text: "", showReadMore: false });
	});

	it("saves only the body again", () => {
		const page = composeBlogPost({ body, look: DEFAULT_BLOG_POST_LOOK });
		const saved = writtenPostBlocks(page);
		expect(saved).toEqual([{ ...body, parentId: null }]);
		expect(() => writtenPostBlocks([])).toThrow(/no body/);
	});
});

describe("the blog's look in its settings", () => {
	it("reads defaults for anything missing or wrong, and keeps other settings when written", () => {
		expect(readBlogPostLook(undefined)).toEqual(DEFAULT_BLOG_POST_LOOK);
		expect(readBlogPostLook({ post: { comments: false, date: "yes" } })).toEqual({ ...DEFAULT_BLOG_POST_LOOK, comments: false });
		expect(writeBlogPostLook({ settings: { other: 1, post: { cover: false } }, look: { comments: false } })).toEqual({ other: 1, post: { ...DEFAULT_BLOG_POST_LOOK, cover: false, comments: false } });
	});
});

describe("how the blog's home lists posts", () => {
	it("reads a post list's fields, and checks a change from the screens", () => {
		expect(readBlogHomeList({ layout: "grid", showDate: false, blogId: "b" })).toEqual({ ...DEFAULT_BLOG_HOME_LIST, layout: "grid", showDate: false });
		expect(readBlogHomeList({ layout: "carousel" }).layout).toBe("cards");
		expect(readBlogHomeListPatch({ layout: "list", showAuthor: false, postsPerPage: 99, showDate: "no" })).toEqual({ layout: "list", showAuthor: false });
	});
});
