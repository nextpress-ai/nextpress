import type { JSX } from 'react';
import { IconRenderer } from '@/components/PageBuilder/blocks/shared/IconRenderer';
import type { IconReference } from '@/lib/icon-indexes';

/** SVGL slugs mapped to renderable react-icons previews until SVGL SVG loader ships. */
const SVGL_PREVIEW_ICON: Record<string, IconReference> = {
	github: { iconSet: 'react-icons', iconName: 'fa6:FaGithub' },
	react: { iconSet: 'react-icons', iconName: 'fa6:FaReact' },
	vercel: { iconSet: 'react-icons', iconName: 'tb:TbBrandVercel' },
};

const resolvePreviewIcon = (icon: IconReference): IconReference => {
	if (icon.iconSet !== 'svgl') return icon;
	return SVGL_PREVIEW_ICON[icon.iconName] ?? { iconSet: 'lucide', iconName: 'image' };
};

/** Renders a theme-editor icon sample (maps SVGL slugs to visible brand icons). */
export function ThemeIconPreview({
	icon,
	size = 20,
	className,
}: {
	icon: IconReference;
	size?: number;
	className?: string;
}): JSX.Element {
	return <IconRenderer icon={resolvePreviewIcon(icon)} size={size} className={className} />;
}
