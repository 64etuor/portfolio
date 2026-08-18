import type { ProjectContent } from './types'

export const work_radar: ProjectContent = {
  slug: 'work-radar',
  ganttId: 'p-radar',
  order: 9,
  enabled: true,
  hero: {
    title: 'Work Radar — Local-first AI 워크플로우 콕핏',
    company: '개인 프로젝트',
    companyKey: 'startup',
    period: '2026.06',
    role: 'Work Radar — Local-first AI 워크플로우 콕핏',
  },
  summary:
    'Work Radar는 캡처·캘린더·PR·worktree·루틴·AI agent 세션을 하나의 local-first 데스크톱 콕핏으로 묶어, 신호 수집부터 시간 배치·실행·회고까지 반복 가능한 운영 루프로 만드는 제품이다. 핵심은 Control Room으로, 자동 개발을 spec·plan·task·session·handoff의 복잡계로 다루고 readiness gate와 approval queue로 human-in-the-loop governance를 명시한다.',
  metrics: [
    { label: '통합 표면', value: '11', note: 'Capture·Today·PR·Worktree·Jobs·Control Room 등' },
    { label: '스택', value: 'Tauri 2 · Rust', note: 'native cockpit, Rust side-effect boundary' },
    { label: '거버넌스', value: 'Human-in-the-loop', note: 'agent write는 approval queue 경유' },
    { label: '동기화', value: 'Local-first', note: 'Google Calendar bounded sync worker' },
    { label: 'Agent 연동', value: 'Codex · Hermes · cmux', note: 'bounded 실행 + 감사 trail' },
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
      heading: '개요',
      body: 'Work Radar는 개인 업무, 코드 리뷰, 로컬 worktree, 캘린더, 루틴, AI agent 세션을 한 화면 체계로 묶는 **local-first 데스크톱 운영 콕핏**이다. 일반적인 todo app처럼 "할 일 목록"을 정리하는 데서 멈추지 않고, 들어온 신호를 분류하고, 오늘의 시간 위에 배치하고, agent 실행을 추적하고, 주간 회고로 다시 접는 전체 루프를 제품으로 만든다.\n\n각 화면은 신호 수집·시간 배치·agent 실행·governance·회고 중 하나의 책임을 맡고, 전체 흐름은 다시 다음 작업 사이클로 되돌아온다. 아키텍처는 *Rust side-effect boundary*와 *React operating UI*가 분리되어, 많은 integration을 다루면서도 사용자의 명시적 판단 게이트를 유지한다.',
    },
    {
      heading: '문제 정의',
      body: '현대적인 개인 개발자의 업무는 한 도구로 들어오지 않는다. 캘린더 일정, GitHub PR, Notion 백로그, 로컬 worktree, Hermes 패널, Codex job, 루틴, 브레인덤프가 서로 다른 속도로 동시에 들어온다. 실제 병목은 자동화 부족보다 **"지금 무엇을 봐야 하는지"를 잃는 데** 있다.\n\nWork Radar는 이 문제를 task manager가 아니라 *운영면의 문제*로 본다. 모든 일을 하나의 list로 평탄화하는 대신, 각 신호가 어떤 레일에 있어야 하는지 드러낸다.\n\n- `Capture Board`는 들어온 신호를 Eisenhower matrix로 받는다\n- `Today`는 신호가 오늘의 시간을 점유하게 만든다\n- `PR Radar`·`Worktree Diff`는 코드 상태를 운영 위험으로 분리해 보여준다\n- `Jobs`는 agent 실행을 bounded log로 남긴다\n- `Control Room`은 자동 개발 시스템이 지금 실행 가능한지, 어디서 사람이 개입해야 하는지를 보여준다',
    },
    {
      heading: 'Control Room · Boule Governance',
      body: 'Control Room은 Work Radar의 핵심이다. **Boule Governance**, 즉 자동 개발 구현 시스템을 단일 job queue가 아니라 *운영 가능한 복잡계*로 다룬다. 자동 개발은 `spec` → `plan` → `task` → `session` → `handoff`가 서로 연결되며 진행되는 event-sourced workflow이고, 여러 agent session과 worktree, human gate가 동시에 존재하면 상태는 쉽게 창발한다. Control Room은 그 창발 상태를 숨기지 않고 **posture·readiness·vitals·flow graph**로 접어낸다.\n\n설계의 핵심은 *ticker와 autonomy를 분리*한 것이다. ticker는 app/operator가 제공하는 bounded heartbeat clock이고, autonomy level은 heartbeat가 돌 때 무엇을 허용할지 정하는 permission envelope이다. 따라서 `tick_enabled=true`와 `autonomyLevel=manual`은 모순이 아니라 "Clock on, autonomy manual — 사람 게이트 대기 중" 상태다.\n\n안전 경계도 명확하다. snapshot은 read-only이고 repo path는 renderer 입력이 아니라 DB에서 resolve된다. ticker는 무한 daemon이 아니라 app-bound runner로, per-repo no-overlap lock과 timeout을 가진다. `halted_decision`·`needs_human`·`stalled`는 fail-closed로 attention latch를 켜고, 원인이 남아 있으면 다음 tick에서 다시 걸린다.',
    },
    {
      heading: '자동화 경계 — Calendar · MCP · Hermes',
      body: '외부 연동은 모두 같은 원칙 아래 붙는다. *외부 agent와 협업 채널은 Work Radar의 판단을 대체하지 않는다.*\n\n- **Google Calendar** — Today/Routine의 시간 상태를 외부 캘린더와 맞추는 mirror surface다. 읽기는 ambient signal로 병합하되, 쓰기는 `stage_calendar_write`가 로컬 mirror를 먼저 갱신하고 `pending_calendar_writes` 큐에 넣는다. 백그라운드 `SyncEngine`이 bounded retry로 flush한다.\n- **MCP gateway** — 내장 stdio MCP 서버의 write tool(`wr_github_comment`, `wr_calendar_create_event` 등)은 기본적으로 실행하지 않고 `external_actions` approval queue에 제안만 넣는다. token이나 raw credential은 MCP 표면에 노출되지 않는다.\n- **Hermes ACP** — `session/request_permission`을 `AskUserCard`로 바꿔 사용자가 승인한 action만 즉시 실행 경로를 탄다. 그래서 Hermes의 확인 card가 human gate가 되고, 같은 결정을 두 번 묻지 않는다.\n\n결과적으로 자동화는 `timeout`·`max turns`·`cost cap`·accept/reject 로그를 남기는 감사 가능한 운영 단위가 된다.',
    },
    {
      heading: '핵심 메시지',
      body: 'Work Radar의 철학은 **자동화의 양을 늘리는 것이 아니라, 자동화가 만들어내는 상태를 사람이 다룰 수 있는 형태로 만드는 것**이다. Capture Board와 Today는 흩어진 신호를 시간 위에 올리고, PR Radar와 Worktree Diff는 코드 운영 위험을 분리해서 읽게 하며, Jobs와 Agent Bar는 실행 주체의 현재성과 감사 trail을 남긴다.\n\nControl Room은 이 철학의 결론이다. Boule Governance는 자동 개발을 하나의 queue가 아니라 복잡계로 보고, 창발 상태를 graph·readiness·heartbeat·latch로 압축해 운영자가 승인하거나 멈추거나 다시 흘려보낼 수 있게 만든다. 그래서 Work Radar는 AI app보다 *AI work를 운영하기 위한 cockpit*에 가깝다.',
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
        'Capture Board — 좌측 미분류 inbox, 중앙 Eisenhower matrix, 우측 Today·루틴 rail을 결합한 첫 관제면. 상단 Agent Bar가 Codex·Hermes·cmux 세션을 상주 노출한다.',
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
        'Worktree Diff — 여러 repo·worktree의 dirty·staged·branch diff를 압축한 branch hygiene cockpit. AI review는 "수정"이 아니라 위험 변경·dead code·누락 테스트를 짚는 read-only 리뷰로 고정된다.',
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
        'Control Room — Boule Governance의 posture·ticker·readiness·flow graph. SPEC·PLAN·TASK·SESSION·HANDOFF ghost pipeline이 work가 생기면 FlowSchematic으로 바뀌며 창발 상태를 사람이 통제하게 만든다.',
    },
  ],
}
