import type { Match } from '@/lib/types';

export type FileFilter = 'all' | 'matched' | 'closed' | 'cancelled';

export function fileMatchesFilter(match: Pick<Match, 'status'>, filter: FileFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'matched') return match.status === 'active';
  if (filter === 'closed') return match.status === 'completed';
  return match.status === 'cancelled';
}