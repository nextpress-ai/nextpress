import { describe, expect, it } from 'vitest';
import {
	DEFAULT_THEME_SETTINGS,
	normalizeLegacyThemeColors,
	parseThemeSettings,
} from './theme-settings';

describe('theme-settings', () => {
	it('returns defaults for empty input', () => {
		const settings = parseThemeSettings(null);
		expect(settings.colors?.accent).toBe(DEFAULT_THEME_SETTINGS.colors?.accent);
		expect(settings.typography?.body?.fontSize).toBe('1rem');
	});

	it('maps legacy seed colors onto typed tokens', () => {
		const legacy = normalizeLegacyThemeColors({
			primary: '#0073aa',
			text: '#23282d',
			background: '#ffffff',
			accent: '#00a0d2',
		});

		expect(legacy?.accent).toBe('#00a0d2');
		expect(legacy?.foreground).toBe('#23282d');
		expect(legacy?.primary).toBe('#0073aa');
	});

	it('merges legacy colors when parsing stored settings', () => {
		const settings = parseThemeSettings({
			colors: {
				primary: '#0073aa',
				text: '#23282d',
				background: '#ffffff',
				accent: '#00a0d2',
			},
		});

		expect(settings.colors?.foreground).toBe('#23282d');
		expect(settings.colors?.accent).toBe('#00a0d2');
	});
});
