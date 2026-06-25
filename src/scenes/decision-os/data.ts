// Decision OS — 가치 변위 콘솔. decision-os.html 의 데이터 모델 + 결정론적 스코어링 이식.
// DAG = SSOT, tree = projection. Deterministic Gate→Score→Cap→Tiebreaker.
// 모든 함수는 순수(동일 입력 ⇒ 동일 출력). 난수는 라이브 레저 스트림에만 존재.

interface Axes {
  info: number
  irr: number
  dep: number
  ddl: number
  ev: number
}

export interface NodeT {
  id: string
  title: string
  type: 'type1' | 'type2'
  state: 'decided' | 'deferred' | 'proposed'
  row: number
  desc: string
  deps: string[]
  axes: Axes
  pos: string[]
  neg: string[]
  _rank?: number | null
}

// 5 axes: information_gain, irreversibility_risk, dependency_enablement,
//         deadline_pressure, evidence_readiness   (each 0..100, fixed)
export const NODES: NodeT[] = [
  {
    id: 'D-01',
    title: '문제를 어떤 좌표계로 분류할 것인가',
    type: 'type1',
    state: 'decided',
    row: 0,
    desc: '첫 결정 = 문제를 분류하는 것. Cynefin/Stacey 좌표계 선택. 좌표계가 틀리면 이후 모든 분석이 무너지므로 가장 먼저, 비가역적으로 다룬다.',
    deps: [],
    axes: { info: 88, irr: 74, dep: 95, ddl: 40, ev: 70 },
    pos: ['이후 모든 노드의 판단 기준(rubric)이 고정된다', '잘못된 분석 프레임을 조기에 차단', '의존성 정렬의 출발점 확보'],
    neg: ['좌표계를 바꾸면 하위 결정 재평가 비용 발생', '조기 확정은 탐색 폭을 좁힐 수 있음'],
  },
  {
    id: 'D-02',
    title: 'DAG를 SSOT로 둘 것인가 (트리는 프로젝션)',
    type: 'type1',
    state: 'decided',
    row: 1,
    desc: 'Canonical DAG harness의 핵심. 트리는 보기 좋은 투영일 뿐, 진실은 DAG. 정보손실은 hidden_dependency_edges로 추적해 숨기지 않는다.',
    deps: ['D-01'],
    axes: { info: 80, irr: 82, dep: 90, ddl: 35, ev: 78 },
    pos: ['다중 의존성을 손실 없이 표현', '트리 투영 시 잘린 엣지를 명시적으로 보존', 'SSOT 단일화로 동기화 충돌 감소'],
    neg: ['DAG 유지 비용 증가', '위상정렬 사이클 검출 로직 필요'],
  },
  {
    id: 'D-03',
    title: '상태머신을 append-only로 강제할 것인가',
    type: 'type1',
    state: 'decided',
    row: 2,
    desc: 'Proposed → Decided → Superseded. non-overwriting. 결정은 덮어쓰지 않고 누적한다. 과거 결정의 맥락(왜)을 잃지 않기 위함.',
    deps: ['D-02'],
    axes: { info: 72, irr: 86, dep: 74, ddl: 30, ev: 84 },
    pos: ['결정 이력·근거의 완전한 감사 추적', '번복도 Superseded로 추적되어 학습 가능', '에이전트/사람 동시편집의 충돌 표면화'],
    neg: ['레저 용량 증가', '조회 시 최신 유효본 계산 필요'],
  },
  {
    id: 'D-04',
    title: '무엇을 먼저 정할 것인가 (순서 우선순위)',
    type: 'type2',
    state: 'decided',
    row: 3,
    desc: '"무엇이 더 중요한가"가 아니라 "무엇을 먼저 정해야 하는가". 의존성(topological) 순서로 결정. 순서를 잘못 잡으면 재작업이 폭발한다.',
    deps: ['D-02', 'D-03'],
    axes: { info: 84, irr: 55, dep: 92, ddl: 62, ev: 66 },
    pos: ['선행 결정이 후행 결정을 enable', '재작업/되돌림 최소화', '병렬 가능 분기 식별'],
    neg: ['위상 변화 시 재정렬 필요', '우선순위≠중요도라는 직관 충돌'],
  },
  {
    id: 'D-05',
    title: 'Pruning을 어떤 근거로 허용할 것인가',
    type: 'type1',
    state: 'decided',
    row: 4,
    desc: 'Pruning은 확인된 사실로만. 추정 기반 pruning은 가장 위험한 오류 — 시스템이 차단한다. 잘라낸 가지는 복구 불가에 준하므로 type-1로 취급.',
    deps: ['D-04'],
    axes: { info: 60, irr: 90, dep: 70, ddl: 48, ev: 92 },
    pos: ['탐색공간 축소로 의사결정 가속', '검증된 사실 기반이라 신뢰 가능', '비가역 손실을 사실로만 정당화'],
    neg: ['사실 검증 비용·지연', '과도 보수 시 탐색 정체 가능'],
  },
  {
    id: 'D-06',
    title: '불확실 노드를 보류(defer)할 것인가 가지치기할 것인가',
    type: 'type2',
    state: 'deferred',
    row: 5,
    desc: 'Deferred ≠ pruned. 되돌릴 수 있으면 보류하고 재방문 트리거를 건다. 정보 부족해도 멈추지 않고 assumptions/unknowns/open_questions로 구조화 보존.',
    deps: ['D-05'],
    axes: { info: 46, irr: 38, dep: 64, ddl: 55, ev: 42 },
    pos: ['성급한 비가역 결정 회피', '정보 도착 시 재평가 가능(reversible)', '미지 항목을 구조로 보존해 누락 방지'],
    neg: ['보류 항목 누적 시 인지부하', '재방문 트리거 운영 비용'],
  },
  {
    id: 'D-07',
    title: '인간 편집과 에이전트 동기화 충돌을 어떻게 해소할 것인가',
    type: 'type2',
    state: 'deferred',
    row: 6,
    desc: 'Reconcile before creating. Last Edited At > Last Agent Sync At 이면 사람 편집을 보호한다. 에이전트는 사람 위에 덮어쓰지 않는다.',
    deps: ['D-03', 'D-04'],
    axes: { info: 58, irr: 50, dep: 58, ddl: 70, ev: 60 },
    pos: ['사람의 권위 있는 편집 보존', '무단 덮어쓰기로 인한 신뢰붕괴 방지', '충돌을 명시적 reconcile 단계로 표면화'],
    neg: ['reconcile 단계의 지연', '타임스탬프 정합성 의존'],
  },
  {
    id: 'D-08',
    title: '가치 변위를 모든 결정의 1급 산출물로 둘 것인가',
    type: 'type1',
    state: 'proposed',
    row: 7,
    desc: '모든 결정은 Positive/Negative 변위를 명시. Magnitude = Scale × Reversibility. 트레이드오프를 숨기지 않는 것이 구조의 정직함이다.',
    deps: ['D-01', 'D-05'],
    axes: { info: 76, irr: 80, dep: 68, ddl: 44, ev: 64 },
    pos: ['트레이드오프 가시화로 정직한 비교', 'Magnitude로 결정의 무게를 정량화', '사후 회고 시 변위 검증 가능'],
    neg: ['모든 결정에 변위 기술 부담', '주관 개입 시 변위 추정 편향'],
  },
]

