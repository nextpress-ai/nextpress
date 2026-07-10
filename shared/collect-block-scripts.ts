import type { BlockConfig } from "./schema-types.js";
import { sanitizeCustomCss } from "./sanitize-custom-css.js";
import { sanitizeHtml } from "./sanitize-html.js";
import { sanitizeJs } from "./sanitize-js.js";

/** Inline sanitized JS from a block override for body injection. */
export const renderBlockJsScript = (js: string): string => {
	const safe = sanitizeJs(js);
	if (!safe) return "";
	return `<script>${safe}</script>`;
};

/** Collect sanitized custom CSS from all blocks for head injection. */
export const collectBlockCustomCss = (blocks: BlockConfig[]): string =>
	blocks
		.map((block) =>
			[sanitizeCustomCss(block.customCss ?? ""), sanitizeCustomCss(String(block.other?.css ?? ""))]
				.filter(Boolean)
				.join("\n"),
		)
		.filter(Boolean)
		.join("\n");

/** Collect sanitized per-block JS overrides for body injection. */
export const collectBlockJsScripts = (blocks: BlockConfig[]): string => {
	const scripts: string[] = [];
	const walk = (list: BlockConfig[]) => {
		for (const block of list) {
			if (block.other?.js) {
				scripts.push(renderBlockJsScript(String(block.other.js)));
			}
			if (block.children?.length) {
				walk(block.children);
			}
		}
	};
	walk(blocks);
	return scripts.filter(Boolean).join("\n");
};
