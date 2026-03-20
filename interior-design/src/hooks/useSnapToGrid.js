// Áp dụng thuật toán Snap-to-grid
export const useSnapToGrid = (gridSize = 0.5) => {
  const snap = (value) => {
    // x' = round(x/s) * s
    // value tương ứng với x, gridSize tương ứng với s
    return Math.round(value / gridSize) * gridSize;
  };

  return { snap };
};