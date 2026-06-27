import { describe, it, expect } from 'vitest';
import {
  tokenColors,
  tokenSpacing,
  tokenFontSize,
  tokenFontWeight,
  tokenBorderRadius,
  tokenScreens,
  unitCategories,
  propertyUnitCategoryMap,
  propertyAliasMap,
  stateModifierMap,
  resolveTokenValue,
  composeCustomValue,
  resolveTokenMap,
  camelToKebab,
  resolveModifierEntry,
  generateBlockModifierCSS,
} from '@/lib/tailwind-tokens';
import type { TokenEntry } from '@shared/schema-types';

describe('Token Data Exports', () => {
  it('tokenColors should be an object with color keys', () => {
    expect(typeof tokenColors).toBe('object');
    expect(tokenColors).toHaveProperty('red');
    expect(tokenColors).toHaveProperty('blue');
    expect(tokenColors).toHaveProperty('primary');
    expect(typeof tokenColors.red).toBe('object');
    expect(tokenColors.red).toHaveProperty('500');
    expect(typeof tokenColors.red['500']).toBe('string');
    expect(tokenColors.red['500']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('tokenSpacing should have standard spacing scale keys', () => {
    expect(typeof tokenSpacing).toBe('object');
    expect(tokenSpacing).toHaveProperty('0');
    expect(tokenSpacing).toHaveProperty('1');
    expect(tokenSpacing).toHaveProperty('2');
    expect(tokenSpacing).toHaveProperty('4');
    expect(tokenSpacing).toHaveProperty('8');
    expect(typeof tokenSpacing['4']).toBe('string');
  });

  it('tokenFontSize should have size keys', () => {
    expect(typeof tokenFontSize).toBe('object');
    expect(tokenFontSize).toHaveProperty('sm');
    expect(tokenFontSize).toHaveProperty('base');
    expect(tokenFontSize).toHaveProperty('lg');
    expect(tokenFontSize).toHaveProperty('xl');
    expect(Array.isArray(tokenFontSize.sm)).toBe(true);
    expect(tokenFontSize.sm.length).toBe(2);
  });

  it('tokenFontWeight should have weight keys', () => {
    expect(typeof tokenFontWeight).toBe('object');
    expect(tokenFontWeight).toHaveProperty('normal');
    expect(tokenFontWeight).toHaveProperty('bold');
    expect(typeof tokenFontWeight.bold).toBe('string');
  });

  it('tokenBorderRadius should have radius keys', () => {
    expect(typeof tokenBorderRadius).toBe('object');
    expect(tokenBorderRadius).toHaveProperty('none');
    expect(tokenBorderRadius).toHaveProperty('lg');
    expect(typeof tokenBorderRadius.lg).toBe('string');
  });

  it('tokenScreens should have breakpoint keys', () => {
    expect(typeof tokenScreens).toBe('object');
    expect(tokenScreens).toHaveProperty('sm');
    expect(tokenScreens).toHaveProperty('md');
    expect(tokenScreens).toHaveProperty('lg');
    expect(typeof tokenScreens.md).toBe('string');
  });

  it('unitCategories should have correct structure', () => {
    expect(unitCategories).toEqual({
      spacing: ['px', 'rem', 'em', '%'],
      font: ['px', 'rem', 'em'],
      dimension: ['px', 'rem', '%', 'vw', 'vh', 'dvh', 'dvw', 'svh'],
      border: ['px', 'rem', '%'],
    });
  });

  it('propertyUnitCategoryMap should map properties correctly', () => {
    expect(propertyUnitCategoryMap.paddingTop).toBe('spacing');
    expect(propertyUnitCategoryMap.fontSize).toBe('font');
    expect(propertyUnitCategoryMap.width).toBe('dimension');
    expect(propertyUnitCategoryMap.borderRadius).toBe('border');
  });

  it('propertyAliasMap should map properties to aliases', () => {
    expect(propertyAliasMap.backgroundColor).toBe('bg');
    expect(propertyAliasMap.paddingTop).toBe('pt');
    expect(propertyAliasMap.fontSize).toBe('text');
  });

  it('stateModifierMap should have correct pseudo-selectors', () => {
    expect(stateModifierMap.hover).toBe(':hover');
    expect(stateModifierMap.focus).toBe(':focus');
    expect(stateModifierMap.active).toBe(':active');
  });
});

describe('resolveTokenValue', () => {
  it('should resolve color with variant', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg' };
    const result = resolveTokenValue(entry);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should resolve color string without variant', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: 'black', variant: null, alias: 'bg' };
    const result = resolveTokenValue(entry);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should resolve spacing', () => {
    const entry: TokenEntry = { property: 'paddingTop', value: '4', variant: null, alias: 'pt', unitCategory: 'spacing' };
    const result = resolveTokenValue(entry);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d+(px|rem|em|%)/);
  });

  it('should resolve font size', () => {
    const entry: TokenEntry = { property: 'fontSize', value: 'lg', variant: null, alias: 'text' };
    const result = resolveTokenValue(entry);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should resolve font weight', () => {
    const entry: TokenEntry = { property: 'fontWeight', value: 'bold', variant: null, alias: 'font' };
    const result = resolveTokenValue(entry);
    expect(result).toBe('700');
  });

  it('should resolve border radius', () => {
    const entry: TokenEntry = { property: 'borderRadius', value: 'lg', variant: null, alias: 'rounded' };
    const result = resolveTokenValue(entry);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should return null for empty value', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: '', variant: null, alias: 'bg' };
    const result = resolveTokenValue(entry);
    expect(result).toBeNull();
  });

  it('should return null for unknown color', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: 'nonexistent', variant: null, alias: 'bg' };
    const result = resolveTokenValue(entry);
    expect(result).toBeNull();
  });
});

