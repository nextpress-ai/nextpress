import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig, FormSubmission } from '@shared/schema-types';
import type { pages } from '@shared/schema';
import { createFormSubmissionService, submissionsToCsv } from '../lib/form-submissions';
import { renderBlocksToHtml } from '../../renderer/to-html';

type PageRow = typeof pages.$inferSelect;

const FORM_ID = '6f1c3a52-7d3e-4c1b-9a1e-2b3c4d5e6f70';

const formBlock: BlockConfig = {
  id: FORM_ID,
  name: 'core/form',
  type: 'container',
  parentId: null,
  content: { kind: 'structured', data: { name: 'Waitlist', successMessage: "You're on the list." } },
  children: [
    {
      id: 'email-field',
      name: 'core/input',
      type: 'block',
      parentId: FORM_ID,
      content: { kind: 'structured', data: { name: 'email', label: 'Your email', type: 'email', required: true } },
    },
    {
      id: 'send',
      name: 'core/button',
      type: 'block',
      parentId: FORM_ID,
      content: { kind: 'text', value: 'Send', action: 'submit' } as BlockConfig['content'],
    },
  ],
};

const livePage = { id: 'page-1', siteId: 'site-1', status: 'publish', blocks: [formBlock] } as unknown as PageRow;

const makeService = (found: PageRow[]) => {
  const create = vi.fn(async (data: Partial<FormSubmission>) => ({ ...data, id: 's1' }) as FormSubmission);
  const service = createFormSubmissionService({
    findPublishedPagesWithBlock: async () => found,
    submissions: {
      create,
      findManyWhere: async () => [],
      count: async () => 0,
      findById: async () => undefined,
      update: async (_id, data) => data as FormSubmission,
      delete: async () => undefined,
    },
  });
  return { service, create };
};

describe('form sends', () => {
  it('stores a valid send against its live page and answers with the form message', async () => {
    const { service, create } = makeService([livePage]);
    const result = await service.submit({ formId: FORM_ID, values: { email: 'ada@example.com', sneaky: 'x' } });
    expect(result).toEqual({ ok: true, message: "You're on the list.", stored: true });
    expect(create).toHaveBeenCalledWith({
      siteId: 'site-1',
      pageId: 'page-1',
      formName: 'Waitlist',
      fields: [{ name: 'email', label: 'Your email', value: 'ada@example.com' }],
      status: 'new',
    });
  });

  it('says "sent" to a bot that fills the trap field, but keeps nothing', async () => {
    const { service, create } = makeService([livePage]);
    const result = await service.submit({ formId: FORM_ID, values: { email: 'bot@spam.io', np_website: 'http://spam' } });
    expect(result).toMatchObject({ ok: true, stored: false });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses forms that are not live, and ids that are not ids', async () => {
    expect(await makeService([]).service.submit({ formId: FORM_ID, values: { email: 'a@b.co' } })).toMatchObject({ ok: false, status: 404 });
    expect(await makeService([livePage]).service.submit({ formId: "x' or 1=1", values: {} })).toMatchObject({ ok: false, status: 404 });
  });

  it('refuses a send that misses a required answer, naming the field', async () => {
    const result = await makeService([livePage]).service.submit({ formId: FORM_ID, values: {} });
    expect(result).toEqual({ ok: false, status: 400, field: 'email', message: 'Please fill in "Your email".' });
  });
});

describe('submissions CSV', () => {
  it('has one column per question and defuses spreadsheet formulas', () => {
    const csv = submissionsToCsv({
      items: [
        {
          id: 's1',
          siteId: 'site-1',
          pageId: 'page-1',
          formName: 'Waitlist',
          status: 'new',
          createdAt: new Date('2026-09-30T10:00:00Z'),
          fields: [
            { name: 'email', label: 'Your email', value: 'ada@example.com' },
            { name: 'message', label: 'Message', value: '=HYPERLINK("http://evil")' },
          ],
        },
      ],
      pageTitles: { 'page-1': 'Contact' },
    });
    const [header, row] = csv.replace('﻿', '').trim().split('\r\n');
    expect(header).toBe('"Sent","Form","Page","Status","Your email","Message"');
    expect(row).toContain('"Contact","new","ada@example.com"');
    expect(row).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
});

describe('published form markup', () => {
  it('is a real form with labels, a submit button, and the hidden parts', () => {
    const html = renderBlocksToHtml([formBlock]);
    expect(html).toContain(`data-np-form="${FORM_ID}"`);
    expect(html).toContain('action="/api/forms/submit"');
    expect(html).toContain(`<label class="wp-block-field__label" for="np-field-email-field">Your email`);
    expect(html).toContain('id="np-field-email-field"');
    expect(html).toMatch(/<button type="submit"[^>]*>Send<\/button>/);
    expect(html).toContain(`name="np_form" value="${FORM_ID}"`);
    expect(html).toContain('name="np_website"');
    expect(html).toContain('class="wp-block-form__status"');
  });
});
