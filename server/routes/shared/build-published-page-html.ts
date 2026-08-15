import type { BlockConfig } from "@shared/schema-types";
import {
	bindPostBlocks,
	type BindablePostDocument,
} from "@shared/bind-post-blocks";
import {
	collectBlockCustomCss,
	collectBlockJsScripts,
} from "@shared/collect-block-scripts";
import {
	generateBlockAnimationCSS,
	getEntryAnimationBaseCSS,
} from "@shared/animation-utils";
import { collectBlockModifierCSS } from "@shared/token-resolution";
import { collectDeviceStylesCSS } from "@shared/collect-device-styles-css";
import { resolveButtonBlockModifierSelector } from "@shared/button-block-styles";
import { resolveFormFieldModifierSelector } from "@shared/form-field-block-styles";
import {
	PageTemplate,
	type PageRenderOptions,
} from "../../../renderer/templates/page";
import {
	renderBlocksToHtml,
	getHydrationScript,
	blocksHaveReactiveFlag,
} from "../../../renderer/to-html";

type PublishedDocument = {
	id: string;
	title: string;
	blocks?: unknown;
	other?: unknown;
};

type BuildPublishedPageHtmlParams = {
	page: PublishedDocument;
	canonicalUrl: string;
	post?: BindablePostDocument;
};

/**
 * SSR HTML for published pages and posts — same renderer as the public SPA stack.
 */
export function buildPublishedPageHtml({
	page,
	canonicalUrl,
	post,
}: BuildPublishedPageHtmlParams): string {
	const rawBlocks = (Array.isArray(page.blocks) ? page.blocks : []) as BlockConfig[];
	const blocks = post ? bindPostBlocks({ blocks: rawBlocks, post }) : rawBlocks;
	const blockContentHtml = renderBlocksToHtml(blocks);

	const allCustomCss = collectBlockCustomCss(blocks);
	const animationCssRules = blocks
		.filter((b) => b.other?.animation)
		.map((b) => generateBlockAnimationCSS(b.id, b.other!.animation!))
		.filter(Boolean)
		.join("\n");
	const modifierCssRules = blocks
		.map((b) =>
			collectBlockModifierCSS(b, {
				modifierSelector:
					resolveButtonBlockModifierSelector(b) ??
					resolveFormFieldModifierSelector(b),
			}),
		)
		.filter(Boolean)
		.join("\n");
	const deviceStylesCss = collectDeviceStylesCSS(blocks);

	const hasAnimations = blocks.some((b) => b.other?.animation);
	const hasEntryAnimations = blocks.some((b) => b.other?.animation?.entry);

	const pageOther =
		page.other && typeof page.other === "object"
			? (page.other as Record<string, unknown>)
			: {};
	const design = (pageOther.design as Record<string, unknown> | undefined) ?? {};

	const headParts: string[] = [];
	if (allCustomCss) headParts.push(`<style>${allCustomCss}</style>`);
	if (animationCssRules) headParts.push(`<style>${animationCssRules}</style>`);
	if (modifierCssRules) headParts.push(`<style>${modifierCssRules}</style>`);
	if (deviceStylesCss) headParts.push(`<style>${deviceStylesCss}</style>`);
	if (hasAnimations) headParts.push(`<link rel="stylesheet" href="/vendor/animate.min.css">`);
	if (hasEntryAnimations) {
		headParts.push(`<style>${getEntryAnimationBaseCSS()}</style>`);
	}
	const headScripts = headParts.filter(Boolean).join("\n");

	const bodyParts: string[] = [];
	if (hasEntryAnimations) {
		bodyParts.push(`<script src="/vendor/entry-animations.js"></script>`);
		bodyParts.push(`<script>initEntryAnimations();</script>`);
	}
	const blockJsScripts = collectBlockJsScripts(blocks);
	if (blockJsScripts) {
		bodyParts.push(blockJsScripts);
	}
	const bodyScripts = bodyParts.join("\n");

	const hydrateScript = blocksHaveReactiveFlag(blocks) ? getHydrationScript() : "";
	const seo = (pageOther.seo as Record<string, unknown> | undefined) ?? {};
	const pageDescription = typeof seo.metaDescription === "string" ? seo.metaDescription : "";

	const renderOptions: PageRenderOptions = {
		fontFamily: typeof design.fontFamily === "string" ? design.fontFamily : undefined,
		containerWidth: typeof design.containerWidth === "string" ? design.containerWidth : undefined,
		padding: typeof design.padding === "string" ? design.padding : undefined,
		backgroundColor:
			design.backgroundColor &&
			typeof design.backgroundColor === "object" &&
			"style" in design.backgroundColor &&
			typeof (design.backgroundColor as { style?: unknown }).style === "string"
				? (design.backgroundColor as { style: string }).style
				: undefined,
		textColor:
			design.textColor &&
			typeof design.textColor === "object" &&
			"style" in design.textColor &&
			typeof (design.textColor as { style?: unknown }).style === "string"
				? (design.textColor as { style: string }).style
				: undefined,
		noIndex: seo.noIndex === true,
		customMeta: Array.isArray(seo.customMeta)
			? (seo.customMeta as Array<{ name: string; content: string }>)
			: undefined,
	};

	return PageTemplate(
		(typeof seo.metaTitle === "string" && seo.metaTitle) || page.title || "Untitled Page",
		pageDescription,
		canonicalUrl,
		headScripts,
		blockContentHtml,
		bodyScripts,
		hydrateScript,
		renderOptions,
	);
}
