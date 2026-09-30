import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initForms } from '@shared/form-runtime';

const MESSAGE = "Thanks! You're on the waitlist.";

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

const mount = () => {
  document.body.innerHTML = `<main><form class="wp-block-form" data-np-form="f1">
    <input name="email" />
    <button type="submit">Join</button>
    <p class="wp-block-form__status" role="status"></p>
  </form></main>`;
  const form = document.querySelector<HTMLFormElement>('form')!;
  form.querySelector<HTMLInputElement>('[name=email]')!.value = 'a@b.co';
  return form;
};

const answerWith = (body: object, ok = true) =>
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })));

const submitAndSettle = async (form: HTMLFormElement) => {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(form.getAttribute('aria-busy')).toBe('false'));
};

let stop: () => void = () => undefined;
afterEach(() => {
  stop();
  vi.unstubAllGlobals();
});

describe('form sent popup (in-app script)', () => {
  it('clears the form and confirms in a popup with an icon, keeping the form on the page', async () => {
    stop = initForms();
    const form = mount();
    answerWith({ message: MESSAGE });
    await submitAndSettle(form);

    const dialog = document.querySelector<HTMLDialogElement>('dialog[data-np-form-sent="f1"]')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.np-form-sent__icon svg')).not.toBeNull();
    expect(dialog.querySelector('.np-form-sent__message')?.textContent).toBe(MESSAGE);
    expect(document.activeElement).toBe(dialog.querySelector('.np-form-sent__done'));
    expect(form.classList.contains('is-sent')).toBe(false);
    expect(form.querySelector<HTMLInputElement>('[name=email]')!.value).toBe('');
    expect(form.nextElementSibling).toBe(dialog);
  });

  it('reuses one popup, and a click on the backdrop closes it', async () => {
    stop = initForms();
    const form = mount();
    answerWith({ message: MESSAGE });
    await submitAndSettle(form);
    const dialog = document.querySelector<HTMLDialogElement>('dialog.np-form-sent')!;
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog.open).toBe(false);
    await submitAndSettle(form);
    expect(document.querySelectorAll('dialog.np-form-sent')).toHaveLength(1);
    expect(dialog.open).toBe(true);
  });

  it('errors still show in place, with no popup', async () => {
    stop = initForms();
    const form = mount();
    answerWith({ message: 'Enter a valid email.', field: 'email' }, false);
    await submitAndSettle(form);
    expect(document.querySelector('dialog.np-form-sent')).toBeNull();
    expect(form.querySelector('.wp-block-form__status')?.textContent).toBe('Enter a valid email.');
  });
});

describe('form sent popup (published page script)', () => {
  it('behaves the same', async () => {
    new Function(readFileSync(resolve(__dirname, '../../public/vendor/form.js'), 'utf8'))();
    const form = mount();
    answerWith({ message: MESSAGE });
    await submitAndSettle(form);
    const dialog = document.querySelector<HTMLDialogElement>('dialog[data-np-form-sent="f1"]')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.np-form-sent__icon svg')).not.toBeNull();
    expect(dialog.querySelector('.np-form-sent__message')?.textContent).toBe(MESSAGE);
    expect(form.nextElementSibling).toBe(dialog);
  });
});
