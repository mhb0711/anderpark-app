import { useEffect, useRef, useState } from 'react';
import { playSound } from '../lib/sound';
import { useSoundSettings } from '../hooks/useSoundSettings';

interface Props {
  colorMode: boolean;
  onToggleColorMode: () => void;
  onOpenFriends: () => void;
}

export function SettingsMenu({ colorMode, onToggleColorMode, onOpenFriends }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { volume, muted, setVolume, setMuted } = useSoundSettings();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        className="border border-white/60 bg-transparent px-3 py-2 text-white hover:bg-white/10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-500">Settings</p>

          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="sfx-volume" className="text-sm font-semibold text-emerald-900">
                Sound effects
              </label>
              <button
                onClick={() => setMuted(!muted)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
            <input
              id="sfx-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={muted}
              onChange={(e) => setVolume(Number(e.target.value))}
              onPointerUp={() => playSound('click')}
              className="w-full accent-emerald-600 disabled:opacity-40"
            />
          </div>

          <button
            onClick={() => {
              playSound('click');
              onToggleColorMode();
            }}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            <span>Park colors</span>
            <span className="text-emerald-600">{colorMode ? 'Color' : 'Mono'}</span>
          </button>

          <button
            onClick={() => {
              playSound('click');
              setOpen(false);
              onOpenFriends();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            <span>Friends</span>
            <span className="text-emerald-600">Add / link →</span>
          </button>
        </div>
      )}
    </div>
  );
}
