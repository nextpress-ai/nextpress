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

/** The three author fields an author box block can display. */
export type AuthorFields = {
	name?: string;
	avatar?: string;
	bio?: string;
};

export type AuthorSource = {
	/** Author fields explicitly set on the block content. */
	override?: AuthorFields | null;
	/** Live profile fetched from the API. */
	live?: AuthorFields | null;
	/** Author record attached to the post document. */
	postAuthor?: AuthorFields | null;
};

/**
 * Merge author data for the author box display.
 * Custom block fields fill gaps, then the live profile, then the post author record.
 */
export function mergeAuthorDisplay({
	override,
	live,
	postAuthor,
}: AuthorSource): AuthorFields {
	const base: AuthorFields = live ?? postAuthor ?? {};
	return {
		name: override?.name?.trim() ? override.name : base.name,
		avatar: override?.avatar?.trim() ? override.avatar : base.avatar,
		bio: override?.bio?.trim() ? override.bio : base.bio,
	};
}
