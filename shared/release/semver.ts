export type SemverParts = {
	major: number;
	minor: number;
	patch: number;
};

/** Parses `x.y.z` semver strings used for NextPress app releases. */
export const parseSemver = (raw: string): SemverParts | null => {
	const match = raw.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) return null;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	};
};

/** Returns true when `candidate` is newer than `current`. */
export const isSemverNewer = (params: {
	current: string;
	candidate: string;
}): boolean => {
	const left = parseSemver(params.current);
	const right = parseSemver(params.candidate);
	if (!left || !right) return false;

	if (right.major !== left.major) return right.major > left.major;
	if (right.minor !== left.minor) return right.minor > left.minor;
	return right.patch > left.patch;
};
