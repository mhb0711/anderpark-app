import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useState } from 'react';
import { ABILITIES, hasAbility } from '../data/abilities';
import { APPEARANCES, getAppearance } from '../data/appearances';
import { GOAL_PRESETS, tasksForGoal } from '../data/goalPresets';
import { NEED_DEFINITIONS, XP_PER_LEVEL } from '../data/needs';
import { displayStreak } from '../data/streak';
import { STRUGGLE_GRACE_HOURS, struggleDrainRatePerHour, vitalityStage, type VitalityStage } from '../data/vitality';
import type { GoalDraft } from '../hooks/useCharacter';
import { useRequireTaskNote } from '../hooks/useRequireTaskNote';
import type { Character, GoalTask, NeedType } from '../types';
import { NeedIcon } from './NeedIcon';

const vitalityColors: Record<VitalityStage, { text: string; bar: string }> = {
  thriving: { text: 'text-amber-600', bar: 'bg-amber-400' },
  healthy: { text: 'text-emerald-700', bar: 'bg-emerald-500' },
  struggling: { text: 'text-orange-600', bar: 'bg-orange-500' },
  critical: { text: 'text-rose-600', bar: 'bg-rose-600' },
};

const vitalityStageLabel: Record<VitalityStage, string> = {
  thriving: 'Thriving',
  healthy: 'Healthy',
  struggling: 'Struggling',
  critical: 'Critical',
};

const vitalityStageBlurb: Record<VitalityStage, string> = {
  thriving: "Sustained great care — tasks pay 10% more while this lasts.",
  healthy: 'Overall wellbeing looks steady.',
  struggling: 'Needs have been low for a while — this is starting to take a toll.',
  critical: "This has gone on too long. Without real attention, they won't make it.",
};

interface Props {
  character: Character;
  onClose: () => void;
  onCompleteTask: (needType: NeedType, taskId: string, note: string) => number;
  onAddCustomTask: (needType: NeedType, label: string, restoreAmount: number) => void;
  onActivateNeed: (needType: NeedType, draft: GoalDraft) => void;
  onUpdateCharacter: (updates: { appearanceId?: string; nickname?: string }) => void;
  onReset: () => void;
  onOpenDailyLog?: () => void;
}

function playCompletionFeedback() {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Medium });
  }
}

function TaskRow({
  task,
  onComplete,
  requireNote,
}: {
  task: GoalTask;
  onComplete: (note: string) => number;
  requireNote: boolean;
}) {
  const [celebrating, setCelebrating] = useState(false);
  const [awarded, setAwarded] = useState(task.restoreAmount);
  const [logging, setLogging] = useState(false);
  const [note, setNote] = useState('');

  const logTask = (finalNote: string) => {
    playCompletionFeedback();
    const reward = onComplete(finalNote);
    setAwarded(reward);
    setCelebrating(true);
    setLogging(false);
    setNote('');
    setTimeout(() => setCelebrating(false), 700);
  };

  const submit = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    logTask(trimmed);
  };

  // With notes required, tapping "+" opens the note field; with them
  // optional, it logs immediately with no note — the simpler one-tap flow.
  const handleTap = () => {
    if (requireNote) setLogging(true);
    else logTask('');
  };

  const lucky = celebrating && awarded !== task.restoreAmount;

  if (logging) {
    return (
      <li className="rounded-xl border border-emerald-300 bg-emerald-50/60 px-3 py-2.5">
        <p className="mb-1.5 text-sm font-medium text-emerald-800">{task.label}</p>
        <p className="mb-1.5 text-[11px] text-emerald-500">What did you actually do? A sentence is enough.</p>
        <div className="flex gap-2">
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') setLogging(false);
            }}
            placeholder="e.g. read chapter 3 of..."
            className="flex-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
          />
          <button
            onClick={submit}
            disabled={!note.trim()}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
          >
            Log it
          </button>
        </div>
        <button
          onClick={() => {
            setLogging(false);
            setNote('');
          }}
          className="mt-1.5 text-[11px] text-emerald-400 hover:text-emerald-600"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li
      className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-emerald-100 px-3 py-2 ${
        celebrating ? 'animate-task-complete' : ''
      }`}
    >
      <button
        onClick={handleTap}
        aria-label={`Log: ${task.label}`}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold transition ${
          celebrating
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-emerald-300 text-emerald-500 hover:bg-emerald-50'
        }`}
      >
        {celebrating ? '✓' : '+'}
      </button>
      <span className="flex-1 text-sm text-emerald-800">{task.label}</span>
      <span className="text-xs font-semibold text-emerald-500">+{task.restoreAmount}</span>
      {celebrating && (
        <span className="pointer-events-none absolute right-3 top-1 animate-float-up-fade text-sm font-bold text-emerald-600">
          {lucky ? `🍀 +${awarded}!` : `+${awarded}`}
        </span>
      )}
    </li>
  );
}

