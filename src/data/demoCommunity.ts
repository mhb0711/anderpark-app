import type { NeedType } from '../types';

// Sample content shown in Friends and the Task Board when Supabase isn't
// configured — lets the community features read as populated and real
// instead of an empty "not connected" state, while staying honestly
// labeled as preview data in the UI. See useFriends.ts / useTaskBoard.ts.

export interface DemoFriend {
  id: string;
  username: string;
  nickname: string;
  appearanceId: string;
  level: number;
  streakCount: number;
  longestStreak: number;
  hyenaHighScore: number;
  hyenaLevelReached: number;
  berryHighScore: number;
  berryLevelReached: number;
}

export const DEMO_FRIENDS: DemoFriend[] = [
  {
    id: 'demo-sadie',
    username: 'sadie_owl',
    nickname: 'Hoot',
    appearanceId: 'owl',
    level: 6,
    streakCount: 9,
    longestStreak: 14,
    hyenaHighScore: 2200,
    hyenaLevelReached: 4,
    berryHighScore: 3100,
    berryLevelReached: 3,
  },
  {
    id: 'demo-panda',
    username: 'panda_prime',
    nickname: 'Mochi',
    appearanceId: 'panda',
    level: 8,
    streakCount: 21,
    longestStreak: 21,
    hyenaHighScore: 4100,
    hyenaLevelReached: 6,
    berryHighScore: 5200,
    berryLevelReached: 5,
  },
  {
    id: 'demo-jmiles',
    username: 'jmiles',
    nickname: 'Ziggy',
    appearanceId: 'zebra',
    level: 4,
    streakCount: 3,
    longestStreak: 6,
    hyenaHighScore: 900,
    hyenaLevelReached: 2,
    berryHighScore: 1400,
    berryLevelReached: 2,
  },
  {
    id: 'demo-taylorw',
    username: 'taylorw',
    nickname: 'Duke',
    appearanceId: 'wolf',
    level: 2,
    streakCount: 1,
    longestStreak: 4,
    hyenaHighScore: 300,
    hyenaLevelReached: 1,
    berryHighScore: 500,
    berryLevelReached: 1,
  },
];

// A short bench of appearances + names used to mint a plausible-looking
// friend on the fly when someone "adds" one in preview mode.
const DEMO_APPEARANCE_POOL = ['fox', 'hamster', 'giraffe', 'turtle', 'cat', 'deer', 'hippo', 'crab'];
const DEMO_NICKNAME_POOL = ['Scout', 'Pixel', 'Marlow', 'Ren', 'Coco', 'Finn', 'Wren', 'Otis'];

export function mintDemoFriend(username: string): DemoFriend {
  const seed = [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return {
    id: `demo-${username}-${Date.now()}`,
    username,
    nickname: DEMO_NICKNAME_POOL[seed % DEMO_NICKNAME_POOL.length],
    appearanceId: DEMO_APPEARANCE_POOL[seed % DEMO_APPEARANCE_POOL.length],
    level: 1,
    streakCount: 0,
    longestStreak: 0,
    hyenaHighScore: 0,
    hyenaLevelReached: 1,
    berryHighScore: 0,
    berryLevelReached: 1,
  };
}

export interface DemoSharedTask {
  id: string;
  needType: NeedType;
  label: string;
  restoreAmount: number;
  username: string;
  useCount: number;
}

export const DEMO_SHARED_TASKS: DemoSharedTask[] = [
  { id: 'demo-t1', needType: 'food', label: 'Meal-prepped for the week', restoreAmount: 8, username: 'panda_prime', useCount: 14 },
  { id: 'demo-t2', needType: 'water', label: 'Drank a full bottle before noon', restoreAmount: 4, username: 'sadie_owl', useCount: 9 },
  { id: 'demo-t3', needType: 'rest', label: 'In bed before midnight', restoreAmount: 6, username: 'jmiles', useCount: 22 },
  { id: 'demo-t4', needType: 'health', label: 'Went for a 20-minute walk', restoreAmount: 5, username: 'taylorw', useCount: 7 },
  { id: 'demo-t5', needType: 'shelter', label: 'Cleared the desk before bed', restoreAmount: 4, username: 'panda_prime', useCount: 11 },
  { id: 'demo-t6', needType: 'weather', label: 'Packed a jacket, checked the forecast', restoreAmount: 3, username: 'sadie_owl', useCount: 5 },
];
