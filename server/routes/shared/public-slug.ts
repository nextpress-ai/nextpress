/**
 * Single-segment addresses that are not a published page.
 * `/admin` and friends must fall through to the app. A dotted name is a file.
 */
const RESERVED_PUBLIC_SLUGS = new Set([
	"admin",
	"api",
	"assets",
	"favicon.ico",
	"home",
	"index.html",
	"page",
	"pages",
	"post",
	"posts",
	"preview",
	"renderer",
	"robots.txt",
	"setup",
	"sites",
	"sitemap.xml",
	"src",
	"uploads",
	"vendor",
]);

export function isReservedPublicSlug(slug: string): boolean {
	const name = slug.trim().toLowerCase();
	if (!name || name.includes(".")) return true;
	return RESERVED_PUBLIC_SLUGS.has(name);
}
