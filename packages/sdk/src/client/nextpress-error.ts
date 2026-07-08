/** Typed error surface so callers can branch on status and API codes instead of parsing strings. */
export class NextpressError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly body?: unknown;

	constructor({
		message,
		status,
		code,
		body,
	}: {
		message: string;
		status: number;
		code?: string;
		body?: unknown;
	}) {
		super(message);
		this.name = "NextpressError";
		this.status = status;
		this.code = code;
		this.body = body;
	}
}

/** Narrow unknown catch values before reading status or code on API failures. */
export function isNextpressError(error: unknown): error is NextpressError {
	return error instanceof NextpressError;
}
