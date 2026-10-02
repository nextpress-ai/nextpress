import { z } from 'zod';

/**
 * Zod validation schemas for site-wide settings
 * 
 * Validates structure and types for settings stored in sites.settings jsonb column.
 * Supports partial updates via PATCH operations.
 */

export const generalSettingsSchema = z.object({
  siteName: z.string().min(1).max(255),
  siteDescription: z.string().max(1000),
  siteUrl: z.string().url().or(z.literal('')),
  adminEmail: z.string().email().or(z.literal('')),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.string().min(1),
});

export const writingSettingsSchema = z.object({
  richTextEnabled: z.boolean(),
  autosaveEnabled: z.boolean(),
  syntaxHighlighting: z.boolean(),
});

export const readingSettingsSchema = z.object({
  postsPerPage: z.number().int().positive().max(100),
  rssPosts: z.number().int().positive().max(100),
  rssEnabled: z.boolean(),
  discourageSearchIndexing: z.boolean(),
  descriptionFrom: z.enum(["auto", "page", "excerpt", "site"]),
});

export const discussionSettingsSchema = z.object({
  enableComments: z.boolean(),
  moderateComments: z.boolean(),
  emailNotifications: z.boolean(),
  enableRegistration: z.boolean(),
  defaultRole: z.string().min(1),
});

export const systemSettingsSchema = z.object({
  cachingEnabled: z.boolean(),
  compressionEnabled: z.boolean(),
  securityHeadersEnabled: z.boolean(),
  debugMode: z.boolean(),
  restApiEnabled: z.boolean(),
  graphqlEnabled: z.boolean(),
  webhooksEnabled: z.boolean(),
});

/**
 * Full settings schema - all sections required
 */
export const settingsSchema = z.object({
  general: generalSettingsSchema,
  writing: writingSettingsSchema,
  reading: readingSettingsSchema,
  discussion: discussionSettingsSchema,
  system: systemSettingsSchema,
});

/**
 * Partial settings schema - for PATCH updates
 * All sections and all fields within sections are optional
 */
export const partialSettingsSchema = z.object({
  general: generalSettingsSchema.partial().optional(),
  writing: writingSettingsSchema.partial().optional(),
  reading: readingSettingsSchema.partial().optional(),
  discussion: discussionSettingsSchema.partial().optional(),
  system: systemSettingsSchema.partial().optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type PartialSettings = z.infer<typeof partialSettingsSchema>;
