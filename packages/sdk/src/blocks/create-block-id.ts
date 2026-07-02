/** Generates a unique block instance ID. Uses crypto.randomUUID when available. */
export function createBlockId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
