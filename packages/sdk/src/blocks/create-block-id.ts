/** Generates unique block IDs so sibling blocks never collide in the tree. */
export function createBlockId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
