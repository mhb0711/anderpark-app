import { useState } from 'react';
import { NEED_DEFINITIONS } from '../data/needs';
import { NeedIcon } from './NeedIcon';
import type { useTaskBoard } from '../hooks/useTaskBoard';
import type { Character, NeedType } from '../types';

interface Props {
  character: Character;
  taskBoard: ReturnType<typeof useTaskBoard>;
  onAddCustomTask: (needType: NeedType, label: string, restoreAmount: number) => void;
  onClose: () => void;
}

export function TaskBoardModal({ character, taskBoard, onAddCustomTask, onClose }: Props) {
  const { enabled, ready, tasks, shareTask, useTask, removeTask } = taskBoard;
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const myTasks = (Object.values(character.goals).filter(Boolean) as NonNullable<Character['goals'][NeedType]>[]).flatMap(
    (goal) => goal.tasks.map((task) => ({ needType: goal.needType, task })),
  );

  const handleShare = async (needType: NeedType, label: string, restoreAmount: number, key: string) => {
    setSharingId(key);
    setShareError(null);
    const result = await shareTask(needType, label, restoreAmount);
    if (!result.ok) setShareError(result.error);
    setSharingId(null);
  };

  const handleAdd = async (task: (typeof tasks)[number]) => {
    onAddCustomTask(task.needType, task.label, task.restoreAmount);
    setAddedIds((prev) => new Set(prev).add(task.id));
    await useTask(task.id);
  };

  const grouped = NEED_DEFINITIONS.map((def) => ({
    def,
    entries: tasks.filter((t) => t.needType === def.id),
  })).filter((g) => g.entries.length > 0);

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

        {!enabled && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            The Task Board isn't connected yet — this needs a Supabase project. See <code>.env.example</code> and{' '}
            <code>supabase/schema.sql</code> in the repo to set one up.
          </p>
        )}

        {enabled && !ready && <p className="text-sm text-emerald-600">Connecting...</p>}

        {enabled && ready && (
          <>
            <div className="mb-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Share one of yours</h3>
              {myTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-4 text-center text-xs text-emerald-500">
                  You don't have any tasks yet — add one in your goals first.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {myTasks.map(({ needType, task }) => {
                    const key = task.id;
                    const alreadyShared = tasks.some(
                      (t) => t.ownedByMe && t.needType === needType && t.label === task.label && t.restoreAmount === task.restoreAmount,
                    );
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-emerald-900">
                          <NeedIcon needType={needType} size={14} className="shrink-0" />
                          <span className="truncate">{task.label}</span>
                          <span className="shrink-0 text-xs text-emerald-500">+{task.restoreAmount}</span>
                        </span>
                        <button
                          onClick={() => handleShare(needType, task.label, task.restoreAmount, key)}
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
              {grouped.length === 0 ? (
                <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-6 text-center text-sm text-emerald-500">
                  Nothing shared yet — be the first.
                </p>
              ) : (
                <div className="space-y-4">
                  {grouped.map(({ def, entries }) => (
                    <div key={def.id}>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <NeedIcon needType={def.id} size={13} />
                        {def.label}
                      </p>
                      <ul className="space-y-1.5">
                        {entries.map((entry) => {
                          const tracked = !!character.goals[entry.needType];
                          const added = addedIds.has(entry.id);
                          return (
                            <li
                              key={entry.id}
                              className="rounded-xl border border-emerald-100 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-emerald-900">{entry.label}</span>
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
                                ) : (
                                  <button
                                    onClick={() => handleAdd(entry)}
                                    disabled={!tracked || added}
                                    title={tracked ? undefined : `You don't track ${def.label} yet`}
                                    className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                                  >
                                    {added ? 'Added' : 'Add to my goals'}
                                  </button>
                                )}
                              </div>
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
