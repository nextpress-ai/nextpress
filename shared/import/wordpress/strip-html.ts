/**
 * Strips HTML tags from WP rendered fields (title, excerpt).
 */
export const stripHtml = (html: string): string =>
	html
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
