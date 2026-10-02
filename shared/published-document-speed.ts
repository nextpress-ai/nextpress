/**
 * Speed extras for a published HTML document: prefetch the next page, and let the
 * first pictures load ahead of the ones further down.
 */

import { escapeHtml } from "./published-document-meta.js";

/** Pictures before this one stay eager. Later ones wait. Matches a typical first screen. */
const EAGER_IMAGE_COUNT = 3;

const hasAttr = (tag: string, name: string): boolean =>
	new RegExp(`\\b${name}\\s*=`, "i").test(tag);

const readAttr = (tag: string, name: string): string => {
	const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
	return match?.[2] ?? match?.[3] ?? "";
};

const ensureAttr = (tag: string, name: string, value: string): string => {
	if (hasAttr(tag, name)) return tag;
	return tag.replace(/\s*\/?>$/, (end) => ` ${name}="${value}"${end}`);
};

const usableImageSrc = (src: string): boolean => {
	if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("javascript:")) return false;
	return !src.includes('"') && !src.includes("'");
};

/**
 * Chrome and Edge prefetch a same-site link when the pointer rests on it.
 * Admin, files, and API addresses are left alone.
 */
export function publishedSpeculationRulesJson(): string {
	return JSON.stringify({
		prefetch: [
			{
				source: "document",
				eagerness: "moderate",
				where: {
					and: [
						{ href_matches: "/*" },
						{ not: { href_matches: "/admin" } },
						{ not: { href_matches: "/admin/*" } },
						{ not: { href_matches: "/api/*" } },
						{ not: { href_matches: "/uploads/*" } },
						{ not: { href_matches: "/assets/*" } },
						{ not: { href_matches: "/vendor/*" } },
						{ not: { href_matches: "/renderer/*" } },
						{ not: { selector_matches: "[rel~=nofollow]" } },
						{ not: { selector_matches: "[download]" } },
					],
				},
			},
		],
	});
}

/**
 * Hover prefetch for browsers that do not read speculation rules.
 * Runs once per page, even if the tag is inserted twice.
 */
export function publishedHoverPrefetchScript(): string {
	return `(function(){if(window.__npPrefetch)return;window.__npPrefetch=1;if(window.HTMLScriptElement&&HTMLScriptElement.supports&&HTMLScriptElement.supports("speculationrules"))return;var seen=Object.create(null);var skip=/^\\/(admin|api|uploads|assets|vendor|renderer)(\\/|$)/;document.addEventListener("pointerover",function(event){var node=event.target;if(!node||!node.closest)return;var link=node.closest("a[href]");if(!link||link.hasAttribute("download"))return;var rel=(link.getAttribute("rel")||"").toLowerCase();if(rel.indexOf("nofollow")!==-1)return;var url;try{url=new URL(link.href,location.href);}catch(e){return;}if(url.origin!==location.origin)return;if(skip.test(url.pathname))return;if(/\\.(png|jpe?g|gif|webp|svg|css|js|pdf|woff2?)$/i.test(url.pathname))return;if(url.pathname===location.pathname&&url.search===location.search)return;var href=url.pathname+url.search;if(seen[href])return;seen[href]=1;var el=document.createElement("link");el.rel="prefetch";el.as="document";el.href=href;document.head.appendChild(el);},true);})();`;
}

/**
 * First pictures load immediately. Later pictures and frames wait.
 * The first picture is also named so the browser can start it from the head.
 */
export function optimizePublishedDocument(html: string): string {
	let images = 0;
	let frames = 0;
	let preloadSrc = "";
	const tuned = html
		.replace(/<img\b[^>]*>/gi, (tag) => {
			images += 1;
			const src = readAttr(tag, "src");
			if (images === 1 && usableImageSrc(src)) preloadSrc = src;
			let next = ensureAttr(tag, "decoding", "async");
			if (images === 1) return ensureAttr(next, "fetchpriority", "high");
			if (images <= EAGER_IMAGE_COUNT) return next;
			next = ensureAttr(next, "loading", "lazy");
			return ensureAttr(next, "fetchpriority", "low");
		})
		.replace(/<iframe\b[^>]*>/gi, (tag) => {
			frames += 1;
			if (frames === 1) return tag;
			return ensureAttr(tag, "loading", "lazy");
		});

	const preload = preloadSrc
		? `<link rel="preload" as="image" href="${escapeHtml(preloadSrc)}" fetchpriority="high">`
		: "";
	const headExtras = [
		preload,
		`<script type="speculationrules">${publishedSpeculationRulesJson()}</script>`,
	]
		.filter(Boolean)
		.join("\n");
	const withHead = tuned.replace("</head>", `${headExtras}\n</head>`);
	return withHead.replace(
		"</body>",
		`<script>${publishedHoverPrefetchScript()}</script>\n</body>`,
	);
}
