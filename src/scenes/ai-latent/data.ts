/* ════════════════════════════════════════════════════════════════
   DATA — vault knowledge graph (테크스택 + 철학/원칙, 5 clusters)
   ai-latent.html 에서 분리.  수치/카피 변경 금지.
   ════════════════════════════════════════════════════════════════ */

export const DOMS: Record<string, { c: string; cx: number; cy: number; sx: number; sy: number }> = {
  '프론트엔드':   { c: '#6fb4ff', cx: -0.62, cy:  0.46, sx: -0.70, sy:  0.55 },
  '데이터/AI':    { c: '#46e6b0', cx:  0.34, cy: -0.42, sx:  0.70, sy:  0.55 },
  '백엔드/인프라': { c: '#c9a3ff', cx:  0.60, cy:  0.40, sx:  0.70, sy: -0.40 },
  '제조/도메인':  { c: '#ff7a8a', cx: -0.58, cy: -0.40, sx: -0.70, sy: -0.40 },
  '철학/원칙':    { c: '#f6c177', cx:  0.0,  cy:  0.06, sx:  0.0,  sy:  0.08 },
}

/* 초기 노드 */
export const POINTS: [string, string][] = [
  ['프론트엔드', 'TypeScript'], ['프론트엔드', 'React'], ['프론트엔드', 'Next.js'],
  ['프론트엔드', '상태관리·React Query'], ['프론트엔드', '디자인 시스템'],
  ['데이터/AI', 'Python'], ['데이터/AI', 'BGE-M3 임베딩'], ['데이터/AI', 'RAG'],
  ['데이터/AI', '벡터DB'], ['데이터/AI', 'GraphRAG'], ['데이터/AI', '에이전트'],
  ['데이터/AI', 'neuro-symbolic'], ['데이터/AI', 'UMAP·HDBSCAN'],
  ['백엔드/인프라', 'PostgreSQL'], ['백엔드/인프라', 'MCP 서버'], ['백엔드/인프라', 'control plane'],
  ['백엔드/인프라', 'API 설계'], ['백엔드/인프라', '관측가능성(observability)'],
  ['제조/도메인', 'MES'], ['제조/도메인', '계측(metrology)'], ['제조/도메인', '공정제어(SPC)'],
  ['제조/도메인', '치공구 설계'], ['제조/도메인', 'PFMEA·CP'], ['제조/도메인', 'IATF16949'],
  ['철학/원칙', '제1원칙 사고'], ['철학/원칙', '크로스도메인 (현장↔기술)'], ['철학/원칙', '지식을 구조로'],
  ['철학/원칙', '도메인 연결'], ['철학/원칙', '의미는 사용이다'], ['철학/원칙', '검증가능성 ≠ 설명가능성'],
]

/* 위성 노드 */
export const SATELLITES: [string, string][] = [
  ['프론트엔드', 'Tailwind'], ['프론트엔드', 'Vite'],
  ['데이터/AI', '임베딩 재랭킹(rerank)'], ['데이터/AI', '평가셋(eval harness)'], ['데이터/AI', 'pydantic 스키마'],
  ['백엔드/인프라', 'Docker'], ['백엔드/인프라', '메시지 큐'],
  ['제조/도메인', '비전검사'], ['제조/도메인', '로봇 티칭'],
  ['철학/원칙', '온톨로지'], ['철학/원칙', '표상비용(representation cost)'],
]

export const CROSS_LINKS: [string, string][] = [
  ['MES', '에이전트'],
  ['계측(metrology)', 'BGE-M3 임베딩'],
  ['공정제어(SPC)', 'RAG'],
  ['제1원칙 사고', 'GraphRAG'],
  ['크로스도메인 (현장↔기술)', 'MCP 서버'],
  ['지식을 구조로', '벡터DB'],
  ['지식을 구조로', 'TypeScript'],
  ['도메인 연결', 'React'],
  ['도메인 연결', 'MES'],
  ['TypeScript', 'API 설계'],
  ['Next.js', 'control plane'],
  ['PostgreSQL', '벡터DB'],
  ['검증가능성 ≠ 설명가능성', 'neuro-symbolic'],
  ['IATF16949', '검증가능성 ≠ 설명가능성'],
]

export const PHASE_EMPH: Record<string, [string, string][]> = {
  who:      [['지식을 구조로', '벡터DB'], ['지식을 구조로', 'TypeScript'], ['도메인 연결', 'React'], ['도메인 연결', 'MES'], ['제1원칙 사고', 'GraphRAG']],
  meaning:  [['제1원칙 사고', 'GraphRAG'], ['검증가능성 ≠ 설명가능성', 'neuro-symbolic'], ['지식을 구조로', '벡터DB']],
  vecsym:   [['검증가능성 ≠ 설명가능성', 'neuro-symbolic'], ['지식을 구조로', '벡터DB'], ['PostgreSQL', '벡터DB']],
  verify:   [['IATF16949', '검증가능성 ≠ 설명가능성'], ['검증가능성 ≠ 설명가능성', 'neuro-symbolic'], ['공정제어(SPC)', 'RAG']],
  pipeline: [['계측(metrology)', 'BGE-M3 임베딩'], ['PostgreSQL', '벡터DB'], ['제1원칙 사고', 'GraphRAG']],
  mfgai:    [['MES', '에이전트'], ['계측(metrology)', 'BGE-M3 임베딩'], ['크로스도메인 (현장↔기술)', 'MCP 서버'], ['도메인 연결', 'MES']],
}

