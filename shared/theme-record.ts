import { z } from "zod";
import { themeSettingsSchema } from "./theme-settings.js";

export const createThemeInputSchema = z.object({
	name: z.string().trim().min(1, "Theme name is required").max(120),
	description: z.string().trim().max(500).optional(),
	settings: themeSettingsSchema.optional(),
});

export const updateThemeInputSchema = z.object({
	name: z.string().trim().min(1).max(120).optional(),
	description: z.string().trim().max(500).optional(),
	settings: themeSettingsSchema.optional(),
});

export type CreateThemeInput = z.infer<typeof createThemeInputSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;
