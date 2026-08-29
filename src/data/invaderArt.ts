// Simple classic-invader silhouettes for the Space Defender minigame,
// drawn with the same box-shadow pixel technique as the park's trees/grass.
export const INVADER_MATRIX_A = [
  [0, 1, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 0, 0, 1, 0],
];

export const INVADER_MATRIX_B = [
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 0, 0, 1, 0],
];

export const INVADER_MATRICES = [INVADER_MATRIX_A, INVADER_MATRIX_B];
