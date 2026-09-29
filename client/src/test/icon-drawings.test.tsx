import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import {
  addMissingIconDrawings,
  captureReactIconSvg,
  withIconDrawing,
} from '@/lib/icon-drawing-capture';
import { isCleanSvgMarkup } from '@shared/icon-drawing';

const iconBlock = (icon: Record<string, string | number | boolean>): BlockConfig => ({
  id: 'icon-1',
  name: 'core/icon',
  type: 'block',
  parentId: null,
  label: 'Icon',
  category: 'media',
  content: { kind: 'structured', data: { icon, link: '', linkTarget: '_self', label: '' } },
  styles: {},
  settings: {},
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error(`No published renderer for ${block.name}`);
  return renderToStaticMarkup(<Component {...block} />);
};

describe('saving a react-icons drawing', () => {
  it('captures a clean drawing that fills its box', () => {
    const svg = captureReactIconSvg('fa6:FaWhatsapp');
    expect(svg).toBeDefined();
    expect(svg).toMatch(/^<svg[\s>]/);
    expect(svg).toContain('width="100%"');
    expect(svg).toContain('height="100%"');
    expect(isCleanSvgMarkup(svg ?? '')).toBe(true);
  });

  it('adds the drawing when picked, and leaves other sets alone', () => {
    expect(withIconDrawing({ iconSet: 'react-icons', iconName: 'lu:LuSearch' }).svg).toContain('<svg');
    const lucide = { iconSet: 'lucide' as const, iconName: 'star' };
    expect(withIconDrawing(lucide)).toBe(lucide);
  });

  it('fills in older icons on open and keeps untouched trees as they were', () => {
    const plain = [iconBlock({ iconSet: 'lucide', iconName: 'star' })];
    expect(addMissingIconDrawings(plain)).toBe(plain);

    const button: BlockConfig = {
      id: 'button-1',
      name: 'core/button',
      type: 'block',
      parentId: 'group-1',
      label: 'Button',
      category: 'basic',
      content: { kind: 'text', value: 'Chat', icon: { iconSet: 'react-icons', iconName: 'fa6:FaTelegram' } } as BlockConfig['content'],
      styles: {},
      settings: {},
    };
    const group: BlockConfig = {
      id: 'group-1',
      name: 'core/group',
      type: 'container',
      parentId: null,
      label: 'Group',
      category: 'layout',
      content: { kind: 'structured', data: {} },
      styles: {},
      settings: {},
      children: [button],
    };
    const [next] = addMissingIconDrawings([group]);
    const icon = (next.children?.[0].content as { icon?: { svg?: string } }).icon;
    expect(icon?.svg).toContain('<svg');
  });
});

describe('published icons need no icon library', () => {
  it('paints a react-icons icon from its saved drawing, not a placeholder', () => {
    const svg = captureReactIconSvg('fa6:FaTelegram') ?? '';
    const html = renderPublished(iconBlock({ iconSet: 'react-icons', iconName: 'fa6:FaTelegram', svg, size: 32 }));
    expect(html).toContain(svg);
    expect(html).not.toContain('opacity="0.15"');
  });

  it('paints a brand logo from its saved copy', () => {
    const html = renderPublished(
      iconBlock({ iconSet: 'svgl', iconName: 'cursor', url: '/uploads/svgl-1-2.svg', label: 'Cursor', size: 40 }),
    );
    expect(html).toMatch(/<img[^>]*src="\/uploads\/svgl-1-2.svg"/);
    expect(html).toContain('alt="Cursor"');
    expect(html).toContain('width:40px');
  });

  it('paints a one-colour upload in the icon colour when asked', () => {
    const html = renderPublished(
      iconBlock({ iconSet: 'custom', iconName: 'mark.svg', url: '/uploads/mark.svg', tint: true, color: '#ff0000' }),
    );
    expect(html).toContain('mask:url(&quot;/uploads/mark.svg&quot;)');
    expect(html).toContain('background-color:#ff0000');
  });

  it('never points a picture off-site, even if bad data slipped in', () => {
    const html = renderPublished(iconBlock({ iconSet: 'custom', iconName: 'x', url: 'https://evil.test/x.svg' }));
    expect(html).not.toContain('evil.test');
  });
});
