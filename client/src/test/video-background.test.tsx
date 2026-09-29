import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import { BACKGROUND_VIDEO_CONTENT, readVideoPlayback } from '@shared/video-playback';
import { getOverlayChildItemStyles } from '@shared/block-container-placement';

const videoBlock = (content: Record<string, string | boolean>, styles: BlockConfig['styles'] = {}): BlockConfig => ({
  id: 'video-1',
  name: 'core/video',
  type: 'block',
  parentId: null,
  label: 'Video',
  category: 'media',
  content: { kind: 'media', mediaType: 'video', url: '/uploads/loop.mp4', ...content } as BlockConfig['content'],
  styles,
  settings: {},
});

const renderPublished = (block: BlockConfig): string => {
  const Component = getBlockComponent(block.name);
  if (!Component) throw new Error(`No published renderer for ${block.name}`);
  return renderToStaticMarkup(<Component {...block} />);
};

describe('readVideoPlayback', () => {
  it('keeps the usual player defaults', () => {
    expect(readVideoPlayback({})).toEqual({
      controls: true,
      autoplay: false,
      loop: false,
      muted: false,
      playsInline: true,
      preload: 'metadata',
      objectFit: undefined,
    });
  });

  it('always mutes an autoplaying video, since browsers refuse to autoplay with sound', () => {
    expect(readVideoPlayback({ autoplay: true, muted: false }).muted).toBe(true);
  });

  it('ignores fit and preload values it does not know', () => {
    const playback = readVideoPlayback({ objectFit: 'stretch', preload: 'lots' });
    expect(playback.objectFit).toBeUndefined();
    expect(playback.preload).toBe('metadata');
  });
});

describe('published video', () => {
  it('can autoplay: muted and plays inline are on the tag', () => {
    const html = renderPublished(videoBlock({ ...BACKGROUND_VIDEO_CONTENT }, { width: '100%', height: '100%' }));
    expect(html).toMatch(/<video[^>]* muted=""/);
    expect(html).toMatch(/<video[^>]* autoPlay=""/);
    expect(html).toMatch(/<video[^>]* loop=""/);
    expect(html).toMatch(/<video[^>]* playsInline=""/);
    expect(html).not.toMatch(/<video[^>]* controls=""/);
    expect(html).toContain('object-fit:cover');
  });

  it('puts the block styles on the wrapper only, so margins are not doubled', () => {
    const html = renderPublished(videoBlock({}, { margin: '24px', border: '1px solid red' }));
    expect(html.match(/margin:24px/g)).toHaveLength(1);
    expect(html).toMatch(/<video[^>]*style="display:block;width:100%;height:auto"/);
  });
});

describe('overlay stack layer that fills behind', () => {
  it('adds no size of its own and stretches over the cell', () => {
    const styles = getOverlayChildItemStyles({ contentAlignHorizontal: 'center' }, { fillsBehind: true });
    expect(styles).toMatchObject({
      gridArea: '1 / 1',
      contain: 'size',
      alignSelf: 'stretch',
      justifySelf: 'stretch',
    });
  });

  it('published stack paints a fill-behind video with those styles', () => {
    const stack: BlockConfig = {
      id: 'stack-1',
      name: 'core/stack',
      type: 'container',
      parentId: null,
      label: 'Stack',
      category: 'layout',
      content: { kind: 'structured', data: { stackType: 'overlay' } },
      styles: {},
      settings: {},
      children: [
        { ...videoBlock({ ...BACKGROUND_VIDEO_CONTENT }), parentId: 'stack-1', settings: { stackFillBehind: true } },
        {
          id: 'text-1',
          name: 'core/paragraph',
          type: 'block',
          parentId: 'stack-1',
          label: 'Paragraph',
          category: 'basic',
          content: { kind: 'text', value: 'On top' },
          styles: {},
          settings: {},
        },
      ],
    };
    const html = renderPublished(stack);
    expect(html).toMatch(/contain:size[^"]*"><div class="wp-block-video/);
    expect(html).toContain('On top');
  });
});

describe('overlay stack with its own height', () => {
  it('stretches the shared cell so "middle" pins sit in the middle of the stack', async () => {
    const { buildStackShellStyles } = await import('@shared/stack-shell-styles');
    const sized = buildStackShellStyles({ styles: { minHeight: '780px' }, content: { kind: 'structured', data: { stackType: 'overlay' } }, children: [] });
    expect(sized.outerStyle).toMatchObject({ display: 'flex', flexDirection: 'column', minHeight: '780px' });
    expect(sized.innerStackStyle).toMatchObject({ display: 'grid', flex: 1, alignSelf: 'stretch' });
    const free = buildStackShellStyles({ styles: {}, content: { kind: 'structured', data: { stackType: 'overlay' } }, children: [] });
    expect(free.innerStackStyle).not.toHaveProperty('flex');
  });
});
