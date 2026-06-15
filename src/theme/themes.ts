// 전역 셸 테마 토큰. 스위처가 <html data-theme> 로 전환한다.
// 시안별 배경 톤 매칭은 scenes/registry.ts 의 bg 값으로 처리한다.

export interface Theme {
  id: string
  label: string
  bg: string
  panel: string
  ink: string
  muted: string
  accent: string
  line: string
}

export const THEMES: Theme[] = [
  {
    id: 'ink',
    label: 'Ink',
    bg: '#0b0d10',
    panel: '#14171c',
    ink: '#e9e9ec',
    muted: '#8b909a',
    accent: '#e07a5f',
    line: 'rgba(233,233,236,0.12)',
  },
  {
    id: 'paper',
    label: 'Paper',
    bg: '#f1ede3',
    panel: '#e7e2d5',
    ink: '#1b1a16',
    muted: '#6c675d',
    accent: '#c0552f',
    line: 'rgba(27,26,22,0.14)',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    bg: '#0a1426',
    panel: '#0f1e38',
    ink: '#d8e6ff',
    muted: '#7d93b8',
    accent: '#4db1ff',
    line: 'rgba(120,160,220,0.18)',
  },
]

export const DEFAULT_THEME = 'ink'

export function themeVars(t: Theme): Record<string, string> {
  return {
    '--bg': t.bg,
    '--panel': t.panel,
    '--ink': t.ink,
    '--muted': t.muted,
    '--accent': t.accent,
    '--line': t.line,
  }
}
