import type { BlockConfig } from "@shared/schema-types";
import { saasLandingFixture } from "./saas-landing.js";
import { cafeLocalFixture } from "./cafe-local.js";
import { portfolioStudioFixture } from "./portfolio-studio.js";
import { blogArticleFixture } from "./blog-article.js";
import { newsletterLandingFixture } from "./newsletter-landing.js";
import { searchEngineFixture } from "./search-engine.js";
import { ngoConservationFixture } from "./ngo-conservation.js";
import { personalBlogFixture } from "./personal-blog.js";

export type DemoPageKey =
	| "saas"
	| "cafe"
	| "portfolio"
	| "blog"
	| "newsletter"
	| "search"
	| "ngo"
	| "personalBlog";

export type DemoPageDefinition = {
	key: DemoPageKey;
	title: string;
	slug: string;
	description: string;
	inspiredBy: string;
	blocks: BlockConfig[];
};

/** Practical workflow demo pages — realistic layouts editors can fork and publish. */
export const demoPageDefinitions: DemoPageDefinition[] = [
	{
		key: "saas",
		title: "Nimbus — Product landing",
		slug: "demo-nimbus-saas",
		description: "SaaS marketing page with hero, feature columns, media-text, and pricing.",
		inspiredBy: "Linear / Notion landing patterns",
		blocks: saasLandingFixture,
	},
	{
		key: "cafe",
		title: "Oak & Ember Coffee",
		slug: "demo-oak-ember-cafe",
		description: "Local business page with hours, menu gallery, and contact form.",
		inspiredBy: "Squarespace café templates",
		blocks: cafeLocalFixture,
	},
	{
		key: "portfolio",
		title: "Studio Meridian",
		slug: "demo-studio-meridian",
		description: "Creative portfolio with gallery, quote, and about media-text.",
		inspiredBy: "Agency / Behance portfolio layouts",
		blocks: portfolioStudioFixture,
	},
	{
		key: "blog",
		title: "Why async work beats endless standups",
		slug: "demo-async-blog-post",
		description: "Long-form article with hero image, pullquote, list, and CTAs.",
		inspiredBy: "Medium / Substack article flow",
		blocks: blogArticleFixture,
	},
	{
		key: "newsletter",
		title: "The Daily Brief",
		slug: "demo-daily-brief-newsletter",
		description: "Newsletter signup landing with benefit columns and email field.",
		inspiredBy: "Substack subscribe page",
		blocks: newsletterLandingFixture,
	},
	{
		key: "search",
		title: "Northstar — Search",
		slug: "demo-northstar-search",
		description: "Whitespace-first search home with pill field and footer links.",
		inspiredBy: "Search engine home pages (fictional brand)",
		blocks: searchEngineFixture,
	},
	{
		key: "ngo",
		title: "Rivermouth Trust",
		slug: "demo-rivermouth-ngo",
		description: "Conservation nonprofit with photo hero, impact stats, programmes, donate CTA.",
		inspiredBy: "WWF / river trust campaign sites",
		blocks: ngoConservationFixture,
	},
	{
		key: "personalBlog",
		title: "Field Notes — The quiet hours before a launch",
		slug: "demo-field-notes-blog",
		description: "Editorial personal blog with masthead, hero photo, pullquote, and archive.",
		inspiredBy: "Personal essay blogs / Ghost editorial themes",
		blocks: personalBlogFixture,
	},
];

export const demoPagesByKey: Record<DemoPageKey, BlockConfig[]> = {
	saas: saasLandingFixture,
	cafe: cafeLocalFixture,
	portfolio: portfolioStudioFixture,
	blog: blogArticleFixture,
	newsletter: newsletterLandingFixture,
	search: searchEngineFixture,
	ngo: ngoConservationFixture,
	personalBlog: personalBlogFixture,
};
