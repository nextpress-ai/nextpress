import type { BlockConfig } from "@shared/schema-types";
import {
	bindPostBlocks,
	documentHasBlockName,
	type BindablePostDocument,
} from "@shared/bind-post-blocks";
import {
	collectBlockCustomCss,
	collectBlockJsScripts,
} from "@shared/collect-block-scripts";
import {
	generateBlockAnimationCSS,
	getEntryAnimationBaseCSS,
	ENTRY_ANIMATION_WAIT_SCRIPT,
	usesAnimateCss,
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
import { prepareVisitorPageBlocks, readPageDesign } from "@shared/page-shell-model";
import { buildScrollbarCss } from "@shared/scrollbar-model";
import { collectBlockExtraCss, treeHasScrollingHeader } from "@shared/collect-block-extra-css";
import { POPUP_BLOCK_NAME } from "@shared/popup-model";
import { FORM_BLOCK_NAME } from "@shared/form-model";
import { parsePageOther } from "@shared/page-other";
import {
	buildPublishedDocumentMeta,
	publishedCanonicalUrl,
	publishedPreviewImageUrl,
	renderPublishedSocialMeta,
} from "@shared/published-document-meta";

/** Every block in the tree, parents before children. */
const listAllBlocks = (list: BlockConfig[]): BlockConfig[] =>
	list.flatMap((block) => [block, ...listAllBlocks(block.children ?? [])]);

type PublishedDocument = {
	id: string;
	title: string;
	blocks?: unknown;
	other?: unknown;
	excerpt?: string | null;
	featuredImage?: string | null;
	blogId?: string | null;
};

type PublishedSite = {
	name?: string;
	description?: string;
	url?: string;
	discourageIndexing?: boolean;
	descriptionFrom?: string;
	logoUrl?: string;
};

type BuildPublishedPageHtmlParams = {
	page: PublishedDocument;
	canonicalUrl: string;
	post?: BindablePostDocument;
	themeSettings?: ThemeSettings;
	themeRawSettings?: unknown;
	site?: PublishedSite;
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
	site,
}: BuildPublishedPageHtmlParams): string {
	const rawBlocks = (Array.isArray(page.blocks) ? page.blocks : []) as BlockConfig[];
	const boundBlocks = post ? bindPostBlocks({ blocks: rawBlocks, post }) : rawBlocks;
	const pageOtherEarly =
		page.other && typeof page.other === "object"
			? (page.other as Record<string, unknown>)
			: {};
	const leftoverDesign = pageOtherEarly.design as PageDesignSettings | undefined;
	const blocks = prepareVisitorPageBlocks({
		blocks: boundBlocks,
		leftoverDesign,
	});
	const blockContentHtml = renderBlocksToHtml(blocks);
	// Pages always sit inside one page shell, so per-block CSS must be read from the whole tree —
	// reading only the top level silently dropped every nested block's animation, hover colours
	// and custom CSS on published pages.
	const allBlocks = listAllBlocks(blocks);

	const allCustomCss = collectBlockCustomCss(allBlocks);
	const animationCssRules = allBlocks
		.filter((b) => b.other?.animation)
		.map((b) => generateBlockAnimationCSS(b.id, b.other!.animation!))
		.filter(Boolean)
		.join("\n");
	const modifierCssRules = allBlocks
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
	const extraCss = collectBlockExtraCss(blocks);

	const needsAnimateCss = allBlocks.some((b) => usesAnimateCss(b.other?.animation));
	const hasEntryAnimations = allBlocks.some((b) => b.other?.animation?.entry);

	const design = resolveVisitorDesign({
		design: readPageDesign({ blocks }),
		themeSettings,
	});

	const headParts: string[] = [];
	if (themeSettings) {
		const themeCss = themeSettingsToStyleBlock(themeSettings, themeRawSettings);
		if (themeCss) headParts.push(`<style>${themeCss}</style>`);
	}
	if (allCustomCss) headParts.push(`<style>${allCustomCss}</style>`);
	if (animationCssRules) headParts.push(`<style>${animationCssRules}</style>`);
	if (modifierCssRules) headParts.push(`<style>${modifierCssRules}</style>`);
	if (deviceStylesCss) headParts.push(`<style>${deviceStylesCss}</style>`);
	if (extraCss) headParts.push(`<style>${extraCss}</style>`);
	if (needsAnimateCss) headParts.push(`<link rel="stylesheet" href="/vendor/animate.min.css">`);
	if (hasEntryAnimations) {
		headParts.push(`<style>${getEntryAnimationBaseCSS({ onlyWhileWaiting: true })}</style>`);
		headParts.push(`<script>${ENTRY_ANIMATION_WAIT_SCRIPT}</script>`);
	}
	const headScripts = headParts.filter(Boolean).join("\n");

	const bodyParts: string[] = [];
	if (hasEntryAnimations) {
		bodyParts.push(`<script src="/vendor/entry-animations.js"></script>`);
		bodyParts.push(`<script>window.initEntryAnimations && window.initEntryAnimations();</script>`);
	}
	if (treeHasScrollingHeader(blocks)) {
		bodyParts.push(`<script src="/vendor/header-scroll.js"></script>`);
	}
	const blockJsScripts = collectBlockJsScripts(blocks);
	if (blockJsScripts) {
		bodyParts.push(blockJsScripts);
	}
	if (allBlocks.some((b) => b.name === "core/select")) {
		bodyParts.push(`<script src="/vendor/select.js"></script>`);
	}
	if (allBlocks.some((b) => b.name === FORM_BLOCK_NAME)) {
		bodyParts.push(`<script src="/vendor/form.js"></script>`);
	}
	if (allBlocks.some((b) => b.name === POPUP_BLOCK_NAME)) {
		bodyParts.push(`<script src="/vendor/popup.js"></script>`);
	}
	if (documentHasBlockName({ blocks, name: "post/list" })) {
		bodyParts.push(`<script src="/vendor/post-list-overlay.js"></script>`);
	}
	const bodyScripts = bodyParts.join("\n");

	const hydrateScript = blocksHaveReactiveFlag(blocks) ? getHydrationScript() : "";
	const seo = parsePageOther(page.other).seo ?? {};
	const canonical = publishedCanonicalUrl({
		requestUrl: canonicalUrl,
		siteUrl: site?.url,
		pageCanonical: seo.canonicalUrl,
	});
	const meta = buildPublishedDocumentMeta({
		pageTitle: page.title,
		metaTitle: seo.metaTitle,
		metaDescription: seo.metaDescription,
		excerpt: page.excerpt ?? undefined,
		siteName: site?.name,
		siteDescription: site?.description,
		pageDescriptionFrom: seo.descriptionFrom,
		siteDescriptionFrom: site?.descriptionFrom,
		canonicalUrl: canonical,
		imageUrl: publishedPreviewImageUrl({
			featuredImage: page.featuredImage,
			blocks,
			logoUrl: site?.logoUrl,
		}),
		kind: page.blogId ? "article" : "website",
	});

	const renderOptions: PageRenderOptions = {
		fontFamily: design.fontFamily,
		containerWidth: design.containerWidth,
		padding: design.padding,
		backgroundColor: design.backgroundColor?.style,
		textColor: design.textColor?.style,
		hasPageShell: true,
		scrollbarCss: buildScrollbarCss({ selector: "html", settings: design.scrollbar }),
		noIndex: seo.noIndex === true || site?.discourageIndexing === true,
		customMeta: seo.customMeta,
		socialMeta: renderPublishedSocialMeta(meta),
	};

	return PageTemplate(
		meta.title,
		meta.description,
		meta.canonicalUrl,
		headScripts,
		blockContentHtml,
		bodyScripts,
		hydrateScript,
		renderOptions,
	);
}
