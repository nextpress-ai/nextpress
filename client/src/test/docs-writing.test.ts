import { describe, expect, it } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import { leaveList, readSlashQuery, readWritingTurn, removeEmptyBlock, replaceBlock, splitBlock, splitText } from '@/components/PageBuilder/docs-mode/docs-writing';

const counter = () => {
  let n = 0;
  return () => `new-${++n}`;
};

const text = (id: string, value: string): BlockConfig => ({ id, name: 'core/paragraph', label: 'Text', type: 'block', parentId: 'page', content: { kind: 'text', value, format: 'html' } as BlockConfig['content'] });
const heading = (id: string, value: string): BlockConfig => ({ id, name: 'core/heading', label: 'Heading', type: 'block', parentId: 'page', content: { kind: 'text', value, format: 'html', level: 2, anchor: '' } as BlockConfig['content'] });
const page = (children: BlockConfig[]): BlockConfig[] => [{ id: 'page', name: 'docs/page', label: 'Docs page', type: 'block', parentId: null, content: { kind: 'structured', data: {} }, children }];

const childrenOf = (blocks: BlockConfig[]): BlockConfig[] => blocks[0].children ?? [];
type StructuredData = Extract<NonNullable<BlockConfig['content']>, { kind: 'structured' }>['data'];
const dataOf = (block: BlockConfig): StructuredData => {
  const content = block.content;
  if (content && 'kind' in content && content.kind === 'structured') return content.data;
  return (content ?? {}) as StructuredData;
};
const allIds = (blocks: BlockConfig[]): string[] => blocks.flatMap((block) => [block.id, ...allIds(block.children ?? [])]);

describe('markers typed at the start of a paragraph', () => {
  it('make a heading, list, numbered list, checklist, quote or code block, taking the rest of the text along', () => {
    expect(readWritingTurn({ previous: '##', next: '## ' })).toEqual({ name: 'core/heading', data: { level: 2, value: '', format: 'html' } });
    expect(readWritingTurn({ previous: '###Setup', next: '### Setup' })).toMatchObject({ name: 'core/heading', data: { level: 3, value: 'Setup', format: 'html' } });
    expect(readWritingTurn({ previous: '-', next: '- **Fast** ' })).toMatchObject({ name: 'core/list', data: { ordered: false, marker: 'default', values: '<li><strong>Fast</strong></li>' } });
    expect(readWritingTurn({ previous: '1.', next: '1. ' })).toMatchObject({ name: 'core/list', data: { ordered: true } });
    expect(readWritingTurn({ previous: '[]', next: '[] ' })).toMatchObject({ name: 'core/list', data: { marker: 'check' } });
    expect(readWritingTurn({ previous: '>', next: '> Be <careful>' })).toEqual({ name: 'core/quote', data: { value: '<p>Be &lt;careful&gt;</p>', citation: '' } });
    expect(readWritingTurn({ previous: '``', next: '```' })).toEqual({ name: 'core/code', data: { content: '', language: '' } });
  });

  it('leave a paragraph alone once it already started that way, or when the marker is not at the start', () => {
    expect(readWritingTurn({ previous: '- a', next: '- ab' })).toBeNull();
    expect(readWritingTurn({ previous: 'Step', next: 'Step ## ' })).toBeNull();
    expect(readWritingTurn({ previous: '#', next: '# ' })).toBeNull();
  });
});

describe('the "/" menu', () => {
  it('opens for a paragraph that starts with "/" and reads what follows as the search', () => {
    expect(readSlashQuery('/')).toBe('');
    expect(readSlashQuery('/code gr')).toBe('code gr');
    expect(readSlashQuery('Use /docs')).toBeNull();
    expect(readSlashQuery('/a/b')).toBeNull();
  });
});

