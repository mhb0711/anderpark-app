import { useState } from 'react';
import { NEED_DEFINITIONS } from '../data/needs';
import { NeedIcon } from './NeedIcon';
import type { GoalDraft } from '../hooks/useCharacter';
import type { useTaskBoard } from '../hooks/useTaskBoard';
import type { Character, NeedType } from '../types';

interface Props {
  character: Character;
  taskBoard: ReturnType<typeof useTaskBoard>;
  onAddCustomTask: (needType: NeedType, label: string, restoreAmount: number) => void;
  onActivateNeed: (needType: NeedType, draft: GoalDraft) => void;
  onClose: () => void;
}

export function TaskBoardModal({ character, taskBoard, onAddCustomTask, onActivateNeed, onClose }: Props) {
  const { demoMode, ready, tasks, shareTask, useTask, removeTask } = taskBoard;
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Which board entry currently has its "add" flow expanded, plus the
  // transient form state for it — reset whenever a different entry opens.
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addToNeedType, setAddToNeedType] = useState<NeedType | ''>('');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalNeedType, setNewGoalNeedType] = useState<NeedType | ''>('');

  const existingGoals = (Object.values(character.goals).filter(Boolean) as NonNullable<Character['goals'][NeedType]>[]);
  const openNeedTypes = NEED_DEFINITIONS.map((d) => d.id).filter((id) => !character.goals[id]);

  const myTasks = existingGoals.flatMap((goal) =>
    goal.tasks.map((task) => ({ needType: goal.needType, goalTitle: goal.title, task })),
  );

  const handleShare = async (needType: NeedType, goalTitle: string, label: string, restoreAmount: number, key: string) => {
    setSharingId(key);
    setShareError(null);
    const result = await shareTask(needType, goalTitle, label, restoreAmount);
    if (!result.ok) setShareError(result.error);
    setSharingId(null);
  };

  const startAdding = (entry: (typeof tasks)[number]) => {
    setAddingId(entry.id);
    setAddToNeedType(existingGoals.length > 0 ? existingGoals[0].needType : '');
    setNewGoalTitle(entry.goalTitle || entry.label);
    setNewGoalNeedType(openNeedTypes[0] ?? '');
  };

  const cancelAdding = () => {
    setAddingId(null);
    setAddToNeedType('');
    setNewGoalTitle('');
    setNewGoalNeedType('');
  };

  const handleAddToExisting = async (entry: (typeof tasks)[number]) => {
    if (!addToNeedType) return;
    onAddCustomTask(addToNeedType, entry.label, entry.restoreAmount);
    setAddedIds((prev) => new Set(prev).add(entry.id));
    cancelAdding();
    await useTask(entry.id);
  };

  const handleCreateGoalAndAdd = async (entry: (typeof tasks)[number]) => {
    const title = newGoalTitle.trim();
    if (!title || !newGoalNeedType) return;
    onActivateNeed(newGoalNeedType, { title, tasks: [{ label: entry.label, restoreAmount: entry.restoreAmount }] });
    setAddedIds((prev) => new Set(prev).add(entry.id));
    cancelAdding();
    await useTask(entry.id);
  };

  // Grouped by the goal the task actually belongs to, not by category — a
  // goal like "Study for an exam" isn't inherently a Health goal, it just
  // happened to land in whichever slot the sharer had open.
  const groupedByGoal = Array.from(
    tasks.reduce((map, t) => {
      const key = t.goalTitle || t.label;
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
      return map;
    }, new Map<string, typeof tasks>()),
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">Task Board</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>
        <p className="mb-4 text-xs text-emerald-500">
          Publish a task you use so others can copy it, or grab one someone else already shared.
        </p>

        {!ready && <p className="text-sm text-emerald-600">Connecting...</p>}

        {ready && demoMode && (
          <p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Preview community — sample tasks so you can see how this looks. Connect Supabase (
            <code>.env.example</code>, <code>supabase/schema.sql</code>) to make it real.
          </p>
        )}

        {ready && (
          <>
            <div className="mb-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Share one of yours</h3>
              {myTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-4 text-center text-xs text-emerald-500">
                  You don't have any tasks yet — add one in your goals first.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {myTasks.map(({ needType, goalTitle, task }) => {
                    const key = task.id;
                    const alreadyShared = tasks.some(
                      (t) =>
                        t.ownedByMe &&
                        t.goalTitle === goalTitle &&
                        t.label === task.label &&
                        t.restoreAmount === task.restoreAmount,
                    );
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-emerald-900">
                          <NeedIcon needType={needType} size={14} className="shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate">{task.label}</span>
                            <span className="block truncate text-[11px] text-emerald-500">{goalTitle}</span>
                          </span>
                          <span className="shrink-0 text-xs text-emerald-500">+{task.restoreAmount}</span>
                        </span>
                        <button
                          onClick={() => handleShare(needType, goalTitle, task.label, task.restoreAmount, key)}
                          disabled={sharingId === key || alreadyShared}
                          className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {alreadyShared ? 'Shared' : sharingId === key ? 'Sharing...' : 'Share'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {shareError && <p className="mt-1.5 text-xs text-rose-500">{shareError}</p>}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Browse the board</h3>
              {groupedByGoal.length === 0 ? (
                <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-6 text-center text-sm text-emerald-500">
                  Nothing shared yet — be the first.
                </p>
              ) : (
                <div className="space-y-4">
                  {groupedByGoal.map(([goalTitle, entries]) => (
                    <div key={goalTitle}>
                      <p className="mb-1.5 text-xs font-semibold text-emerald-700">{goalTitle}</p>
                      <ul className="space-y-1.5">
                        {entries.map((entry) => {
                          const added = addedIds.has(entry.id);
                          const isAdding = addingId === entry.id;
                          return (
                            <li key={entry.id} className="rounded-xl border border-emerald-100 px-3 py-2 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-1.5 text-emerald-900">
                                  <NeedIcon needType={entry.needType} size={13} className="shrink-0" />
                                  <span className="min-w-0 truncate">{entry.label}</span>
                                </span>
                                <span className="shrink-0 text-xs text-emerald-500">+{entry.restoreAmount}</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="text-xs text-emerald-400">
                                  by @{entry.username} · used {entry.useCount}×
                                </span>
                                {entry.ownedByMe ? (
                                  <button
                                    onClick={() => removeTask(entry.id)}
                                    className="shrink-0 text-xs text-rose-400 hover:text-rose-600"
                                  >
                                    Remove
                                  </button>
                                ) : !isAdding ? (
                                  <button
                                    onClick={() => startAdding(entry)}
                                    disabled={added}
                                    className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                                  >
                                    {added ? 'Added' : 'Add to my goals'}
                                  </button>
                                ) : null}
                              </div>

                              {isAdding && (
                                <div className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                                  {existingGoals.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={addToNeedType}
                                        onChange={(e) => setAddToNeedType(e.target.value as NeedType)}
                                        className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                                      >
                                        {existingGoals.map((g) => (
                                          <option key={g.needType} value={g.needType}>
                                            {g.title}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => handleAddToExisting(entry)}
                                        className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                                      >
                                        Add here
                                      </button>
                                    </div>
                                  )}

                                  {openNeedTypes.length > 0 && (
                                    <div
                                      className={`space-y-1.5 ${existingGoals.length > 0 ? 'border-t border-emerald-200 pt-2' : ''}`}
                                    >
                                      <p className="text-[11px] text-emerald-500">Or create a new goal for it:</p>
                                      <input
                                        value={newGoalTitle}
                                        onChange={(e) => setNewGoalTitle(e.target.value)}
                                        placeholder="Goal name"
                                        className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          value={newGoalNeedType}
                                          onChange={(e) => setNewGoalNeedType(e.target.value as NeedType)}
                                          className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                                        >
                                          {openNeedTypes.map((nt) => (
                                            <option key={nt} value={nt}>
                                              {NEED_DEFINITIONS.find((d) => d.id === nt)?.label}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => handleCreateGoalAndAdd(entry)}
                                          disabled={!newGoalTitle.trim()}
                                          className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                                        >
                                          Create & add
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {existingGoals.length === 0 && openNeedTypes.length === 0 && (
                                    <p className="text-[11px] text-emerald-500">
                                      You're not tracking anything yet — set up a goal from your character first.
                                    </p>
                                  )}

                                  <button onClick={cancelAdding} className="text-[11px] text-emerald-500 hover:text-emerald-700">
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
