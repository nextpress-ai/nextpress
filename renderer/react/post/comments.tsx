import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent } from "../render-helpers";

function countBoundComments(items: Record<string, unknown>[]): number {
	return items.reduce((total, item) => {
		const replies = Array.isArray(item.replies)
			? item.replies.filter((reply): reply is Record<string, unknown> =>
					Boolean(reply) && typeof reply === "object",
				)
			: [];
		return total + 1 + countBoundComments(replies);
	}, 0);
}

function BoundCommentItem({
	item,
	depth,
}: {
	item: Record<string, unknown>;
	depth: number;
}) {
	const replies = Array.isArray(item.replies)
		? item.replies.filter((reply): reply is Record<string, unknown> =>
				Boolean(reply) && typeof reply === "object",
			)
		: [];
	return (
		<div
			className="wp-block-post-comments__comment"
			style={{
				padding: "8px 0",
				paddingLeft: depth > 0 ? 16 : 0,
				borderBottom: depth === 0 ? "1px solid var(--npb-border-default)" : undefined,
			}}
		>
			<strong>{typeof item.author === "string" ? item.author : "Anonymous"}</strong>
			<p style={{ margin: "4px 0 0", color: "var(--npb-text-secondary)", fontSize: "0.875rem" }}>
				{typeof item.content === "string" ? item.content : ""}
			</p>
			{replies.map((reply, index) => (
				<BoundCommentItem
					key={typeof reply.id === "string" ? reply.id : index}
					item={reply}
					depth={depth + 1}
				/>
			))}
		</div>
	);
}

/**
 * Post Comments — bound list from SSR, empty when the post has none.
 * Reply form stays on the SPA public path (JSON API).
 */
export function PostCommentsBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const data = parseStructuredContent(block.content);
	const showCount = data.showCount !== false;
	const showForm = data.showForm !== false;
	const comments = Array.isArray(data.comments)
		? data.comments.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
		: [];
	const isBound = Boolean(data.postId) || Array.isArray(data.comments);

	const mergedClassName = ["wp-block-post-comments", className]
		.filter(Boolean)
		.join(" ");

	const authors = isBound
		? comments
		: [{ author: "Jane Doe", content: "Comment placeholder text." }, { author: "John Smith", content: "Comment placeholder text." }];

	return (
		<div className={mergedClassName || undefined} style={style} {...attributes}>
			<h3 className="wp-block-post-comments__title">
				Comments{showCount ? ` (${countBoundComments(authors)})` : ""}
			</h3>
			<div className="wp-block-post-comments__list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
				{authors.length === 0 ? (
					<p style={{ margin: 0, color: "var(--npb-text-muted)", fontSize: "0.875rem" }}>
						No comments yet.
					</p>
				) : (
					authors.map((item, i) => (
						<BoundCommentItem
							key={typeof item.id === "string" ? item.id : i}
							item={item}
							depth={0}
						/>
					))
				)}
			</div>
			{showForm && (
				<p className="wp-block-post-comments__form-note" style={{ marginTop: "16px", fontSize: "0.875rem", color: "var(--npb-text-muted)" }}>
					Leave a reply
				</p>
			)}
		</div>
	);
}
