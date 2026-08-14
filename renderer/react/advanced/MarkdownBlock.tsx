import React, { Suspense } from "react";
import type { Options as ReactMarkdownOptions } from "react-markdown";
import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseMarkdownContent } from "../render-helpers";

// Lazy-load react-markdown — only fetched when a markdown block renders
const ReactMarkdown = React.lazy(() => import("react-markdown"));

function useMountEffect(effect: () => void | (() => void)) {
	/* eslint-disable react-hooks/exhaustive-deps, no-restricted-syntax */
	React.useEffect(effect, []);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MarkdownBlock(block: BlockConfig) {
	const { style, className } = getRenderProps(block);
	const { content } = parseMarkdownContent(block.content);
	const blockClass = ["wp-block-markdown", className].filter(Boolean).join(" ");

	const [remarkPlugins, setRemarkPlugins] = React.useState<
		ReactMarkdownOptions["remarkPlugins"]
	>([]);

	useMountEffect(() => {
		import("remark-gfm").then((m) => {
			setRemarkPlugins([m.default]);
		});
	});

	return (
		<div className={blockClass} style={{ color: "var(--npb-text-primary)", ...style }}>
			<Suspense fallback={<div style={{ minHeight: "20px" }} />}>
				<ReactMarkdown
					remarkPlugins={remarkPlugins}
					components={{
						// Provide some basic styling mapping for the rendered markdown
						// to ensure it matches the typical WP block editor style
						p: ({ node, ...props }) => <p className="mb-4" {...props} />,
						h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mb-4" {...props} />,
						h2: ({ node, ...props }) => <h2 className="text-3xl font-bold mb-4" {...props} />,
						h3: ({ node, ...props }) => <h3 className="text-2xl font-bold mb-3" {...props} />,
						h4: ({ node, ...props }) => <h4 className="text-xl font-bold mb-3" {...props} />,
						h5: ({ node, ...props }) => <h5 className="text-lg font-bold mb-2" {...props} />,
						h6: ({ node, ...props }) => <h6 className="text-base font-bold mb-2" {...props} />,
						ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4" {...props} />,
						ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4" {...props} />,
						li: ({ node, ...props }) => <li className="mb-1" {...props} />,
						blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 mb-4 italic" {...props} />,
						a: ({ node, ...props }) => <a className="text-wp-blue hover:underline" {...props} />,
						code: ({ node, inline, ...props }: any) =>
							inline
								? <code className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" {...props} />
								: <code className="block bg-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono mb-4" {...props} />,
						table: ({ node, ...props }) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse border border-gray-200" {...props} /></div>,
						th: ({ node, ...props }) => <th className="border border-gray-200 px-4 py-2 bg-gray-50 font-semibold text-left" {...props} />,
						td: ({ node, ...props }) => <td className="border border-gray-200 px-4 py-2" {...props} />,
					}}
				>
					{content || ""}
				</ReactMarkdown>
			</Suspense>
		</div>
	);
}
