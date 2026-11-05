import React from "react";
import { Newspaper } from "lucide-react";
import { ContainerChildren } from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import { catalogMeta } from "../catalog-meta";

type PostBodyContent = Record<string, never>;

/**
 * Canvas view of a written post's writing: the same element as the published page, its blocks in
 * plain document flow. In the writing editor it is the one place blocks go; the blog's look around
 * it is drawn, not edited.
 */
const PostBodyBlock = createBlockDefinition<PostBodyContent>({
	...catalogMeta("post/body"),
	icon: Newspaper,
	handlesOwnChildren: true,
	defaultContent: {},
	hasSettings: false,
	render: ({ value, styles, isPreview, onNestedBlockChange }) => (
		// A link in the writing is part of the text here: clicking it must not leave the editor.
		<div
			className="wp-block-post-body np-prose"
			style={styles}
			onClickCapture={(event) => {
				if ((event.target as Element).closest("a[href]")) event.preventDefault();
			}}
		>
			<ContainerChildren block={value} isPreview={isPreview ?? false} onBlockChange={onNestedBlockChange} stackLayout="document" />
		</div>
	),
});

export default PostBodyBlock;
