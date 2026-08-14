/**
 * Map a CMS user record into the fields author blocks actually display.
 */
export type AuthorDisplay = {
	id?: string;
	name: string;
	avatar: string;
	bio: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

/** Prefer full name, then first + last, then username. */
export function authorDisplayFromUser(user: unknown): AuthorDisplay | null {
	if (!isRecord(user)) return null;
	const firstName = readString(user.firstName);
	const lastName = readString(user.lastName);
	const combined = [firstName, lastName].filter(Boolean).join(" ");
	const name =
		readString(user.name) ||
		combined ||
		readString(user.displayUsername) ||
		readString(user.username);
	const other = isRecord(user.other) ? user.other : {};
	const avatar =
		readString(user.profileImageUrl) ||
		readString(user.image) ||
		readString(user.avatar);
	const bio = readString(other.bio) || readString(user.bio);
	if (!name && !avatar && !bio && !readString(user.id)) return null;
	return {
		id: readString(user.id) || undefined,
		name: name || "Author",
		avatar,
		bio,
	};
}

/** Persist a bio string onto user.other without dropping other keys. */
export function userOtherWithBio({
	other,
	bio,
}: {
	other: unknown;
	bio: string;
}): Record<string, unknown> {
	const current = isRecord(other) ? { ...other } : {};
	current.bio = bio;
	return current;
}
