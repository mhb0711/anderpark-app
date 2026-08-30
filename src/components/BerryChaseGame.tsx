import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import spiderImg from '../assets/spider.png';
import { getAppearance } from '../data/appearances';
import { generateMaze, isWalkable, GRID_H, GRID_W, type Cell, type Pos } from '../data/mazeGen';
import type { GameProgressEntry, RunResult } from '../hooks/useGameProgress';
import { playSound } from '../lib/sound';

// Tints the (grayscale) spider art in color mode — a filter, not recolored
// art, matching how pet appearances handle Mono/Color. Frightened spiders
// get a distinct pale-blue tint regardless of mode, same idea as the old
// palette-swap this replaced.
const SPIDER_COLOR_FILTER = 'sepia(1) saturate(2.5) hue-rotate(-25deg) brightness(0.65)';
const SPIDER_FRIGHTENED_FILTER = 'sepia(1) saturate(4) hue-rotate(165deg) brightness(1.5)';

const PLAYER_SPEED = 4.6; // cells per second
const HYENA_SPEED = 3.7;
const HYENA_FRIGHTENED_SPEED = 2.5;
const RANDOM_TURN_CHANCE = 0.15;
const FRIGHTENED_MS = 7000;
const EATEN_RESPAWN_MS = 1500;
const STARTING_LIVES = 3;
const INITIAL_HYENAS = 2;
const MAX_HYENAS = 4;
const LEVEL_BANNER_MS = 1300;
const COLLISION_DIST = 0.6;
const BERRY_SCORE = 10;
const POWER_BERRY_SCORE = 50;
const HYENA_EATEN_SCORE = 200;

