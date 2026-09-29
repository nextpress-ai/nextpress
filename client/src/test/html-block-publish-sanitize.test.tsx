import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';

const htmlBlock = (content: string): BlockConfig => ({
  id: 'html-1',
  name: 'core/html',
  type: 'block',
  parentId: null,
  label: 'HTML',
  category: 'advanced',
  content: { kind: 'structured', data: { content } },
  styles: {},
  settings: {},
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error('No published HTML renderer');
  return renderToStaticMarkup(<Component {...block} />);
};

describe('published HTML block cleaning matches the editor', () => {
  it('removes style tags, like the editor canvas does', () => {
    const html = renderPublished(htmlBlock('<style>body{display:none}</style><p>Hi</p>'));
    expect(html).not.toContain('<style');
    expect(html).toContain('<p>Hi</p>');
  });

  it('removes single-quoted and unquoted event handlers', () => {
    const html = renderPublished(
      htmlBlock(`<img src="/a.png" onerror='steal()'><button onclick=go()>Go</button>`),
    );
    expect(html).not.toMatch(/onerror|onclick/i);
  });

  it('keeps ordinary markup and inline styles', () => {
    const html = renderPublished(
      htmlBlock('<details open style="border:1px solid #ddd"><summary>Q</summary>A</details>'),
    );
    expect(html).toContain('<details open style="border:1px solid #ddd">');
    expect(html).toContain('<summary>Q</summary>');
  });
});
