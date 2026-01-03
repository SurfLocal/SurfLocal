/**
 * Utils Tests
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../../../src/lib/utils';

describe('cn (className merge utility)', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active')).toBe('base active');
    expect(cn('base', false && 'active')).toBe('base');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('should handle empty strings', () => {
    expect(cn('base', '', 'end')).toBe('base end');
  });

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should handle conflicting classes
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('should handle objects', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('should handle complex combinations', () => {
    const result = cn(
      'base-class',
      true && 'conditional-true',
      false && 'conditional-false',
      { 'object-true': true, 'object-false': false },
      ['array-class']
    );
    expect(result).toContain('base-class');
    expect(result).toContain('conditional-true');
    expect(result).not.toContain('conditional-false');
    expect(result).toContain('object-true');
    expect(result).not.toContain('object-false');
    expect(result).toContain('array-class');
  });
});
