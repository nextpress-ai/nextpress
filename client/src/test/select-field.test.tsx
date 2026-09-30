import { describe, expect, it, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SelectFieldView } from '@shared/select-field-view';
import { initSelects } from '@shared/select-runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const options = [
  { label: "I don't use WordPress", value: 'none' },
  { label: 'I own a website', value: 'website' },
  { label: 'I have a plugin', value: 'plugin' },
];

let stop: () => void = () => undefined;

const mount = () => {
  document.body.innerHTML = `<form>${renderToStaticMarkup(
    <SelectFieldView
      blockId="b1"
      name="wordpress"
      label="How have you used WordPress?"
      defaultValue="none"
      ariaLabel="How have you used WordPress?"
      options={options}
    />,
  )}</form>`;
  stop = initSelects();
  const root = document.querySelector<HTMLElement>('[data-np-select]')!;
  return {
    root,
    native: root.querySelector('select')!,
    trigger: root.querySelector<HTMLButtonElement>('.np-select__trigger')!,
    list: root.querySelector<HTMLElement>('[role=listbox]')!,
    value: () => root.querySelector('.np-select__value')!.textContent,
    option: (label: string) => [...root.querySelectorAll<HTMLElement>('[role=option]')].find((o) => o.textContent === label)!,
  };
};

const key = (target: HTMLElement, name: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

afterEach(() => {
  stop();
  document.body.innerHTML = '';
});

describe('styled dropdown', () => {
  it('keeps a real select underneath and shows the chosen text on the button', () => {
    const { root, native, trigger, value } = mount();
    expect(root.classList.contains('is-ready')).toBe(true);
    expect(native.name).toBe('wordpress');
    expect(native.value).toBe('none');
    expect(value()).toBe("I don't use WordPress");
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('opens on click, picks with the mouse, and the form sees the new value', () => {
    const { native, trigger, list, value, option } = mount();
    let changed = '';
    native.addEventListener('change', () => (changed = native.value));

    trigger.click();
    expect(list.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    option('I own a website').click();
    expect(native.value).toBe('website');
    expect(changed).toBe('website');
    expect(value()).toBe('I own a website');
    expect(list.hidden).toBe(true);
    expect(new FormData(document.querySelector('form')!).get('wordpress')).toBe('website');
  });

  it('works from the keyboard: arrows, letters, Enter, Escape', () => {
    const { native, trigger, list, option } = mount();
    key(trigger, 'ArrowDown');
    expect(list.hidden).toBe(false);
    key(list, 'ArrowDown');
    expect(option('I own a website').classList.contains('is-active')).toBe(true);
    key(list, 'i');
    expect(option('I have a plugin').classList.contains('is-active')).toBe(true);
    key(list, 'Enter');
    expect(native.value).toBe('plugin');
    expect(document.activeElement).toBe(trigger);

    key(trigger, 'Enter');
    key(list, 'Escape');
    expect(list.hidden).toBe(true);
    expect(native.value).toBe('plugin');
  });

  it('closes when clicking elsewhere', () => {
    const { trigger, list } = mount();
    trigger.click();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(list.hidden).toBe(true);
  });
});

describe('published page dropdown script (vendor/select.js)', () => {
  it('behaves like the in-app one: opens, picks, updates the real select', () => {
    document.body.innerHTML = `<form>${renderToStaticMarkup(
      <SelectFieldView blockId="b2" name="wordpress" label="Used WordPress?" ariaLabel="Used WordPress?" options={options} defaultValue="none" />,
    )}</form>`;
    new Function(readFileSync(resolve(process.cwd(), 'client/public/vendor/select.js'), 'utf8'))();
    const root = document.querySelector<HTMLElement>('[data-np-select]')!;
    const trigger = root.querySelector<HTMLButtonElement>('.np-select__trigger')!;
    const list = root.querySelector<HTMLElement>('[role=listbox]')!;
    expect(root.classList.contains('is-ready')).toBe(true);
    trigger.click();
    expect(list.hidden).toBe(false);
    [...root.querySelectorAll<HTMLElement>('[role=option]')].find((o) => o.textContent === 'I have a plugin')!.click();
    expect(root.querySelector('select')!.value).toBe('plugin');
    expect(root.querySelector('.np-select__value')!.textContent).toBe('I have a plugin');
    expect(list.hidden).toBe(true);
  });
});
