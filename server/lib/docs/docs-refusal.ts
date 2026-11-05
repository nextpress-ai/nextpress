/** A docs request the server says no to, with the words the person sees. */
export type DocsRefusal = Error & { docsRefusal: true; statusCode: number; publicMessage: string };

export const refuseDocs = ({
	statusCode,
	message,
	cause,
}: {
	statusCode: number;
	message: string;
	/** What the log says when it differs from what the person sees. */
	cause?: string;
}): DocsRefusal => Object.assign(new Error(cause ?? message), { docsRefusal: true as const, statusCode, publicMessage: message });

export const isDocsRefusal = (error: Error): error is DocsRefusal => (error as Partial<DocsRefusal>).docsRefusal === true;
