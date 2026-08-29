interface Props {
  onPlaySpaceDefender: () => void;
  onClose: () => void;
}

// Launcher for minigames — currently just the one, but built as a picker so
// more can be dropped in later without reworking the entry point.
export function GamesModal({ onPlaySpaceDefender, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Games</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>

        <button
          onClick={onPlaySpaceDefender}
          className="flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-left transition hover:border-emerald-300"
        >
          <div>
            <p className="text-sm font-semibold text-emerald-900">Space Defender</p>
            <p className="text-xs text-emerald-600">Your character defends the park from a wave of invaders.</p>
          </div>
          <span className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Play</span>
        </button>
      </div>
    </div>
  );
}
