import { useCallback, useEffect, useState } from 'react';
import { dateKey } from '../data/streak';

const STORAGE_KEY = 'anderpark-game-progress';

// 10% because full rewards every time would let someone farm coins by
// replaying the same quick minigame over and over instead of doing real
// tasks — one full-reward run a day, small consolation runs after that.
const REPEAT_REWARD_FRACTION = 0.1;

export interface GameProgressEntry {
  bestScore: number;
  bestLevel: number;
  /** Local YYYY-MM-DD of the last full-reward run, '' if never played. */
  lastFullRewardDay: string;
}

type GameProgressState = Record<string, GameProgressEntry>;

function defaultEntry(): GameProgressEntry {
  return { bestScore: 0, bestLevel: 1, lastFullRewardDay: '' };
}

function load(): GameProgressState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GameProgressState;
  } catch {
    return {};
  }
}

export interface RunResult {
  coins: number;
  isFullReward: boolean;
  newBestScore: boolean;
}

export function useGameProgress() {
  const [state, setState] = useState<GameProgressState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getEntry = useCallback((gameId: string): GameProgressEntry => state[gameId] ?? defaultEntry(), [state]);

  // Call once when a run ends. Applies the daily full/reduced reward rule
  // and updates the personal best, returning what to show the player.
  const recordRun = useCallback(
    (gameId: string, finalScore: number, finalLevel: number, fullReward: number): RunResult => {
      const entry = state[gameId] ?? defaultEntry();
      const today = dateKey(new Date());
      const isFullReward = entry.lastFullRewardDay !== today;
      const coins = isFullReward ? fullReward : Math.round(fullReward * REPEAT_REWARD_FRACTION);
      const newBestScore = finalScore > entry.bestScore;

      setState((prev) => ({
        ...prev,
        [gameId]: {
          bestScore: Math.max(entry.bestScore, finalScore),
          bestLevel: Math.max(entry.bestLevel, finalLevel),
          lastFullRewardDay: isFullReward ? today : entry.lastFullRewardDay,
        },
      }));

      return { coins, isFullReward, newBestScore };
    },
    [state],
  );

  return { getEntry, recordRun };
}
