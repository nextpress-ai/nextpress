import { collectBlockModifierCSS } from "@shared/token-resolution";
import { collectDeviceStylesCSS } from "@shared/collect-device-styles-css";
import { resolveButtonBlockModifierSelector } from "@shared/button-block-styles";
import { resolveFormFieldModifierSelector } from "@shared/form-field-block-styles";
import { renderBlocksToHtml, getHydrationScript } from "../../../renderer/to-html";
import { PageTemplate } from "../../../renderer/templates/page";
import type { PageRenderOptions } from "../../../renderer/templates/page";
import type { BlockConfig, Page } from "@shared/schema-types";
import { generateBlockAnimationCSS, getEntryAnimationBaseCSS } from "@shared/animation-utils";
import { collectBlockCustomCss, collectBlockJsScripts } from "@shared/collect-block-scripts";
import { BUNDLED_FONTS_STYLESHEET } from "@shared/font-catalog";

type BuildPublishedPageHtmlParams = {
	page: Page;
	canonicalUrl: string;
};

/**
 * SSR HTML for a published page — same pipeline as `/sites/:siteId/:pageSlug`.
 * Blocks → renderBlocksToHtml + publish CSS + deviceStyles @media rules.
 */
export function buildPublishedPageHtml({
	page,
	canonicalUrl,
}: BuildPublishedPageHtmlParams): string {
	const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as BlockConfig[];
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

	const headParts: string[] = [
		`<link rel="stylesheet" href="${BUNDLED_FONTS_STYLESHEET}">`,
	];
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

	const hydrateScript = getHydrationScript();
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
