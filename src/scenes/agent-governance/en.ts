import { registerSceneText } from '../_host/localize'

/** English projection of this scene's Korean copy (exact strings first, then word-level terms). */
registerSceneText({
  // Pipeline / heartbeat
  'Boule Pipeline · 경계 설계 후 실행': 'Boule Pipeline · boundaries before execution',
  'ticker 정지해도 권한 봉투는 닫힌 채 유지 — 경계는 하트비트와 무관': 'Stopping the ticker keeps the envelope closed — boundaries are independent of the heartbeat',
  '⏻ 시계 정지 — 권한은': '⏻ Clock stopped — permissions',
  '새지 않음': 'do not leak',
  '(fail-closed 증명)': '(fail-closed proven)',
  'ticker·autonomy 분리 → fail-closed 증명': 'ticker · autonomy decoupled → fail-closed proven',

  // Knowledge layers
  '원천 캡처 — 미가공 노트/대화': 'Raw capture — unprocessed notes/chats',
  '정제 위키 — ingest · query · lint': 'Refined wiki — ingest · query · lint',
  '강제 스키마 — 구조화된 진실': 'Enforced schema — structured truth',
  'query → multi-hop trace 대기…': 'query → waiting for multi-hop trace…',

  // Hermes ACP
  '권한 승인 요청': 'Permission request',
  '에이전트가 외부 쓰기를 요청합니다 —': 'An agent is requesting an external write —',
  'autonomy 봉투 밖의 작업. 사람 승인 없이는 실행되지 않습니다.': 'This is outside the autonomy envelope. It will not run without human approval.',
  'APPROVE · 게이트 개방': 'APPROVE · open gate',
  'DENY · 유지': 'DENY · keep closed',
  '승인됨 —': 'Approved —',
  '1회 실행 허용. autonomy 봉투가': 'allowed to run once. The autonomy envelope is',
  '일시 개방 → fail-closed 복귀': 'briefly opened → back to fail-closed',
  '거부됨 — 외부 쓰기 차단 유지. autonomy 봉투': 'Denied — external write stays blocked. Autonomy envelope',

  // Permission envelope
  'permission envelope · 권한 봉투': 'permission envelope',
  'read · 코드/이벤트 관측': 'read · observe code/events',
  '자율 허용': 'autonomous',
  'plan · 제안 생성': 'plan · draft proposals',
  'external write · push/배포': 'external write · push/deploy',
  '사람 게이트': 'human gate',
  '개방됨 (승인)': 'open (approved)',
  'priority 변경': 'priority change',
  'PINNED · 확인필요': 'PINNED · needs review',

  // Tool / audit feeds
  'wiki.lint · schema 비대화 check': 'wiki.lint · schema bloat check',
  'changelog 체크 추가: ISO-date strict': 'add changelog check: ISO-date strict',
  '오래된 date-format 경고 제거': 'remove stale date-format warning',
  'lint #34 AUTOGEN drift 추가': 'add lint #34 AUTOGEN drift',
  '중복 frontmatter rule 제거': 'remove duplicate frontmatter rule',
  'tag taxonomy 항목 추가': 'add tag taxonomy entry',
  'stale class 별칭 제거': 'remove stale class alias',
  'wikilink 해석 규칙 강화': 'tighten wikilink resolution rule',
  '중복 link-check 제거': 'remove duplicate link-check',
  '규칙 §frontmatter-7 재검토 제안 — 5개월 미참조': 'Propose review of rule §frontmatter-7 — unreferenced for 5 months',
  'dead_notes 임계 초과 감지 → 검토 트리거': 'dead_notes over threshold → review triggered',
  'net-zero 위반 후보: [A] 단독 커밋 발견': 'net-zero violation candidate: [A]-only commit found',
  'AUTOGEN 블록 드리프트(#34) — append 기록': 'AUTOGEN block drift (#34) — appended',
  'status_aging 규칙 cadence 갱신 제안': 'Propose cadence update for status_aging rule',
  'knowledge_gap 상위 wikilink 끊김 랭킹': 'knowledge_gap: top broken wikilinks ranked',

  // Failure modes
  'Schema 비대화': 'Schema bloat',
  "SSOT가 모든 규칙 종착지로 비대해짐 — Hyrum's Law. net-zero 레저로 차단.": "SSOT bloats into the landing spot for every rule — Hyrum's Law. Blocked by a net-zero ledger.",
  '최소주의 = 비대화 면역력.': 'Minimalism = immunity to bloat.',
  '사문화 드리프트': 'Dead-letter drift',
  '정형화됐지만 아무도 안 읽음 = 공동묘지. read_log · dead_notes 텔레메트리로 사문화를 관측.': 'Formalised but read by no one = a graveyard. read_log · dead_notes telemetry observes dead letters.',
  '행동적 부패': 'Behavioural rot',
  '형식은 살았으나 의미가 죽음 — lint로 못 잡는 부패. Instruction Review Protocol + 텔레메트리 read-side 신호로 검출, 처분은 수동.': 'Form survives, meaning dies — rot lint cannot catch. Detected by the Instruction Review Protocol + read-side telemetry; disposal is manual.',

  // Vault governance
  'Vault Governance · 자가통치': 'Vault Governance · self-governance',
  '모든 볼트-쓰기 규칙의 단일 진실원천.': 'Single source of truth for every vault-write rule.',
  '충돌 시 이 파일이 이김': 'This file wins on conflict',
  '— 권한·중단조건·인간 게이트를 여기서 선언 후 실행.': '— permissions, stop conditions and human gates are declared here before execution.',
  '매 편집 턴 후 통과해야': 'must pass after every edit turn',
  'slug: changelog-net-zero · [A]==[R] · 비대화 거버너': 'slug: changelog-net-zero · [A]==[R] · bloat governor',
  'run_due_maintenance.py · CADENCE_DAYS+state · 의존성 순서 · 매주 월': 'run_due_maintenance.py · CADENCE_DAYS+state · dependency order · every Mon',
  'graph_health = god-notes · hub-overload · echo-chambers / knowledge_gap = 끊긴 wikilink 랭킹 →': 'graph_health = god-notes · hub-overload · echo-chambers / knowledge_gap = broken wikilinks ranked →',
  '다음에 쓸 것': 'what to write next',
  '. 측정은 자동, 판결은 아님.': '. Measurement is automatic; judgement is not.',
  'stale 규칙은': 'Stale rules are',
  '절대 조용히 수정 안 함': 'never silently edited',
  '→ 000_System/audits/instruction-review.md 에 append. [llm] 제안 vs [auto] 감지 — 처분은 사람이.': '→ appended to 000_System/audits/instruction-review.md. [llm] proposes vs [auto] detects — a human decides.',

  // Footer
  '경계 설계 → 인간 게이트 → fail-closed 복귀 · 이벤트 소싱 단일 진실원천': 'Boundaries → human gate → back to fail-closed · event-sourced single source of truth',
  'autonomy 기본값': 'autonomy default',
  'vault-lint 게이트': 'vault-lint gate',
  'AGENTS.md 단일원천': 'AGENTS.md single source',
  '이벤트 · 감사 로그': 'events · audit log',

  // Lab page title (public/lab/agent-governance.html)
  'Boule Control Room — AI 에이전트 거버넌스': 'Boule Control Room — AI agent governance',
})