function ActivateNeedForm({
  needType,
  onActivate,
}: {
  needType: NeedType;
  onActivate: (needType: NeedType, draft: GoalDraft) => void;
}) {
  const def = NEED_DEFINITIONS.find((d) => d.id === needType)!;
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState<{ label: string; restoreAmount: number }[]>([]);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskReward, setTaskReward] = useState(5);

  const addTask = (label: string, restoreAmount: number) => {
    if (tasks.some((t) => t.label === label)) return;
    setTasks((prev) => [...prev, { label, restoreAmount }]);
  };

  const canActivate = title.trim().length > 0 && tasks.length > 0;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {GOAL_PRESETS.map((preset) => (
          <button
            key={preset.title}
            onClick={() => {
              setTitle(preset.title);
              setTasks([]);
            }}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              title === preset.title
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
            }`}
          >
            {preset.title}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`e.g. what keeps their ${def.label.toLowerCase()} up`}
        className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
      />
      <div className="flex flex-wrap gap-2">
        {tasksForGoal(title).map((task) => {
          const added = tasks.some((t) => t.label === task.label);
          return (
            <button
              key={task.label}
              disabled={added}
              onClick={() => addTask(task.label, task.restoreAmount)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
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
      {tasks.length > 0 && (
        <ul className="space-y-1">
          {tasks.map((t, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-emerald-100 px-2 py-1">
              <span className="text-xs text-emerald-800">{t.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600">+{t.restoreAmount}</span>
                <button
                  onClick={() => setTasks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-rose-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={taskLabel}
          onChange={(e) => setTaskLabel(e.target.value)}
          placeholder="Something else..."
          className="flex-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
        />
        <input
          type="number"
          min={1}
          max={20}
          value={taskReward}
          onChange={(e) => setTaskReward(Number(e.target.value))}
          className="w-14 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => {
            const label = taskLabel.trim();
            if (!label) return;
            addTask(label, Math.max(1, taskReward));
            setTaskLabel('');
            setTaskReward(5);
          }}
          className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
        >
          Add
        </button>
      </div>
      <button
        disabled={!canActivate}
        onClick={() => onActivate(needType, { title: title.trim(), tasks })}
        className="w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
      >
        Start tracking {def.label}
      </button>
    </div>
  );
}

function CharacterEditForm({
  character,
  onSave,
  onCancel,
}: {
  character: Character;
  onSave: (updates: { appearanceId?: string; nickname?: string }) => void;
  onCancel: () => void;
}) {
  const [appearanceId, setAppearanceId] = useState(character.appearanceId);
  const [nickname, setNickname] = useState(character.nickname);

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="mb-3 grid grid-cols-3 gap-2">
        {APPEARANCES.map((a) => (
          <button
            key={a.id}
            onClick={() => setAppearanceId(a.id)}
            className={`rounded-xl border-2 p-2 text-center transition ${
              appearanceId === a.id ? 'border-emerald-500 bg-white' : 'border-transparent bg-white/60'
            }`}
          >
            <img src={a.image} alt={a.name} className="mx-auto h-10 w-10 object-contain" />
          </button>
        ))}
      </div>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        className="mb-3 w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-emerald-700">
          Cancel
        </button>
        <button
          disabled={!nickname.trim()}
          onClick={() => onSave({ appearanceId, nickname: nickname.trim() })}
          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function CharacterDetailModal({
  character,
  onClose,
  onCompleteTask,
  onAddCustomTask,
  onActivateNeed,
  onUpdateCharacter,
  onReset,
  onOpenDailyLog,
}: Props) {
  const appearance = getAppearance(character.appearanceId);
  const { requireNote } = useRequireTaskNote();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [expandedInactiveNeed, setExpandedInactiveNeed] = useState<NeedType | null>(null);
  const activeNeedDefs = NEED_DEFINITIONS.filter((def) => character.needs[def.id]);
  const inactiveNeedDefs = NEED_DEFINITIONS.filter((def) => !character.needs[def.id]);
  const [taskDraft, setTaskDraft] = useState<Partial<Record<NeedType, { label: string; reward: number }>>>({});
  const canEditCharacter = hasAbility(character.level, 'edit-character');
  const streak = displayStreak(character.streak, new Date());
  const stage = vitalityStage(character.vitality);
  const drainRate = struggleDrainRatePerHour(stage, character.streak.count);
  const pastGrace =
    character.strugglingSince !== null && (Date.now() - character.strugglingSince) / 3_600_000 > STRUGGLE_GRACE_HOURS;
  const isDraining = pastGrace && (drainRate.coins > 0 || drainRate.xp > 0);

  const draftFor = (needType: NeedType) => taskDraft[needType] ?? { label: '', reward: 5 };

  const handleAddTask = (needType: NeedType) => {
    const draft = draftFor(needType);
    const label = draft.label.trim();
    if (!label) return;
    onAddCustomTask(needType, label, Math.max(1, draft.reward));
    setTaskDraft((prev) => ({ ...prev, [needType]: { label: '', reward: 5 } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={appearance.image} alt={appearance.name} className="h-14 w-14 object-contain" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold text-emerald-900">{character.nickname}</h2>
                {canEditCharacter && !editingCharacter && (
                  <button
                    onClick={() => setEditingCharacter(true)}
                    aria-label="Edit character"
                    className="text-sm text-emerald-400 hover:text-emerald-600"
                  >
                    ✎
                  </button>
                )}
              </div>
              <p className="text-xs text-emerald-600">Level {character.level}</p>
              {character.streak.lastActiveDay !== '' && (
                <p
                  className={`text-xs font-semibold ${
                    streak.broken ? 'text-emerald-400' : streak.atRisk ? 'text-amber-500' : 'text-orange-500'
                  }`}
                >
                  🔥 {streak.count}-day streak
                  {streak.atRisk ? ' — log a task today!' : ''}
                  {streak.broken ? ' — start a new one today' : ''}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>

        {editingCharacter && (
          <CharacterEditForm
            character={character}
            onCancel={() => setEditingCharacter(false)}
            onSave={(updates) => {
              onUpdateCharacter(updates);
              setEditingCharacter(false);
            }}
          />
        )}

        <div className="mb-4 rounded-2xl border border-emerald-100 p-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className={vitalityColors[stage].text}>
              {vitalityStageLabel[stage]} {stage === 'thriving' ? '✨' : stage === 'critical' ? '⚠️' : ''}
            </span>
            <span className="text-emerald-500">{Math.round(character.vitality)}/100</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${vitalityColors[stage].bar}`}
              style={{ width: `${character.vitality}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-emerald-500">{vitalityStageBlurb[stage]}</p>
          {isDraining && (
            <p className="mt-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-600">
              ⚠ Losing ~{drainRate.coins}c and {drainRate.xp} XP per hour while this lasts
            </p>
          )}
          {stage !== 'healthy' && stage !== 'thriving' && !pastGrace && (
            <p className="mt-1.5 text-[11px] text-amber-600">
              Fix this soon — coins and XP start draining after {STRUGGLE_GRACE_HOURS}h here.
            </p>
          )}
        </div>

        <div className="mb-5">
          <div className="mb-1 flex justify-between text-xs font-medium text-emerald-700">
            <span>XP</span>
            <span>
              {Math.round(character.xp)}/{XP_PER_LEVEL}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(character.xp / XP_PER_LEVEL) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-5">
          {activeNeedDefs.map((def) => {
            const state = character.needs[def.id]!;
            const goal = character.goals[def.id]!;
            const draft = draftFor(def.id);
            return (
              <div key={def.id} className="rounded-2xl border border-emerald-100 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                    <NeedIcon needType={def.id} size={18} />
                    {def.label}
                  </span>
                  <span className="text-xs font-medium text-rose-600">{Math.round(state.level)}/100</span>
                </div>
                <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-rose-100">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all"
                    style={{ width: `${state.level}%` }}
                  />
                </div>
                <p className="mb-2 text-xs text-emerald-600">Goal: {goal.title}</p>

                <ul className="mb-2 space-y-1.5">
                  {goal.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      requireNote={requireNote}
                      onComplete={(note) => onCompleteTask(def.id, task.id, note)}
                    />
                  ))}
                </ul>

                <details className="rounded-xl border border-dashed border-emerald-200 p-2">
                  <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
                    + Add your own task
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={draft.label}
                      onChange={(e) =>
                        setTaskDraft((prev) => ({ ...prev, [def.id]: { ...draftFor(def.id), label: e.target.value } }))
                      }
                      placeholder="New task"
                      className="flex-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={draft.reward}
                      onChange={(e) =>
                        setTaskDraft((prev) => ({
                          ...prev,
                          [def.id]: { ...draftFor(def.id), reward: Number(e.target.value) },
                        }))
                      }
                      className="w-14 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleAddTask(def.id)}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                </details>
              </div>
            );
          })}
        </div>

        {inactiveNeedDefs.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-emerald-900">Track another need</h3>
            <div className="space-y-2">
              {inactiveNeedDefs.map((def) => (
                <div key={def.id} className="rounded-2xl border border-dashed border-emerald-200 p-3">
                  <button
                    onClick={() => setExpandedInactiveNeed((prev) => (prev === def.id ? null : def.id))}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-emerald-800"
                  >
                    <span className="flex items-center gap-1.5">
                      <NeedIcon needType={def.id} size={16} />
                      {def.label} <span className="font-normal text-emerald-500">— {def.blurb}</span>
                    </span>
                    <span className="text-emerald-400">{expandedInactiveNeed === def.id ? '–' : '+'}</span>
                  </button>
                  {expandedInactiveNeed === def.id && (
                    <ActivateNeedForm
                      needType={def.id}
                      onActivate={(needType, draft) => {
                        onActivateNeed(needType, draft);
                        setExpandedInactiveNeed(null);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-emerald-900">Abilities</h3>
          <ul className="space-y-1.5">
            {ABILITIES.map((ability) => {
              const unlocked = character.level >= ability.level;
              return (
                <li
                  key={ability.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    unlocked ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-100 bg-white opacity-60'
                  }`}
                >
                  <span className="text-lg">{unlocked ? ability.emoji : '🔒'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-900">{ability.name}</p>
                    <p className="text-[11px] text-emerald-600">{ability.description}</p>
                  </div>
                  {!unlocked && <span className="text-[10px] font-semibold text-emerald-400">Lv{ability.level}</span>}
                </li>
              );
            })}
          </ul>
        </div>

        {character.taskLog.length > 0 && (
          <div className="mb-4 mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-900">Recent activity</h3>
              {onOpenDailyLog && (
                <button onClick={onOpenDailyLog} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                  View today's log
                </button>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-emerald-600">
              {character.taskLog.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-start gap-1.5">
                  <NeedIcon needType={entry.needType} size={12} />
                  <span>
                    <span className="font-medium text-emerald-800">{entry.taskLabel}</span> — +{entry.restored}
                    {entry.note && <span className="block text-emerald-500">"{entry.note}"</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {confirmingReset ? (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-center">
            <p className="mb-2 text-sm text-rose-800">Release {character.nickname}? This can't be undone.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-full px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
              >
                Cancel
              </button>
              <button
                onClick={onReset}
                className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Release
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-4 w-full text-center text-xs text-rose-400 hover:text-rose-600"
          >
            Release this character
          </button>
        )}
      </div>
    </div>
  );
}
