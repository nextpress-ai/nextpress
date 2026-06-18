import dns from "node:dns/promises";
import { normalizeSiteUrl } from "@shared/import/wordpress/normalize-site-url";

const PRIVATE_IPV4_RANGES = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[0-1])\./,
	/^192\.168\./,
	/^169\.254\./,
	/^0\./,
];

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

const isPrivateIpv4 = (address: string): boolean =>
	PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(address));

/**
 * Validates an external URL is safe to fetch server-side (SSRF guard).
 * Only http/https; blocks private/reserved IPs after DNS resolution.
 */
export const validateExternalUrl = async (
	input: string,
): Promise<{ ok: true; url: URL } | { ok: false; message: string }> => {
	const baseUrl = normalizeSiteUrl(input);
	if (!baseUrl) {
		return { ok: false, message: "Invalid URL" };
	}

	let parsed: URL;
	try {
		parsed = new URL(baseUrl);
	} catch {
		return { ok: false, message: "Invalid URL" };
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return { ok: false, message: "Only HTTP and HTTPS URLs are allowed" };
	}

	const hostname = parsed.hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.has(hostname)) {
		return { ok: false, message: "Hostname is not allowed" };
	}

	if (isPrivateIpv4(hostname)) {
		return { ok: false, message: "Private network addresses are not allowed" };
	}

	try {
		const addresses = await dns.resolve4(hostname);
		if (addresses.some(isPrivateIpv4)) {
			return { ok: false, message: "URL resolves to a private network address" };
		}
	} catch {
		// IPv6-only or DNS failure — allow fetch to fail naturally at request time
	}

	return { ok: true, url: parsed };
};