// hidden_dependency_edges (정보손실 — tree projection이 잘라낸 엣지, 숨기지 않고 추적)
export const HIDDEN_EDGES: [string, string][] = [
  ['D-08', 'D-03'],
  ['D-07', 'D-02'],
]

export interface LedgerEntry {
  id: string
  state: 'proposed' | 'decided' | 'superseded'
  txt: string
  node: string
  by: string
  edited: string
  sync: string
}

export const LEDGER: LedgerEntry[] = [
  { id: 'L-006', state: 'proposed', txt: '가치 변위(Positive/Negative)를 모든 결정의 1급 산출물로 승격 — Magnitude=Scale×Reversibility 의무화', node: 'D-08', by: 'human', edited: 'T+0m', sync: 'T-3m' },
  { id: 'L-005', state: 'decided', txt: 'Pruning은 확인된 사실로만 허용. 추정 기반 pruning 전면 금지(엔진 차단)', node: 'D-05', by: 'human', edited: 'T-12m', sync: 'T-40m' },
  { id: 'L-004', state: 'decided', txt: '결정 순서는 위상정렬(dependency-first). 중요도가 아니라 선행성으로 정렬', node: 'D-04', by: 'agent', edited: 'T-31m', sync: 'T-31m' },
  { id: 'L-003', state: 'decided', txt: '상태머신 append-only 확정 (Proposed→Decided→Superseded, non-overwriting)', node: 'D-03', by: 'human', edited: 'T-58m', sync: 'T-70m' },
  { id: 'L-002', state: 'superseded', txt: '트리를 SSOT로 두자 — DAG=SSOT 결정(L-001 계열)에 의해 대체됨', node: 'D-02', by: 'agent', edited: 'T-92m', sync: 'T-92m' },
  { id: 'L-001', state: 'decided', txt: '문제 좌표계를 먼저 분류(Cynefin/Stacey). 첫 결정=분류로 확정', node: 'D-01', by: 'human', edited: 'T-110m', sync: 'T-120m' },
]

