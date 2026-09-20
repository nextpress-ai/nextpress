import { describe, expect, it } from 'vitest';
import { isValidCssColor } from './is-valid-css-color';

describe('isValidCssColor', () => {
  it('accepts hex in every length', () => {
    for (const text of ['#fff', '#ffff', '#3b82f6', '#3b82f680', ' #3B82F6 ']) {
      expect(isValidCssColor(text)).toBe(true);
    }
  });

  it('accepts colour functions and the two colour words', () => {
    for (const text of ['rgb(59 130 246)', 'rgba(0,0,0,.5)', 'hsl(217 91% 60%)', 'transparent', 'currentColor']) {
      expect(isValidCssColor(text)).toBe(true);
    }
  });

  it('rejects half-typed and unknown values so they are never saved', () => {
    for (const text of ['', '   ', '#', '#12', '#12345', '#gggggg', 'blu', 'red', 'rgb(', 'rgb()', '3b82f6']) {
      expect(isValidCssColor(text)).toBe(false);
    }
  });
});
