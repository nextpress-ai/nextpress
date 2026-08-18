import { PAGE_ICON_DEFAULT_SETS } from '@shared/icon-types';
import type { IconReference } from '@/lib/icon-indexes';

export type ThemeIconSetId = (typeof PAGE_ICON_DEFAULT_SETS)[number];

/** Labels for theme-level default icon library (seeds new pages). */
export const THEME_ICON_SET_OPTIONS: readonly { id: ThemeIconSetId; label: string }[] = [
	{ id: 'lucide', label: 'Lucide' },
	{ id: 'react-icons', label: 'React Icons' },
	{ id: 'svgl', label: 'Brand logos' },
	{ id: 'all', label: 'All sets' },
] as const;

export const THEME_ICON_CHIP_SAMPLE: Record<ThemeIconSetId, IconReference> = {
	lucide: { iconSet: 'lucide', iconName: 'star' },
	'react-icons': { iconSet: 'react-icons', iconName: 'lu:LuStar' },
	svgl: { iconSet: 'react-icons', iconName: 'fa6:FaGithub' },
	all: { iconSet: 'lucide', iconName: 'layers' },
};

export const THEME_ICON_PREVIEW_SAMPLES: Record<ThemeIconSetId, readonly IconReference[]> = {
	lucide: [
		{ iconSet: 'lucide', iconName: 'house' },
		{ iconSet: 'lucide', iconName: 'heart' },
		{ iconSet: 'lucide', iconName: 'mail' },
	],
	'react-icons': [
		{ iconSet: 'react-icons', iconName: 'lu:LuHouse' },
		{ iconSet: 'react-icons', iconName: 'lu:LuHeart' },
		{ iconSet: 'react-icons', iconName: 'lu:LuMail' },
	],
	svgl: [
		{ iconSet: 'svgl', iconName: 'github' },
		{ iconSet: 'svgl', iconName: 'react' },
		{ iconSet: 'svgl', iconName: 'vercel' },
	],
	all: [
		{ iconSet: 'lucide', iconName: 'star' },
		{ iconSet: 'react-icons', iconName: 'lu:LuHeart' },
		{ iconSet: 'svgl', iconName: 'github' },
	],
};
