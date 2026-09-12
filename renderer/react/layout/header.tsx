import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps } from "../render-helpers";
import { readHeaderContent } from "@shared/header-model";
import { HeaderBar } from "@shared/header-view";

export function HeaderBlock(block: BlockConfig) {
	const { className, attributes } = getRenderProps(block);
	const content = readHeaderContent(block.content);
	return (
		<div className={className || undefined} {...attributes}>
			<HeaderBar content={content} />
		</div>
	);
}