export const RETRIEVE: Record<string, string[]> = {
  who:      ['BGE-M3 임베딩', 'MCP 서버', 'PostgreSQL', 'TypeScript', '제1원칙 사고', 'MES', '지식을 구조로'],
  meaning:  ['의미는 사용이다', 'RAG', 'GraphRAG', '에이전트', '검증가능성 ≠ 설명가능성'],
  vecsym:   ['neuro-symbolic', '벡터DB', '온톨로지', '검증가능성 ≠ 설명가능성', 'GraphRAG', '에이전트'],
  verify:   ['검증가능성 ≠ 설명가능성', 'neuro-symbolic', 'IATF16949', 'PFMEA·CP', '공정제어(SPC)'],
  pipeline: ['BGE-M3 임베딩', 'UMAP·HDBSCAN', 'GraphRAG', '벡터DB', 'Python'],
  mfgai:    ['MES', '계측(metrology)', '공정제어(SPC)', '에이전트', 'MCP 서버', '크로스도메인 (현장↔기술)'],
}

export const ANSWERS: Record<string, string> = {
  who:
`이 지도는 비유가 아니다. 학습 노트를 **Obsidian vault** 에 모아, [[000_System/scripts/semantic_map.py|실제 스크립트]] 로 돌린 출력이다 — **BGE-M3** 임베딩(1024d) → **UMAP** 차원축소(2d) → **HDBSCAN** 클러스터링.

클러스터는 지식의 실제 도메인 구조다 — **프론트엔드**(TypeScript·React·Next.js), **데이터/AI**(BGE-M3·RAG·GraphRAG·에이전트), **백엔드/인프라**(PostgreSQL·MCP·control plane), **제조/도메인**(MES·계측·공정제어)을 **철학/원칙**(제1원칙·크로스도메인·"지식을 구조로")이 한 벡터공간 안에서 잇는다.

학습을 흘려보내지 않고 **의미 군집으로 구조화**한 것 — 지식의 운영화다. 그리고 진짜 경쟁력은 노드가 아니라 **노드 사이의 연결**에서 나온다.`,

  meaning:
`핵심 렌즈는 비트겐슈타인의 명제다 — [[의미는 사용이다|Philosophical Investigations §43]]. 단어의 의미는 정의가 아니라 **언어게임 안의 쓰임**에서 나온다.

그래서 묻는다 — **LLM이 의미를 "이해"하는가?** 분산 표상(embedding)은 사용의 통계를 포착하지만, 그 자체가 이해의 충분조건인지는 열려 있다. [[콰인 · 번역 불확정성|Quine, indeterminacy of translation]] 은 같은 행동을 낳는 의미가 여럿일 수 있음을 경고한다.

이것이 **LLM Wiki·GraphRAG** 를 단순 검색이 아니라 *의미의 사용 맥락*을 보존하는 구조로 설계하는 이유다. 임베딩은 쓰임의 그림자이지, 쓰임 자체가 아니다.`,

  vecsym:
`**vector ↔ symbol** 의 비대칭이 이 vault의 중심 긴장이다.

분산 표상(vector)은 유사도엔 강하지만 **합성(composition)이 빈약하고 검증가능성이 낮다** — "A이면서 B가 아닌 경우"를 구조적으로 보장하지 못한다. 반대로 기호(symbol)·[[온톨로지|ontology]] 는 합성·추론·감사가 가능하다.

그래서 **규제·감사 요구가 기호 통합을 압박한다** — 금융·의료·제조 품질처럼 제3자 검증이 필수인 영역에서 순수 벡터는 부족하다. 결론은 [[neuro-symbolic|neuro-symbolic 통합]] : 벡터로 검색하고 기호로 검증한다. 우상단 토글로 두 표상의 배치를 직접 비교해 보라.`,

  verify:
`두 축을 혼동하면 안 된다 — **검증가능성 ≠ 설명가능성**.

· **검증가능성(verifiability)** — *제3자가 도출 과정을 재추적*할 수 있는가. 감사·규제·재현의 축이다.
· **설명가능성(explainability)** — *사람이 그 결과를 이해*할 수 있는가. 직관·납득의 축이다.

분산 표상은 종종 설명은 그럴듯해도 [[검증가능성 ≠ 설명가능성|representation cost note]] 재추적이 어렵다. 제조 현장(IATF16949·PFMEA)에서 온 원칙이 여기 그대로 들어온다 — **숫자와 절차로 닫지 못한 결론은 아직 닫힌 게 아니다.** AI에도 같은 잣대를 댄다.`,

  pipeline:
`파이프라인은 한 줄로 요약된다 — **BGE-M3 → UMAP → HDBSCAN**.

· **BGE-M3** — vault의 각 노트를 1024차원 다국어 임베딩으로 인코딩(한·영 혼용 노트에 강함).
· **UMAP** — 고차원 구조를 보존하며 2d로 축소, 이 화면의 좌표가 된다.
· **HDBSCAN** — 밀도 기반 클러스터링으로 **임의 개수의 도메인**을 자동 발견(미리 k를 정하지 않는다).

이 [[semantic_map.py|000_System/scripts]] 가 만드는 클러스터가 곧 위 범례의 도메인이다. 즉 이 그림은 데모가 아니라 **이 vault의 사고 구조의 측정값**이다.`,

  mfgai:
`제조와 AI는 vault 안에서 가장 가까운 두 이웃이다 — 둘 다 *자동화·검증·표준화*라는 공통 축을 공유하기 때문이다.

**MES·공정제어**에서 데이터를 구조화하고 표준을 세운 감각은, 그대로 **에이전트**와 **MCP 서버** 설계로 이어진다. 비전검사·계측의 "물리 자동화" 사고가 "소프트웨어 자동화"로 옮겨오는 셈이다.

그리고 제조 품질의 **검증가능성** 요구가, AI에 대한 [[neuro-symbolic|기호 통합]] 주장의 뿌리다 — 현장에서 통하지 않는 자동화는 코드에서도 통하지 않는다. 이 **크로스도메인 연결**이 지도에서 가장 굵은 선이다.`,
}

