import { useState } from 'react';
import { APPEARANCES } from '../data/appearances';
import { GOAL_PRESETS, tasksForGoal } from '../data/goalPresets';
import { NEED_DEFINITIONS } from '../data/needs';
import { NeedIcon } from './NeedIcon';
import type { NeedType } from '../types';
import type { GoalDraft } from '../hooks/useCharacter';

interface Props {
  onCreate: (appearanceId: string, nickname: string, activeNeeds: NeedType[], goals: Partial<Record<NeedType, GoalDraft>>) => void;
}

interface GoalItem {
  id: string;
  title: string;
  needType: NeedType;
}

// One flat pool of goal ideas — no goal is "for" any particular need. Which
// need a goal ends up feeding is decided purely by which slot is next open
// when you add it, never by the goal's content, so adding one goal never
// locks out an unrelated one.
const SUGGESTIONS: string[] = GOAL_PRESETS.map((p) => p.title);

// Step 0 = appearance + name, step 1 = collect goals (each auto-tagged to a
// need on add), steps 2..N = tasks for each goal.
export function OnboardingModal({ onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [appearanceId, setAppearanceId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [goalItems, setGoalItems] = useState<GoalItem[]>([]);
  const [customGoalText, setCustomGoalText] = useState('');
  const [tasksByGoal, setTasksByGoal] = useState<Record<string, { label: string; restoreAmount: number }[]>>({});
  const [taskLabel, setTaskLabel] = useState('');
  const [taskReward, setTaskReward] = useState(5);

  const takenNeeds = new Set(goalItems.map((g) => g.needType));
  const nextFreeNeed = NEED_DEFINITIONS.find((def) => !takenNeeds.has(def.id))?.id ?? null;

  // Every goal — preset or custom — lands wherever the next open slot is.
  // No goal is disabled because of what some *other* goal happened to claim.
  const addGoal = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || nextFreeNeed === null) return;
    setGoalItems((prev) => [...prev, { id: crypto.randomUUID(), title: trimmed, needType: nextFreeNeed }]);
  };

  const removeGoal = (id: string) => {
    setGoalItems((prev) => prev.filter((g) => g.id !== id));
  };

  const taskStepIndex = step - 2;
  const currentGoal = taskStepIndex >= 0 ? goalItems[taskStepIndex] : null;
  const currentNeedDef = currentGoal ? NEED_DEFINITIONS.find((d) => d.id === currentGoal.needType)! : null;
  const isLastStep = goalItems.length > 0 && step === 1 + goalItems.length;

  const currentTasks = currentGoal ? (tasksByGoal[currentGoal.id] ?? []) : [];

  const addTaskToCurrent = (label: string, restoreAmount: number) => {
    if (!currentGoal) return;
    setTasksByGoal((prev) => {
      const existing = prev[currentGoal.id] ?? [];
      if (existing.some((t) => t.label === label)) return prev;
      return { ...prev, [currentGoal.id]: [...existing, { label, restoreAmount }] };
    });
  };

  const removeTask = (index: number) => {
    if (!currentGoal) return;
    setTasksByGoal((prev) => ({
      ...prev,
      [currentGoal.id]: (prev[currentGoal.id] ?? []).filter((_, i) => i !== index),
    }));
  };

  const canAdvanceFromIntro = !!appearanceId && nickname.trim().length > 0;
  const canAdvanceFromGoals = goalItems.length > 0;
  const canAdvanceFromTasks = currentTasks.length > 0;

  const canAdvance = step === 0 ? canAdvanceFromIntro : step === 1 ? canAdvanceFromGoals : canAdvanceFromTasks;

  const handleNext = () => {
    if (isLastStep) {
      const activeNeeds = goalItems.map((g) => g.needType);
      const goals: Partial<Record<NeedType, GoalDraft>> = {};
      for (const g of goalItems) {
        goals[g.needType] = { title: g.title, tasks: tasksByGoal[g.id] ?? [] };
      }
      onCreate(appearanceId!, nickname.trim(), activeNeeds, goals);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {step === 0 && (
          <>
            <h2 className="mb-1 text-2xl font-bold text-emerald-900">Create Your Character</h2>
            <p className="mb-4 text-sm text-emerald-700">
              This is the one character you'll be keeping alive. Pick a look and give them a name.
            </p>

            <div className="mb-5 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
              {APPEARANCES.map((appearance) => (
                <button
                  key={appearance.id}
                  onClick={() => setAppearanceId(appearance.id)}
                  className={`relative rounded-2xl border-2 p-2 text-center transition ${
                    appearanceId === appearance.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-transparent bg-emerald-50/50 hover:border-emerald-200'
                  }`}
                >
                  {appearance.placeholderArt && (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-100 px-1 text-[8px] font-bold uppercase tracking-wide text-amber-700">
                      WIP
                    </span>
                  )}
                  <img src={appearance.image} alt={appearance.name} className="mx-auto h-14 w-14 object-contain" />
                  <div className="mt-1 text-xs font-semibold text-emerald-900">{appearance.name}</div>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-semibold text-emerald-700">
              Name
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Give your character a name"
                maxLength={20}
                className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-500"
              />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="mb-1 text-2xl font-bold text-emerald-900">What are you working on?</h2>
            <p className="mb-4 text-sm text-emerald-700">
              Add whatever you want to stay accountable for — tap a suggestion or write your own. You can add up to
              six.
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((title) => {
                const added = goalItems.some((g) => g.title === title);
                const noRoomLeft = !added && nextFreeNeed === null;
                return (
                  <button
                    key={title}
                    disabled={added || noRoomLeft}
                    onClick={() => addGoal(title)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      added
                        ? 'cursor-default border-emerald-200 bg-emerald-100 text-emerald-400'
                        : noRoomLeft
                          ? 'cursor-not-allowed border-emerald-100 bg-emerald-50/50 text-emerald-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                    }`}
                  >
                    {added ? '✓ ' : '+ '}
                    {title}
                  </button>
                );
              })}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                value={customGoalText}
                onChange={(e) => setCustomGoalText(e.target.value)}
                placeholder="Something else..."
                className="flex-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                disabled={!customGoalText.trim() || nextFreeNeed === null}
                onClick={() => {
                  addGoal(customGoalText);
                  setCustomGoalText('');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
              >
                Add
              </button>
            </div>
            {nextFreeNeed === null && goalItems.length > 0 && (
              <p className="mb-4 -mt-2 text-xs text-emerald-500">You've added the max of six.</p>
            )}

            {goalItems.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-emerald-700">Your goals</p>
                <ul className="space-y-2">
                  {goalItems.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between rounded-xl border border-emerald-100 px-3 py-2"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-emerald-800">
                        <NeedIcon needType={g.needType} size={14} />
                        {g.title}
                      </span>
                      <button
                        onClick={() => removeGoal(g.id)}
                        className="text-xs text-rose-400 hover:text-rose-600"
                        aria-label="Remove goal"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {currentGoal && currentNeedDef && (
          <>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Goal {taskStepIndex + 1} of {goalItems.length} · <NeedIcon needType={currentNeedDef.id} size={13} />{' '}
              {currentNeedDef.label}
            </p>
            <h2 className="mb-4 text-2xl font-bold text-emerald-900">
              What counts as progress on "{currentGoal.title}"?
            </h2>

            <p className="mb-2 text-xs font-semibold text-emerald-700">Common tasks — tap to add</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {tasksForGoal(currentGoal.title).map((task) => {
                const added = currentTasks.some((t) => t.label === task.label);
                return (
                  <button
                    key={task.label}
                    disabled={added}
                    onClick={() => addTaskToCurrent(task.label, task.restoreAmount)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      added
                        ? 'cursor-default border-emerald-200 bg-emerald-100 text-emerald-400'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                    }`}
                  >
                    {added ? '✓ ' : '+ '}
                    {task.label}
                  </button>
                );
              })}
            </div>

            {currentTasks.length > 0 && (
              <ul className="mb-3 space-y-2">
                {currentTasks.map((task, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-emerald-100 px-3 py-2"
                  >
                    <span className="text-sm text-emerald-800">{task.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600">+{task.restoreAmount}</span>
                      <button
                        onClick={() => removeTask(i)}
                        className="text-xs text-rose-400 hover:text-rose-600"
                        aria-label="Remove task"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mb-4 flex gap-2">
              <input
                value={taskLabel}
                onChange={(e) => setTaskLabel(e.target.value)}
                placeholder="Something else..."
                className="flex-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                min={1}
                max={20}
                value={taskReward}
                onChange={(e) => setTaskReward(Number(e.target.value))}
                className="w-16 rounded-lg border border-emerald-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  const label = taskLabel.trim();
                  if (!label) return;
                  addTaskToCurrent(label, Math.max(1, taskReward));
                  setTaskLabel('');
                  setTaskReward(5);
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:text-emerald-200"
          >
            Back
          </button>
          <button
            disabled={!canAdvance}
            onClick={handleNext}
            className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-emerald-200"
          >
            {isLastStep ? 'Bring them to life' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
