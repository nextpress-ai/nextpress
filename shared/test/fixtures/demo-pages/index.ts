import type { BlockConfig } from "@shared/schema-types";
import { saasLandingFixture } from "./saas-landing.js";
import { cafeLocalFixture } from "./cafe-local.js";
import { portfolioStudioFixture } from "./portfolio-studio.js";
import { blogArticleFixture } from "./blog-article.js";
import { newsletterLandingFixture } from "./newsletter-landing.js";

export type DemoPageKey = "saas" | "cafe" | "portfolio" | "blog" | "newsletter";

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
];

export const demoPagesByKey: Record<DemoPageKey, BlockConfig[]> = {
	saas: saasLandingFixture,
	cafe: cafeLocalFixture,
	portfolio: portfolioStudioFixture,
	blog: blogArticleFixture,
	newsletter: newsletterLandingFixture,
};
