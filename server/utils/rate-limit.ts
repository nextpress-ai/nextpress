/**
 * A small fixed-window rate limiter kept in memory, per route module.
 * WHY: routes that make the server fetch from the internet (WordPress import, brand logos) must not
 * be usable to hammer outside sites or fill the disk. One process = one set of buckets, which is
 * enough for a single-server install.
 */
export function createRateLimiter(): (params: { key: string; limit: number; windowMs: number }) => boolean {
	const buckets = new Map<string, { count: number; resetAt: number }>();

	return ({ key, limit, windowMs }) => {
		const now = Date.now();
		const bucket = buckets.get(key);

		if (!bucket || now > bucket.resetAt) {
			buckets.set(key, { count: 1, resetAt: now + windowMs });
			return true;
		}

		if (bucket.count >= limit) return false;
		bucket.count += 1;
		return true;
	};
}
