export type SemverParts = {
	major: number;
	minor: number;
	patch: number;
};

export type BumpKind = "deploy" | "patch" | "minor" | "major";

/** Parses strict `x.y.z` semver. */
export const parseSemver = (raw: string): SemverParts | null => {
	const match = raw.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) return null;
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);
	if ([major, minor, patch].some((n) => !Number.isFinite(n))) return null;
	return { major, minor, patch };
};

export const formatSemver = (parts: SemverParts): string =>
	`${parts.major}.${parts.minor}.${parts.patch}`;

/**
 * Default deploy bump: patch+1, unless patch is already 10 → minor+1 and patch 0.
 * e.g. 1.0.9 → 1.0.10, 1.0.10 → 1.1.0, 1.1.10 → 1.2.0
 */
export const bumpDeployVersion = (current: string): string | null => {
	const parts = parseSemver(current);
	if (!parts) return null;

	if (parts.patch >= 10) {
		return formatSemver({ major: parts.major, minor: parts.minor + 1, patch: 0 });
	}

	return formatSemver({ ...parts, patch: parts.patch + 1 });
};

/** Applies an explicit bump kind or returns null when current semver is invalid. */
export const bumpVersion = (params: {
	current: string;
	kind: BumpKind;
}): string | null => {
	const parts = parseSemver(params.current);
	if (!parts) return null;

	if (params.kind === "deploy") {
		return bumpDeployVersion(params.current);
	}

	if (params.kind === "patch") {
		return formatSemver({ ...parts, patch: parts.patch + 1 });
	}

	if (params.kind === "minor") {
		return formatSemver({ major: parts.major, minor: parts.minor + 1, patch: 0 });
	}

	return formatSemver({ major: parts.major + 1, minor: 0, patch: 0 });
};
