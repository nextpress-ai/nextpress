/** Optimistic concurrency error when remote version does not match expected. */
export const VERSION_STALE = "VERSION_STALE" as const;

/** Client omitted or sent invalid expectedVersion on PUT. */
export const VERSION_REQUIRED = "VERSION_REQUIRED" as const;

/** Page create slug collision (existing). */
export const PAGE_SLUG_EXISTS = "PAGE_SLUG_EXISTS" as const;

export type VersionStaleBody = {
	code: typeof VERSION_STALE;
	message: string;
	remoteVersion: number;
	expectedVersion: number;
};

export type VersionRequiredBody = {
	code: typeof VERSION_REQUIRED;
	message: string;
};

/** Parses required expectedVersion from a PUT body. */
export const parseExpectedVersion = (
	body: unknown,
): { ok: true; expectedVersion: number } | { ok: false } => {
	if (!body || typeof body !== "object") return { ok: false };
	const raw = (body as { expectedVersion?: unknown }).expectedVersion;
	if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
		return { ok: false };
	}
	return { ok: true, expectedVersion: raw };
};

/** Returns conflict when remote !== expected (standard OCC). */
export const checkExpectedVersion = ({
	remoteVersion,
	expectedVersion,
}: {
	remoteVersion: number;
	expectedVersion: number;
}): { ok: true } | { ok: false; remoteVersion: number; expectedVersion: number } => {
	if (remoteVersion !== expectedVersion) {
		return { ok: false, remoteVersion, expectedVersion };
	}
	return { ok: true };
};

/** Strips concurrency and client-controlled version fields before DB write. */
export const stripVersionControlFields = <T extends Record<string, unknown>>(
	body: T,
): Omit<T, "expectedVersion" | "version"> => {
	const { expectedVersion: _e, version: _v, ...rest } = body;
	return rest as Omit<T, "expectedVersion" | "version">;
};
