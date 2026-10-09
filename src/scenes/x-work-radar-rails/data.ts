// Work Radar · 두 레일 — 사실/라벨/타임라인 상수.
// 사실 출처: content/projects/work-radar.ts, content/profile.ts(id work-radar). 성과 수치 없음.

export type Lang = 'ko' | 'en'

/** 앰비언트 루프 주기(초). 0–PERIOD 첫 사이클이 히어로 시퀀스. */
export const PERIOD = 8

export const COLORS = {
  bg: '#050706',
  phosphor: '#d7d7d7',
  dim: '#8d8d8d',
  teal: '#4fe0c4',
  blue: '#4ab3cc',
  amber: '#d98a3d',
  red: '#ff4a3a',
  proposal: '#f2c48d',
}

/** 신호 소스 — 3D 글리프 모양과 범례가 1:1. */
export const SOURCES = [
  { key: 'calendar', glyph: '■', color: '#4ab3cc', ko: 'Google Calendar', en: 'Google Calendar' },
  { key: 'pr', glyph: '◆', color: '#4fe0c4', ko: 'GitHub PR', en: 'GitHub PR' },
  { key: 'notion', glyph: '▬', color: '#d7d7d7', ko: 'Notion 백로그·안건', en: 'Notion backlog · agenda' },
  { key: 'worktree', glyph: '▲', color: '#7fb0c8', ko: '로컬 worktree', en: 'local worktree' },
  { key: 'agent', glyph: '●', color: '#c9ad86', ko: 'agent 세션', en: 'agent session' },
] as const

export const SIGNALS_PER_SOURCE = 22

export const COPY = {
  ko: {
    title: 'WORK RADAR',
    sub: 'local-first 업무 앱 · 개인 프로젝트',
    h1: '수집은 자동',
    h2: '승격은 사람',
    line2: '자동화는 결정 레일에 들어가지 않는다',
    stack: 'Tauri 2 · Rust · MCP',
    matrix: 'Capture Board · Eisenhower',
    urgent: '긴급 →',
    important: '중요 ↑',
    decision: '결정 레일',
    decisionSub: 'DECISION RAIL',
    auto: '제안·실행 레일 · Codex',
    autoSub: 'AUTOMATION RAIL',
    gate: '사람 승인',
    gateSub: 'HUMAN GATE',
    proposal: 'proposal-only → 사람 승인',
    pads: ['백로그', '안건', '일정'],
    job: 'Codex job',
    sandbox: 'sandbox',
    killed: 'kill · cost cap',
    rings: ['timeout', 'max turns', 'cost cap'],
    log: [
      ['run', 'job-07 · read_only'],
      ['kill', 'job-08 · cost cap'],
      ['proposal', 'job-07 → awaiting_approval'],
      ['accept', '사람 · 로컬 기록'],
    ],
    logTitle: 'accept / reject log',
  },
  en: {
    title: 'WORK RADAR',
    sub: 'local-first desktop app · personal project',
    h1: 'Collection is automatic',
    h2: 'promotion is human',
    line2: 'Automation never enters the decision rail',
    stack: 'Tauri 2 · Rust · MCP',
    matrix: 'Capture Board · Eisenhower',
    urgent: 'urgent →',
    important: 'important ↑',
    decision: 'decision rail',
    decisionSub: 'DECISION RAIL',
    auto: 'proposal · execution rail · Codex',
    autoSub: 'AUTOMATION RAIL',
    gate: 'human approval',
    gateSub: 'HUMAN GATE',
    proposal: 'proposal-only → human gate',
    pads: ['Backlog', 'Agenda', 'Schedule'],
    job: 'Codex job',
    sandbox: 'sandbox',
    killed: 'kill · cost cap',
    rings: ['timeout', 'max turns', 'cost cap'],
    log: [
      ['run', 'job-07 · read_only'],
      ['kill', 'job-08 · cost cap'],
      ['proposal', 'job-07 → awaiting_approval'],
      ['accept', 'human · local record'],
    ],
    logTitle: 'accept / reject log',
  },
} as const

/** 루프 내 이벤트 시각(tc, 초). D=결정 토큰, J=제안이 되는 job, X=한도에 걸려 kill 되는 job. */
export const TL = {
  dLift: 0.9,
  dGo: 1.25,
  dWait: 2.7,
  dPass: 3.45,
  dArrive: 4.4,
  dFade: 5.0,
  gate1: [3.2, 3.5, 3.95, 4.3] as const,

  jLift: 1.5,
  jGo: 1.85,
  jIn: 3.0,
  jOut: 4.95,
  jProp: 5.25,
  jWait: 6.3,
  jPass: 6.7,
  jArrive: 7.45,
  jFade: 7.85,
  gate2: [6.45, 6.75, 7.1, 7.5] as const,

  xLift: 2.0,
  xGo: 2.35,
  xIn: 3.5,
  xHit: 4.55,
  xDead: 5.3,

  /** 로그 행 등장 시각 */
  log: [3.1, 4.6, 5.0, 6.8] as const,
}

/** 월드 좌표 레이아웃(y-up). */
export const LAYOUT = {
  matrix: { x: -5.6, z: 0, size: 4.8 },
  gate: [1.7, 2.35, -1.2] as const,
  join: [0.45, 2.35, -1.2] as const,
  waitU: 0.6,
  box: { c: [1.1, 0.62, 3.0] as const, w: 1.7, h: 1.15, d: 1.7 },
  pads: [
    [5.6, 3.0, -3.4],
    [6.1, 2.35, -1.2],
    [5.6, 1.7, 1.0],
  ] as const,
  // 토큰이 떠오르는 사분면 지점
  qD: [-6.8, 0.1, -1.2] as const,
  qJ: [-4.5, 0.1, 1.1] as const,
  qX: [-6.6, 0.1, 1.4] as const,
}
