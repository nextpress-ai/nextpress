import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
// Load the renderer entry first: the renderer modules import each other through the block table.
import { getBlockComponent } from '../../../renderer/react/render-helpers';
import {
  DEFAULT_HEADER_CONTENT,
  buildHeaderLookCss,
  headerFloatWrapperStyles,
  headerNeedsScript,
  readHeaderContent,
} from '@shared/header-model';
import { observeReadingProgress } from '@shared/header-scroll-observer';
import { treeHasScrollingHeader } from '@shared/collect-block-extra-css';

const header = (data: Record<string, string | boolean | object>): BlockConfig => ({
  id: 'hdr',
  name: 'core/header',
  type: 'container',
  parentId: null,
  label: 'Header',
  category: 'layout',
  content: { kind: 'structured', data: { ...DEFAULT_HEADER_CONTENT, variant: 'actions-only', ...data } },
  styles: {},
  settings: {},
});

describe('header over the first section', () => {
  it('is off by default and changes nothing', () => {
    const content = readHeaderContent(header({}).content);
    expect(content.overFirstSection).toBe(false);
    expect(content.progress?.show).toBe(false);
    expect(headerFloatWrapperStyles(header({}))).toEqual({});
    expect(headerFloatWrapperStyles(header({ sticky: true }))).toEqual({ position: 'sticky', top: 0, zIndex: 40 });
  });

  it('takes no room, and still floats when asked', () => {
    expect(headerFloatWrapperStyles(header({ overFirstSection: true }))).toEqual({
      position: 'relative',
      zIndex: 40,
      height: 0,
      overflow: 'visible',
    });
    expect(headerFloatWrapperStyles(header({ overFirstSection: true, sticky: true }))).toMatchObject({
      position: 'sticky',
      top: 0,
      height: 0,
    });
  });

  it('is see-through at rest unless it has a colour of its own', () => {
    const plain = readHeaderContent(header({ overFirstSection: true }).content);
    expect(buildHeaderLookCss({ blockId: 'hdr', content: plain })).toContain('.block-hdr .wp-block-header{background-color:transparent}');
    const white = readHeaderContent(
      header({ overFirstSection: true, backgroundColor: { alias: 'bg', style: '#ffffff', value: '', variant: null, property: 'backgroundColor' } }).content,
    );
    expect(buildHeaderLookCss({ blockId: 'hdr', content: white })).toContain('background-color:#ffffff');
  });
});

describe('header reading progress', () => {
  it('draws a bar that fills from page scrolling in CSS, with a fallback value', () => {
    const content = readHeaderContent(header({ progress: { show: true, height: '4px', color: '#ff0055' } }).content);
    const css = buildHeaderLookCss({ blockId: 'hdr', content });
    expect(css).toContain('.block-hdr .wp-block-header .wp-block-header__progress{position:absolute');
    expect(css).toContain('height:4px;background:#ff0055');
    expect(css).toContain('transform:scaleX(var(--np-read-progress,0))');
    expect(css).toContain('@supports (animation-timeline: scroll())');
  });

  it('is painted in the header only when switched on', () => {
    const Component = getBlockComponent('core/header');
    if (!Component) throw new Error('No header renderer');
    expect(renderToStaticMarkup(<Component {...header({ progress: { show: true } })} />)).toContain('wp-block-header__progress');
    expect(renderToStaticMarkup(<Component {...header({})} />)).not.toContain('wp-block-header__progress');
  });

  it('asks for the header script so browsers without scroll timelines still fill it', () => {
    expect(headerNeedsScript(readHeaderContent(header({ progress: { show: true } }).content))).toBe(true);
    expect(treeHasScrollingHeader([header({ progress: { show: true } })])).toBe(true);
    expect(treeHasScrollingHeader([header({})])).toBe(false);
  });

  it('follows the scrolling area it is given', () => {
    const root = document.createElement('div');
    const bar = document.createElement('div');
    Object.defineProperty(root, 'scrollHeight', { value: 2000 });
    Object.defineProperty(root, 'clientHeight', { value: 1000 });
    root.scrollTop = 250;
    const stop = observeReadingProgress({ bar, root });
    expect(bar.style.getPropertyValue('--np-read-progress')).toBe('0.2500');
    stop();
  });
});
