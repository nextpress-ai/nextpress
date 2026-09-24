import { z } from "zod";

export const PLUGIN_RUNS_WHEN = ["rendering", "admin", "always"] as const;
export type PluginRunsWhen = (typeof PLUGIN_RUNS_WHEN)[number];

/** Short labels for the list and the add popup. */
export const PLUGIN_RUNS_WHEN_LABELS: Record<PluginRunsWhen, string> = {
	rendering: "On published pages",
	admin: "In the admin",
	always: "Everywhere",
};

export const createPluginInputSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(120),
	description: z.string().trim().max(500).optional(),
	version: z.string().trim().min(1).max(32).optional(),
	runsWhen: z.enum(PLUGIN_RUNS_WHEN).optional(),
});

export type CreatePluginInput = z.infer<typeof createPluginInputSchema>;

/** True when this name is already used, ignoring case and extra spaces. */
export function pluginNameTaken({
	name,
	existing,
}: {
	name: string;
	existing: readonly string[];
}): boolean {
	const needle = name.trim().toLowerCase();
	if (!needle) return false;
	return existing.some((row) => row.trim().toLowerCase() === needle);
}

export function isPluginRunsWhen(value: string): value is PluginRunsWhen {
	return (PLUGIN_RUNS_WHEN as readonly string[]).includes(value);
}

/** Human label, or the raw value if it is an older unexpected string. */
export function describePluginRunsWhen(value: string | null | undefined): string {
	if (!value) return PLUGIN_RUNS_WHEN_LABELS.rendering;
	if (isPluginRunsWhen(value)) return PLUGIN_RUNS_WHEN_LABELS[value];
	return value;
}