describe('composeCustomValue', () => {
  it('should compose with unit', () => {
    const entry: TokenEntry = { property: 'paddingTop', value: '16', variant: null, alias: 'pt', style: '16', unitCategory: 'spacing' };
    const units = { spacing: 'px' };
    const result = composeCustomValue(entry, units);
    expect(result).toBe('16px');
  });

  it('should return style directly for color', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: '#ff0000', variant: null, alias: 'bg', style: '#ff0000' };
    const units = {};
    const result = composeCustomValue(entry, units);
    expect(result).toBe('#ff0000');
  });

  it('should return null if no style', () => {
    const entry: TokenEntry = { property: 'backgroundColor', value: 'red', variant: null, alias: 'bg' };
    const units = {};
    const result = composeCustomValue(entry, units);
    expect(result).toBeNull();
  });

  it('should use style directly if no matching unit', () => {
    const entry: TokenEntry = { property: 'paddingTop', value: '16', variant: null, alias: 'pt', style: '16px', unitCategory: 'spacing' };
    const units = { font: 'rem' };
    const result = composeCustomValue(entry, units);
    expect(result).toBe('16px');
  });
});

describe('resolveTokenMap', () => {
  it('should resolve mix of base and modifier entries', () => {
    const tokenMap: Record<string, TokenEntry> = {
      bg: { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg' },
      pt: { property: 'paddingTop', value: '4', variant: null, alias: 'pt', unitCategory: 'spacing', modifier: 'hover' },
    };
    const units = { spacing: 'rem' };
    const result = resolveTokenMap(tokenMap, units);
    expect(result.style).toHaveProperty('backgroundColor');
    expect(result.modifierEntries).toHaveLength(1);
  });

  it('should resolve all base entries', () => {
    const tokenMap: Record<string, TokenEntry> = {
      bg: { property: 'backgroundColor', value: 'blue', variant: '500', alias: 'bg' },
      text: { property: 'fontSize', value: 'lg', variant: null, alias: 'text' },
    };
    const units = {};
    const result = resolveTokenMap(tokenMap, units);
    expect(result.style).toHaveProperty('backgroundColor');
    expect(result.style).toHaveProperty('fontSize');
    expect(result.modifierEntries).toEqual([]);
  });

  it('should handle empty tokenMap', () => {
    const tokenMap: Record<string, TokenEntry> = {};
    const units = {};
    const result = resolveTokenMap(tokenMap, units);
    expect(result.style).toEqual({});
    expect(result.modifierEntries).toEqual([]);
  });

  it('should resolve custom values', () => {
    const tokenMap: Record<string, TokenEntry> = {
      pt: { property: 'paddingTop', value: '', variant: null, alias: 'pt', style: '16', unitCategory: 'spacing' },
    };
    const units = { spacing: 'px' };
    const result = resolveTokenMap(tokenMap, units);
    expect(result.style.paddingTop).toBe('16px');
  });
});

describe('camelToKebab', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(camelToKebab('backgroundColor')).toBe('background-color');
    expect(camelToKebab('paddingTop')).toBe('padding-top');
    expect(camelToKebab('fontSize')).toBe('font-size');
    expect(camelToKebab('color')).toBe('color');
  });
});