describe('Enter and Backspace', () => {
  it('Enter keeps the text before the caret and starts a new paragraph after it with the rest', () => {
    expect(splitText({ text: 'Hello world', start: 5, end: 5 })).toEqual({ before: 'Hello', after: ' world' });
    const result = splitBlock({ blocks: page([text('a', 'Hello world'), text('b', 'Next')]), blockId: 'a', before: 'Hello', after: ' world', newId: counter() });

    expect(result?.caret).toBe('start');
    const children = childrenOf(result!.blocks);
    expect(children.map((child) => child.id)).toEqual(['a', result!.editId, 'b']);
    expect(dataOf(children[0]).value).toBe('Hello');
    expect(children[1]).toMatchObject({ name: 'core/paragraph', parentId: 'page' });
    expect(dataOf(children[1])).toMatchObject({ value: ' world', format: 'html' });
  });

  it('Enter in a heading starts a paragraph under it', () => {
    const result = splitBlock({ blocks: page([heading('h', 'Install')]), blockId: 'h', before: 'Install', after: '', newId: counter() });
    expect(childrenOf(result!.blocks).map((child) => child.name)).toEqual(['core/heading', 'core/paragraph']);
  });

  it('Backspace in an empty paragraph removes it and carries on at the end of the block above', () => {
    const result = removeEmptyBlock({ blocks: page([heading('h', 'Install'), text('a', '')]), blockId: 'a' });
    expect(childrenOf(result!.blocks).map((child) => child.id)).toEqual(['h']);
    expect(result).toMatchObject({ editId: 'h', caret: 'end' });
  });

  it('Backspace in the first paragraph removes it and opens nothing', () => {
    const result = removeEmptyBlock({ blocks: page([text('a', ''), text('b', 'More')]), blockId: 'a' });
    expect(result?.editId).toBeNull();
  });
});

describe('turning a paragraph into another block', () => {
  it('puts the new block where the paragraph was, with fresh ids for it and every block inside it', () => {
    const result = replaceBlock({ blocks: page([text('a', '/code'), text('b', 'Next')]), blockId: 'a', name: 'docs/code-group', newId: counter() });

    const children = childrenOf(result!.blocks);
    expect(children.map((child) => child.name)).toEqual(['docs/code-group', 'core/paragraph']);
    expect(result?.editId).toBe(children[0].id);
    const ids = allIds(result!.blocks);
    expect(new Set(ids).size).toBe(ids.length);
    expect((children[0].children ?? []).length).toBeGreaterThan(1);
  });

  it('starts the new block with the fields given', () => {
    const result = replaceBlock({ blocks: page([text('a', '## ')]), blockId: 'a', name: 'core/heading', data: { level: 3, value: 'Setup', format: 'html' }, newId: counter() });
    expect(dataOf(childrenOf(result!.blocks)[0])).toMatchObject({ level: 3, value: 'Setup' });
  });

  it('refuses a block NextPress does not know, leaving the page as it was', () => {
    expect(replaceBlock({ blocks: page([text('a', 'x')]), blockId: 'a', name: 'docs/nope', newId: counter() })).toBeNull();
  });
});

describe('blocks added to a docs page by click or drag', () => {
  it('line up with its text; blocks added to an ordinary page keep the page builder padding', async () => {
    const { insertNewBlock } = await import('@/lib/handlers/treeUtils');
    const docsTree = page([text('a', 'Hi')]);
    const inDocs = insertNewBlock(docsTree, 'page', 1, 'core/code');
    const added = childrenOf(inDocs.blocks).find((child) => child.id === inDocs.newId);
    expect(added?.styles?.padding).toBe('20px 0 0');

    const plain: BlockConfig[] = [{ id: 'group', name: 'core/group', label: 'Group', type: 'container', parentId: null, content: { kind: 'structured', data: {} }, children: [] }];
    const inPage = insertNewBlock(plain, 'group', 0, 'core/code');
    expect(inPage.blocks[0].children?.[0].styles?.padding).toBe('20px 20px 0');
  });
});

describe('Enter on an empty line of a list', () => {
  const list = (values: string): BlockConfig => ({ id: 'l', name: 'core/list', label: 'List', type: 'block', parentId: 'page', content: { kind: 'structured', data: { ordered: false, values, marker: 'default' } } });

  it('ends the list and opens a new paragraph under it', () => {
    const result = leaveList({ blocks: page([list('<li>One</li>')]), blockId: 'l', newId: counter() });
    expect(childrenOf(result!.blocks).map((child) => child.name)).toEqual(['core/list', 'core/paragraph']);
    expect(result).toMatchObject({ editId: childrenOf(result!.blocks)[1].id, caret: 'start' });
  });

  it('turns a list with nothing in it into the paragraph', () => {
    const result = leaveList({ blocks: page([list('')]), blockId: 'l', newId: counter() });
    expect(childrenOf(result!.blocks).map((child) => child.name)).toEqual(['core/paragraph']);
  });
});
