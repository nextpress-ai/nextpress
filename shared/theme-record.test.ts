import { describe, expect, it } from 'vitest';
import { createThemeInputSchema, updateThemeInputSchema } from './theme-record';

describe('theme-record', () => {
  it('requires a theme name on create', () => {
    expect(createThemeInputSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createThemeInputSchema.safeParse({ name: 'Brand theme' }).success).toBe(true);
  });

  it('accepts partial updates', () => {
    const parsed = updateThemeInputSchema.safeParse({
      description: 'Updated blurb',
    });
    expect(parsed.success).toBe(true);
  });
});
