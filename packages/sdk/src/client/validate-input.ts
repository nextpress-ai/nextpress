import type { ZodTypeAny, z } from "zod";

/**
 * Parses input against a Zod schema and throws a descriptive Error on failure.
 * Keeps SDK callers from sending invalid payloads to the API.
 */
export function parseInput<TSchema extends ZodTypeAny>({
	schema,
	input,
	label,
}: {
	schema: TSchema;
	input: unknown;
	label: string;
}): z.infer<TSchema> {
	const result = schema.safeParse(input);
	if (!result.success) {
		const details = result.error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("; ");
		throw new Error(`Invalid ${label}: ${details}`);
	}
	return result.data;
}
