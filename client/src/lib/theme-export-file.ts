import type { ThemeExportDocument } from '@shared/theme-export';

const sanitizeFilename = (name: string): string => {
	const trimmed = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	return trimmed || 'theme';
};

/**
 * Triggers a browser download of the portable theme JSON file.
 */
export const downloadThemeExportFile = (document: ThemeExportDocument): void => {
	const json = `${JSON.stringify(document, null, 2)}\n`;
	const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = window.document.createElement('a');
	anchor.href = url;
	anchor.download = `${sanitizeFilename(document.name)}.nextpress-theme.json`;
	anchor.click();
	URL.revokeObjectURL(url);
};

/**
 * Reads a theme file from disk and returns parsed text for shared validation.
 */
export const readThemeExportFile = async (file: File): Promise<string> => {
	const text = await file.text();
	if (!text.trim()) {
		throw new Error('Theme file is empty.');
	}
	return text;
};
