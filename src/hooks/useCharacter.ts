import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasAbility } from '../data/abilities';
import { type Activity, awayActivityCount, pickAwayActivities } from '../data/awayActivities';
import { recordLegacyEntry } from '../data/legacy';
import { XP_PER_LEVEL, getNeedDefinition } from '../data/needs';
import { loadCharacter, saveCharacter } from '../data/storage';
import { advanceStreak, isFirstCompletionToday } from '../data/streak';
import {
  averageNeedLevel,
  computeStruggleDrain,
  driftVitality,
  thrivingMultiplier,
  vitalityStage,
  type VitalityStage,
} from '../data/vitality';
import type { Character, Goal, NeedType } from '../types';

export interface AwayReport {
  activities: Activity[];
  stage: VitalityStage;
  lostCoins: number;
  lostXp: number;
}

// Advances need decay, vitality, and struggle-drain together for however
// much real time has passed. Vitality drifts toward the needs' average,
// bounded per hour — see data/vitality.ts for why. Returns died=true the
// moment vitality bottoms out, so callers can record a legacy entry and end
// the run. Coin drain is returned separately (not applied here) since coins
// live in the park, not the character.
function applyTimePassage(
  character: Character,
  now: number,
): { character: Character; died: boolean; drainedCoins: number; drainedXp: number } {
  const needs = { ...character.needs };
  let needsChanged = false;

  for (const needType of Object.keys(needs) as NeedType[]) {
    const state = needs[needType]!;
    const minutesElapsed = (now - state.lastUpdatedAt) / 60_000;
    if (minutesElapsed <= 0) continue;
    const decayPerMinute = getNeedDefinition(needType).decayPerMinute;
    const level = Math.max(0, state.level - minutesElapsed * decayPerMinute);
    needs[needType] = { level, lastUpdatedAt: now };
    needsChanged = true;
  }

  const hoursElapsed = (now - character.lastUpdatedAt) / 3_600_000;
  const vitality = driftVitality(character.vitality, averageNeedLevel(needs), hoursElapsed);
  const vitalityChanged = vitality !== character.vitality;

  const drain = computeStruggleDrain(
    character.strugglingSince,
    character.lastUpdatedAt,
    now,
    vitality,
    character.streak.count,
  );

  let xp = character.xp;
  let level = character.level;
  if (drain.drainedXp > 0) {
    xp -= drain.drainedXp;
    while (xp < 0 && level > 1) {
      level -= 1;
      xp += XP_PER_LEVEL;
    }
    if (level === 1 && xp < 0) xp = 0;
  }

  const xpChanged = xp !== character.xp || level !== character.level;
  const strugglingSinceChanged = drain.strugglingSince !== character.strugglingSince;

  if (!needsChanged && !vitalityChanged && !xpChanged && !strugglingSinceChanged) {
    return { character, died: false, drainedCoins: 0, drainedXp: 0 };
  }

  const updated: Character = {
    ...character,
    needs,
    vitality,
    xp,
    level,
    strugglingSince: drain.strugglingSince,
    lastUpdatedAt: now,
  };
  return { character: updated, died: vitality <= 0, drainedCoins: drain.drainedCoins, drainedXp: drain.drainedXp };
}

// The single place that reacts to "real time passed since we last looked" —
// used on cold start, the foreground tick, and app-resume alike, so death,
// away-activity detection, and struggle-drain all behave identically no
// matter how the gap happened. coinsDelta always reflects any drain from
// this call (applied silently tick-to-tick); the away report only surfaces
// it in a modal when the gap was long enough to also show away-activities —
// no popup for the ordinary 30-second foreground tick.
function processTimePassage(
  prev: Character,
  now: number,
): { character: Character | null; deceased: Character | null; awayReport: AwayReport | null; coinsDelta: number } {
  const { character: updated, died, drainedCoins, drainedXp } = applyTimePassage(prev, now);
  if (died) {
    recordLegacyEntry(updated);
    // No drain on death — the character already paid the ultimate cost.
    return { character: null, deceased: updated, awayReport: null, coinsDelta: 0 };
  }

  const hoursAway = (now - prev.lastUpdatedAt) / 3_600_000;
  const count = awayActivityCount(hoursAway);
  const awayReport =
    count > 0
      ? { activities: pickAwayActivities(count), stage: vitalityStage(updated.vitality), lostCoins: drainedCoins, lostXp: drainedXp }
      : null;

  return { character: updated, deceased: null, awayReport, coinsDelta: -drainedCoins };
}

