interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

export function RestartConfirmModal({ onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-rose-900">Restart AnderPark?</h2>
        <p className="mb-5 text-sm text-rose-700">
          This deletes your pet, park, coins, and all progress — for good. This can't be undone.
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
