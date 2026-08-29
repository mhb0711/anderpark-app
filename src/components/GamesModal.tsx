interface Props {
  onPlayHyenaDefense: () => void;
  onOpenScoreboard: () => void;
  onClose: () => void;
}

// Launcher for minigames — currently just the one, but built as a picker so
// more can be dropped in later without reworking the entry point.
export function GamesModal({ onPlayHyenaDefense, onOpenScoreboard, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Games</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>

        <div className="flex w-full items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <button onClick={onPlayHyenaDefense} className="flex-1 text-left">
            <p className="text-sm font-semibold text-emerald-900">Hyena Defense</p>
            <p className="text-xs text-emerald-600">Your character fends off a pack of hyenas, wave after wave.</p>
          </button>
          <button
            onClick={onOpenScoreboard}
            title="Scoreboard"
            className="shrink-0 rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            🏆
          </button>
          <button onClick={onPlayHyenaDefense} className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
            Play
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-emerald-500">
          Full coin reward once a day — replays after that earn a small 10% top-up.
        </p>
      </div>
    </div>
  );
}