describe('resolveModifierEntry', () => {
  it('should generate CSS for state modifier', () => {
    const blockId = 'test-block';
    const entry: TokenEntry = { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg', modifier: 'hover' };
    const resolvedValue = '#ef4444';
    const result = resolveModifierEntry(blockId, entry, resolvedValue);
    expect(result).toContain(`.block-test-block:hover`);
    expect(result).toContain(`background-color: #ef4444;`);
  });

  it('should generate CSS for responsive modifier', () => {
    const blockId = 'test-block';
    const entry: TokenEntry = { property: 'paddingTop', value: '4', variant: null, alias: 'pt', modifier: 'md' };
    const resolvedValue = '1rem';
    const result = resolveModifierEntry(blockId, entry, resolvedValue);
    expect(result).toContain('@media');
    expect(result).toContain('.block-test-block');
    expect(result).toContain('padding-top: 1rem;');
  });

  it('should return empty string for no modifier', () => {
    const blockId = 'test-block';
    const entry: TokenEntry = { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg' };
    const resolvedValue = '#ef4444';
    const result = resolveModifierEntry(blockId, entry, resolvedValue);
    expect(result).toBe('');
  });

  it('should return empty string for unknown modifier', () => {
    const blockId = 'test-block';
    const entry: TokenEntry = { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg', modifier: 'unknown' };
    const resolvedValue = '#ef4444';
    const result = resolveModifierEntry(blockId, entry, resolvedValue);
    expect(result).toBe('');
  });
});

describe('generateBlockModifierCSS', () => {
  it('should generate CSS for multiple modifier entries', () => {
    const blockId = 'test-block';
    const modifierEntries = [
      { entry: { property: 'backgroundColor', value: 'red', variant: '500', alias: 'bg', modifier: 'hover' }, resolvedValue: '#ef4444' },
      { entry: { property: 'paddingTop', value: '4', variant: null, alias: 'pt', modifier: 'md' }, resolvedValue: '1rem' },
    ];
    const result = generateBlockModifierCSS(blockId, modifierEntries);
    expect(result).toContain('.block-test-block:hover');
    expect(result).toContain('@media');
  });

  it('should return empty string for empty array', () => {
    const blockId = 'test-block';
    const modifierEntries: { entry: TokenEntry; resolvedValue: string }[] = [];
    const result = generateBlockModifierCSS(blockId, modifierEntries);
    expect(result).toBe('');
  });

  it('should handle mix of state and responsive modifiers', () => {
    const blockId = 'test-block';
    const modifierEntries = [
      { entry: { property: 'color', value: 'black', variant: null, alias: 'text', modifier: 'focus' }, resolvedValue: '#000' },
      { entry: { property: 'fontSize', value: 'lg', variant: null, alias: 'text', modifier: 'lg' }, resolvedValue: '1.125rem' },
    ];
    const result = generateBlockModifierCSS(blockId, modifierEntries);
    expect(result).toContain(':focus');
    expect(result).toContain('@media');
  });
});