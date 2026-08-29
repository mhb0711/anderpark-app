import { HUNGRY_THRESHOLD, NEED_DEFINITIONS } from '../data/needs';
import { NeedIcon } from './NeedIcon';
import type { Character } from '../types';

interface Props {
  character: Character;
  onSelect: () => void;
  onOpenGames: () => void;
}

// Always-visible strip of what the character needs right now, so there's
// something to act on without first having to discover you can tap the
// sprite. Tapping any need opens the full detail/task screen.
export function NeedHud({ character, onSelect, onOpenGames }: Props) {
  const activeNeedDefs = NEED_DEFINITIONS.filter((def) => character.needs[def.id]);
  if (activeNeedDefs.length === 0) return null;

  return (
    <div className="fixed inset-x-0 z-10 flex items-center justify-center gap-2 px-3 [bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <button
        onClick={onSelect}
        className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/30 bg-black/70 px-2 py-2 backdrop-blur-sm"
      >
        {activeNeedDefs.map((def) => {
          const level = Math.round(character.needs[def.id]!.level);
          const isNeedy = level < HUNGRY_THRESHOLD;
          return (
            <span
              key={def.id}
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] ${
                isNeedy ? 'bg-rose-500/80 text-white' : 'text-white/80'
              }`}
            >
              <NeedIcon needType={def.id} size={14} />
              <span>{level}</span>
            </span>
          );
        })}
      </button>
      <button
        onClick={onOpenGames}
        title="Games"
        className="shrink-0 rounded-full border border-white/30 bg-black/70 px-3 py-2 font-mono text-[11px] font-bold text-white backdrop-blur-sm"
      >
        🎮
      </button>
    </div>
  );
}
