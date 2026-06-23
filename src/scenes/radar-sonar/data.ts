// Work Radar — 레이더 소나 씬 컨택 데이터 (radar-sonar.html 이식)

export interface ContactDef {
  type: 'signal' | 'surface' | 'agent' | 'gate'
  id: string
  sub: string
  brg: number
  ring: number
  conf: number
  desc: string
  ach: [string, string][]
  tags: string[]
  priority?: boolean
  lock?: boolean
}

export const CONTACTS_DEF: ContactDef[] = [
  // ---- 외부 신호 SIGNAL ----
  {
    type: 'signal',
    id: 'Google Calendar',
    sub: 'CALENDAR EVENTS',
    brg: 18,
    ring: 0.3,
    conf: 99,
    desc: 'OAuth PKCE+loopback 인증으로 구글 캘린더 이벤트를 실시간 수신. Today Timeline 서피스에 drag 배치 가능한 신호로 변환. 미배치 이벤트는 Work Debt chip으로 집계.',
    ach: [
      ['INT', 'OAuth PKCE + loopback redirect'],
      ['SURF', 'Today Timeline drag 배치'],
      ['DEBT', '미배치 이벤트 Work Debt chip 집계'],
    ],
    tags: ['Google Calendar', 'OAuth PKCE', 'Today Timeline'],
    priority: true,
    lock: true,
  },
  {
    type: 'signal',
    id: 'GitHub PR',
    sub: 'PR RADAR SIGNAL',
    brg: 96,
    ring: 0.46,
    conf: 97,
    desc: 'PR Radar 서피스가 CI/Needs Review/Ready/Stale/Merged 버킷으로 자동 triage. 리뷰 요청·CI 실패 신호를 우선 탐지해 Work Radar 스코프에 락온.',
    ach: [
      ['BUCKET', 'CI · Needs Review · Ready · Stale · Merged'],
      ['TRIAGE', '자동 triage 파이프라인'],
      ['LOCK', '리뷰 요청 우선 락온'],
    ],
    tags: ['GitHub', 'PR Radar', 'CI', 'triage'],
  },
  {
    type: 'signal',
    id: 'Notion 백로그',
    sub: 'BACKLOG SIGNAL',
    brg: 168,
    ring: 0.6,
    conf: 96,
    desc: 'Notion API 연동으로 백로그 아이템을 Capture Board 수신 큐로 끌어들임. Eisenhower matrix 자동 분류 후 Today Timeline 또는 Weekly Review로 라우팅.',
    ach: [
      ['API', 'Notion API 연동'],
      ['MATRIX', 'Eisenhower matrix 자동 분류'],
      ['ROUTE', 'Today / Weekly 라우팅'],
    ],
    tags: ['Notion', 'Capture Board', 'Eisenhower'],
  },
  {
    type: 'signal',
    id: '뉴스 Ticker',
    sub: 'NEWS FEED SIGNAL',
    brg: 242,
    ring: 0.74,
    conf: 95,
    desc: 'Capture Board 하단 뉴스 ticker로 외부 신호 유입. 관심 키워드 필터링 후 Capture Board 상단 큐에 버블업. 클릭 시 Command Palette로 바로 액션 생성.',
    ach: [
      ['FILTER', '키워드 필터링'],
      ['BUBBLE', '큐 버블업'],
      ['CMD', 'Command Palette 액션 연결'],
    ],
    tags: ['뉴스 Ticker', 'Capture Board', 'Command Palette'],
  },
  // ---- 운영 서피스 SURFACE ----
  {
    type: 'surface',
    id: 'Capture Board',
    sub: 'EISENHOWER · ROUTINE · AGENT BAR',
    brg: 300,
    ring: 0.4,
    conf: 99,
    desc: 'Work Radar의 1번 서피스. Eisenhower matrix로 신호를 긴급/중요 축 분류. 루틴 트래킹과 Agent Bar(Codex/Hermes 에이전트 상태 바)를 한 화면에. 뉴스 ticker가 하단 고정.',
    ach: [
      ['MATRIX', 'Eisenhower 긴급/중요 2x2 분류'],
      ['ROUTINE', '루틴 이행률 실시간 추적'],
      ['AGENTS', 'Agent Bar -- Codex/Hermes 상태'],
    ],
    tags: ['Capture Board', 'Eisenhower', '루틴', 'Agent Bar'],
    priority: true,
  },
  {
    type: 'surface',
    id: 'Today Timeline',
    sub: 'DRAG PLACE · WORK DEBT CHIP',
    brg: 78,
    ring: 0.55,
    conf: 98,
    desc: '오늘 할 일을 타임블록으로 drag 배치하는 서피스. 배치 안 된 신호는 Work Debt chip으로 누적 가시화. 미배치 백로그가 늘어날수록 chip 색상이 amber -> red로 에스컬레이션.',
    ach: [
      ['DRAG', '타임블록 drag 배치'],
      ['DEBT', 'Work Debt chip 에스컬레이션'],
      ['TRAY', '미배치 신호 tray 수납'],
    ],
    tags: ['Today Timeline', 'Work Debt', 'drag', 'tray'],
    priority: true,
  },
  {
    type: 'surface',
    id: 'Weekly Review',
    sub: 'THROUGHPUT · PR · LIFE WHEEL',
    brg: 150,
    ring: 0.5,
    conf: 98,
    desc: '주간 처리량 / PR 머지율 / Life Wheel 8축 / 루틴 이행률을 한 화면에 집계하는 리뷰 서피스. 전주 대비 delta 차트와 Work Debt 추이를 함께 표시.',
    ach: [
      ['THP', '처리량 · PR 머지율'],
      ['WHEEL', 'Life Wheel 8축 레이더 차트'],
      ['ROUTINE', '루틴 이행률 + 전주 delta'],
    ],
    tags: ['Weekly Review', 'Life Wheel', '처리량', '루틴'],
  },
  {
    type: 'surface',
    id: 'PR Radar',
    sub: 'CI/REVIEW/READY/STALE/MERGED',
    brg: 200,
    ring: 0.44,
    conf: 97,
    desc: 'GitHub PR 전용 서피스. CI 상태 / Needs Review / Ready to Merge / Stale / Merged 5개 버킷으로 자동 triage. 스테일 PR 자동 알림과 리뷰어 ping 기능 내장.',
    ach: [
      ['BUCKET', '5-bucket 자동 triage'],
      ['STALE', '스테일 PR 자동 알림'],
      ['PING', '리뷰어 Telegram/Slack ping'],
    ],
    tags: ['PR Radar', 'GitHub', 'CI', 'Stale', 'triage'],
    priority: true,
  },
  {
    type: 'surface',
    id: 'Worktree Diff',
    sub: 'LOCAL WORKTREE SURFACE',
    brg: 330,
    ring: 0.62,
    conf: 96,
    desc: '로컬 git worktree 상태를 스코프에 락온. 브랜치별 diff 요약과 uncommitted 변경사항을 Work Radar 신호로 변환. Codex CLI 에이전트 세션과 연동.',
    ach: [
      ['DIFF', 'worktree diff 요약'],
      ['BRANCH', '브랜치별 상태 비교'],
      ['CODEX', 'Codex CLI 세션 연동'],
    ],
    tags: ['Worktree', 'Diff', 'git', 'Codex CLI'],
  },
  {
    type: 'surface',
    id: 'Routine Tracking',
    sub: 'ROUTINE ADHERENCE SURFACE',
    brg: 120,
    ring: 0.66,
    conf: 96,
    desc: '일일/주간 루틴 이행률을 추적하는 전용 서피스. 루틴 스트릭과 이행 패턴 시각화. Capture Board Agent Bar와 양방향 상태 동기화.',
    ach: [
      ['STREAK', '루틴 스트릭 추적'],
      ['PATTERN', '이행 패턴 시각화'],
      ['SYNC', 'Capture Board 양방향 동기화'],
    ],
    tags: ['Routine', '스트릭', '이행률', 'Capture Board'],
  },
  {
    type: 'surface',
    id: 'Skills Registry',
    sub: 'SKILL SIGNAL SURFACE',
    brg: 260,
    ring: 0.7,
    conf: 95,
    desc: '보유 스킬을 신호 소스로 등록하고 성장 방향을 추적하는 서피스. Life Wheel 8축과 연동해 스킬 성장 delta를 Weekly Review에 반영.',
    ach: [
      ['REG', '스킬 신호 등록 및 태깅'],
      ['WHEEL', 'Life Wheel 8축 연동'],
      ['DELTA', '성장 delta Weekly Review 반영'],
    ],
    tags: ['Skills Registry', 'Life Wheel', '성장', 'Weekly Review'],
  },
  // ---- 에이전트 AGENT ----
  {
    type: 'agent',
    id: 'Jobs Agent',
    sub: 'CODEX / HERMES ACP',
    brg: 30,
    ring: 0.84,
    conf: 94,
    desc: 'Codex CLI와 Hermes ACP 프로토콜로 실행되는 자동화 에이전트. Control Room Boule Governance 게이트 하에서 bounded 실행. tick_enabled / interval_sec / max_steps / autonomy_level 파라미터로 운영 범위 제한.',
    ach: [
      ['CODEX', 'Codex CLI 에이전트 실행'],
      ['HERMES', 'Hermes ACP 연동'],
      ['BOUNDED', 'max_steps · autonomy_level 경계'],
    ],
    tags: ['Jobs Agent', 'Codex CLI', 'Hermes ACP', 'Boule'],
  },
  {
    type: 'agent',
    id: 'cmux 세션',
    sub: 'TERMINAL MUX AGENT',
    brg: 62,
    ring: 0.88,
    conf: 92,
    desc: 'cmux 기반 터미널 세션 관리 에이전트. 복수 worktree 작업을 세션별로 격리하고 Work Radar 스코프에 상태 신호 전송. Worktree Diff 서피스와 실시간 연동.',
    ach: [
      ['SESSION', '세션별 worktree 격리'],
      ['STATUS', 'Work Radar 상태 신호 전송'],
      ['DIFF', 'Worktree Diff 실시간 연동'],
    ],
    tags: ['cmux', '터미널', '세션', 'Worktree'],
  },
  {
    type: 'agent',
    id: 'Command Palette',
    sub: 'QUICK ACTION AGENT',
    brg: 108,
    ring: 0.86,
    conf: 90,
    desc: 'Work Radar 전역 커맨드 팔레트. 신호 탐지 후 즉각 액션 생성 인터페이스. 캘린더 이벤트 생성 / PR 리뷰 요청 / 루틴 완료 체크 / 에이전트 트리거를 단일 입력창으로 통합.',
    ach: [
      ['ACTION', '즉각 액션 생성'],
      ['UNIFY', '캘린더 PR 루틴 에이전트 통합'],
      ['TRIGGER', '에이전트 트리거 원클릭'],
    ],
    tags: ['Command Palette', '액션', '에이전트', '통합'],
  },
  {
    type: 'agent',
    id: 'Telegram/Slack 알림',
    sub: 'NOTIFICATION AGENT',
    brg: 140,
    ring: 0.82,
    conf: 93,
    desc: 'Work Radar 이벤트를 Telegram/Slack으로 푸시하는 알림 에이전트. PR 스테일 경고 / 루틴 리마인더 / Boule Governance 승인 요청을 채널별로 라우팅.',
    ach: [
      ['PUSH', 'Telegram · Slack 푸시'],
      ['STALE', 'PR 스테일 경고'],
      ['GATE', 'Boule 승인 요청 알림'],
    ],
    tags: ['Telegram', 'Slack', '알림', 'PR Stale', 'Boule'],
  },
  // ---- 거버넌스 GATE ----
  {
    type: 'gate',
    id: 'Control Room',
    sub: 'BOULE GOVERNANCE',
    brg: 270,
    ring: 0.36,
    conf: 100,
    desc: 'Work Radar의 자동화 readiness gate. Boule Governance 엔진이 tick_enabled / interval_sec / max_steps / autonomy_level 파라미터로 에이전트 실행 범위를 경계 지정. event-sourced work graph로 모든 에이전트 액션 추적 가능.',
    ach: [
      ['GATE', '자동화 실행 readiness gate'],
      ['BOUND', 'tick_enabled · interval_sec · max_steps'],
      ['GRAPH', 'event-sourced work graph 추적'],
    ],
    tags: ['Control Room', 'Boule', 'Governance', 'event-sourced'],
    priority: true,
  },
  {
    type: 'gate',
    id: 'Settings',
    sub: 'CONFIG SURFACE',
    brg: 320,
    ring: 0.78,
    conf: 97,
    desc: 'Work Radar 전역 설정 서피스. 연동 계정(Google / GitHub / Notion) 관리 / Boule Governance 파라미터 조정 / 알림 채널 설정 / autonomy_level 슬라이더를 단일 설정 화면에 통합.',
    ach: [
      ['ACCOUNTS', 'Google · GitHub · Notion 연동'],
      ['PARAMS', 'Boule 파라미터 조정'],
      ['NOTIF', '알림 채널 설정'],
    ],
    tags: ['Settings', 'Google', 'GitHub', 'Notion', 'Boule'],
  },
  // ---- 스택/아키텍처 (signal) ----
  {
    type: 'signal',
    id: 'TanStack Query',
    sub: 'DATA SYNC LAYER',
    brg: 182,
    ring: 0.9,
    conf: 89,
    desc: 'React/TS 프론트엔드의 서버 상태 동기화 레이어. SQLite local-first 캐시와 연동해 오프라인 신호도 Work Radar 스코프에 유지. Zustand 전역 상태와 조합.',
    ach: [
      ['SYNC', 'SQLite local-first 캐시 동기화'],
      ['OFFLINE', '오프라인 신호 유지'],
      ['STATE', 'Zustand 전역 상태 조합'],
    ],
    tags: ['TanStack Query', 'React', 'Zustand', 'SQLite', 'local-first'],
  },
  {
    type: 'signal',
    id: 'Rust side-effect boundary',
    sub: 'SYSTEM LAYER',
    brg: 216,
    ring: 0.84,
    conf: 95,
    desc: 'Tauri 2 백엔드 Rust 레이어가 side-effect(파일 IO / 프로세스 실행 / 외부 API 호출)를 경계 지정. 프론트엔드 React/TS는 순수 뷰 로직만 담당. Boule Governance gate와 Rust boundary가 이중 안전망 구성.',
    ach: [
      ['TAURI', 'Tauri 2 Rust 백엔드'],
      ['BOUNDARY', 'side-effect 경계 지정'],
      ['SAFETY', 'Boule gate + Rust boundary 이중 안전망'],
    ],
    tags: ['Tauri 2', 'Rust', 'side-effect', 'boundary', 'Boule'],
  },
  {
    type: 'signal',
    id: 'SQLite local-first',
    sub: 'DATA STORE',
    brg: 252,
    ring: 0.88,
    conf: 94,
    desc: '모든 Work Radar 데이터를 로컬 SQLite에 우선 저장. 클라우드 연동 장애 시에도 스코프 운영 유지. event-sourced work graph의 저장소이자 오프라인 캐시 소스.',
    ach: [
      ['LOCAL', '로컬 우선 저장'],
      ['OFFLINE', '클라우드 장애 내성'],
      ['SOURCE', 'event-sourced graph 저장소'],
    ],
    tags: ['SQLite', 'local-first', 'offline', 'event-sourced'],
  },
  {
    type: 'agent',
    id: 'Hermes ACP 세션',
    sub: 'AGENT COMMUNICATION PROTOCOL',
    brg: 288,
    ring: 0.86,
    conf: 92,
    desc: 'Hermes Agent Communication Protocol로 복수 에이전트 간 메시지 교환. Jobs Agent / cmux 세션 / Command Palette 에이전트가 Hermes를 통해 Work Radar 이벤트 버스에 연결. Control Room이 ACP 트래픽을 실시간 모니터링.',
    ach: [
      ['ACP', 'Hermes Agent Communication Protocol'],
      ['BUS', 'Work Radar 이벤트 버스 연결'],
      ['MONITOR', 'Control Room 실시간 모니터링'],
    ],
    tags: ['Hermes', 'ACP', '이벤트 버스', 'Jobs Agent', 'Control Room'],
  },
]