export const PRESERVED = {
  assume: [
    '회의록 1건당 평균 3.2개 결정이 추출된다(파일럿 표본)',
    '재방문 트리거는 주 1회 배치로 충분하다',
    '사람의 편집 타임스탬프는 신뢰 가능하다(NTP 동기)',
  ],
  unknown: [
    'Superseded 결정의 장기 조회 비용 곡선',
    'hidden_dependency_edges가 트리 가독성에 미치는 임계점',
    '에이전트 동기화 주기의 최적값',
  ],
  open: [
    '비가역 위험 cap의 임계값은 도메인마다 달라야 하는가?',
    '보류(defer) 누적 상한을 둘 것인가, 둔다면 어떻게?',
    '가치 변위의 주관성을 어떻게 캘리브레이션할 것인가?',
  ],
}

/* ---------- DETERMINISTIC SCORING: Gate → Score → Cap → Tiebreaker ---------- */
// Fixed weights (frozen). No randomness anywhere. Pure function of node data.
const WEIGHTS = { info: 0.3, dep: 0.26, ev: 0.2, ddl: 0.14, irr: 0.1 }
export const CAP_THRESHOLD = 82 // irreversibility_risk above this triggers a cap
const CAP_VALUE = 70 // capped score ceiling

function gateNode(n: NodeT) {
  // Gate: all hard dependencies must be in {decided}. else BLOCKED.
  const states = Object.fromEntries(NODES.map((x) => [x.id, x.state]))
  const unmet = n.deps.filter((d) => states[d] !== 'decided')
  return { pass: unmet.length === 0, unmet }
}
export function rawScore(n: NodeT) {
  const a = n.axes
  // deadline contributes positively; irreversibility as small positive urgency term
  const s = a.info * WEIGHTS.info + a.dep * WEIGHTS.dep + a.ev * WEIGHTS.ev + a.ddl * WEIGHTS.ddl + a.irr * WEIGHTS.irr
  return Math.round(s * 10) / 10
}
export function capScore(n: NodeT, raw: number) {
  if (n.axes.irr >= CAP_THRESHOLD && raw > CAP_VALUE) {
    return { capped: true, value: CAP_VALUE, from: raw }
  }
  return { capped: false, value: raw, from: raw }
}
function topoIndex(): Record<string, number> {
  // deterministic topological order via Kahn; ties broken by id asc
  const ids = NODES.map((n) => n.id)
  const indeg: Record<string, number> = Object.fromEntries(ids.map((i) => [i, 0]))
  const edges: Record<string, string[]> = {}
  NODES.forEach((n) => {
    edges[n.id] = []
  })
  NODES.forEach((n) =>
    n.deps.forEach((d) => {
      if (edges[d]) {
        edges[d].push(n.id)
        indeg[n.id]++
      }
    })
  )
  const order: string[] = []
  const ready = ids.filter((i) => indeg[i] === 0).sort()
  while (ready.length) {
    const cur = ready.shift() as string
    order.push(cur)
    edges[cur].sort().forEach((t) => {
      if (--indeg[t] === 0) ready.push(t)
    })
    ready.sort()
  }
  return Object.fromEntries(order.map((id, i) => [id, i]))
}
function djb2(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  return h
}

export interface RankRow {
  n: NodeT
  gate: { pass: boolean; unmet: string[] }
  raw: number
  cap: { capped: boolean; value: number; from: number }
  eff: number
  topo: number
  rank: number
}

export function computeRanking(): { rows: RankRow[]; hash: string } {
  const topo = topoIndex()
  const rows: RankRow[] = NODES.map((n) => {
    const g = gateNode(n)
    const raw = rawScore(n)
    const cap = capScore(n, raw)
    const eff = g.pass ? cap.value : -1 // blocked nodes sink to bottom deterministically
    return { n, gate: g, raw, cap, eff, topo: topo[n.id], rank: 0 }
  })
  // Tiebreaker: eff desc, then topo asc, then id asc  (fully deterministic)
  rows.sort((A, B) => {
    if (B.eff !== A.eff) return B.eff - A.eff
    if (A.topo !== B.topo) return A.topo - B.topo
    return A.n.id < B.n.id ? -1 : 1
  })
  rows.forEach((r, i) => (r.rank = i + 1))
  // deterministic hash of the ranking result
  const sig = rows.map((r) => `${r.n.id}:${r.eff}:${r.gate.pass ? 1 : 0}:${r.cap.capped ? 1 : 0}`).join('|')
  const hash = '0x' + djb2(sig).toString(16).padStart(8, '0')
  return { rows, hash }
}

