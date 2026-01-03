/**
 * formatNumber Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { formatStatNumber } from '../../../src/lib/formatNumber';

describe('formatStatNumber', () => {
  describe('numbers less than 1000', () => {
    it('should return the number as a string', () => {
      expect(formatStatNumber(0)).toBe('0');
      expect(formatStatNumber(1)).toBe('1');
      expect(formatStatNumber(100)).toBe('100');
      expect(formatStatNumber(999)).toBe('999');
    });

    it('should handle edge case at 999', () => {
      expect(formatStatNumber(999)).toBe('999');
    });
  });

  describe('numbers equal to or greater than 1000', () => {
    it('should format 1000 as "1k"', () => {
      expect(formatStatNumber(1000)).toBe('1k');
    });

    it('should format with one decimal place', () => {
      expect(formatStatNumber(1100)).toBe('1.1k');
      expect(formatStatNumber(1200)).toBe('1.2k');
      expect(formatStatNumber(1500)).toBe('1.5k');
      expect(formatStatNumber(1900)).toBe('1.9k');
    });

    it('should round down to nearest 0.1', () => {
      expect(formatStatNumber(1260)).toBe('1.2k');
      expect(formatStatNumber(1299)).toBe('1.2k');
      expect(formatStatNumber(1350)).toBe('1.3k');
      expect(formatStatNumber(1399)).toBe('1.3k');
    });

    it('should not show decimal for whole thousands', () => {
      expect(formatStatNumber(2000)).toBe('2k');
      expect(formatStatNumber(5000)).toBe('5k');
      expect(formatStatNumber(10000)).toBe('10k');
    });

    it('should handle larger numbers', () => {
      expect(formatStatNumber(10500)).toBe('10.5k');
      expect(formatStatNumber(15000)).toBe('15k');
      expect(formatStatNumber(99999)).toBe('99.9k');
      expect(formatStatNumber(100000)).toBe('100k');
    });

    it('should handle very large numbers', () => {
      expect(formatStatNumber(1000000)).toBe('1000k');
      expect(formatStatNumber(1500000)).toBe('1500k');
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 1000', () => {
      expect(formatStatNumber(1000)).toBe('1k');
    });

    it('should handle 1001', () => {
      expect(formatStatNumber(1001)).toBe('1k');
    });

    it('should handle 1099', () => {
      expect(formatStatNumber(1099)).toBe('1k');
    });

    it('should handle 1100', () => {
      expect(formatStatNumber(1100)).toBe('1.1k');
    });
  });
});
