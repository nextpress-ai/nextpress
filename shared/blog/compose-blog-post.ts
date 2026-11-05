import { fresh } from "../block-catalog/content.js";
import { createDefaultBlock } from "../block-catalog/create-default-block.js";
import { POST_INFO_DEFAULT_CONTENT } from "../block-catalog/post-blocks.js";
import { emptyParagraphContent } from "../docs/empty-paragraph.js";
import { fitToDocsColumn } from "../docs/docs-column-spacing.js";
import { ensureRootPageShell } from "../page-shell-model.js";
import type { BlockConfig } from "../schema-types.js";
import type { BlogPostLook } from "./blog-post-look.js";

/** The block that holds a written post's writing; a written post's blocks are this block alone. */
export const POST_BODY_BLOCK_NAME = "post/body";

/** The frame's blocks: drawn around the body from the blog's look, never stored in the post. */
export const POST_FRAME_BLOCK_NAMES: ReadonlySet<string> = new Set([
	"core/page-shell",
	"post/title",
	"post/excerpt",
	"post/info",
	"post/featured-image",
	"post/author-box",
	"post/navigation",
	"post/comments",
]);

/** Frame blocks a writer types in or picks in place (title, subtitle, cover); the rest only show. */
export const POST_FRAME_EDITABLE: ReadonlySet<string> = new Set(["post/title", "post/excerpt", "post/featured-image"]);

/** The reading column: narrower than a page, so lines stay easy to read. */
const READING_WIDTH = "720px";

/** A written post: its blocks are one post body. Posts designed in the page builder are not. */
export const isWrittenPost = (blocks: BlockConfig[] | null | undefined): boolean =>
	Array.isArray(blocks) && blocks.length === 1 && blocks[0].name === POST_BODY_BLOCK_NAME;

/** The post body inside a tree, the stored one or one put in its blog's look. */
export function findPostBody(blocks: BlockConfig[]): BlockConfig | null {
	for (const block of blocks) {
		if (block.name === POST_BODY_BLOCK_NAME) return block;
		const inside = findPostBody(block.children ?? []);
		if (inside) return inside;
	}
	return null;
}

/** What a written post saves: its body alone, out of the look the editor shows it in. */
export function writtenPostBlocks(blocks: BlockConfig[]): BlockConfig[] {
	const body = findPostBody(blocks);
	if (!body) throw new Error("This post has no body to save: its blocks lost the post body block.");
	return [{ ...body, parentId: null }];
}

/** An empty post body with one empty paragraph, for a new written post. */
export function newPostBody({ newId }: { newId: () => string }): BlockConfig[] {
	const body = createDefaultBlock({ name: POST_BODY_BLOCK_NAME, id: newId(), newId });
	const paragraph = createDefaultBlock({ name: "core/paragraph", id: newId(), newId });
	if (!body || !paragraph) throw new Error("The block catalog has no post body or text block, so a written post can't start.");
	const text = { ...paragraph, parentId: body.id, styles: { ...paragraph.styles, padding: "0" }, content: emptyParagraphContent() };
	return [{ ...body, children: [text] }];
}

/**
 * The page a written post is shown as: its body inside the blog's look (title, subtitle, date line,
 * cover, then the body, then the author box, previous/next and comments, as the look says). The
 * frame's ids come from the body's, so the editor and the published page draw the same tree.
 */
export function composeBlogPost({ body, look }: { body: BlockConfig; look: BlogPostLook }): BlockConfig[] {
	let count = 0;
	const newId = (): string => `${body.id}-frame-${++count}`;
	// Frame blocks line up with the body's text, and start without the catalog's sample text, so
	// the post's own title and subtitle show (the published page fills them in from the post).
	const frame = (name: string, data: Record<string, string | boolean> = {}): BlockConfig => {
		const block = createDefaultBlock({ name, id: newId(), newId });
		if (!block) throw new Error(`The block catalog has no "${name}", so a written post can't be shown in its blog's look.`);
		const content = block.content && "kind" in block.content && block.content.kind === "structured" ? { kind: "structured" as const, data: { ...block.content.data, ...data } } : block.content;
		return fitToDocsColumn({ ...block, content });
	};
	const showInfo = look.date || look.readingTime;
	// The date line keeps its plain stored shape (no `kind`), as the block itself saves it.
	const info = (): BlockConfig => ({
		...frame("post/info"),
		content: fresh({ ...POST_INFO_DEFAULT_CONTENT, showDate: look.date, showReadTime: look.readingTime, showCategories: false, showTags: false }),
	});
	const blocks: BlockConfig[] = [
		frame("post/title", { text: "" }),
		frame("post/excerpt", { text: "", showReadMore: false }),
		...(showInfo ? [info()] : []),
		...(look.cover ? [frame("post/featured-image")] : []),
		body,
		...(look.author ? [frame("post/author-box")] : []),
		...(look.prevNext ? [frame("post/navigation")] : []),
		...(look.comments ? [frame("post/comments")] : []),
	];
	const [shell] = ensureRootPageShell({ blocks, shellId: `${body.id}-frame-shell` }).blocks;
	const content = shell.content && "kind" in shell.content && shell.content.kind === "structured" ? shell.content.data : {};
	return [{ ...shell, content: { kind: "structured", data: { ...content, containerWidth: READING_WIDTH } } }];
}
