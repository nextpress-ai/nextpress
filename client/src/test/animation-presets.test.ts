import { describe, it, expect } from 'vitest';
import {
  entryPresets,
  hoverPresets,
  loopPresets,
  generateHoverAnimationCSS,
  generateLoopAnimationCSS,
  generateBlockAnimationCSS,
  getEntryAnimationAttributes,
} from '@/lib/animation-presets';
import type { EntryAnimation, HoverAnimation, LoopAnimation, BlockAnimation } from '@shared/schema-types';

describe('Animation Presets', () => {
  describe('Preset Arrays', () => {
    it('entryPresets should have 28 items with valid structure', () => {
      expect(entryPresets).toHaveLength(28);
      entryPresets.forEach((preset) => {
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.label).toBe('string');
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.label.length).toBeGreaterThan(0);
      });
      const names = entryPresets.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('hoverPresets should have 13 items with valid structure', () => {
      expect(hoverPresets).toHaveLength(13);
      hoverPresets.forEach((preset) => {
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.label).toBe('string');
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.label.length).toBeGreaterThan(0);
      });
      const names = hoverPresets.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('loopPresets should have 11 items with valid structure', () => {
      expect(loopPresets).toHaveLength(11);
      loopPresets.forEach((preset) => {
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.label).toBe('string');
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.label.length).toBeGreaterThan(0);
      });
      const names = loopPresets.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('generateHoverAnimationCSS', () => {
    it('should generate correct hover CSS', () => {
      const hover: HoverAnimation = { name: 'pulse' };
      const result = generateHoverAnimationCSS('123', hover);
      expect(result).toBe('.block-123:hover { animation: pulse 1s both; }');
    });
  });

  describe('generateLoopAnimationCSS', () => {
    it('should generate loop CSS without entry', () => {
      const loop: LoopAnimation = { name: 'bounce' };
      const result = generateLoopAnimationCSS('456', loop, false);
      expect(result).toBe('.block-456 { animation: bounce 1s infinite both; }');
    });

    it('should generate loop CSS with entry', () => {
      const loop: LoopAnimation = { name: 'bounce' };
      const result = generateLoopAnimationCSS('456', loop, true);
      expect(result).toBe('.block-456.np-entry-played { animation: bounce 1s infinite both; }');
    });
  });

  describe('generateBlockAnimationCSS', () => {
    it('should generate hover only', () => {
      const animation: BlockAnimation = { hover: { name: 'pulse' } };
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('.block-789:hover { animation: pulse 1s both; }');
    });

    it('should generate loop only without entry', () => {
      const animation: BlockAnimation = { loop: { name: 'bounce' } };
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('.block-789 { animation: bounce 1s infinite both; }');
    });

    it('should generate hover and loop', () => {
      const animation: BlockAnimation = { hover: { name: 'pulse' }, loop: { name: 'bounce' } };
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('.block-789:hover { animation: pulse 1s both; }\n.block-789 { animation: bounce 1s infinite both; }');
    });

    it('should return empty string for entry only', () => {
      const animation: BlockAnimation = { entry: { name: 'fadeIn' } };
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('');
    });

    it('should return empty string for empty animation', () => {
      const animation: BlockAnimation = {};
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('');
    });

    it('should generate hover and loop with entry', () => {
      const animation: BlockAnimation = { entry: { name: 'fadeIn' }, hover: { name: 'pulse' }, loop: { name: 'bounce' } };
      const result = generateBlockAnimationCSS('789', animation);
      expect(result).toBe('.block-789:hover { animation: pulse 1s both; }\n.block-789.np-entry-played { animation: bounce 1s infinite both; }');
    });
  });

  describe('getEntryAnimationAttributes', () => {
    it('should return default attributes', () => {
      const entry: EntryAnimation = { name: 'fadeIn' };
      const result = getEntryAnimationAttributes(entry);
      expect(result).toEqual({
        'data-np-entry': 'fadeIn',
        'data-np-entry-duration': '1000',
        'data-np-entry-once': 'true',
      });
    });

    it('should handle custom duration', () => {
      const entry: EntryAnimation = { name: 'fadeIn', duration: 500 };
      const result = getEntryAnimationAttributes(entry);
      expect(result).toEqual({
        'data-np-entry': 'fadeIn',
        'data-np-entry-duration': '500',
        'data-np-entry-once': 'true',
      });
    });

    it('should handle custom delay', () => {
      const entry: EntryAnimation = { name: 'fadeIn', delay: 200 };
      const result = getEntryAnimationAttributes(entry);
      expect(result).toEqual({
        'data-np-entry': 'fadeIn',
        'data-np-entry-duration': '1000',
        'data-np-entry-delay': '200',
        'data-np-entry-once': 'true',
      });
    });

    it('should not include delay if zero', () => {
      const entry: EntryAnimation = { name: 'fadeIn', delay: 0 };
      const result = getEntryAnimationAttributes(entry);
      expect(result).toEqual({
        'data-np-entry': 'fadeIn',
        'data-np-entry-duration': '1000',
        'data-np-entry-once': 'true',
      });
    });

    it('should handle once false', () => {
      const entry: EntryAnimation = { name: 'fadeIn', once: false };
      const result = getEntryAnimationAttributes(entry);
      expect(result).toEqual({
        'data-np-entry': 'fadeIn',
        'data-np-entry-duration': '1000',
        'data-np-entry-once': 'false',
      });
    });
  });
});