import type { WpApiErrorCode } from "./types";

const FETCH_TIMEOUT_MS = 10_000;

export type WpFetchError = {
	code: WpApiErrorCode;
	message: string;
	hint: string;
};

export type WpFetchResult<T> =
	| { ok: true; data: T; headers: Headers }
	| { ok: false; error: WpFetchError };

const errorHints: Record<WpApiErrorCode, string> = {
	connection_failed:
		"Check the domain is correct, the site is online, and reachable over HTTPS.",
	not_wordpress:
		"Confirm this is a WordPress site with permalinks enabled and REST API available at /wp-json.",
	rest_blocked:
		"A firewall or security plugin may be blocking REST access. Whitelist /wp-json/ or disable the blocker temporarily.",
	no_posts:
		"The site is reachable but has no public posts. Publish posts on WordPress or check visibility settings.",
	invalid_url: "Enter a valid domain or URL (e.g. example.com or https://example.com).",
	timeout: "The WordPress site took too long to respond. Try again later.",
};

const buildError = (code: WpApiErrorCode, message: string): WpFetchError => ({
	code,
	message,
	hint: errorHints[code],
});

/**
 * Fetches a WordPress REST endpoint with timeout and classifies common failures.
 */
export const fetchWpJson = async <T>(params: {
	url: string;
	signal?: AbortSignal;
}): Promise<WpFetchResult<T>> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(params.url, {
			signal: params.signal ?? controller.signal,
			headers: { Accept: "application/json" },
			redirect: "follow",
		});

		if (response.status === 401 || response.status === 403) {
			return {
				ok: false,
				error: buildError(
					"rest_blocked",
					`WordPress REST API returned ${response.status}`,
				),
			};
		}

		if (response.status === 404) {
			return {
				ok: false,
				error: buildError("not_wordpress", "WordPress REST API endpoint not found"),
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				error: buildError(
					"connection_failed",
					`WordPress returned HTTP ${response.status}`,
				),
			};
		}

		const data = (await response.json()) as T;
		return { ok: true, data, headers: response.headers };
	} catch (err: unknown) {
		if (err instanceof Error && err.name === "AbortError") {
			return { ok: false, error: buildError("timeout", "Request timed out") };
		}
		return {
			ok: false,
			error: buildError(
				"connection_failed",
				err instanceof Error ? err.message : "Failed to reach WordPress site",
			),
		};
	} finally {
		clearTimeout(timeout);
	}
};

export const getWpTotal = (headers: Headers): number => {
	const raw = headers.get("X-WP-Total");
	const parsed = raw ? Number.parseInt(raw, 10) : 0;
	return Number.isFinite(parsed) ? parsed : 0;
};

export const getWpTotalPages = (headers: Headers): number => {
	const raw = headers.get("X-WP-TotalPages");
	const parsed = raw ? Number.parseInt(raw, 10) : 0;
	return Number.isFinite(parsed) ? parsed : 0;
};
