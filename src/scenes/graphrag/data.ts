// graphrag scene — static graph topology data
// Extracted from public/lab/graphrag.html

export const GRAPH_NODES: [number, number][] = [
  [0.22, 0.30],
  [0.46, 0.20],
  [0.70, 0.34],
  [0.34, 0.55],
  [0.60, 0.58],
  [0.80, 0.66],
  [0.26, 0.78],
  [0.52, 0.80],
]

export const GRAPH_EDGES: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [3, 4],
  [1, 4], [4, 5], [3, 6], [6, 7],
  [4, 7], [2, 5],
]
