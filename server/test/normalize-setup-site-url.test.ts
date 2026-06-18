import { describe, it, expect } from 'vitest';
import { normalizeSetupSiteUrl } from '../../server/utils/normalize-setup-site-url';

describe('normalizeSetupSiteUrl', () => {
  it('uses http for localhost with port', () => {
    expect(normalizeSetupSiteUrl('localhost:5000')).toBe('http://localhost:5000');
  });

  it('rewrites https localhost to http', () => {
    expect(normalizeSetupSiteUrl('https://localhost:5000')).toBe('http://localhost:5000');
  });

  it('uses https for public domains', () => {
    expect(normalizeSetupSiteUrl('example.com')).toBe('https://example.com');
  });
});
