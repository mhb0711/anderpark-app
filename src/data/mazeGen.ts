// Random maze generator for Berry Berry Chase — a recursive-backtracker
// spanning tree (guarantees every cell is reachable), with a few extra walls
// knocked down for loops so hyenas can't just camp a dead end, plus a carved
// central den. Regenerated fresh each run for replay variety.

export const ROOM_COLS = 9;
export const ROOM_ROWS = 7;
export const GRID_W = ROOM_COLS * 2 + 1;
export const GRID_H = ROOM_ROWS * 2 + 1;

// 0 = wall, 1 = open (no berry), 2 = berry, 3 = power berry
export type Cell = 0 | 1 | 2 | 3;

export interface Pos {
  row: number;
  col: number;
}

export interface MazeResult {
  grid: Cell[][];
  playerStart: Pos;
  denExits: Pos[];
  totalBerries: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export function generateMaze(): MazeResult {
  // true = wall. Every room cell sits at odd,odd wall-grid coordinates;
  // carving a passage clears the room cell plus the connector cell between
  // it and its neighbor.
  const walls: boolean[][] = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(true));
  const visited: boolean[][] = Array.from({ length: ROOM_ROWS }, () => Array(ROOM_COLS).fill(false));

  function carve(r: number, c: number) {
    visited[r][c] = true;
    walls[r * 2 + 1][c * 2 + 1] = false;
    for (const [dr, dc] of shuffle(DIRS)) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROOM_ROWS && nc >= 0 && nc < ROOM_COLS && !visited[nr][nc]) {
        walls[r * 2 + 1 + dr][c * 2 + 1 + dc] = false;
        carve(nr, nc);
      }
    }
  }
  carve(0, 0);

  // Extra loops: any connector cell (odd,even or even,odd) sits between two
  // room cells that are *always* already open (every room is visited above),
  // so clearing more of them is always safe — no separate reachability check
  // needed.
  let extra = Math.round(ROOM_ROWS * ROOM_COLS * 0.15);
  let guard = 600;
  while (extra > 0 && guard-- > 0) {
    const r = Math.floor(Math.random() * GRID_H);
    const c = Math.floor(Math.random() * GRID_W);
    const isConnector = (r % 2 === 1 && c % 2 === 0) || (r % 2 === 0 && c % 2 === 1);
    if (isConnector && walls[r][c]) {
      walls[r][c] = false;
      extra--;
    }
  }

  const grid: Cell[][] = walls.map((row) => row.map((isWall) => (isWall ? 0 : 2)));

  // Carve a plus-shaped den in the middle with four guaranteed exits,
  // overriding whatever the generator happened to do there.
  const denRow = ROOM_ROWS % 2 === 1 ? Math.floor(ROOM_ROWS / 2) * 2 + 1 : ROOM_ROWS;
  const denCol = ROOM_COLS % 2 === 1 ? Math.floor(ROOM_COLS / 2) * 2 + 1 : ROOM_COLS;
  const denExits: Pos[] = [];
  grid[denRow][denCol] = 1;
  for (const [dr, dc] of DIRS) {
    const r = denRow + dr;
    const c = denCol + dc;
    if (r > 0 && r < GRID_H - 1 && c > 0 && c < GRID_W - 1) {
      grid[r][c] = 1;
      denExits.push({ row: r, col: c });
    }
  }

  // Player starts in the bottom-center room, well clear of the den.
  const playerStart: Pos = { row: GRID_H - 2, col: denCol };
  grid[playerStart.row][playerStart.col] = 1;

  // Power berries near the four far corners (always a room cell, always open).
  const corners: Pos[] = [
    { row: 1, col: 1 },
    { row: 1, col: GRID_W - 2 },
    { row: GRID_H - 2, col: 1 },
    { row: GRID_H - 2, col: GRID_W - 2 },
  ];
  for (const corner of corners) {
    if (grid[corner.row][corner.col] === 2) grid[corner.row][corner.col] = 3;
  }

  let totalBerries = 0;
  for (const row of grid) for (const cell of row) if (cell === 2 || cell === 3) totalBerries++;

  return { grid, playerStart, denExits: [{ row: denRow, col: denCol }, ...denExits], totalBerries };
}

export function isWalkable(grid: Cell[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] !== 0;
}
