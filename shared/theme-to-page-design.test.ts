import { describe, expect, it } from 'vitest';
import { parseThemeSettings } from './theme-settings';
import {
	mergePageOtherWithThemeDefaults,
	resolveVisitorDesign,
	themeSettingsToInitialPageDesign,
} from './theme-to-page-design';

describe('theme-to-page-design', () => {
	it('seeds page design fields from theme typography and colors', () => {
		const settings = parseThemeSettings({
			colors: { background: '#eeeeee', foreground: '#222222' },
			typography: { body: { fontFamily: 'Inter, sans-serif' } },
		});

		const seeded = themeSettingsToInitialPageDesign(settings);
		expect(seeded.design.fontFamily).toBe('Inter, sans-serif');
		expect(seeded.design.backgroundColor?.style).toBe('#eeeeee');
		expect(seeded.design.textColor?.style).toBe('#222222');
	});

	it('merges theme seed without overwriting explicit page.other values', () => {
		const settings = parseThemeSettings({
			typography: { body: { fontFamily: 'Georgia, serif' } },
		});

		const merged = mergePageOtherWithThemeDefaults({
			themeSettings: settings,
			other: {
				design: { fontFamily: 'Roboto, sans-serif', containerWidth: '900px' },
			},
		});

		expect(merged.design?.fontFamily).toBe('Roboto, sans-serif');
		expect(merged.design?.containerWidth).toBe('900px');
	});

	it('resolveVisitorDesign falls back to defaults for posts without other.design', () => {
		const resolved = resolveVisitorDesign({ design: undefined, themeSettings: null });
		expect(resolved.containerWidth).toBe('1200px');
		expect(resolved.padding).toBe('2rem 1rem');
		expect(resolved.fontFamily).toBe('system-ui');
	});

	it('resolveVisitorDesign seeds from active theme when design is missing', () => {
		const settings = parseThemeSettings({
			colors: { background: '#fafafa', foreground: '#111111' },
			typography: { body: { fontFamily: 'Inter, sans-serif' } },
		});

		const resolved = resolveVisitorDesign({ design: undefined, themeSettings: settings });
		expect(resolved.fontFamily).toBe('Inter, sans-serif');
		expect(resolved.backgroundColor?.style).toBe('#fafafa');
		expect(resolved.textColor?.style).toBe('#111111');
	});
});
