import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { getAppearance } from '../data/appearances';
import { HYENA_MATRICES } from '../data/hyenaArt';
import type { GameProgressEntry, RunResult } from '../hooks/useGameProgress';
import { playSound } from '../lib/sound';
import { PixelSprite } from './PixelDecor';

interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface EnemyCell {
  row: number;
  col: number;
  alive: boolean;
}

const COLS = 6;
const COL_SPACING = 11;
const ROW_SPACING = 9;
const GRID_START_X = 14;
const GRID_START_Y = 10;
const GRID_LEFT_BOUND = 4;
const GRID_RIGHT_BOUND = 96;
const PLAYER_Y = 90;
const PLAYER_SPEED = 60; // % of arena width per second
const BULLET_SPEED = 95; // % per second
const ENEMY_BULLET_SPEED = 42;
const ENEMY_STEP_DOWN = 6;
const SHOOT_COOLDOWN_MS = 320;
const PLAYER_HALF_WIDTH = 5;
const ENEMY_HALF_WIDTH = 4.5;
const ENEMY_HALF_HEIGHT = 4.5;
const ENEMY_LOSE_Y = 78;
const STARTING_LIVES = 3;
const LEVEL_BANNER_MS = 1300;

// Each level adds more hyenas and speeds up the pack; rows cap at 5 so the
// grid never gets taller than the arena has room for.
function levelConfig(level: number) {
  const rows = Math.min(5, 2 + Math.ceil(level / 2));
  const baseSpeed = 10 + level * 2.5;
  const shotIntervalMin = Math.max(350, 900 - level * 60);
  const shotIntervalSpread = 700;
  return { rows, cols: COLS, baseSpeed, shotIntervalMin, shotIntervalSpread };
}

function buildGrid(rows: number, cols: number): EnemyCell[] {
  const cells: EnemyCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) cells.push({ row, col, alive: true });
  }
  return cells;
}

type Status = 'ready' | 'playing' | 'levelup' | 'lost';

interface GameState {
  level: number;
  playerX: number;
  bullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: EnemyCell[];
  levelTotalEnemies: number;
  enemyOffsetX: number;
  enemyOffsetY: number;
  enemyDir: 1 | -1;
  enemySpeed: number;
  lives: number;
  score: number;
  status: Status;
  lastShotAt: number;
  nextEnemyShotAt: number;
  levelBannerUntil: number;
  runResult: RunResult | null;
}

function makeInitialState(): GameState {
  const config = levelConfig(1);
  const enemies = buildGrid(config.rows, config.cols);
  return {
    level: 1,
    playerX: 50,
    bullets: [],
    enemyBullets: [],
    enemies,
    levelTotalEnemies: enemies.length,
    enemyOffsetX: 0,
    enemyOffsetY: 0,
    enemyDir: 1,
    enemySpeed: config.baseSpeed,
    lives: STARTING_LIVES,
    score: 0,
    status: 'ready',
    lastShotAt: 0,
    nextEnemyShotAt: 1200,
    levelBannerUntil: 0,
    runResult: null,
  };
}

interface Props {
  appearanceId: string;
  colorMode: boolean;
  progress: GameProgressEntry;
  onExit: () => void;
  onGameOver: (finalScore: number, finalLevel: number, fullReward: number) => RunResult;
}

