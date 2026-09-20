import { describe, expect, it } from 'vitest';
import { describeTokenColor } from './describe-token-color';

describe('describeTokenColor', () => {
  it('says "Not set" when neither a token nor a style value exists', () => {
    expect(describeTokenColor({ entry: undefined })).toEqual({
      label: 'Not set',
      swatch: null,
      isSet: false,
    });
  });

  it('names a palette token with its shade', () => {
    const summary = describeTokenColor({
      entry: {
        property: 'color',
        value: 'blue',
        variant: '500',
        alias: 'text',
        style: '#3b82f6',
      },
    });
    expect(summary).toEqual({ label: 'blue-500', swatch: '#3b82f6', isSet: true });
  });

  it('names a shadeless token such as white', () => {
    const summary = describeTokenColor({
      entry: { property: 'color', value: 'white', variant: null, alias: 'text', style: '#ffffff' },
    });
    expect(summary.label).toBe('white');
  });

  it('shows the hex for a custom color that is not on the palette', () => {
    const summary = describeTokenColor({
      entry: { property: 'color', value: '', variant: null, alias: 'text', style: '#123abc' },
    });
    expect(summary).toEqual({ label: '#123ABC', swatch: '#123abc', isSet: true });
  });

  it('recognises a plain style hex that matches the palette', () => {
    const summary = describeTokenColor({ entry: undefined, styleValue: '#3b82f6' });
    expect(summary.label).toBe('blue-500');
    expect(summary.isSet).toBe(true);
  });
});
