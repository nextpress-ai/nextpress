/**
 * Visitor HTML must not leak drafts, private, trash, or passworded documents.
 * Matches the public JSON API's publish gate, plus password (stored on pages/posts).
 */
export function isPubliclyReadable({
	status,
	password,
}: {
	status?: string | null;
	password?: string | null;
}): boolean {
	if (status !== "publish") return false;
	if (typeof password === "string" && password.trim() !== "") return false;
	return true;
}
