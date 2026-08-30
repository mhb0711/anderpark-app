import { displayStreak } from '../data/streak';
import type { Streak } from '../types';

export function StreakBadge({ streak }: { streak: Streak }) {
  if (streak.lastActiveDay === '') return null; // nothing completed yet — nothing to show

  const { count, atRisk, broken } = displayStreak(streak, new Date());
  const title = atRisk
    ? 'Complete a task today to keep your streak alive!'
    : broken
      ? 'Streak reset — start a new one today'
      : `${count}-day streak · best: ${streak.longest}`;

  return (
    <span
      title={title}
      className={`flex items-center gap-1 rounded-full border bg-black/70 px-2.5 py-1.5 font-mono text-xs font-bold backdrop-blur-sm ${
        broken
          ? 'border-white/30 text-white/50'
          : atRisk
            ? 'animate-pulse border-amber-400 text-amber-300'
            : 'border-orange-400 text-orange-300'
      }`}
    >
      🔥 {count}
    </span>
  );
}
