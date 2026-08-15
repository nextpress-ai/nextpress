import * as React from "react";
import { Suspense, useState } from "react";
import { useEffect } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseMarkdownContent } from "../render-helpers";

const ReactMarkdown = React.lazy(() => import("react-markdown"));

function useMountEffect(effect: () => void | (() => void)) {
	/* eslint-disable react-hooks/exhaustive-deps, no-restricted-syntax */
	useEffect(effect, []);
}

/**
 * Publish markdown for the SPA. Heavy parsers load in a separate chunk
 * so first paint is not blocked. SSR uses MarkdownSsrBlock instead.
 */
export function MarkdownBlock(block: BlockConfig) {
	const { style, className } = getRenderProps(block);
	const { content } = parseMarkdownContent(block.content);
	const blockClass = ["wp-block-markdown", className].filter(Boolean).join(" ");
	const [gfm, setGfm] = useState<typeof import("remark-gfm").default | null>(
		null,
	);

	useMountEffect(() => {
		let cancelled = false;
		void import("remark-gfm").then((mod) => {
			if (!cancelled) setGfm(() => mod.default);
		});
		return () => {
			cancelled = true;
		};
	});

	return (
		<div className={blockClass} style={{ color: "var(--npb-text-primary)", ...style }}>
			<Suspense fallback={<div style={{ minHeight: 20 }} />}>
				<ReactMarkdown remarkPlugins={gfm ? [gfm] : []}>
					{content || ""}
				</ReactMarkdown>
			</Suspense>
		</div>
	);
}
