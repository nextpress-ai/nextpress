import { parseSemver, isSemverNewer } from "./semver";

export type LatestVersionLookup = {
	latestVersion: string;
	source: "github" | "bundled";
	checkedAt: string;
	checkOk: boolean;
	checkNote: string;
};

const GITHUB_LATEST_RELEASE_URL =
	"https://api.github.com/repos/nextpress-ai/nextpress/releases/latest";

/** Normalizes release tags like `v1.0.13` or `1.0.13` to semver. */
export const normalizeReleaseTag = (tag: string): string | null => {
	const trimmed = tag.trim();
	const withoutPrefix = trimmed.replace(/^v/i, "");
	const semverMatch = withoutPrefix.match(/(\d+\.\d+\.\d+)/);
	if (!semverMatch) return null;
	return parseSemver(semverMatch[1]) ? semverMatch[1] : null;
};

/**
 * Fetches the newest published GitHub release tag.
 * Does not contact Docker — image tags are expected to match GitHub release semver.
 */
export const fetchLatestReleaseVersion = async (params: {
	fallbackVersion: string;
	fetchFn?: typeof fetch;
}): Promise<LatestVersionLookup> => {
	const fetchImpl = params.fetchFn ?? fetch;
	const checkedAt = new Date().toISOString();

	try {
		const res = await fetchImpl(GITHUB_LATEST_RELEASE_URL, {
			headers: { Accept: "application/vnd.github+json" },
			signal: AbortSignal.timeout(8_000),
		});

		if (!res.ok) {
			return {
				latestVersion: params.fallbackVersion,
				source: "bundled",
				checkedAt,
				checkOk: false,
				checkNote: `GitHub release check failed (${res.status}). Showing bundled version only.`,
			};
		}

		const body = (await res.json()) as { tag_name?: string };
		const normalized = body.tag_name ? normalizeReleaseTag(body.tag_name) : null;

		if (!normalized) {
			return {
				latestVersion: params.fallbackVersion,
				source: "bundled",
				checkedAt,
				checkOk: false,
				checkNote: "GitHub response had no semver tag. Showing bundled version only.",
			};
		}

		return {
			latestVersion: normalized,
			source: "github",
			checkedAt,
			checkOk: true,
			checkNote: "Compared installed app version against latest GitHub release tag.",
		};
	} catch {
		return {
			latestVersion: params.fallbackVersion,
			source: "bundled",
			checkedAt,
			checkOk: false,
			checkNote: "Could not reach GitHub. Showing bundled version only.",
		};
	}
};

export const isUpdateAvailable = (params: {
	installedVersion: string;
	latestVersion: string;
}): boolean =>
	isSemverNewer({ current: params.installedVersion, candidate: params.latestVersion });
