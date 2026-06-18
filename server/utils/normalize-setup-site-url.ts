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
		if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
			try {
				const parsed = new URL(trimmed);
				return `http://${parsed.host}`.replace(/\/+$/, '');
			} catch {
				return `http://${hostname}`.replace(/\/+$/, '');
			}
		}
		return `http://${hostname}`.replace(/\/+$/, '');
	}

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed.replace(/\/+$/, '');
	}

	return `https://${hostname}`.replace(/\/+$/, '');
};
