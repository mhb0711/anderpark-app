import { useEffect, useRef, useState } from 'react';
import type { InteractionAnim } from '../data/decorations';

const MIN_LEFT = 4;
const MAX_LEFT = 88;
const MIN_BOTTOM = 4;
const MAX_BOTTOM = 36;

// The ground band (where decorations live) is 46% of the screen height —
// see AnderPark's `h-[46%]` — so a decoration's ground-relative bottom% has
// to be scaled down to line up with the character's screen-relative bottom%.
const GROUND_HEIGHT_FRAC = 0.46;

export interface DecorationSpot {
  lineId: string;
  left: number;
  bottom: number;
  verb: string;
  emoji: string;
  anim: InteractionAnim;
  reaction: string;
}

export interface Activity {
  lineId: string;
  verb: string;
  emoji: string;
  anim: InteractionAnim;
  reaction: string;
}

interface WanderState {
  left: number;
  bottom: number;
  duration: number;
  easing: string;
  jumping: boolean;
  activity: Activity | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Drives one character's position as a small random walk: pause and look
// around, stroll to a nearby spot, do a couple of playful hops — or, if
// anything's been placed in the park, wander over and actually use it for a
// bit (bounce on the trampoline, nap in the doghouse, splash in the pond)
// before moving on. Like a little sim reacting to whatever's in its space.
export function useWander(seedLeft: number, seedBottom: number, decorations: DecorationSpot[]): WanderState {
  const [state, setState] = useState<WanderState>({
    left: seedLeft,
    bottom: seedBottom,
    duration: 0,
    easing: 'ease-in-out',
    jumping: false,
    activity: null,
  });
  const timeoutRef = useRef<number | undefined>(undefined);
  const decorationsRef = useRef(decorations);
  decorationsRef.current = decorations;

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = (currentLeft: number, currentBottom: number) => {
      const spots = decorationsRef.current;
      const roll = Math.random();

      if (spots.length > 0 && roll < 0.22) {
        const spot = spots[Math.floor(Math.random() * spots.length)];
        const targetLeft = clamp(spot.left + (Math.random() - 0.5) * 6, MIN_LEFT, MAX_LEFT);
        const targetBottom = clamp(spot.bottom * GROUND_HEIGHT_FRAC, MIN_BOTTOM, MAX_BOTTOM);
        const travel = clamp(1.5 + Math.abs(targetLeft - currentLeft) / 18, 1.5, 5);

        setState({
          left: targetLeft,
          bottom: targetBottom,
          duration: travel,
          easing: 'ease-in-out',
          jumping: false,
          activity: null,
        });

        timeoutRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setState((s) => ({
            ...s,
            activity: { lineId: spot.lineId, verb: spot.verb, emoji: spot.emoji, anim: spot.anim, reaction: spot.reaction },
          }));
          const useDuration = 2200 + Math.random() * 1800;
          timeoutRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setState((s) => ({ ...s, activity: null }));
            scheduleNext(targetLeft, targetBottom);
          }, useDuration);
        }, travel * 1000);
        return;
      }

      let waitMs: number;
      if (roll < 0.52) {
        // pause and look around
        waitMs = 900 + Math.random() * 1800;
        setState((s) => ({ ...s, duration: 0, jumping: false }));
      } else if (roll < 0.78) {
        // slow stroll to a nearby spot — varies depth (bottom) as much as
        // horizontal position, so it reads as walking around the grass band
        // rather than sliding along a single fixed row.
        const distance = 12 + Math.random() * 30;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const nextLeft = clamp(currentLeft + distance * direction, MIN_LEFT, MAX_LEFT);
        const nextBottom = clamp(currentBottom + (Math.random() - 0.5) * 22, MIN_BOTTOM, MAX_BOTTOM);
        const duration = 3 + Math.random() * 3.5;
        setState((s) => ({ ...s, left: nextLeft, bottom: nextBottom, duration, easing: 'ease-in-out', jumping: false }));
        waitMs = duration * 1000;
        currentLeft = nextLeft;
        currentBottom = nextBottom;
      } else {
        // a couple of quick playful hops, with a bit of vertical jitter too
        const distance = 5 + Math.random() * 9;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const nextLeft = clamp(currentLeft + distance * direction, MIN_LEFT, MAX_LEFT);
        const nextBottom = clamp(currentBottom + (Math.random() - 0.5) * 12, MIN_BOTTOM, MAX_BOTTOM);
        const duration = 0.35 + Math.random() * 0.2;
        setState((s) => ({
          ...s,
          left: nextLeft,
          bottom: nextBottom,
          duration,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          jumping: true,
        }));
        waitMs = duration * 1000 + 150;
        currentLeft = nextLeft;
        currentBottom = nextBottom;
      }

      timeoutRef.current = window.setTimeout(() => {
        if (!cancelled) scheduleNext(currentLeft, currentBottom);
      }, waitMs);
    };

    const initialDelay = Math.random() * 4000;
    timeoutRef.current = window.setTimeout(() => scheduleNext(seedLeft, seedBottom), initialDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutRef.current);
    };
    // Intentionally runs once per mounted character; seedLeft/seedBottom are
    // only a starting point, and decorationsRef always tracks the latest list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
