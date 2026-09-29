import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { BlockConfig } from '@shared/schema-types';
import { sanitizeSvgMarkup } from '@shared/icon-drawing';
import type { IconReference } from '@/lib/icon-indexes';
import { resolveReactIcon } from '@/components/PageBuilder/blocks/shared/IconRenderer';

/**
 * Published pages do not load react-icons (each family is 0.4–5.5 MB). The editor already has
 * them, so when a react-icons icon is picked it saves that icon's SVG drawing on the reference.
 * The drawing is stretched to its box (width/height 100%) so any size unit works.
 */
export function captureReactIconSvg(iconName: string): string | undefined {
  const Component = resolveReactIcon(iconName);
  if (!Component || typeof document === 'undefined') return undefined;

  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(<Component />));
  const markup = host.innerHTML;
  root.unmount();

  const sized = markup
    .replace(/\swidth="1em"/, ' width="100%"')
    .replace(/\sheight="1em"/, ' height="100%"');
  const cleaned = sanitizeSvgMarkup(sized);
  return cleaned.ok ? cleaned.svg : undefined;
}

/** Adds the saved drawing to a react-icons reference that lacks one. Other sets pass through. */
export function withIconDrawing(icon: IconReference): IconReference {
  if (icon.iconSet !== 'react-icons' || icon.svg) return icon;
  const svg = captureReactIconSvg(icon.iconName);
  return svg ? { ...icon, svg } : icon;
}

const ICON_OWNER_BLOCKS = new Set(['core/icon', 'core/button']);

type IconHolder = { icon?: IconReference };

const isIconReference = (value: IconHolder['icon'] | object | undefined): value is IconReference =>
  Boolean(value && typeof value === 'object' && 'iconSet' in value && 'iconName' in value);

/** Where Icon and Button blocks keep their icon: `data.icon` (structured) or `icon` (text). */
function addDrawingToContent(content: BlockConfig['content']): BlockConfig['content'] {
  if (!content || typeof content !== 'object') return content;
  if (content.kind === 'structured') {
    const data = (content.data ?? {}) as IconHolder;
    if (!isIconReference(data.icon)) return content;
    const icon = withIconDrawing(data.icon);
    return icon === data.icon ? content : { ...content, data: { ...content.data, icon } };
  }
  const holder = content as BlockConfig['content'] & IconHolder;
  if (!isIconReference(holder.icon)) return content;
  const icon = withIconDrawing(holder.icon);
  return icon === holder.icon ? content : Object.assign({}, holder, { icon });
}

/**
 * Gives older react-icons icons their drawing when a page opens in the editor, so the next save
 * lets them show on the published page too. Blocks without such icons are returned as they were.
 */
export function addMissingIconDrawings(blocks: BlockConfig[]): BlockConfig[] {
  let changed = false;
  const next = blocks.map((block) => {
    const content = ICON_OWNER_BLOCKS.has(block.name) ? addDrawingToContent(block.content) : block.content;
    const children = block.children?.length ? addMissingIconDrawings(block.children) : block.children;
    if (content === block.content && children === block.children) return block;
    changed = true;
    return { ...block, content, children };
  });
  return changed ? next : blocks;
}