export interface GoalDraft {
  title: string;
  tasks: { label: string; restoreAmount: number }[];
}

function buildGoal(needType: NeedType, draft: GoalDraft): Goal {
  return {
    needType,
    title: draft.title,
    tasks: draft.tasks.map((t) => ({ id: crypto.randomUUID(), label: t.label, restoreAmount: t.restoreAmount })),
  };
}

// `onCoinsDrained` is called (with a negative amount) whenever struggle-drain
// takes coins — the character hook owns vitality/XP, but coins live in the
// park, so this is how the two stay in sync without merging the two stores.
export function useCharacter(onCoinsDrained?: (amount: number) => void) {
  const onCoinsDrainedRef = useRef(onCoinsDrained);
  onCoinsDrainedRef.current = onCoinsDrained;

  const [deceased, setDeceased] = useState<Character | null>(null);
  const [awayReport, setAwayReport] = useState<AwayReport | null>(null);
  const [character, setCharacter] = useState<Character | null>(() => {
    const loaded = loadCharacter();
    if (!loaded) return null;
    const result = processTimePassage(loaded, Date.now());
    // setState during the initializer isn't safe — defer to right after mount.
    if (result.deceased) queueMicrotask(() => setDeceased(result.deceased));
    else if (result.awayReport) queueMicrotask(() => setAwayReport(result.awayReport));
    if (result.coinsDelta) queueMicrotask(() => onCoinsDrainedRef.current?.(result.coinsDelta));
    return result.character;
  });
  const [leveledUp, setLeveledUp] = useState(false);
  const characterRef = useRef(character);
  characterRef.current = character;

  useEffect(() => {
    saveCharacter(character);
  }, [character]);

  // Computed from characterRef (not a setCharacter functional updater) and
  // side effects fired directly here, not from inside one — a setState
  // updater isn't guaranteed to run synchronously, and calling other
  // setState functions from inside one is unsafe under React 18 batching.
  const tick = useCallback(() => {
    const prev = characterRef.current;
    if (!prev) return;
    const result = processTimePassage(prev, Date.now());
    if (result.deceased) setDeceased(result.deceased);
    else if (result.awayReport) setAwayReport(result.awayReport);
    if (result.coinsDelta) onCoinsDrainedRef.current?.(result.coinsDelta);
    setCharacter(result.character);
  }, []);

  // Keep need bars (and vitality) ticking in real time while the app is open.
  useEffect(() => {
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [tick]);

  // Also react the moment the app comes back to the foreground — native apps
  // often survive backgrounding without the JS context (and this hook's
  // interval) ever restarting, so "away" needs its own trigger, not just
  // cold start.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) tick();
      });
      return () => {
        listenerPromise.then((l) => l.remove());
      };
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [tick]);

  const createCharacter = useCallback(
    (appearanceId: string, nickname: string, activeNeeds: NeedType[], goalDrafts: Partial<Record<NeedType, GoalDraft>>) => {
      const now = Date.now();
      const needs: Character['needs'] = {};
      const goals: Character['goals'] = {};
      for (const needType of activeNeeds) {
        const draft = goalDrafts[needType];
        if (!draft) continue;
        needs[needType] = { level: 80, lastUpdatedAt: now };
        goals[needType] = buildGoal(needType, draft);
      }

      const newCharacter: Character = {
        id: crypto.randomUUID(),
        nickname,
        appearanceId,
        level: 1,
        xp: 0,
        needs,
        goals,
        taskLog: [],
        streak: { count: 0, longest: 0, lastActiveDay: '' },
        vitality: 65, // Healthy, not Thriving — that's earned, not a starting gift.
        strugglingSince: null,
        createdAt: now,
        lastUpdatedAt: now,
      };
      setCharacter(newCharacter);
    },
    [],
  );

  const resetCharacter = useCallback(() => setCharacter(null), []);
  const dismissMemorial = useCallback(() => setDeceased(null), []);
  const dismissAwayReport = useCallback(() => setAwayReport(null), []);

  // Level 7+: change appearance/name without releasing and re-onboarding.
  const updateCharacter = useCallback((updates: { appearanceId?: string; nickname?: string }) => {
    setCharacter((prev) => (prev ? { ...prev, ...updates, lastUpdatedAt: Date.now() } : prev));
  }, []);

  // Brings a previously-skipped need online later — the needs picked at setup
  // aren't permanent.
  const activateNeed = useCallback((needType: NeedType, draft: GoalDraft) => {
    setCharacter((prev) => {
      if (!prev || prev.needs[needType]) return prev;
      return {
        ...prev,
        needs: { ...prev.needs, [needType]: { level: 80, lastUpdatedAt: Date.now() } },
        goals: { ...prev.goals, [needType]: buildGoal(needType, draft) },
      };
    });
  }, []);

  // Returns the amount actually awarded (Lucky Task and/or Thriving can both
  // apply), so callers can both award coins and show accurate feedback.
  const completeTask = useCallback((needType: NeedType, taskId: string, note: string) => {
    const current = characterRef.current;
    const task = current?.goals[needType]?.tasks.find((t) => t.id === taskId);
    if (!task || !current) return 0;

    const now = new Date();
    const lucky = hasAbility(current.level, 'lucky-task') && isFirstCompletionToday(current.streak, now);
    const reward = Math.round(task.restoreAmount * (lucky ? 2 : 1) * thrivingMultiplier(current));

    setCharacter((prev) => {
      if (!prev) return prev;
      const currentNeed = prev.needs[needType];
      if (!currentNeed) return prev;
      const needs = {
        ...prev.needs,
        [needType]: { level: Math.min(100, currentNeed.level + reward), lastUpdatedAt: Date.now() },
      };

      let xp = prev.xp + reward;
      let level = prev.level;
      let didLevelUp = false;
      if (xp >= XP_PER_LEVEL) {
        xp -= XP_PER_LEVEL;
        level += 1;
        didLevelUp = true;
      }

      if (didLevelUp) {
        // Fire after this render pass so we don't setState-during-setState.
        queueMicrotask(() => setLeveledUp(true));
      }

      return {
        ...prev,
        needs,
        xp,
        level,
        streak: advanceStreak(prev.streak, now),
        taskLog: [
          {
            id: crypto.randomUUID(),
            needType,
            taskLabel: task.label,
            note,
            restored: reward,
            completedAt: Date.now(),
          },
          ...prev.taskLog,
          // High enough that the Activity Log reads as "everything you've
          // done" in practice, while still bounding localStorage growth.
        ].slice(0, 2000),
        lastUpdatedAt: Date.now(),
      };
    });
    return reward;
  }, []);

  const addCustomTask = useCallback((needType: NeedType, label: string, restoreAmount: number) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const goal = prev.goals[needType];
      if (!goal) return prev;
      return {
        ...prev,
        goals: {
          ...prev.goals,
          [needType]: {
            ...goal,
            tasks: [...goal.tasks, { id: crypto.randomUUID(), label, restoreAmount }],
          },
        },
      };
    });
  }, []);

  const dismissLevelUp = useCallback(() => setLeveledUp(false), []);

  return {
    character,
    deceased,
    dismissMemorial,
    awayReport,
    dismissAwayReport,
    createCharacter,
    resetCharacter,
    updateCharacter,
    activateNeed,
    completeTask,
    addCustomTask,
    leveledUp,
    dismissLevelUp,
    getNeedDefinition,
  };
}
