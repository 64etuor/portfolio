export const C = {
  signal: '#36e0a4',
  signalDim: '#1c7a5c',
  amber: '#e6a64b',
  rust: '#d96b5a',
  hueA: '#5aa9e6',
  hueB: '#b07fd6',
  hueC: '#e6cf6a',
  ink2: '#9fb0c4',
  ink3: '#5f7287',
  line: '#1a2330',
  line2: '#232f40',
  bg: '#070b11',
}

export const STAGES = ['spec', 'plan', 'task', 'session', 'handoff'] as const

export const AGENT_DEFS = [
  { g: 'P', name: 'planner', scope: 'autonomy: low · read+plan', status: 'run' },
  { g: 'E', name: 'executor', scope: 'autonomy: scoped · code write', status: 'run' },
  { g: 'C', name: 'codex-runner', scope: 'autonomy: gated · job spawn', status: 'await' },
  { g: 'R', name: 'researcher', scope: 'autonomy: low · insane-search', status: 'run' },
  { g: 'V', name: 'verifier', scope: 'autonomy: read-only · review', status: 'idle' },
] as const

export type AgentStatus = (typeof AGENT_DEFS)[number]['status'] | 'done'

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'IDLE',
  run: 'RUNNING',
  await: 'AWAITING-PERM',
  done: 'DONE',
}

export const REG_DEFS = [
  { n: 'EventStore', h: 'healthy' },
  { n: 'TickerService', h: 'healthy' },
  { n: 'AutonomyGate', h: 'healthy' },
  { n: 'AttentionLatch', h: 'armed' },
  { n: 'HermesACP', h: 'awaiting' },
  { n: 'GraphRAGIndex', h: 'healthy' },
] as const

export const EV_TYPES = [
  ['emit', 'spec.captured · §0 readiness eval'],
  ['emit', 'plan.proposed · executor draft'],
  ['gate', 'readiness.gate · hold §%s pending'],
  ['emit', 'task.materialized · 3 subtasks'],
  ['ok', 'session.handoff · upcast v%s→v%s'],
  ['tool', 'mcp.insane-search · adaptive fetch'],
  ['emit', 'ticker.tick · heartbeat observe'],
] as const

export const TOOLS = [
  ['tool', 'fs.read · src/store/migrations'],
  ['tool', 'graphrag.query · multi-hop k=4'],
  ['tool', 'vault-lint.py · 48 deterministic checks'],
  ['tool', 'codex.runner · turn advance'],
  ['deny', 'external.write · BLOCKED (envelope)'],
  ['tool', 'AGENTS.md · SSOT resolve (conflict→win)'],
  ['ok', 'changelog · net-zero [A]↔[R] enforced'],
  ['tool', 'run_due_maintenance.py · CADENCE check'],
  ['ok', 'instruction-review.md · append [llm]'],
  ['tool', 'mcp.server · neuro-symbolic eval'],
] as const

export const SEED_EVENTS = [
  ['emit', 'spec.captured · §0 readiness eval'],
  ['ok', 'plan.proposed · executor draft v2'],
  ['gate', 'readiness.gate · release §0→§1'],
  ['emit', 'task.materialized · 3 subtasks'],
  ['ok', 'session.handoff · upcast v7→v8'],
  ['emit', 'ticker.tick · heartbeat observe'],
  ['gate', 'attention.latch · armed'],
] as const

export const SEED_TOOLS = [
  ['tool', 'graphrag.query · multi-hop k=4'],
  ['deny', 'external.write · BLOCKED (envelope)'],
  ['ok', 'decision.ledger · append (non-overwrite)'],
  ['tool', 'wiki.lint · schema 비대화 check'],
  ['tool', 'codex.runner · turn advance'],
  ['tool', 'mcp.server · neuro-symbolic eval'],
] as const

export const G_LABELS = [
  'LLM Wiki',
  'GraphRAG',
  'Leiden',
  'ticker',
  'envelope',
  'fail-closed',
  'spec',
  'handoff',
  'Decision OS',
  'MCP',
  'Tauri',
  'SQLite',
  'ACP',
  'Codex',
] as const

export const NZ_PAIRS = [
  ['changelog 체크 추가: ISO-date strict', '오래된 date-format 경고 제거'],
  ['lint #34 AUTOGEN drift 추가', '중복 frontmatter rule 제거'],
  ['tag taxonomy 항목 추가', 'stale class 별칭 제거'],
  ['wikilink 해석 규칙 강화', '중복 link-check 제거'],
] as const

export const AUDITS = [
  ['llm', '규칙 §frontmatter-7 재검토 제안 — 5개월 미참조'],
  ['auto', 'dead_notes 임계 초과 감지 → 검토 트리거'],
  ['llm', 'net-zero 위반 후보: [A] 단독 커밋 발견'],
  ['auto', 'AUTOGEN 블록 드리프트(#34) — append 기록'],
  ['llm', 'status_aging 규칙 cadence 갱신 제안'],
  ['auto', 'knowledge_gap 상위 wikilink 끊김 랭킹'],
] as const

export const SEED_AUDITS = [
  ['auto', 'AUTOGEN 블록 드리프트(#34) — append 기록'],
  ['llm', '규칙 §frontmatter-7 재검토 제안 — 5개월 미참조'],
  ['auto', 'dead_notes 임계 초과 감지 → 검토 트리거'],
] as const