export const PHASE_BY_TYPE: Record<string, number> = {
  gate: 0,
  surface: 1,
  agent: 2,
  signal: 3,
}

export const PHASE_LABEL = [
  'S0 · CAPTURE BOARD',
  'S1 · TODAY TIMELINE',
  'S2 · PR RADAR',
  'S3 · CONTROL ROOM',
]

export const PHASE_KO = [
  'Capture Board(Eisenhower matrix)',
  'Today Timeline(drag 배치)',
  'PR Radar(CI 버킷 triage)',
  'Control Room(Boule Governance gate)',
]

export const SURFACE_STACK = [
  { px: 'S0', label: 'CAPTURE BOARD', sub: 'Eisenhower · 루틴 · Agent Bar' },
  { px: 'S1', label: 'TODAY TIMELINE', sub: 'drag 배치 · Work Debt chip' },
  { px: 'S2', label: 'PR RADAR', sub: 'CI · Review · Stale 버킷' },
  { px: 'S3', label: 'CONTROL ROOM', sub: 'Boule Governance gate' },
] as const

export const FAKE_SIGNALS = [
  { id: 'NOTION-WEBHOOK', sub: 'API SIGNAL', type: 'signal', brg: 188, ring: 0.92 },
  { id: 'SLACK-EVENT', sub: 'NOTIFICATION', type: 'agent', brg: 47, ring: 0.94 },
  { id: 'CRON-JOB-01', sub: 'SCHEDULED TASK', type: 'agent', brg: 225, ring: 0.88 },
  { id: 'WEBHOOK-GH', sub: 'GITHUB EVENT', type: 'signal', brg: 310, ring: 0.96 },
  { id: 'TAURI-IPC', sub: 'SYSTEM EVENT', type: 'signal', brg: 72, ring: 0.9 },
]
