// Hyena silhouettes for the Hyena Defense minigame — same box-shadow pixel
// technique as the park's trees/grass, just small canine heads with pointed
// ears instead of generic invaders.
export const HYENA_MATRIX_A = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
];

export const HYENA_MATRIX_B = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
];

export const HYENA_MATRICES = [HYENA_MATRIX_A, HYENA_MATRIX_B];
