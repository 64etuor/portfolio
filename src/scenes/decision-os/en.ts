import { registerSceneText } from '../_host/localize'

/**
 * English projection of this scene's Korean copy (exact strings first, then word-level terms).
 * Also covers public/lab/decision-os.html (iframe panel in 41-perspectives), whose SVG node
 * titles are split at 20 characters and whose rank rows are truncated at 16 — those fragments
 * are listed explicitly below.
 */
registerSceneText({
  // Top bar / tenet
  '— 가치 변위 콘솔': '— Value Displacement Console',
  '"모든 결정은': '"Every decision is a',
  '가치 변위(value displacement)': 'value displacement',
  '다 — Positive와 Negative를 반드시 명시하고 트레이드오프를 숨기지 마라."': ' — always state the Positive and the Negative, and never hide the trade-off."',
  '좋은 결정은 결론의 정확성이 아니라,': 'A good decision comes not from a correct conclusion',
  '결정이 놓인': 'but from the',
  '구조의 정직함': 'honesty of the structure',
  '에서 나온다.': ' it sits in.',

  // Context selector (STEP 0)
  '문제 분류 · 좌표계 설정': 'Classify the problem · set the frame',
  '첫 결정은 결론이 아니라 문제를': 'The first decision is not the conclusion but the',
  '분류': 'classification',
  '하는 것 — 좌표계가 틀리면 이후 분석이 다 무너진다. 컨텍스트를 바꾸면 동일 노드의 권고 경로가 변한다.':
    ' of the problem — if the frame is wrong, every later analysis collapses. Change the context and the same node gets a different recommended path.',
  'Stacey · 합의×확실성': 'Stacey · agreement × certainty',
  '합의 높음 · 확실성 중간 →': 'High agreement · medium certainty →',
  '분석적(analyzable)': 'analyzable',
  '영역. 전문가 판단 + 모범사례(good practice) 적용.': 'zone. Expert judgement + good practice.',
  '영역. 전문가 판단 + 모범사례 적용.': 'zone. Expert judgement + good practice.',
  '합의 낮음 · 확실성 낮음 →': 'Low agreement · low certainty →',
  '창발(emergent)': 'emergent',
  '영역. 안전-실패 실험으로 패턴을 유도(probe).': 'zone. Probe for patterns with safe-to-fail experiments.',
  '합의·확실성 모두 붕괴 →': 'Agreement and certainty both collapsed →',
  '혼돈(act-first)': 'chaotic (act-first)',
  '영역. 먼저 행동해 안정화한 뒤 분류로 복귀.': 'zone. Act first to stabilise, then return to classification.',
  '합의 높음 · 확실성 높음 →': 'High agreement · high certainty →',
  '명백(obvious)': 'obvious',
  '영역. 모범사례를 그대로 적용(best practice).': 'zone. Apply best practice as is.',
  '감지': 'sense',
  '분석(전문가)': 'analyze (expert)',
  '대응': 'respond',
  '탐침(실험)': 'probe (experiment)',
  '행동(즉시)': 'act (now)',
  '범주화': 'categorize',
  '의사결정 스택 (레이어드 · 대체 아님)': 'Decision stack (layered · not a replacement)',

  // DAG panel
  '의사결정 트리 · 의존성(topological) 순서': 'Decision tree · dependency (topological) order',
  'RUN 스코어링': 'RUN scoring',
  '뷰 리셋': 'Reset view',
  'prune (추정)': 'prune (estimate)',
  '추정 기반 pruning 시도': 'Try estimate-based pruning',
  'type-1(비가역)': 'type-1 (irreversible)',
  'RANK 모드 · y=결정론적 점수순': 'RANK mode · y = deterministic score order',
  '실선 = dependency_edge · 점선 = hidden_dependency_edge (정보손실 추적, 숨기지 않음)':
    'solid = dependency_edge · dashed = hidden_dependency_edge (information loss tracked, not hidden)',

  // Node titles (full)
  '문제를 어떤 좌표계로 분류할 것인가': 'Which frame classifies the problem?',
  'DAG를 SSOT로 둘 것인가 (트리는 프로젝션)': 'Make the DAG the SSOT? (tree = projection)',
  '상태머신을 append-only로 강제할 것인가': 'Enforce an append-only state machine?',
  '무엇을 먼저 정할 것인가 (순서 우선순위)': 'What to decide first? (order priority)',
  'Pruning을 어떤 근거로 허용할 것인가': 'On what grounds to allow pruning?',
  '불확실 노드를 보류(defer)할 것인가 가지치기할 것인가': 'Defer or prune uncertain nodes?',
  '인간 편집과 에이전트 동기화 충돌을 어떻게 해소할 것인가': 'Resolve human-edit vs agent-sync conflicts?',
  '가치 변위를 모든 결정의 1급 산출물로 둘 것인가': 'Value displacement as a first-class output?',
  // Node titles split at 20 chars (lab iframe SVG)
  'DAG를 SSOT로 둘 것인가 (트리': 'Make the DAG the SSOT?',
  '는 프로젝션)': '(tree = projection)',
  '상태머신을 append-only로 강': 'Enforce an append-only',
  '제할 것인가': 'state machine?',
  '무엇을 먼저 정할 것인가 (순서 우선': 'What to decide first?',
  '순위)': '(order priority)',
  'Pruning을 어떤 근거로 허용할': 'On what grounds to allow',
  '것인가': 'pruning?',
  '불확실 노드를 보류(defer)할 것': 'Defer or prune',
  '인가 가지치기할 것인가': 'uncertain nodes?',
  '인간 편집과 에이전트 동기화 충돌을': 'Resolve human-edit vs',
  '어떻게 해소할 것인가': 'agent-sync conflicts?',
  '가치 변위를 모든 결정의 1급 산출물': 'Value displacement as a',
  '로 둘 것인가': 'first-class output?',
  // Rank rows truncated at 16 chars (lab iframe)
  'D-01 · 문제를 어떤 좌표계로 분류할 …': 'D-01 · Which frame classifies the problem?',
  'D-02 · DAG를 SSOT로 둘 것인가…': 'D-02 · Make the DAG the SSOT?…',
  'D-03 · 상태머신을 append-onl…': 'D-03 · Enforce an append-only…',
  'D-04 · 무엇을 먼저 정할 것인가 (순…': 'D-04 · What to decide first?…',
  'D-05 · Pruning을 어떤 근거로 …': 'D-05 · On what grounds to allow…',
  'D-06 · 불확실 노드를 보류(defer…': 'D-06 · Defer or prune uncertain…',
  'D-07 · 인간 편집과 에이전트 동기화 …': 'D-07 · Resolve human-edit vs…',
  'D-08 · 가치 변위를 모든 결정의 1급…': 'D-08 · Value displacement as a…',

  // Node descriptions
  '첫 결정 = 문제를 분류하는 것. Cynefin/Stacey 좌표계 선택. 좌표계가 틀리면 이후 모든 분석이 무너지므로 가장 먼저, 비가역적으로 다룬다.':
    'First decision = classify the problem. Choose a Cynefin/Stacey frame. A wrong frame breaks every later analysis, so it is handled first and treated as irreversible.',
  'Canonical DAG harness의 핵심. 트리는 보기 좋은 투영일 뿐, 진실은 DAG. 정보손실은 hidden_dependency_edges로 추적해 숨기지 않는다.':
    'The core of the canonical DAG harness. The tree is just a readable projection; the truth is the DAG. Information loss is tracked as hidden_dependency_edges, never hidden.',
  'Proposed → Decided → Superseded. non-overwriting. 결정은 덮어쓰지 않고 누적한다. 과거 결정의 맥락(왜)을 잃지 않기 위함.':
    'Proposed → Decided → Superseded. Non-overwriting. Decisions accumulate instead of being overwritten, so the context (the why) of past decisions is never lost.',
  '"무엇이 더 중요한가"가 아니라 "무엇을 먼저 정해야 하는가". 의존성(topological) 순서로 결정. 순서를 잘못 잡으면 재작업이 폭발한다.':
    'Not "what matters more" but "what must be decided first". Decide in dependency (topological) order. Get the order wrong and rework explodes.',
  'Pruning은 확인된 사실로만. 추정 기반 pruning은 가장 위험한 오류 — 시스템이 차단한다. 잘라낸 가지는 복구 불가에 준하므로 type-1로 취급.':
    'Prune only on confirmed facts. Estimate-based pruning is the most dangerous error — the system blocks it. A cut branch is close to unrecoverable, so it is treated as type-1.',
  'Deferred ≠ pruned. 되돌릴 수 있으면 보류하고 재방문 트리거를 건다. 정보 부족해도 멈추지 않고 assumptions/unknowns/open_questions로 구조화 보존.':
    'Deferred ≠ pruned. If it is reversible, defer it and set a revisit trigger. Missing information does not stop work — it is preserved as assumptions/unknowns/open_questions.',
  'Reconcile before creating. Last Edited At > Last Agent Sync At 이면 사람 편집을 보호한다. 에이전트는 사람 위에 덮어쓰지 않는다.':
    'Reconcile before creating. If Last Edited At > Last Agent Sync At, the human edit is protected. Agents never overwrite people.',
  '모든 결정은 Positive/Negative 변위를 명시. Magnitude = Scale × Reversibility. 트레이드오프를 숨기지 않는 것이 구조의 정직함이다.':
    'Every decision states its Positive/Negative displacement. Magnitude = Scale × Reversibility. Not hiding the trade-off is what makes the structure honest.',

  // Value displacement (positive / negative)
  '이후 모든 노드의 판단 기준(rubric)이 고정된다': 'Fixes the rubric for every later node',
  '잘못된 분석 프레임을 조기에 차단': 'Blocks a wrong analysis frame early',
  '의존성 정렬의 출발점 확보': 'Gives dependency ordering a starting point',
  '좌표계를 바꾸면 하위 결정 재평가 비용 발생': 'Changing the frame forces costly re-evaluation downstream',
  '조기 확정은 탐색 폭을 좁힐 수 있음': 'Locking in early can narrow exploration',
  '다중 의존성을 손실 없이 표현': 'Represents multiple dependencies without loss',
  '트리 투영 시 잘린 엣지를 명시적으로 보존': 'Explicitly keeps edges cut by the tree projection',
  'SSOT 단일화로 동기화 충돌 감소': 'One SSOT means fewer sync conflicts',
  'DAG 유지 비용 증가': 'Higher cost to maintain the DAG',
  '위상정렬 사이클 검출 로직 필요': 'Needs cycle detection for topological sort',
  '결정 이력·근거의 완전한 감사 추적': 'Full audit trail of decisions and rationale',
  '번복도 Superseded로 추적되어 학습 가능': 'Reversals are tracked as Superseded, so they teach',
  '에이전트/사람 동시편집의 충돌 표면화': 'Surfaces agent/human concurrent-edit conflicts',
  '레저 용량 증가': 'Ledger grows larger',
  '조회 시 최신 유효본 계산 필요': 'Reads must compute the latest valid version',
  '선행 결정이 후행 결정을 enable': 'Earlier decisions enable later ones',
  '재작업/되돌림 최소화': 'Minimises rework and rollbacks',
  '병렬 가능 분기 식별': 'Identifies branches that can run in parallel',
  '위상 변화 시 재정렬 필요': 'Re-sorting needed when the topology changes',
  '우선순위≠중요도라는 직관 충돌': 'Priority ≠ importance clashes with intuition',
  '탐색공간 축소로 의사결정 가속': 'Smaller search space speeds decisions',
  '검증된 사실 기반이라 신뢰 가능': 'Trustworthy because it rests on verified facts',
  '비가역 손실을 사실로만 정당화': 'Irreversible loss justified by facts only',
  '사실 검증 비용·지연': 'Cost and delay of verifying facts',
  '과도 보수 시 탐색 정체 가능': 'Over-caution can stall exploration',
  '성급한 비가역 결정 회피': 'Avoids hasty irreversible decisions',
  '정보 도착 시 재평가 가능(reversible)': 'Can be re-evaluated when information arrives (reversible)',
  '미지 항목을 구조로 보존해 누락 방지': 'Keeps unknowns structured so nothing is dropped',
  '보류 항목 누적 시 인지부하': 'Cognitive load as deferred items pile up',
  '재방문 트리거 운영 비용': 'Cost of running revisit triggers',
  '사람의 권위 있는 편집 보존': 'Preserves authoritative human edits',
  '무단 덮어쓰기로 인한 신뢰붕괴 방지': 'Prevents trust collapse from silent overwrites',
  '충돌을 명시적 reconcile 단계로 표면화': 'Surfaces conflicts as an explicit reconcile step',
  'reconcile 단계의 지연': 'Delay from the reconcile step',
  '타임스탬프 정합성 의존': 'Depends on timestamp consistency',
  '트레이드오프 가시화로 정직한 비교': 'Visible trade-offs make comparisons honest',
  'Magnitude로 결정의 무게를 정량화': 'Magnitude quantifies the weight of a decision',
  '사후 회고 시 변위 검증 가능': 'Displacement can be verified in retrospectives',
  '모든 결정에 변위 기술 부담': 'Every decision must describe its displacement',
  '주관 개입 시 변위 추정 편향': 'Subjectivity can bias displacement estimates',

  // Detail panel
  '노드 상세 · 가치 변위 & 스코어': 'Node detail · value displacement & score',
  'TYPE-1 비가역': 'TYPE-1 irreversible',
  'TYPE-2 가역': 'TYPE-2 reversible',
  '가치 변위 — Value Displacement': 'Value Displacement',
  '5축 결정론적 스코어': '5-axis deterministic score',
  '정보 이득': 'Information gain',
  '비가역 위험': 'Irreversibility risk',
  '의존성 enable': 'Dependency enablement',
  '마감 압력': 'Deadline pressure',
  '증거 준비도': 'Evidence readiness',
  '권고 경로 — Context-driven': 'Recommended path — context-driven',

  // Recommendations (innerHTML fragments around <b>)
  '비가역(Type-1) × 분석가능 →': 'Irreversible (Type-1) × analyzable →',
  'Pre-mortem 의무': 'mandatory pre-mortem',
  '후 RAPID로 권한 확정.': 'first, then lock authority with RAPID.',
  '전문가 분석으로 인과를 규명한 뒤, 실패 시나리오를 먼저 적어 비가역 위험을 상한 처리한다.':
    'Establish cause and effect through expert analysis, then write the failure scenarios first to cap the irreversible risk.',
  '가역(Type-2) →': 'Reversible (Type-2) →',
  'OODA 빠른 순환': 'fast OODA loops',
  '으로 분석·실행 병행.': ' to analyse and execute in parallel.',
  '되돌릴 수 있으므로 분석에 과투자하지 않고 빠르게 관찰-판단-실행한다.': 'Since it can be undone, do not over-invest in analysis — observe, decide and act quickly.',
  '비가역 × 복잡 →': 'Irreversible × complex →',
  '결정을 가역화(Type-2 변환)': 'make the decision reversible (convert to Type-2)',
  '하거나 보류.': ' or defer it.',
  '복잡계에서 비가역 결정은 위험하다. 작게 쪼개 가역으로 만들고 probe로 패턴이 보일 때까지 defer.':
    'Irreversible decisions are dangerous in complex systems. Split them small, make them reversible, and defer until probes reveal a pattern.',
  '가역 × 복잡 →': 'Reversible × complex →',
  'safe-to-fail probe 우선': 'safe-to-fail probes first',
  ', 결론은 창발에 맡긴다.': ' — let the conclusion emerge.',
  '여러 작은 실험을 병렬 가동하고 신호가 강해지는 분기를 증폭한다.': 'Run several small experiments in parallel and amplify the branches whose signal grows.',
  '혼돈 →': 'Chaotic →',
  'OODA의 Act를 먼저': "run OODA's Act first",
  '실행해 출혈을 멈춘다.': 'to stop the bleeding.',
  '분석을 기다리지 않는다. 안정화 후 Cynefin으로 재분류 — 좌표계를 다시 잡는 것이 회복의 첫 걸음.':
    'Do not wait for analysis. Stabilise, then reclassify with Cynefin — re-establishing the frame is the first step to recovery.',
  '명백 →': 'Clear →',
  'RAPID로 즉시 결정': 'decide immediately with RAPID',
  ', 절차화·자동화 대상.': ' — a candidate for procedures and automation.',
  '논쟁 여지가 적다. 권한(RAPID)을 명확히 하고 best practice를 적용해 빠르게 닫는다.':
    'Little room for debate. Clarify authority (RAPID), apply best practice and close quickly.',

  // Pipeline
  '같은 입력 = 같은 출력. 4단계 결정론적 파이프라인이 노드를': 'Same input = same output. A 4-stage deterministic pipeline re-ranks the nodes on',
  '시 재랭크한다. 두 번 실행해도 해시가 동일하다.': '— run it twice and the hash is identical.',
  '사전조건/의존성 충족 검사. 미충족 → 차단': 'Checks preconditions/dependencies. Unmet → blocked',
  '5축 가중합 (고정 가중치)': '5-axis weighted sum (fixed weights)',
  '비가역 위험 상한 적용': 'Caps irreversibility risk',
  '동점 → 위상순서·ID로 결정론 해소': 'Ties → resolved deterministically by topo order · ID',

  // Ledger
  'Decision Ledger · 인간 편집 보호': 'Decision Ledger · human edits protected',
  '가치 변위(Positive/Negative)를 모든 결정의 1급 산출물로 승격 — Magnitude=Scale×Reversibility 의무화':
    'Promote value displacement (Positive/Negative) to a first-class output of every decision — Magnitude=Scale×Reversibility mandatory',
  'Pruning은 확인된 사실로만 허용. 추정 기반 pruning 전면 금지(엔진 차단)': 'Pruning allowed on confirmed facts only. Estimate-based pruning fully banned (engine-blocked)',
  '결정 순서는 위상정렬(dependency-first). 중요도가 아니라 선행성으로 정렬': 'Decision order is a topological sort (dependency-first) — by precedence, not importance',
  '상태머신 append-only 확정 (Proposed→Decided→Superseded, non-overwriting)': 'Append-only state machine confirmed (Proposed→Decided→Superseded, non-overwriting)',
  '트리를 SSOT로 두자 — DAG=SSOT 결정(L-001 계열)에 의해 대체됨': 'Make the tree the SSOT — superseded by the DAG=SSOT decision (L-001 line)',
  '문제 좌표계를 먼저 분류(Cynefin/Stacey). 첫 결정=분류로 확정': 'Classify the problem frame first (Cynefin/Stacey). First decision = classification',
  '회의록 1건당 평균 3.2개 결정이 추출된다(파일럿 표본)': 'An average of 3.2 decisions are extracted per meeting note (pilot sample)',
  '재방문 트리거는 주 1회 배치로 충분하다': 'A weekly batch is enough for revisit triggers',
  '사람의 편집 타임스탬프는 신뢰 가능하다(NTP 동기)': 'Human edit timestamps are reliable (NTP-synced)',
  'Superseded 결정의 장기 조회 비용 곡선': 'Long-term read-cost curve of Superseded decisions',
  'hidden_dependency_edges가 트리 가독성에 미치는 임계점': 'Tipping point where hidden_dependency_edges hurt tree readability',
  '에이전트 동기화 주기의 최적값': 'Optimal agent sync interval',
  '비가역 위험 cap의 임계값은 도메인마다 달라야 하는가?': 'Should the irreversibility cap threshold differ by domain?',
  '보류(defer) 누적 상한을 둘 것인가, 둔다면 어떻게?': 'Should deferred items have a cap — and if so, how?',
  '가치 변위의 주관성을 어떻게 캘리브레이션할 것인가?': 'How do we calibrate the subjectivity of value displacement?',
  '되돌릴 수 있으면 보류 + 재방문 트리거. 정보 부족해도 멈추지 않고 구조화 보존한다 — Pruning은':
    'If it is reversible, defer + revisit trigger. Missing information does not stop work; it is preserved as structure — prune',
  '확인된 사실로만': 'on confirmed facts only',
  'Canonical DAG harness · 가치 변위 콘솔': 'Canonical DAG harness · value displacement console',

  // Live ledger stream (engine)
  'Value displacement POSITIVE logged: 트레이드오프 명시 완료': 'Value displacement POSITIVE logged: trade-off stated',
  'Value displacement NEGATIVE logged: 변위 추정 편향 가능성 기록': 'Value displacement NEGATIVE logged: possible estimation bias recorded',
  '트레이드오프 명시 완료': 'trade-off stated',
  '변위 추정 편향 가능성 기록': 'possible estimation bias recorded',

  // Toasts (RUN / prune) — fragments around runtime values
  'RUN 완료 · 결정론적 해시': 'RUN complete · deterministic hash',
  '같은 입력 = 같은 출력. 다시 RUN 해도 해시가 동일합니다.': 'Same input = same output. RUN again and the hash stays the same.',
  '추정 기반 pruning 금지': 'Estimate-based pruning is not allowed',
  '· 노드가 deferred 상태': '· node is deferred',
  'Pruning은 확인된 사실로만 허용됩니다.': 'Pruning is allowed on confirmed facts only.',
  'Deferred ≠ pruned: 보류 후 재방문 트리거를 거세요.': 'Deferred ≠ pruned: defer it and set a revisit trigger.',
  'PRUNE 허용됨': 'PRUNE allowed',
  '— 확인된 사실 기준 충족. 단, 비가역 손실이므로 ledger에 Superseded로 추적됩니다.':
    '— confirmed-fact threshold met. As an irreversible loss, it is tracked in the ledger as Superseded.',
})
