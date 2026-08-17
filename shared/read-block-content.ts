/**
 * Unwrap block content regardless of kind so editor structured shapes
 * still render on preview and publish.
 */
export function readBlockContentData(
	content: unknown,
): Record<string, unknown> {
	if (!content || typeof content !== "object") return {};
	const record = content as Record<string, unknown>;
	if (record.kind === "structured") {
		return record.data && typeof record.data === "object"
			? (record.data as Record<string, unknown>)
			: {};
	}
	if (
		record.kind === "text" ||
		record.kind === "media" ||
		record.kind === "html" ||
		record.kind === "markdown"
	) {
		const { kind: _kind, ...rest } = record;
		if (record.kind === "markdown" || record.kind === "html") {
			return {
				...rest,
				content:
					typeof record.value === "string" ? record.value : rest.content,
				value: record.value,
			};
		}
		return rest;
	}
	if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
		return record.data as Record<string, unknown>;
	}
	return record;
}

/**
 * Merges parsed block payload with defaults. Editor `parseContent` unwraps
 * `{ kind: "structured", data }`, so renderers and settings must not rely on
 * `content.kind === "structured"` after that step.
 */
export function readStructuredBlockData<T extends Record<string, unknown>>(
	content: unknown,
	defaults: T,
): T {
	return { ...defaults, ...readBlockContentData(content) } as T;
}

/** Map heading tag strings (`h1`) to a numeric level for publish headings. */
export function headingLevelFromTag(tag: unknown, fallback = 2): number {
	if (typeof tag === "number" && tag >= 1 && tag <= 6) return tag;
	if (typeof tag === "string") {
		const match = /^h([1-6])$/i.exec(tag.trim());
		if (match) return Number(match[1]);
	}
	return fallback;
}

/** Draft, preview, and publish can all open in the authenticated preview pane. */
export function isPreviewableContentStatus(status: string | null | undefined): boolean {
	return status === "publish" || status === "preview" || status === "draft";
}
