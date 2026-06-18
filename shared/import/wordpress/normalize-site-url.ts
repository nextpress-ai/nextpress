const PROTOCOL_REGEX = /^https?:\/\//i;

/**
 * Turns user input into a canonical WordPress site base URL (no trailing slash).
 */
export const normalizeSiteUrl = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const withProtocol = PROTOCOL_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;
	let parsed: URL;

	try {
		parsed = new URL(withProtocol);
	} catch {
		return null;
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return null;
	}

	if (!parsed.hostname) return null;

	const pathname = parsed.pathname.replace(/\/+$/, "");
	return `${parsed.protocol}//${parsed.host}${pathname}`;
};
