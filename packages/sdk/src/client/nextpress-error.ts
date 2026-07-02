/** Thrown when the NextPress API returns a non-2xx response or the request fails. */
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

/** Returns true when an error is a {@link NextpressError}. */
export function isNextpressError(error: unknown): error is NextpressError {
	return error instanceof NextpressError;
}
