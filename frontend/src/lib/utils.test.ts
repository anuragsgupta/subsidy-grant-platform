import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatCurrency } from './utils';

describe('cn', () => {
  it('merges class names without conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional class names', () => {
    const condition = false;
    expect(cn('base', condition && 'skipped', 'added')).toBe('base added');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string to dd MMM yyyy', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
  });

  it('formats a Date object with a custom format', () => {
    expect(formatDate(new Date(2026, 0, 15), 'yyyy/MM/dd')).toBe('2026/01/15');
  });
});

describe('formatCurrency', () => {
  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toMatch(/₹|INR/);
  });

  it('formats a typical grant amount', () => {
    const result = formatCurrency(50000);
    expect(result).toMatch(/50,000/);
  });
});