type Dir = [number, number];
const DIRS: Dir[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

interface MovingBody {
  row: number;
  col: number;
  dirR: number;
  dirC: number;
  t: number;
}

interface HyenaBody extends MovingBody {
  id: number;
  frightenedUntil: number;
  eatenUntil: number;
}

type Status = 'ready' | 'playing' | 'levelup' | 'lost';

interface GameState {
  level: number;
  grid: Cell[][];
  denCenter: Pos;
  denExits: Pos[];
  playerStart: Pos;
  totalBerries: number;
  berriesLeft: number;
  player: MovingBody & { desiredR: number; desiredC: number };
  hyenas: HyenaBody[];
  lives: number;
  score: number;
  status: Status;
  levelBannerUntil: number;
  runResult: RunResult | null;
}

function hyenaCountForLevel(level: number): number {
  return Math.min(MAX_HYENAS, INITIAL_HYENAS + Math.floor((level - 1) / 2));
}

function spawnPositions(denCenter: Pos, denExits: Pos[], count: number): Pos[] {
  const spots = [denCenter, ...denExits];
  return Array.from({ length: count }, (_, i) => spots[i % spots.length]);
}

function buildLevel(level: number, score: number, lives: number): GameState {
  const maze = generateMaze();
  const count = hyenaCountForLevel(level);
  const spots = spawnPositions(maze.denExits[0], maze.denExits.slice(1), count);
  return {
    level,
    grid: maze.grid,
    denCenter: maze.denExits[0],
    denExits: maze.denExits.slice(1),
    playerStart: maze.playerStart,
    totalBerries: maze.totalBerries,
    berriesLeft: maze.totalBerries,
    player: { row: maze.playerStart.row, col: maze.playerStart.col, dirR: 0, dirC: 0, t: 0, desiredR: 0, desiredC: 0 },
    hyenas: spots.map((s, i) => ({ id: i, row: s.row, col: s.col, dirR: 0, dirC: 0, t: 0, frightenedUntil: 0, eatenUntil: 0 })),
    lives,
    score,
    status: 'playing',
    levelBannerUntil: 0,
    runResult: null,
  };
}

function makeInitialState(): GameState {
  const s = buildLevel(1, 0, STARTING_LIVES);
  s.status = 'ready';
  return s;
}

function pickPlayerDir(grid: Cell[][], row: number, col: number, desired: Dir, current: Dir): Dir {
  if ((desired[0] !== 0 || desired[1] !== 0) && isWalkable(grid, row + desired[0], col + desired[1])) return desired;
  if ((current[0] !== 0 || current[1] !== 0) && isWalkable(grid, row + current[0], col + current[1])) return current;
  return [0, 0];
}

function pickHyenaDir(grid: Cell[][], row: number, col: number, last: Dir, targetRow: number, targetCol: number, flee: boolean): Dir {
  const options = DIRS.filter(([dr, dc]) => isWalkable(grid, row + dr, col + dc));
  const nonReverse = options.filter(([dr, dc]) => !(dr === -last[0] && dc === -last[1]));
  const candidates = nonReverse.length > 0 ? nonReverse : options;
  if (candidates.length === 0) return [0, 0];
  if (Math.random() < RANDOM_TURN_CHANCE) return candidates[Math.floor(Math.random() * candidates.length)];
  let best = candidates[0];
  let bestDist = flee ? -Infinity : Infinity;
  for (const cand of candidates) {
    const [dr, dc] = cand;
    const dist = Math.hypot(row + dr - targetRow, col + dc - targetCol);
    if (flee ? dist > bestDist : dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best;
}

interface Props {
  appearanceId: string;
  colorMode: boolean;
  progress: GameProgressEntry;
  onExit: () => void;
  onGameOver: (finalScore: number, finalLevel: number, fullReward: number) => RunResult;
}

export function BerryChaseGame({ appearanceId, colorMode, progress, onExit, onGameOver }: Props) {
  const appearance = getAppearance(appearanceId);
  const stateRef = useRef<GameState>(makeInitialState());
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const desiredDirRef = useRef<Dir>([0, 0]);
  const elapsedMsRef = useRef(0);
  const gameOverHandledRef = useRef(false);

  const start = useCallback(() => {
    stateRef.current = buildLevel(1, 0, STARTING_LIVES);
    desiredDirRef.current = [0, 0];
    elapsedMsRef.current = 0;
    gameOverHandledRef.current = false;
    bump();
  }, []);

  useEffect(() => {
    const setDir = (dr: number, dc: number) => {
      desiredDirRef.current = [dr, dc];
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDir(-1, 0);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDir(1, 0);
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDir(0, -1);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDir(0, 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetPositionsAfterHit = useCallback((s: GameState) => {
    s.player.row = s.playerStart.row;
    s.player.col = s.playerStart.col;
    s.player.dirR = 0;
    s.player.dirC = 0;
    s.player.t = 0;
    desiredDirRef.current = [0, 0];
    const spots = spawnPositions(s.denCenter, s.denExits, s.hyenas.length);
    s.hyenas.forEach((h, i) => {
      h.row = spots[i].row;
      h.col = spots[i].col;
      h.dirR = 0;
      h.dirC = 0;
      h.t = 0;
      h.frightenedUntil = 0;
      h.eatenUntil = 0;
    });
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;

      if (s.status === 'levelup') {
        elapsedMsRef.current += dt * 1000;
        if (elapsedMsRef.current > s.levelBannerUntil) {
          const next = buildLevel(s.level + 1, s.score, s.lives);
          stateRef.current = next;
        }
        bump();
        raf = requestAnimationFrame(tick);
        return;
      }

      if (s.status === 'playing') {
        elapsedMsRef.current += dt * 1000;

        // player movement
        const p = s.player;
        p.t += PLAYER_SPEED * dt;
        while (p.t >= 1) {
          p.row += p.dirR;
          p.col += p.dirC;
          p.t -= 1;
          const [dr, dc] = pickPlayerDir(s.grid, p.row, p.col, desiredDirRef.current, [p.dirR, p.dirC]);
          p.dirR = dr;
          p.dirC = dc;
          if (dr === 0 && dc === 0) {
            p.t = 0;
            break;
          }

          const cell = s.grid[p.row][p.col];
          if (cell === 2) {
            s.grid[p.row][p.col] = 1;
            s.score += BERRY_SCORE;
            s.berriesLeft -= 1;
            playSound('eat');
          } else if (cell === 3) {
            s.grid[p.row][p.col] = 1;
            s.score += POWER_BERRY_SCORE;
            s.berriesLeft -= 1;
            playSound('powerup');
            for (const h of s.hyenas) {
              if (h.eatenUntil > elapsedMsRef.current) continue;
              h.frightenedUntil = elapsedMsRef.current + FRIGHTENED_MS;
              h.dirR = -h.dirR;
              h.dirC = -h.dirC;
              h.t = 1 - h.t;
            }
          }
        }

        // hyenas
        for (const h of s.hyenas) {
          if (h.eatenUntil > elapsedMsRef.current) continue; // returning to den, paused
          if (h.eatenUntil !== 0 && h.eatenUntil <= elapsedMsRef.current) {
            // respawn
            h.row = s.denCenter.row;
            h.col = s.denCenter.col;
            h.dirR = 0;
            h.dirC = 0;
            h.t = 0;
            h.eatenUntil = 0;
            h.frightenedUntil = 0;
          }
          const frightened = h.frightenedUntil > elapsedMsRef.current;
          const speed = frightened ? HYENA_FRIGHTENED_SPEED : HYENA_SPEED;
          h.t += speed * dt;
          while (h.t >= 1) {
            h.row += h.dirR;
            h.col += h.dirC;
            h.t -= 1;
            const [dr, dc] = pickHyenaDir(s.grid, h.row, h.col, [h.dirR, h.dirC], p.row, p.col, frightened);
            h.dirR = dr;
            h.dirC = dc;
            if (dr === 0 && dc === 0) {
              h.t = 0;
              break;
            }
          }
        }

        // collisions
        const playerR = p.row + p.dirR * p.t;
        const playerC = p.col + p.dirC * p.t;
        for (const h of s.hyenas) {
          if (h.eatenUntil !== 0) continue;
          const hr = h.row + h.dirR * h.t;
          const hc = h.col + h.dirC * h.t;
          if (Math.hypot(hr - playerR, hc - playerC) < COLLISION_DIST) {
            const frightened = h.frightenedUntil > elapsedMsRef.current;
            if (frightened) {
              h.eatenUntil = elapsedMsRef.current + EATEN_RESPAWN_MS;
              s.score += HYENA_EATEN_SCORE;
              playSound('hit');
            } else {
              s.lives -= 1;
              playSound('error');
              if (s.lives <= 0) {
                s.status = 'lost';
              } else {
                resetPositionsAfterHit(s);
              }
              break;
            }
          }
        }

        if (s.status === 'playing' && s.berriesLeft <= 0) {
          s.status = 'levelup';
          s.levelBannerUntil = elapsedMsRef.current + LEVEL_BANNER_MS;
          playSound('levelup');
        }

        if (s.status === 'lost' && !gameOverHandledRef.current) {
          gameOverHandledRef.current = true;
          const fullReward = Math.round(s.score / 10);
          s.runResult = onGameOver(s.score, s.level, fullReward);
        }
      }

      bump();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onGameOver, resetPositionsAfterHit]);

  const s = stateRef.current;
  const berryColor = colorMode ? '#ffb84d' : '#cfcfcf';
  const powerColor = colorMode ? '#ff6b6b' : '#ffffff';
  const wallColor = colorMode ? '#26418f' : '#333333';

  const playerLeft = ((s.player.col + s.player.dirC * s.player.t + 0.5) / GRID_W) * 100;
  const playerTop = ((s.player.row + s.player.dirR * s.player.t + 0.5) / GRID_H) * 100;

  const gridCells = useMemo(() => Array.from({ length: GRID_H }, (_, r) => r), []);
  const gridCols = useMemo(() => Array.from({ length: GRID_W }, (_, c) => c), []);

  const setDesired = (dr: number, dc: number) => {
    desiredDirRef.current = [dr, dc];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 px-4 py-2">
          <p className="font-mono text-xs font-bold text-white">BERRY BERRY CHASE</p>
          <button onClick={onExit} className="font-mono text-xs text-white/70 hover:text-white">
            Close
          </button>
        </div>

        <div className="relative w-full touch-none select-none bg-black" style={{ aspectRatio: `${GRID_W} / ${GRID_H}` }}>
          <div className="absolute left-2 top-1 z-10 font-mono text-[11px] text-white">
            SCORE {s.score} · LV {s.level}
          </div>
          <div className="absolute right-2 top-1 z-10 font-mono text-[11px] text-white">
            {'♥'.repeat(Math.max(0, s.lives))}
            {'♡'.repeat(Math.max(0, STARTING_LIVES - s.lives))}
          </div>

          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${GRID_W}, 1fr)`, gridTemplateRows: `repeat(${GRID_H}, 1fr)` }}
          >
            {gridCells.map((r) =>
              gridCols.map((c) => {
                const cell = s.grid[r][c];
                return (
                  <div key={`${r}-${c}`} className="relative flex items-center justify-center">
                    {cell === 0 && <div className="absolute inset-[1px] rounded-[1px]" style={{ backgroundColor: wallColor }} />}
                    {cell === 2 && <span className="h-[3px] w-[3px] rounded-full" style={{ backgroundColor: berryColor }} />}
                    {cell === 3 && (
                      <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: powerColor }} />
                    )}
                  </div>
                );
              }),
            )}
          </div>

          {(s.status === 'playing' || s.status === 'levelup') &&
            s.hyenas.map((h) => {
              if (h.eatenUntil !== 0) return null;
              const frightened = h.frightenedUntil > elapsedMsRef.current;
              const left = ((h.col + h.dirC * h.t + 0.5) / GRID_W) * 100;
              const top = ((h.row + h.dirR * h.t + 0.5) / GRID_H) * 100;
              return (
                <div
                  key={h.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${frightened ? 'animate-pulse' : ''}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <img
                    src={spiderImg}
                    alt=""
                    className="h-5 w-5"
                    style={{ filter: frightened ? SPIDER_FRIGHTENED_FILTER : colorMode ? SPIDER_COLOR_FILTER : undefined }}
                  />
                </div>
              );
            })}

          {(s.status === 'playing' || s.status === 'levelup' || s.status === 'lost') && (
            <img
              src={appearance.image}
              alt=""
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 object-contain [image-rendering:pixelated]"
              style={{ left: `${playerLeft}%`, top: `${playerTop}%` }}
            />
          )}

          {s.status === 'levelup' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="font-mono text-xl font-bold text-white">BOARD CLEARED — LEVEL {s.level + 1}</p>
            </div>
          )}

          {(s.status === 'ready' || s.status === 'lost') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <p className="font-mono text-sm font-bold text-white">
                {s.status === 'ready' && 'Berries incoming — spiders too.'}
                {s.status === 'lost' && `GAME OVER — score ${s.score} · level ${s.level}`}
              </p>
              {s.status === 'ready' && (
                <>
                  <p className="max-w-sm font-mono text-[11px] text-white/60">
                    Arrows / WASD to move, or the on-screen D-pad. Clear every berry to advance. Grab a big berry to
                    turn the spiders edible for a few seconds.
                  </p>
                  {progress.bestScore > 0 && (
                    <p className="font-mono text-[11px] text-emerald-400">
                      Best: {progress.bestScore} (level {progress.bestLevel})
                    </p>
                  )}
                </>
              )}
              {s.status === 'lost' && s.runResult && (
                <p className="font-mono text-[11px] text-emerald-400">
                  +{s.runResult.coins} coins earned
                  {!s.runResult.isFullReward && ' (10% — already played today)'}
                  {s.runResult.newBestScore && ' · New best!'}
                </p>
              )}
              <button onClick={start} className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white">
                {s.status === 'ready' ? 'Start' : 'Play Again'}
              </button>
            </div>
          )}

          {(s.status === 'playing' || s.status === 'levelup') && (
            <div className="absolute bottom-2 right-2 grid grid-cols-3 grid-rows-3 gap-1">
              <div />
              <button
                onClick={() => setDesired(-1, 0)}
                className="h-8 w-8 rounded-full border border-white/40 bg-white/10 font-mono text-xs text-white active:bg-white/25"
              >
                ▲
              </button>
              <div />
              <button
                onClick={() => setDesired(0, -1)}
                className="h-8 w-8 rounded-full border border-white/40 bg-white/10 font-mono text-xs text-white active:bg-white/25"
              >
                ◀
              </button>
              <div />
              <button
                onClick={() => setDesired(0, 1)}
                className="h-8 w-8 rounded-full border border-white/40 bg-white/10 font-mono text-xs text-white active:bg-white/25"
              >
                ▶
              </button>
              <div />
              <button
                onClick={() => setDesired(1, 0)}
                className="h-8 w-8 rounded-full border border-white/40 bg-white/10 font-mono text-xs text-white active:bg-white/25"
              >
                ▼
              </button>
              <div />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
