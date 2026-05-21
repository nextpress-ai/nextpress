/**
 * Safe execution utility for handling errors gracefully
 * Follows the safeTry pattern specified in AGENTS.md
 */

export interface SafeTryResult<T> {
	err: Error | null;
	result: T | null;
}

/**
 * Execute a function safely and return structured result
 * @param fn - Function to execute
 * @returns Object with err and result properties
 */
export function safeTry<T>(
	fn: () => T | Promise<T>,
): Promise<SafeTryResult<T>> | SafeTryResult<T> {
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result
				.then((value) => ({ err: null, result: value }))
				.catch((error) => ({ err: error, result: null }));
		}
		return { err: null, result };
	} catch (error) {
		return { err: error as Error, result: null };
	}
}

/**
 * Execute an async function safely and return structured result
 * @param fn - Async function to execute
 * @returns Promise with err and result properties
 */
export async function safeTryAsync<T>(
	fn: () => Promise<T>,
): Promise<SafeTryResult<T>> {
	try {
		const result = await fn();
		return { err: null, result };
	} catch (error) {
		return { err: error as Error, result: null };
	}
}

/**
 * Handle safeTry result in Express route handler
 * @param safeResult - Result from safeTry
 * @param res - Express response object
 * @param successMessage - Optional success message
 * @param errorMessage - Optional error message
 * @returns True if handled, false if caller should continue
 */
/** Normalizes a page slug to the canonical URL-safe form used on insert. */
export function normalizePageSlug(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Walks error.cause chains so Drizzle/Postgres details are not lost. */
export function collectErrorText(error: unknown): string {
	const parts: string[] = [];
	const seen = new Set<unknown>();
	let current: unknown = error;

	while (current && typeof current === "object" && !seen.has(current)) {
		seen.add(current);
		const err = current as {
			message?: string;
			code?: string | number;
			cause?: unknown;
		};
		if (typeof err.message === "string" && err.message.trim() !== "") {
			parts.push(err.message);
		}
		if (err.code !== undefined && err.code !== null && err.code !== "") {
			parts.push(String(err.code));
		}
		current = err.cause;
	}

	if (typeof error === "string" && error.trim() !== "") {
		parts.push(error);
	}

	return parts.join(" ");
}

/** Detects duplicate page slug failures from app checks or database constraints. */
export function isPageSlugConflictError(error: unknown): boolean {
	const text = collectErrorText(error);
	return (
		/already exists/i.test(text) ||
		/pages_slug_unique/i.test(text) ||
		/duplicate key/i.test(text) ||
		/\b23505\b/.test(text) ||
		(/unique/i.test(text) && /slug/i.test(text))
	);
}

export function handleSafeTryResult<T>(
	safeResult: SafeTryResult<T>,
	res: any,
	successMessage?: string,
	errorMessage?: string,
): boolean {
	if (safeResult.err) {
		console.error("SafeTry error:", safeResult.err);
		res.status(500).json({
			message: errorMessage || "Operation failed",
			error: safeResult.err.message,
		});
		return true;
	}

	if (successMessage) {
		res.json({ message: successMessage, data: safeResult.result });
	} else {
		res.json(safeResult.result);
	}
	return false;
}
