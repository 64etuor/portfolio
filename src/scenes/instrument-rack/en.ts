import { registerSceneText } from '../_host/localize'

/** English projection of this scene's Korean copy (exact strings first, then word-level terms). */
registerSceneText({
  // Header
  '원가 제1원칙 해부 보드': 'First-Principles Cost Teardown Board',
  '운영경비(OPEX) −85%': 'OPEX −85%',
  '절감 · 제1원칙 분석': 'reduction · first-principles analysis',
  '0불량': '0 defects',

  // Doctrine
  '제1원칙 — 모든 원가를 처음부터 다시 본다': 'First principles — re-examine every cost from scratch',
  '“이 비용은 관행이 아니라, 꼭 필요해서 존재하는가?”': '“Does this cost exist because it is truly needed, not out of habit?”',
  '운영경비(OPEX)를 결과가 아니라': 'Treat OPEX not as an outcome but as a',
  '구조': 'structure',
  '로 본다 — 원가를 숫자로 세우기 위해 항목을 한 줄씩 원장에 펼치고, 각 줄을 심문한다. 답이 “관행”이면 레버를 건다. 조달단가 재협상 · 라인 운영구조 재설계 · 비전검사 0불량 · 인원·공수·생산계획·재고 개선으로 기준 OPEX를 단계적으로 깎아':
    ' — lay every cost out line by line in the ledger to put a number on it, then interrogate each line. If the answer is “habit”, pull a lever. Supplier price renegotiation · line operating redesign · vision inspection to zero defects · staffing, labor, planning and inventory fixes cut baseline OPEX step by step by',
  '까지 내렸다. 1막은 손의 시대에서 정렬을 시작한 시기였다.': '. Act 1 was when alignment began, in the era of hands.',

  // Ledger + waterfall
  '운영경비 원장 해부 → 단계 절감 워터폴': 'OPEX ledger teardown → step-down savings waterfall',
  '왼쪽: 항목별 심문 · 오른쪽: 100 → 15 계단식 하강': 'Left: line-by-line interrogation · Right: 100 → 15 stepped descent',
  '원가 항목 · 심문 대상': 'Cost line · under interrogation',
  '기준 비중': 'Base share',
  '절감 후': 'After cut',
  '재료비 · 조달단가': 'Materials · purchase price',
  '직접 공수': 'Direct labor',
  '자재 · 소모품': 'Parts · consumables',
  '재고 유지비': 'Inventory carrying cost',
  '불량 · 재작업 · 폐기': 'Defects · rework · scrap',
  '간접 · 운영': 'Indirect · operations',
  '운영경비 합계 (지수)': 'OPEX total (index)',
  '원장 메모 · LEDGER NOTE': 'LEDGER NOTE',
  '항목': 'Item',

  // Ledger notes (question / answer / lever) — answers are split at <b> tags
  'LEVER ① 조달단가 재협상': 'LEVER ① Supplier price renegotiation',
  '이 공급단가는 실투입 자원에 근거한 값인가, 관행 단가인가?': 'Is this supply price based on actual resource input, or just the customary price?',
  '실투입 자원 기준으로 단가를 재산정하고': 'Re-costed unit prices on actual resource input,',
  '협력사와 재협상': 'renegotiated with suppliers',
  '· 마진 구조를 개선해 재료·조달원가를 끌어내렸다.': '· and improved the margin structure to drive down material and sourcing cost.',
  'LEVER ② 라인 운영구조 재설계': 'LEVER ② Line operating structure redesign',
  '이 공수는 제품이 요구하는가, 라인 배치가 만들어낸 낭비인가?': 'Does the product require this labor, or is it waste created by the line layout?',
  '라인 운영구조를 재설계': 'Redesigned the line operating structure',
  '해 불필요한 직접 공수를 제거하고 흐름을 단축했다.': ', removing unneeded direct labor and shortening the flow.',
  'LEVER ① · ② 단가·운영 개선': 'LEVER ① · ② Price · operations fixes',
  '이 소모량은 표준인가, 누구도 묻지 않은 초과분인가?': 'Is this consumption standard, or an excess nobody ever questioned?',
  '소모품 사용을 재산정하고 단가·운영구조 개선분에 함께 묶어 정비했다.': 'Re-costed consumable usage and folded it into the price and operating-structure fixes.',
  'LEVER ④ 생산계획·재고 개선': 'LEVER ④ Production planning · inventory fixes',
  '이 재고는 수요가 부른 것인가, 계획 부재가 쌓아둔 것인가?': 'Was this stock pulled by demand, or piled up by a lack of planning?',
  '생산계획·재고 관리': 'Production planning and inventory control',
  '를 정비해 과잉 재고와 유지비를 축소했다.': ' were overhauled, cutting excess stock and carrying cost.',
  'LEVER ③ 비전검사 → 0불량': 'LEVER ③ Vision inspection → 0 defects',
  '이 폐기·재작업 비용은 불가피한가, 검사로 없앨 수 있는가?': 'Is this scrap and rework cost unavoidable, or can inspection remove it?',
  '저비용': 'Introduced low-cost',
  '비전검사를 도입': 'vision inspection',
  '해 역방향 삽입 등 불량을 원천 차단 ·': ' to block defects such as reversed insertion at the source ·',
  '으로 이 항목 비용을 제거했다.': ', eliminating this cost line.',
  'LEVER ② · ④ 운영 정비': 'LEVER ② · ④ Operations overhaul',
  '이 간접비는 운영에 필수인가, 줄지 않아서 그대로 둔 것인가?': 'Is this overhead essential to operations, or left as is because it never shrank?',
  '인원·공수 운영을 정비하고 간접 운영비를 다시 들여다봐 축소했다.': 'Overhauled staffing and labor, and re-examined indirect operating cost to cut it.',

  // Waterfall bar captions (SVG, names truncated to 6 chars + …)
  기준: 'Base',
  '조달단가 재…': 'Pricing',
  '라인 운영구…': 'Line ops',
  '비전검사 →…': 'Vision QC',
  '인원·공수·…': 'Staff/plan',

  // Waterfall steps
  '기준 운영경비': 'Baseline OPEX',
  '제1원칙 재검토 이전 · 지수 100': 'Before first-principles review · index 100',
  '조달단가 재협상': 'Supplier price renegotiation',
  '재료·조달원가 재산정': 'Material and sourcing cost re-costed',
  '라인 운영구조 재설계': 'Line operating structure redesign',
  '직접 공수·간접비 축소': 'Direct labor and overhead cut',
  '비전검사 → 0불량': 'Vision inspection → 0 defects',
  '불량·재작업·폐기 비용 제거': 'Defect, rework and scrap cost removed',
  '인원·공수·계획·재고': 'Staffing · labor · planning · inventory',
  '재고 유지비·운영 낭비 축소': 'Carrying cost and operating waste cut',
  '최종 운영경비': 'Final OPEX',
  '기준 대비 −85% · 실제 성과': '−85% vs. baseline · actual result',

  // Illustrative note
  총: 'Total',
  '운영경비 −85%': 'OPEX −85%',
  '(지수 100→15)와 레버 항목은 실제 성과·실제 활동. 단,': '(index 100→15) and the levers are actual results and actual work. However, the',
  '레버별 절감 분해 비율': 'per-lever breakdown of savings',
  '은 정확히 알 수 없어 워터폴 각 단계값은 illustrative(예시) 지수로 표기 — 실제 원화 총액 아님.':
    ' is not known exactly, so each waterfall step is shown as an illustrative index — not actual KRW totals.',

  // Levers
  '제1원칙으로 건 4개 레버 — 실제 활동': 'Four levers pulled from first principles — actual work',
  '분해 비율은 illustrative · 활동 자체는 실제': 'Breakdown is illustrative · the work itself is real',
  '실투입 자원 기준으로 협력사 공급단가를 재산정 · 마진 구조를 개선해 재료·조달원가를 끌어내림.':
    'Re-costed supplier prices on actual resource input · improved the margin structure to drive down material and sourcing cost.',
  '공정·배치·운영 흐름을 다시 설계해 직접 공수와 간접 운영비를 줄임.':
    'Redesigned process, layout and operating flow to cut direct labor and indirect operating cost.',
  '비전검사 도입 → 0불량': 'Vision inspection → 0 defects',
  '외부 네트워크 활용 저비용 비전검사로 역방향 삽입 등 불량을 원천 차단 · 불량·재작업·폐기 비용 제거.':
    'Low-cost vision inspection via an external network blocks defects such as reversed insertion at the source · defect, rework and scrap cost removed.',
  '인원·공수·계획·재고 개선': 'Staffing · labor · planning · inventory',
  '생산계획·인원 운영·재고 관리를 정비해 재고 유지비와 운영 낭비를 축소.':
    'Overhauled production planning, staffing and inventory control to cut carrying cost and operating waste.',

  // Instruments
  '계측 패널 — 측정으로 확정한 성과 readout': 'Instrument panel — results confirmed by measurement',
  'DMM 절감률 · 원가 스코프 · OPEX 게이지 · live': 'DMM savings · cost scope · OPEX gauge · live',
  'DMM · 절감률': 'DMM · savings rate',
  '운영경비(OPEX) 절감률 — 실측': 'OPEX reduction rate — measured',
  'Scope · 원가 트레이스': 'Scope · cost trace',
  'Gauge · 잔여 OPEX': 'Gauge · remaining OPEX',
  '바늘: 기준 100 →': 'Needle: base 100 →',
  '잔여 15': 'remaining 15',
  '· 스윕 반복': '· sweep loop',

  // Systems
  '품질체계 · 운영 시스템 — 절감을 떠받친 기반': 'Quality and operating systems — the base under the savings',
  'OPEX 절감 · 제1원칙 분석': 'OPEX reduction · first-principles analysis',
  '운영경비(OPEX) 구조 재검토': 'OPEX structure review',
  '제1원칙으로 전 항목 재산정 · 라인 운영구조 재설계': 'Every line re-costed from first principles · line operating redesign',
  '생산관리 총괄': 'Production management lead',
  '−85% 달성': '−85% achieved',
  '비전검사 시스템 · 0불량': 'Vision inspection system · 0 defects',
  '셀 역방향 삽입 등 불량 원천 차단 · 재작업·폐기 제거': 'Blocks defects like reversed cell insertion at the source · no rework or scrap',
  '외부 네트워크 활용': 'Via external network',
  'SQ · ISO · IATF 16949 품질체계': 'SQ · ISO · IATF 16949 quality system',
  '자동차 품질표준 운영 · 고객·필드 불량 0건 유지': 'Automotive quality standards · zero customer/field defects held',
  '인증 관리': 'Certification',
  적합: 'Compliant',
  '조달단가 재협상 · 계약 갱신': 'Supplier price renegotiation · contract renewal',
  '실투입 기준 공급단가 재산정 · 마진 구조 개선': 'Supply prices re-costed on actual input · margin structure improved',
  '협력사 협상': 'Supplier negotiation',
  재산정: 'Re-costed',

  // Chips + footer
  '원가 제1원칙': 'Cost first principles',
  'OPEX 절감': 'OPEX reduction',
  '라인 운영구조': 'Line operating structure',
  비전검사: 'Vision inspection',
  'SQ·ISO': 'SQ·ISO',
  '생산계획·재고': 'Planning · inventory',
  배터리팩: 'Battery packs',
  '와이어링 하네스': 'Wiring harness',
  'OPEX −85% · 제1원칙 · 측정 · 심문 · 절감': 'OPEX −85% · first principles · measure · interrogate · cut',

  // aria-labels
  '시스템 헤더': 'System header',
  '제1원칙 선언': 'First-principles statement',
  '원가 원장 및 워터폴': 'Cost ledger and waterfall',
  '원가 원장': 'Cost ledger',
  '운영경비 워터폴 차트 — 100에서 15까지 단계 하강': 'OPEX waterfall chart — stepped descent from 100 to 15',
  '절감 레버': 'Savings levers',
  '계측 패널 — 측정 readout': 'Instrument panel — measurement readout',
  'OPEX 절감률 마이너스 85 퍼센트': 'OPEX reduction minus 85 percent',
  '기준 100에서 15까지 원가 하강 트레이스': 'Cost descent trace from base 100 to 15',
  '잔여 운영경비 게이지 — 100에서 15로': 'Remaining OPEX gauge — 100 to 15',
  '품질·시스템 현황': 'Quality and systems status',
  '기술 스택 / 연락처': 'Tech stack / contact',
})
