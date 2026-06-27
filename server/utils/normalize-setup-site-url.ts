import {
	normalizeSiteHostname,
	shouldSkipPublicDnsCheck,
} from './validate-domain';

/**
 * Builds the canonical site URL for setup — local hosts always use http (never https).
 */
export const normalizeSetupSiteUrl = (domain: string): string => {
	const trimmed = domain.trim();
	if (!trimmed) {
		throw new Error('Domain is required');
	}

	const hostname = normalizeSiteHostname(trimmed);
	if (!hostname) {
		throw new Error('Domain is required');
	}

	if (shouldSkipPublicDnsCheck(hostname)) {
		const localHost = (() => {
			if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
				try {
					return new URL(trimmed).host;
				} catch {
					return hostname;
				}
			}
			const hostSegment = trimmed.replace(/\/+$/, '').split('/')[0];
			return hostSegment || hostname;
		})();

		return `http://${localHost}`.replace(/\/+$/, '');
	}

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed.replace(/\/+$/, '');
	}

	return `https://${hostname}`.replace(/\/+$/, '');
};
