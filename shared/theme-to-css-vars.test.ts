import { describe, expect, it } from 'vitest';
import { parseThemeSettings } from './theme-settings';
import { themeSettingsToCssVars, themeSettingsToStyleBlock } from './theme-to-css-vars';

describe('theme-to-css-vars', () => {
	it('returns empty vars for empty raw settings', () => {
		const settings = parseThemeSettings({});
		expect(themeSettingsToCssVars(settings, {})).toEqual({});
	});

	it('bridges accent and text colors to npb vars', () => {
		const settings = parseThemeSettings({
			colors: {
				accent: '#ff0000',
				foreground: '#111111',
				background: '#fafafa',
			},
		});

		const vars = themeSettingsToCssVars(settings, settings);
		expect(vars['--npb-accent']).toBe('#ff0000');
		expect(vars['--npb-text-primary']).toBe('#111111');
		expect(vars['--npb-surface-base']).toBe('#fafafa');
	});

	it('emits a scoped style block for SSR', () => {
		const settings = parseThemeSettings({
			colors: { accent: '#336699' },
		});
		const block = themeSettingsToStyleBlock(settings, settings);
		expect(block).toContain('.np-visitor-document');
		expect(block).toContain('--npb-accent: #336699');
	});
});