/* ---------- CONTEXT (Cynefin / Stacey) ---------- */
export interface CtxDef {
  label: string
  pin: string
  stacey: string
  domains: { n: string; d: string; act?: boolean }[]
  stack: string[]
  hot: string
  reco: (n: NodeT) => { t: string; s: string }
}

export const CTX: Record<string, CtxDef> = {
  complicated: {
    label: 'COMPLICATED',
    pin: 'COMPLICATED',
    stacey: '합의 높음 · 확실성 중간 → <b>분석적(analyzable)</b> 영역. 전문가 판단 + 모범사례(good practice) 적용.',
    domains: [
      { n: 'sense', d: '감지' },
      { n: 'analyze', d: '분석(전문가)', act: true },
      { n: 'respond', d: '대응' },
      { n: 'good-practice', d: 'good practice' },
    ],
    stack: ['Cynefin', 'Stacey', 'Type1/2', 'OODA', 'Pre-mortem', 'RAPID'],
    hot: 'Pre-mortem',
    reco: (n) =>
      n.type === 'type1'
        ? { t: `비가역(Type-1) × 분석가능 → <b>Pre-mortem 의무</b> 후 RAPID로 권한 확정.`, s: '전문가 분석으로 인과를 규명한 뒤, 실패 시나리오를 먼저 적어 비가역 위험을 상한 처리한다.' }
        : { t: `가역(Type-2) → <b>OODA 빠른 순환</b>으로 분석·실행 병행.`, s: '되돌릴 수 있으므로 분석에 과투자하지 않고 빠르게 관찰-판단-실행한다.' },
  },
  complex: {
    label: 'COMPLEX',
    pin: 'COMPLEX',
    stacey: '합의 낮음 · 확실성 낮음 → <b>창발(emergent)</b> 영역. 안전-실패 실험으로 패턴을 유도(probe).',
    domains: [
      { n: 'probe', d: '탐침(실험)', act: true },
      { n: 'sense', d: '감지' },
      { n: 'respond', d: '대응' },
      { n: 'emergent', d: 'emergent practice' },
    ],
    stack: ['Cynefin', 'Stacey', 'Type1/2', 'OODA', 'Pre-mortem', 'RAPID'],
    hot: 'OODA',
    reco: (n) =>
      n.type === 'type1'
        ? { t: `비가역 × 복잡 → <b>결정을 가역화(Type-2 변환)</b>하거나 보류.`, s: '복잡계에서 비가역 결정은 위험하다. 작게 쪼개 가역으로 만들고 probe로 패턴이 보일 때까지 defer.' }
        : { t: `가역 × 복잡 → <b>safe-to-fail probe 우선</b>, 결론은 창발에 맡긴다.`, s: '여러 작은 실험을 병렬 가동하고 신호가 강해지는 분기를 증폭한다.' },
  },
  chaotic: {
    label: 'CHAOTIC',
    pin: 'CHAOTIC',
    stacey: '합의·확실성 모두 붕괴 → <b>혼돈(act-first)</b> 영역. 먼저 행동해 안정화한 뒤 분류로 복귀.',
    domains: [
      { n: 'act', d: '행동(즉시)', act: true },
      { n: 'sense', d: '감지' },
      { n: 'respond', d: '대응' },
      { n: 'novel', d: 'novel practice' },
    ],
    stack: ['Cynefin', 'OODA', 'Type1/2', 'RAPID', 'Pre-mortem', 'Stacey'],
    hot: 'OODA',
    reco: () => ({ t: `혼돈 → <b>OODA의 Act를 먼저</b> 실행해 출혈을 멈춘다.`, s: '분석을 기다리지 않는다. 안정화 후 Cynefin으로 재분류 — 좌표계를 다시 잡는 것이 회복의 첫 걸음.' }),
  },
  clear: {
    label: 'CLEAR',
    pin: 'CLEAR',
    stacey: '합의 높음 · 확실성 높음 → <b>명백(obvious)</b> 영역. 모범사례를 그대로 적용(best practice).',
    domains: [
      { n: 'sense', d: '감지' },
      { n: 'categorize', d: '범주화', act: true },
      { n: 'respond', d: '대응' },
      { n: 'best-practice', d: 'best practice' },
    ],
    stack: ['Cynefin', 'Stacey', 'Type1/2', 'RAPID', 'OODA', 'Pre-mortem'],
    hot: 'RAPID',
    reco: () => ({ t: `명백 → <b>RAPID로 즉시 결정</b>, 절차화·자동화 대상.`, s: '논쟁 여지가 적다. 권한(RAPID)을 명확히 하고 best practice를 적용해 빠르게 닫는다.' }),
  },
}

export function tsToMin(t: string) {
  // "T+0m" → 0, "T-58m" → -58
  const m = t.match(/T([+-])(\d+)m/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * parseInt(m[2], 10)
}