export function HyenaDefenseGame({ appearanceId, colorMode, progress, onExit, onGameOver }: Props) {
  const appearance = getAppearance(appearanceId);
  const stateRef = useRef<GameState>(makeInitialState());
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const keysRef = useRef({ left: false, right: false });
  const touchDirRef = useRef<-1 | 0 | 1>(0);
  const shootHeldRef = useRef(false);
  const nextBulletId = useRef(0);
  const elapsedMsRef = useRef(0);
  const gameOverHandledRef = useRef(false);

  const start = useCallback(() => {
    stateRef.current = { ...makeInitialState(), status: 'playing' };
    elapsedMsRef.current = 0;
    gameOverHandledRef.current = false;
    bump();
  }, []);

  const advanceLevel = useCallback((s: GameState) => {
    const nextLevel = s.level + 1;
    const config = levelConfig(nextLevel);
    const enemies = buildGrid(config.rows, config.cols);
    s.level = nextLevel;
    s.enemies = enemies;
    s.levelTotalEnemies = enemies.length;
    s.enemyOffsetX = 0;
    s.enemyOffsetY = 0;
    s.enemyDir = 1;
    s.enemySpeed = config.baseSpeed;
    s.nextEnemyShotAt = elapsedMsRef.current + 1000;
    s.status = 'playing';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === ' ') {
        shootHeldRef.current = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === ' ') shootHeldRef.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;

      if (s.status === 'levelup') {
        if (elapsedMsRef.current > s.levelBannerUntil) advanceLevel(s);
        elapsedMsRef.current += dt * 1000;
        bump();
        raf = requestAnimationFrame(tick);
        return;
      }

      if (s.status === 'playing') {
        elapsedMsRef.current += dt * 1000;

        const dir = Math.max(
          -1,
          Math.min(1, (keysRef.current.left ? -1 : 0) + (keysRef.current.right ? 1 : 0) + touchDirRef.current),
        );
        s.playerX = Math.max(PLAYER_HALF_WIDTH, Math.min(100 - PLAYER_HALF_WIDTH, s.playerX + dir * PLAYER_SPEED * dt));

        if (shootHeldRef.current && now - s.lastShotAt > SHOOT_COOLDOWN_MS) {
          s.bullets.push({ id: nextBulletId.current++, x: s.playerX, y: PLAYER_Y - 4 });
          s.lastShotAt = now;
          playSound('shoot');
        }

        s.bullets = s.bullets.filter((b) => b.y > -5).map((b) => ({ ...b, y: b.y - BULLET_SPEED * dt }));
        s.enemyBullets = s.enemyBullets
          .filter((b) => b.y < 105)
          .map((b) => ({ ...b, y: b.y + ENEMY_BULLET_SPEED * dt }));

        const alive = s.enemies.filter((e) => e.alive);
        if (alive.length > 0) {
          const minCol = Math.min(...alive.map((e) => e.col));
          const maxCol = Math.max(...alive.map((e) => e.col));
          let nextOffsetX = s.enemyOffsetX + s.enemyDir * s.enemySpeed * dt;
          const leftEdge = GRID_START_X + nextOffsetX + minCol * COL_SPACING;
          const rightEdge = GRID_START_X + nextOffsetX + maxCol * COL_SPACING;
          if (rightEdge > GRID_RIGHT_BOUND || leftEdge < GRID_LEFT_BOUND) {
            // Reverse and step down, then apply this frame's move in the new
            // direction too — otherwise next frame's edge check re-reads the
            // same still-past-bound position and flips again immediately,
            // racing the grid straight to the bottom in a few frames.
            s.enemyDir = s.enemyDir === 1 ? -1 : 1;
            s.enemyOffsetY += ENEMY_STEP_DOWN;
            nextOffsetX = s.enemyOffsetX + s.enemyDir * s.enemySpeed * dt;
          }
          s.enemyOffsetX = nextOffsetX;
        }

        const config = levelConfig(s.level);
        if (elapsedMsRef.current > s.nextEnemyShotAt && alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          s.enemyBullets.push({
            id: nextBulletId.current++,
            x: GRID_START_X + s.enemyOffsetX + shooter.col * COL_SPACING,
            y: GRID_START_Y + s.enemyOffsetY + shooter.row * ROW_SPACING,
          });
          s.nextEnemyShotAt = elapsedMsRef.current + config.shotIntervalMin + Math.random() * config.shotIntervalSpread;
        }

        for (const enemy of s.enemies) {
          if (!enemy.alive) continue;
          const ex = GRID_START_X + s.enemyOffsetX + enemy.col * COL_SPACING;
          const ey = GRID_START_Y + s.enemyOffsetY + enemy.row * ROW_SPACING;
          for (const b of s.bullets) {
            if (b.y < 0) continue;
            if (Math.abs(b.x - ex) < ENEMY_HALF_WIDTH && Math.abs(b.y - ey) < ENEMY_HALF_HEIGHT) {
              enemy.alive = false;
              b.y = -999;
              s.score += 10;
              playSound('hit');
              break;
            }
          }
        }
        s.bullets = s.bullets.filter((b) => b.y > -100);

        for (const b of s.enemyBullets) {
          if (b.y > 100) continue;
          if (Math.abs(b.x - s.playerX) < PLAYER_HALF_WIDTH && Math.abs(b.y - PLAYER_Y) < 5) {
            b.y = 999;
            s.lives -= 1;
            playSound('error');
          }
        }
        s.enemyBullets = s.enemyBullets.filter((b) => b.y < 105);

        const stillAlive = s.enemies.filter((e) => e.alive);
        s.enemySpeed = config.baseSpeed + (s.levelTotalEnemies - stillAlive.length) * 0.7;

        if (s.lives <= 0) s.status = 'lost';
        if (GRID_START_Y + s.enemyOffsetY + (levelConfig(s.level).rows - 1) * ROW_SPACING > ENEMY_LOSE_Y) {
          s.status = 'lost';
        }
        if (s.status === 'playing' && stillAlive.length === 0) {
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
  }, [advanceLevel, onGameOver]);

  const s = stateRef.current;
  const starField = useMemo(
    () =>
      Array.from({ length: 45 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() > 0.8 ? 2 : 1,
      })),
    [],
  );

  const setTouchDir = (d: -1 | 0 | 1) => {
    touchDirRef.current = d;
  };

  const hyenaColor = colorMode ? '#c9a15a' : '#e8e8e8';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 px-4 py-2">
          <p className="font-mono text-xs font-bold text-white">HYENA DEFENSE</p>
          <button onClick={onExit} className="font-mono text-xs text-white/70 hover:text-white">
            Close
          </button>
        </div>

        <div className="relative h-[440px] w-full touch-none overflow-hidden bg-black select-none">
          {starField.map((star, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white opacity-70"
              style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size }}
            />
          ))}

          <div className="absolute left-2 top-2 font-mono text-[11px] text-white">
            SCORE {s.score} · LV {s.level}
          </div>
          <div className="absolute right-2 top-2 font-mono text-[11px] text-white">
            {'♥'.repeat(Math.max(0, s.lives))}
            {'♡'.repeat(Math.max(0, STARTING_LIVES - s.lives))}
          </div>

          {(s.status === 'playing' || s.status === 'levelup') &&
            s.enemies
              .filter((e) => e.alive)
              .map((e) => {
                const x = GRID_START_X + s.enemyOffsetX + e.col * COL_SPACING;
                const y = GRID_START_Y + s.enemyOffsetY + e.row * ROW_SPACING;
                const matrix = HYENA_MATRICES[(e.row + e.col) % HYENA_MATRICES.length];
                return (
                  <div
                    key={`${e.row}-${e.col}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <PixelSprite matrix={matrix} size={4} palette={{ 1: hyenaColor }} />
                  </div>
                );
              })}

          {s.bullets.map((b) => (
            <div
              key={b.id}
              className="absolute h-3 w-1 -translate-x-1/2 bg-white"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
            />
          ))}
          {s.enemyBullets.map((b) => (
            <div
              key={b.id}
              className="absolute h-3 w-1 -translate-x-1/2"
              style={{ left: `${b.x}%`, top: `${b.y}%`, backgroundColor: colorMode ? '#ff6b6b' : '#cfcfcf' }}
            />
          ))}

          {(s.status === 'playing' || s.status === 'levelup' || s.status === 'lost') && (
            <img
              src={appearance.image}
              alt=""
              className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 object-contain [image-rendering:pixelated]"
              style={{ left: `${s.playerX}%`, top: `${PLAYER_Y}%` }}
            />
          )}

          {s.status === 'levelup' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="font-mono text-2xl font-bold text-white">LEVEL {s.level + 1}</p>
            </div>
          )}

          {(s.status === 'ready' || s.status === 'lost') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-6 text-center">
              <p className="font-mono text-sm font-bold text-white">
                {s.status === 'ready' && 'Hyenas incoming!'}
                {s.status === 'lost' && `GAME OVER — score ${s.score} · level ${s.level}`}
              </p>
              {s.status === 'ready' && (
                <>
                  <p className="max-w-xs font-mono text-[11px] text-white/60">
                    Arrow keys / A-D to move, Space to fire. Or use the on-screen controls. Survive as many levels as
                    you can.
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
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
              <div className="flex gap-2">
                <button
                  onPointerDown={() => setTouchDir(-1)}
                  onPointerUp={() => setTouchDir(0)}
                  onPointerLeave={() => setTouchDir(0)}
                  className="h-12 w-12 rounded-full border border-white/40 bg-white/10 font-mono text-lg text-white active:bg-white/25"
                >
                  ◀
                </button>
                <button
                  onPointerDown={() => setTouchDir(1)}
                  onPointerUp={() => setTouchDir(0)}
                  onPointerLeave={() => setTouchDir(0)}
                  className="h-12 w-12 rounded-full border border-white/40 bg-white/10 font-mono text-lg text-white active:bg-white/25"
                >
                  ▶
                </button>
              </div>
              <button
                onPointerDown={() => {
                  shootHeldRef.current = true;
                }}
                onPointerUp={() => {
                  shootHeldRef.current = false;
                }}
                onPointerLeave={() => {
                  shootHeldRef.current = false;
                }}
                className="h-14 w-14 rounded-full border border-white/40 bg-white/10 font-mono text-[10px] font-bold text-white active:bg-white/25"
              >
                FIRE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
