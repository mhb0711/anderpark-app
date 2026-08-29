import { getAppearance } from '../data/appearances';
import type { useFriends } from '../hooks/useFriends';
import type { GameProgressEntry } from '../hooks/useGameProgress';

interface Props {
  friends: ReturnType<typeof useFriends>;
  myNickname: string;
  myAppearanceId: string;
  myProgress: GameProgressEntry;
  onClose: () => void;
}

interface Row {
  id: string;
  isMe: boolean;
  nickname: string;
  appearanceId: string;
  score: number;
  level: number;
}

export function ScoreboardModal({ friends, myNickname, myAppearanceId, myProgress, onClose }: Props) {
  const { enabled, ready, username, friends: list } = friends;

  const rows: Row[] = [
    { id: 'me', isMe: true, nickname: myNickname || 'You', appearanceId: myAppearanceId, score: myProgress.bestScore, level: myProgress.bestLevel },
    ...list.map((f) => ({
      id: f.id,
      isMe: false,
      nickname: f.nickname || `@${f.username}`,
      appearanceId: f.appearanceId,
      score: f.hyenaHighScore,
      level: f.hyenaLevelReached,
    })),
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Hyena Defense Scoreboard</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>
        <p className="mb-4 text-sm text-emerald-600">Best score and level reached.</p>

        {enabled && !ready && <p className="mb-3 text-sm text-emerald-600">Connecting to friends...</p>}
        {enabled && ready && !username && (
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Claim a username in Friends to see how you stack up against them here too.
          </p>
        )}
        {!enabled && (
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Friends aren't connected yet, so this only shows your own best. See <code>.env.example</code> and{' '}
            <code>supabase/schema.sql</code> to set that up.
          </p>
        )}

        <ul className="space-y-2">
          {rows.map((row, i) => {
            const appearance = getAppearance(row.appearanceId || 'octopus');
            return (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  row.isMe ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-100 bg-emerald-50/50'
                }`}
              >
                <span className="w-5 text-center text-xs font-bold text-emerald-400">#{i + 1}</span>
                <img src={appearance.image} alt="" className="h-8 w-8 object-contain" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">
                    {row.nickname}
                    {row.isMe && ' (you)'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-emerald-700">{row.score} pts</p>
                  <p className="text-[11px] text-emerald-500">Lv{row.level}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
