import { dateKey } from '../data/streak';
import type { Character, TaskLogEntry } from '../types';
import { NeedIcon } from './NeedIcon';

interface Props {
  character: Character;
  onClose: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(key: string, today: string, yesterday: string): string {
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// character.taskLog is already newest-first, so grouping in a Map while
// walking it in order naturally keeps the date groups (and every entry
// within each group) in the same newest-first order.
function groupByDate(entries: TaskLogEntry[]): Map<string, TaskLogEntry[]> {
  const groups = new Map<string, TaskLogEntry[]>();
  for (const entry of entries) {
    const key = dateKey(new Date(entry.completedAt));
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}

export function ActivityLogModal({ character, onClose }: Props) {
  const now = new Date();
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86_400_000));
  const groups = groupByDate(character.taskLog);
  const totalRestored = character.taskLog.reduce((sum, e) => sum + e.restored, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">Activity Log</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>
        <p className="mb-4 text-xs text-emerald-500">
          {character.taskLog.length === 0
            ? 'Nothing logged yet.'
            : `${character.taskLog.length} task${character.taskLog.length === 1 ? '' : 's'} logged all-time · +${totalRestored} total`}
        </p>

        {character.taskLog.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-center text-sm text-emerald-500">
            Every task you log shows up here, grouped by day.
          </p>
        ) : (
          <div className="space-y-5">
            {Array.from(groups.entries()).map(([key, entries]) => (
              <div key={key}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">
                  {formatDateLabel(key, today, yesterday)}
                </h3>
                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rounded-2xl border border-emerald-100 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                          <NeedIcon needType={entry.needType} size={14} />
                          {entry.taskLabel}
                        </span>
                        <span className="shrink-0 text-xs text-emerald-500">{formatTime(entry.completedAt)}</span>
                      </div>
                      {entry.note && <p className="text-sm text-emerald-700">"{entry.note}"</p>}
                      <p className="mt-1 text-xs font-semibold text-emerald-500">+{entry.restored}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
