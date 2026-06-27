export type NextpressConfig = {
	schemaVersion: string;
	previousSchemaVersion: string;
	schemaPath: string;
	hasSchemaChanges: boolean;
};

export type ReadNextpressConfigResult =
	| { ok: true; config: NextpressConfig }
	| { ok: false; reason: string };

const isNextpressConfig = (value: unknown): value is NextpressConfig => {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.schemaVersion === "string" &&
		typeof record.previousSchemaVersion === "string" &&
		typeof record.schemaPath === "string" &&
		typeof record.hasSchemaChanges === "boolean"
	);
};

/**
 * Parses `nextpress.config.json` release metadata shipped with each image.
 * Used by the CLI upgrade flow and in-app upgrade assessment.
 */
export const parseNextpressConfig = (raw: unknown): ReadNextpressConfigResult => {
	if (!isNextpressConfig(raw)) {
		return { ok: false, reason: "Invalid nextpress.config.json shape" };
	}
	return { ok: true, config: raw };
};