export const QTEXT: Record<string, string> = {
  who: '이 지도는 무엇인가?',
  meaning: 'LLM은 의미를 이해하는가?',
  vecsym: 'vector ↔ symbol?',
  verify: '검증가능성 vs 설명가능성?',
  pipeline: '파이프라인은?',
  mfgai: '제조와 AI의 관계?',
}

export const LOG_LINES: string[] = [
  '[embed] TypeScript·React·Next.js     dim=1024  norm=0.9821',
  '[embed] 제1원칙 사고                 dim=1024  norm=0.9743',
  '[embed] GraphRAG                     dim=1024  norm=0.9867',
  '[umap]  projecting 41 notes → 2d    n_neighbors=15  min_dist=0.08',
  '[hdbscan] 5 clusters found           min_cluster_size=3',
  "[query] q='지식을 구조로'            cos_sim top-1=0.927 (지식을 구조로)",
  '[embed] MES·공정제어                 dim=1024  norm=0.9611',
  '[embed] 벡터DB                       dim=1024  norm=0.9755',
  '[umap]  epoch 180/200               loss=0.0431',
  "[query] q='제조와 AI'                cos_sim top-1=0.912 (에이전트)",
  '[embed] neuro-symbolic               dim=1024  norm=0.9802',
  '[hdbscan] cluster 제조/도메인 n=6   persistence=0.74',
  '[link]  cross-domain edge 제조↔AI   weight=0.91  reinforced',
  '[embed] PostgreSQL · MCP             dim=1024  norm=0.9688',
  "[query] q='크로스도메인 연결'        cos_sim top-1=0.944 (크로스도메인)",
  '[embed] RAG · 리랭킹                 dim=1024  norm=0.9734',
  "[query] q='BGE-M3 파이프라인'        cos_sim top-1=0.956 (BGE-M3 임베딩)",
  '[embed] 검증가능성 ≠ 설명가능성     dim=1024  norm=0.9799',
  '[hdbscan] cluster 데이터/AI n=8     persistence=0.81',
  '[grow]  satellite sprouted           cluster=프론트엔드 (Tailwind)',
  '[embed] 계측(metrology)              dim=1024  norm=0.9712',
  "[query] q='온톨로지 표상'            cos_sim top-1=0.938 (온톨로지)",
  '[umap]  converged at epoch 200      stress=0.0389',
  "[query] q='GraphRAG 구조'            cos_sim top-1=0.961 (GraphRAG)",
  '[link]  cross-domain edge 원칙↔AI   weight=0.88  held',
  '[hdbscan] cluster 철학/원칙 n=6     persistence=0.69',
  '[embed] Next.js · control plane      dim=1024  norm=0.9841',
  "[query] q='vault 의미지도'            cos_sim top-1=0.949 (BGE-M3 임베딩)",
]

export const KEYS = ['who', 'meaning', 'vecsym', 'verify', 'pipeline', 'mfgai'] as const
export type PhaseKey = typeof KEYS[number]
