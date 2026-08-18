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
import type { ThemeSettings } from "@shared/theme-settings";
import { themeSettingsToStyleBlock } from "@shared/theme-to-css-vars";
import type { PageDesignSettings } from "@shared/schema-types";
import { resolveVisitorDesign } from "@shared/theme-to-page-design";

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
	themeSettings?: ThemeSettings;
	themeRawSettings?: unknown;
};

/**
 * SSR HTML for published pages and posts — same renderer as the public SPA stack.
 */
export function buildPublishedPageHtml({
	page,
	canonicalUrl,
	post,
	themeSettings,
	themeRawSettings,
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
	const rawDesign = pageOther.design as PageDesignSettings | undefined;
	const design = resolveVisitorDesign({ design: rawDesign, themeSettings });

	const headParts: string[] = [];
	if (themeSettings) {
		const themeCss = themeSettingsToStyleBlock(themeSettings, themeRawSettings);
		if (themeCss) headParts.push(`<style>${themeCss}</style>`);
	}
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
		fontFamily: design.fontFamily,
		containerWidth: design.containerWidth,
		padding: design.padding,
		backgroundColor: design.backgroundColor?.style,
		textColor: design.textColor?.style,
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
