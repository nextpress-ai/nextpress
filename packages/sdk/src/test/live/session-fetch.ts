/**
 * Minimal cookie jar for Node fetch so Better Auth session cookies persist
 * across SDK requests during live integration tests.
 */
export function createSessionFetch({
	baseFetch = globalThis.fetch.bind(globalThis),
	origin = "http://localhost:5000",
}: {
	baseFetch?: typeof fetch;
	origin?: string;
} = {}): typeof fetch {
	const jar = new Map<string, string>();

	const storeCookie = (setCookieHeader: string) => {
		const [pair] = setCookieHeader.split(";");
		const separatorIndex = pair.indexOf("=");
		if (separatorIndex === -1) {
			return;
		}
		const name = pair.slice(0, separatorIndex).trim();
		const value = pair.slice(separatorIndex + 1).trim();
		if (name) {
			jar.set(name, value);
		}
	};

	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const headers = new Headers(init?.headers);
		if (!headers.has("Origin")) {
			headers.set("Origin", origin);
		}
		if (jar.size > 0) {
			headers.set(
				"Cookie",
				Array.from(jar.entries())
					.map(([name, value]) => `${name}=${value}`)
					.join("; "),
			);
		}

		const response = await baseFetch(input, {
			...init,
			headers,
			credentials: "include",
		});

		const setCookies =
			typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];

		if (setCookies.length === 0) {
			const single = response.headers.get("set-cookie");
			if (single) {
				storeCookie(single);
			}
		} else {
			for (const cookie of setCookies) {
				storeCookie(cookie);
			}
		}

		return response;
	};
}

/** Clears stored cookies (use between isolated live test runs). */
export function clearSessionCookies(fetchImpl: typeof fetch & { __jar?: Map<string, string> }) {
	fetchImpl.__jar?.clear();
}
