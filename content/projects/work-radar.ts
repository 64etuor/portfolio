import type { ProjectContent } from './types'

export const work_radar: ProjectContent = {
  slug: 'work-radar',
  ganttId: 'p-radar',
  order: 9,
  enabled: true,
  hero: {
    title: 'Work Radar — AI 에이전트를 함께 쓰는 개인 업무 관리 앱',
    company: '개인 프로젝트',
    companyKey: 'startup',
    period: '2026.05–',
    role: '1인 개발 · 기획, 프론트엔드, Rust 백엔드',
  },
  summary:
    '캘린더·GitHub PR·Notion 백로그·AI 에이전트 작업처럼 흩어진 업무 신호를 한 화면에 모으는 데스크톱 앱. AI는 제안만 하고, 무엇을 할지 정하고 외부에 반영하는 일은 사람이 승인한다. 1,432 커밋 동안 직접 쓰면서 만들었다.',
  metrics: [
    { label: '개발 규모', value: '1,432 커밋', note: '직접 쓰면서 개발 (Phase 0–20)' },
    { label: '외부 쓰기', value: '승인 후 실행', note: 'GitHub · Notion · 캘린더 모두' },
    { label: '에이전트 통제', value: '시간·비용 상한', note: '실행 시간·턴 수·비용 제한, 강제 종료' },
    { label: '범위 판단', value: '위험 기능 제거', note: '구현했지만 이득이 적어 삭제' },
  ],
  stack: [
    'Tauri 2',
    'Rust',
    'SQLite',
    'Vite',
    'React',
    'TypeScript',
    'Tailwind v4',
    'shadcn/ui',
    'TanStack Query',
    'Zustand',
    'Google Calendar',
    'GitHub',
    'Notion',
    'Codex CLI',
    'Hermes ACP',
    'cmux',
    'MCP',
  ],
  sections: [
    {
      heading: '문제',
      body:
        '개인 개발자의 업무는 여러 도구에서 서로 다른 속도로 동시에 들어온다.\n\n- 캘린더 일정, GitHub PR, Notion 백로그, AI 에이전트 작업, 메모가 **각기 다른 곳에** 쌓인다\n- 실제 병목은 자동화 부족이 아니라 **"지금 무엇을 봐야 하는지"를 놓치는 것**이다\n- 모든 일을 할 일 목록 하나로 합치면 일정·코드 리뷰·에이전트 작업의 **성격 차이가 사라진다**',
    },
    {
      heading: '한 화면에 모으기',
      body:
        '할 일 수집 → 오늘 일정 배치 → 실행 → 주간 회고가 하나의 흐름으로 이어진다.\n\n- 들어온 일을 **아이젠하워 매트릭스**(긴급·중요)로 분류하는 수집함\n- 할 일을 끌어다 **오늘의 타임라인**에 배치하고 Google Calendar와 양방향 동기화\n- 여러 저장소의 PR을 **상태별**(CI 실패·리뷰 대기·머지 가능)로 분류\n- 처리량·PR 활동·루틴 이행률을 **주간 회고**로 집계',
    },
    {
      heading: 'AI는 제안만, 결정은 사람이',
      body:
        '자동화를 어디에 넣을지보다 어디에 넣지 않을지를 먼저 정했다.\n\n- 신호는 자동으로 모이지만, 백로그·일정으로 올리는 **결정은 사람이 직접** 한다\n- AI 제안은 **사람이 검토·수정·승인**한 뒤에만 반영된다\n- GitHub·Notion·캘린더에 대한 외부 쓰기는 **승인 대기열**을 거친다\n- 에이전트 실행마다 **시간·턴 수·비용 상한**과 강제 종료를 두고 기록을 남긴다\n- 에이전트 권한은 읽기 전용과 작업 폴더 쓰기뿐, **전체 권한은 제공하지 않는다**',
    },
    {
      heading: '결과',
      body:
        '개발 기간 내내 직접 쓰면서 고쳐 나갔다.\n\n- **1,432 커밋**, 단계별 개발 계획(Phase 0–20)을 모두 반영\n- 앱 안에서 AI가 코드를 구현하고 PR까지 여는 기능은 **구현 후 제거**\n- 외부 코딩 도구와 역할이 겹치고 위험에 비해 이득이 없다고 판단했다\n- 만든 기능을 지운 판단과 이유도 기록으로 남겼다',
    },
  ],
  diagram: {
    kind: 'flow',
    nodes: [
      { id: 'signals', label: 'Signals\ncapture·calendar·PR' },
      { id: 'shape', label: 'Shape\nclassify·schedule' },
      { id: 'work', label: 'Work\njobs·worktrees·agents' },
      { id: 'govern', label: 'Govern\nBoule gates·readiness' },
      { id: 'learn', label: 'Learn\nweekly review' },
    ],
    edges: [
      { from: 'signals', to: 'shape' },
      { from: 'shape', to: 'work' },
      { from: 'work', to: 'govern' },
      { from: 'govern', to: 'learn' },
      { from: 'learn', to: 'signals' },
    ],
  },
  gallery: [
    {
      src: '/projects/work-radar/work-radar-01-capture-board-2026-06-15.png',
      caption:
        'Capture Board — 좌측 미분류 inbox, 중앙 Eisenhower matrix, 우측 Today·루틴 rail을 결합한 첫 화면. 상단 Agent Bar가 Codex·Hermes·cmux 세션을 상주 노출한다.',
    },
    {
      src: '/projects/work-radar/work-radar-03-today-timeline-2026-06-15.png',
      caption:
        'Today Timeline — 미배치 tray를 timeline으로 드래그해 하루의 실제 시간 점유를 만든다. signal·캘린더·루틴을 하나의 시간 좌표계로 합성하고 Work Debt chip으로 운영 부채를 드러낸다.',
    },
    {
      src: '/projects/work-radar/Pasted-image-20260615141933.png',
      caption:
        'Weekly Review — 처리량·PR 활동·배치 시간·Life Wheel·루틴 이행률을 주 window로 집계한다. Capture와 Today의 데이터가 다시 자기 점검 지표가 되는 운영 피드백 루프.',
    },
    {
      src: '/projects/work-radar/Pasted-image-20260615141953.png',
      caption:
        'PR Radar — 열린 PR을 CI Blocked·Needs Review·Ready·Stale·Merged Cleanup bucket으로 분리하고 readiness mix를 시각화한다. 리뷰·CI triage·escalation은 GitHub를 직접 바꾸지 않고 Jobs 제안 레일로 보낸다.',
    },
    {
      src: '/projects/work-radar/Pasted-image-20260615142021.png',
      caption:
        'Worktree Diff — 여러 repo·worktree의 dirty·staged·branch diff를 압축한 branch hygiene 화면. AI review는 "수정"이 아니라 위험 변경·dead code·누락 테스트를 짚는 read-only 리뷰로 고정된다.',
    },
    {
      src: '/projects/work-radar/work-radar-08-jobs-agent-2026-06-15.png',
      caption:
        'Jobs (Agent) — 모든 Codex job에 timeout·max turns·cost cap·kill을 붙인 실행 감사 표면. 제안형 job은 ProposalPanel에서 사람이 편집·accept하며 실행·실패·수락 이력이 남는다.',
    },
    {
      src: '/projects/work-radar/work-radar-09-skills-registry-2026-06-15.png',
      caption:
        'Skills Registry — 인앱 프롬프트와 외부 Claude·Codex·Hermes skill을 검색·태그·설치·백업·감사 로그로 운영한다. AI 운영 자산도 코드처럼 inventory·divergence·backup·audit이 필요하다는 관점.',
    },
    {
      src: '/projects/work-radar/work-radar-10-control-room-2026-06-15.png',
      caption:
        'Control Room — Boule Governance의 posture·ticker·readiness·flow graph. SPEC·PLAN·TASK·SESSION·HANDOFF ghost pipeline이 work가 생기면 FlowSchematic으로 바뀌며 얽힌 상태를 사람이 읽고 통제하게 만든다.',
    },
  ],
}
