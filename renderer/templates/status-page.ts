import { PageTemplate } from "./page";

/**
 * Visitor HTML for missing or failed SSR routes.
 * Same page shell as published blocks so 404/500 are not a second theme engine.
 */
export function renderStatusHtml({
	status,
	title,
	message,
	canonicalUrl,
}: {
	status: number;
	title: string;
	message: string;
	canonicalUrl: string;
}): string {
	const body = `
		<div style="text-align:center;padding:4rem 1rem">
			<p style="margin:0 0 0.5rem;font-size:0.875rem;letter-spacing:0.08em;color:#6b7280">${status}</p>
			<h1 style="margin:0 0 0.75rem">${title}</h1>
			<p style="margin:0 0 1.5rem;color:#6b7280">${message}</p>
			<a href="/">Back to home</a>
		</div>
	`;

	return PageTemplate(
		title,
		message,
		canonicalUrl,
		"",
		body,
		"",
		"",
		{ noIndex: true },
	);
}
