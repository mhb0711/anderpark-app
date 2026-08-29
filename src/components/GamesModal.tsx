interface GameRow {
  name: string;
  description: string;
  onPlay: () => void;
  onScoreboard: () => void;
}

interface Props {
  onPlayHyenaDefense: () => void;
  onScoreboardHyenaDefense: () => void;
  onPlayBerryChase: () => void;
  onScoreboardBerryChase: () => void;
  onClose: () => void;
}

export function GamesModal({
  onPlayHyenaDefense,
  onScoreboardHyenaDefense,
  onPlayBerryChase,
  onScoreboardBerryChase,
  onClose,
}: Props) {
  const games: GameRow[] = [
    {
      name: 'Hyena Defense',
      description: 'Your character fends off a pack of hyenas, wave after wave.',
      onPlay: onPlayHyenaDefense,
      onScoreboard: onScoreboardHyenaDefense,
    },
    {
      name: 'Berry Berry Chase',
      description: 'Clear the maze of berries while hyenas hunt you down.',
      onPlay: onPlayBerryChase,
      onScoreboard: onScoreboardBerryChase,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Games</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>

        <div className="space-y-2">
          {games.map((game) => (
            <div
              key={game.name}
              className="flex w-full items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
            >
              <button onClick={game.onPlay} className="flex-1 text-left">
                <p className="text-sm font-semibold text-emerald-900">{game.name}</p>
                <p className="text-xs text-emerald-600">{game.description}</p>
              </button>
              <button
                onClick={game.onScoreboard}
                title="Scoreboard"
                className="shrink-0 rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                🏆
              </button>
              <button onClick={game.onPlay} className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                Play
              </button>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-emerald-500">
          Full coin reward once a day per game — replays after that earn a small 10% top-up.
        </p>
      </div>
    </div>
  );
}
