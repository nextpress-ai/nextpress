import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { POST_BODY_BLOCK_NAME, POST_FRAME_BLOCK_NAMES, POST_FRAME_EDITABLE, composeBlogPost, findPostBody } from "@shared/blog/compose-blog-post";
import type { BlogPostLook } from "@shared/blog/blog-post-look";
import type { BlockConfig } from "@shared/schema-types";
import { useToast } from "@/hooks/use-toast";
import { findBlock, findParentBlock, insertNewBlock } from "@/lib/handlers/treeUtils";
import { FrameValueProvider, type DocsFrameValue } from "../docs-mode/docs-frame-context";
import { WritingProvider } from "../writing/writing-context";
import { buildBlogLibraryCategories } from "./blog-library";
import { BlogModeContextProvider, type BlogModeValue, type BlogPanelTab } from "./blog-mode-context";
import { lookOfBlog, useBlog, useSaveBlogLook } from "./use-blog";

/** What the editor page hands the page builder to open a written post in the writing editor. */
export type BlogModeProps = { blogId: string };

/**
 * A post's frame on the canvas: the blog's look drawn as visitors see it, with the title, subtitle
 * and cover typed in place but never moved or deleted, and the body the one place blocks go.
 */
const POST_FRAME: DocsFrameValue = {
	isFrameBlock: (name) => POST_FRAME_BLOCK_NAMES.has(name) && !POST_FRAME_EDITABLE.has(name),
	isFixed: (name) => POST_FRAME_EDITABLE.has(name),
	takesBlocks: (name) => name === POST_BODY_BLOCK_NAME,
	openRegion: () => undefined,
	openLink: () => false,
};

/** Blocks a click in the block list opens for typing; the rest are picked. */
const TYPED_IN: ReadonlySet<string> = new Set(["core/paragraph", "core/heading", "core/list", "core/quote", "core/code"]);

type Props = {
	blog: BlogModeProps | null;
	getBlocks: () => BlockConfig[];
	commitBlocks: (next: BlockConfig[]) => void;
	selectedBlockId: string | null;
	selectBlock: (id: string | null) => void;
	startEditing: (id: string) => void;
	children: ReactNode;
};

/** The right panel's tab: picking a block shows Block, putting it down goes back to Post. */
function usePanelTab(pickedBlockId: string | null): { tab: BlogPanelTab; setTab: (tab: BlogPanelTab) => void } {
	const [tab, setTab] = useState<BlogPanelTab>("post");
	const [lastPick, setLastPick] = useState(pickedBlockId);
	if (pickedBlockId !== lastPick) {
		setLastPick(pickedBlockId);
		if (pickedBlockId) setTab("block");
		else if (tab === "block") setTab("post");
	}
	return { tab: tab === "block" && !pickedBlockId ? "post" : tab, setTab };
}

function BlogModeActive({ blog: { blogId }, getBlocks, commitBlocks, selectedBlockId, selectBlock, startEditing, children }: Props & { blog: BlogModeProps }): ReactElement {
	const { toast } = useToast();
	const blogQuery = useBlog({ blogId });
	const saveLookMutation = useSaveBlogLook({ blog: blogQuery.data });
	const panel = usePanelTab(selectedBlockId);
	const menuBlocks = useMemo(() => buildBlogLibraryCategories().flatMap((category) => category.blocks), []);
	const selectedBlock = selectedBlockId ? findBlock(getBlocks(), selectedBlockId) : null;
	const look = lookOfBlog(blogQuery.data);

	// The canvas opened in the blog's look; when the Blog tab changes it, the post is drawn again in the new one.
	const lookKey = JSON.stringify(look);
	const shownLook = useRef(lookKey);
	useEffect(() => {
		if (!blogQuery.data || shownLook.current === lookKey) return;
		shownLook.current = lookKey;
		const body = findPostBody(getBlocks());
		if (body) commitBlocks(composeBlogPost({ body: { ...body, parentId: null }, look }));
	}, [blogQuery.data, commitBlocks, getBlocks, look, lookKey]);

	const saveLook = useCallback(
		async (patch: Partial<BlogPostLook>): Promise<boolean> => {
			try {
				await saveLookMutation.mutateAsync(patch);
				return true;
			} catch (error) {
				console.error({ atFunction: "blogWriting.saveLook", data: { blogId, patch, error }, message: "Saving the blog's post look failed" });
				toast({ title: "Couldn't save the blog's look", description: "Check your connection and try again.", variant: "destructive" });
				return false;
			}
		},
		[blogId, saveLookMutation, toast],
	);

	const insertBlock = useCallback(
		(name: string) => {
			const tree = getBlocks();
			const body = findPostBody(tree);
			if (!body) return;
			const siblings = body.children ?? [];
			const pickedInBody = selectedBlockId && findParentBlock(tree, selectedBlockId)?.id === body.id ? siblings.findIndex((child) => child.id === selectedBlockId) : -1;
			const inserted = insertNewBlock(tree, body.id, pickedInBody >= 0 ? pickedInBody + 1 : siblings.length, name);
			if (!inserted.newId) return;
			commitBlocks(inserted.blocks);
			if (TYPED_IN.has(name)) startEditing(inserted.newId);
			else selectBlock(inserted.newId);
		},
		[commitBlocks, getBlocks, selectBlock, selectedBlockId, startEditing],
	);

	const value: BlogModeValue = {
		blog: blogQuery.data,
		blogLoading: blogQuery.isLoading,
		blogFailed: blogQuery.isError,
		look,
		saveLook,
		savingLook: saveLookMutation.isPending,
		tab: panel.tab,
		setTab: panel.setTab,
		selectedBlock,
		insertBlock,
	};

	return (
		<BlogModeContextProvider value={value}>
			<FrameValueProvider value={POST_FRAME}>
				<WritingProvider getBlocks={getBlocks} commitBlocks={commitBlocks} selectBlock={selectBlock} startEditing={startEditing} menuBlocks={menuBlocks}>
					{children}
				</WritingProvider>
			</FrameValueProvider>
		</BlogModeContextProvider>
	);
}

/**
 * Turns the page builder into the blog writing editor for a written post. With `blog` null (any
 * other document) it adds nothing.
 */
export function BlogModeProvider({ blog, ...props }: Props): ReactElement {
	if (!blog) return <>{props.children}</>;
	return <BlogModeActive blog={blog} {...props} />;
}
