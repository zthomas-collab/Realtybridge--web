import { expect, it } from 'vitest';
import { fileMatchesFilter } from '@/lib/domain/admin-files';

it('tracks active selected matches as matched files', () => {
  expect(fileMatchesFilter({ status: 'active' }, 'matched')).toBe(true);
  expect(fileMatchesFilter({ status: 'completed' }, 'matched')).toBe(false);
});

it('tracks confirmed completed files as closed without counting cancellations as sold', () => {
  expect(fileMatchesFilter({ status: 'completed' }, 'closed')).toBe(true);
  expect(fileMatchesFilter({ status: 'active' }, 'closed')).toBe(false);
  expect(fileMatchesFilter({ status: 'cancelled' }, 'closed')).toBe(false);
});

it('retains cancelled files separately and includes every match in history', () => {
  expect(fileMatchesFilter({ status: 'cancelled' }, 'cancelled')).toBe(true);
  expect(fileMatchesFilter({ status: 'completed' }, 'cancelled')).toBe(false);
  for (const status of ['active', 'completed', 'cancelled'] as const) expect(fileMatchesFilter({ status }, 'all')).toBe(true);
});