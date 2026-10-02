/**
 * A repeat import replaces the saved body. The version has to move with that
 * write, or a visitor keeps the HTML from before the import. Mapped payloads
 * send version 0, which would otherwise rewind the counter.
 */
export function contentVersionAfterRewrite(current: number | null | undefined): number {
	if (typeof current !== "number" || !Number.isFinite(current) || current < 0) return 1;
	return current + 1;
}
