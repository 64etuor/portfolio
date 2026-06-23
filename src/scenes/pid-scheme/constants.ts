export const TF_STATES = ['PLAN', 'APPLY', 'STABILIZE', 'RECORDED'] as const
export const TF_BARS = ['○○○○', '●○○○', '●●○○', '●●●●'] as const
export const TF_COLORS = ['#f0b429', '#4aa8ff', '#36d9d9', '#37e88a'] as const
export const TF_STAGES = ['stage: validate', 'stage: apply', 'stage: ECS stable', 'stage: state recorded'] as const
export const TF_FILL_HEIGHTS = [8, 36, 62, 86] as const
export const TF_PERIOD_MS = 1600
export const INTERLOCK_CIRCUMFERENCE = 251
