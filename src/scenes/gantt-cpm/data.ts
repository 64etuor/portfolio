// gantt-cpm.html DATA 이식 — 커리어 타임라인(CPM) 정본.
// gantt = career-timeline CANON: 회사 lane/프로젝트 막대 수치·라벨·카피는 원본 그대로 유지.

export const COLORS = {
  eun: '#e0704e',
  elen: '#3fa8c0',
  sol: '#5588e8',
  mir: '#9470e0',
  bridge: '#8fa0b4',
  self: '#46c79a',
} as const

export const T0 = new Date(2020, 6, 1) // 2020-07
export const T1 = new Date(2026, 8, 1) // 2026-09 (headroom for ongoing)
export const TODAY = new Date(2026, 5, 15) // 2026-06-15

function ym(y: number, m: number) {
  return new Date(y, m - 1, 1)
}

interface Metric {
  k: string
  v: string
  cls: string
  c: string
}

export interface Row {
  id: string
  tier: 0 | 1
  co: string
  color: string
  role: string
  start: Date
  end: Date
  pct: number
  crit: boolean
  deps: string[]
  slack: number
  problem?: string
  built?: string
  rewind?: string // 회사·시대 단위 되감기 키(REWIND_ROUTES). 전용 씬이 없는 막대의 기본값.
  scene?: string // 이 프로젝트만의 전용 씬 slug(예: 'pipeline-dag'). 있으면 rewind 보다 우선해 /s/<scene> 로 직행.
  slug?: string // → /projects/<slug> detail doc (only bars with an embedded doc)
  desc: string
  metrics: Metric[]
  stack: string[]
  parent?: string
  kind?: string
  ongoing?: boolean
  award?: string
}

/* ----------------------------------------------------------------
   2-tier model:
   - COMPANIES (tier 0) = critical path. FS deps chain the career.
   - PROJECTS  (tier 1) = nested under each company, parallel (Float).
---------------------------------------------------------------- */
export const COMPANIES: Row[] = [
  {
    id: 'eun',
    tier: 0,
    co: '은성에스아이티',
    color: COLORS.eun,
    role: '생산관리과장 · 2차전지 배터리팩 생산 총괄',
    start: ym(2020, 8),
    end: ym(2022, 11),
    pct: 100,
    crit: true,
    deps: [],
    slack: 0,
    problem:
      'Capa·공수·재고 데이터 없이 운영되던 배터리팩 생산 현장에서 운영경비 과다·출하 불량이 통제 불가 상태였음.',
    built:
      '라인 운영구조 재설계와 조달단가 재협상으로 운영경비를 직접 85% 절감하고, 비전검사 시스템을 도입해 출하 품질을 0불량 수준으로 안정화함.',
    rewind: 'eunseong',
    desc:
      '배터리팩·정수기 부품·자동차 와이어링 하네스 생산운영과 생산관리를 총괄. Capa·투입공수·자재 사용량·재고 흐름 기반으로 제조원가·운영비 구조를 분석하고, 조달단가 재협상과 라인 운영구조 재설계로 운영경비를 대폭 절감. 비전검사 도입으로 출하 품질을 0불량 수준으로 안정화하고 SQ·ISO·IATF16949 체계를 운영.',
    metrics: [
      { k: '운영경비', v: '−85%', cls: 'g', c: '라인 운영구조 재설계' },
      { k: '조달단가', v: '재협상', cls: 'g', c: '공급단가 마진 개선' },
      { k: '필드불량', v: '0건', cls: 'g', c: '비전검사 도입 후' },
      { k: '품질체계', v: 'IATF16949', cls: '', c: 'SQ·ISO·자동차 표준' },
    ],
    stack: ['PFMEA', 'CP/PFD', 'SOP', '비전검사', 'IATF16949', 'Ecount ERP'],
  },
  {
    id: 'elen',
    tier: 0,
    co: '이랜텍',
    color: COLORS.elen,
    role: '생산라인 PM · 파트장',
    start: ym(2022, 11),
    end: ym(2023, 9),
    pct: 100,
    crit: true,
    deps: ['eun'],
    slack: 0,
    problem:
      '초음파 용착 불량(15%)과 Neck 공정 병목이 라인 전체 생산성을 끌어내리고 있었고, LOB 불균형으로 가동 손실이 만성화된 상태였음.',
    built:
      'DOE로 용착 조건을 직접 최적화하고, 커팅·검사 Jig를 기구설계·제작해 C/T를 49% 단축하며 LOB 재배치로 생산성을 24% 끌어올림.',
    rewind: 'elentec',
    desc:
      '생산라인 PM으로 Capa·LOB·공정 C/T를 분석해 생산성을 개선. 스팟·레이저·초음파 용착 공정 불량을 DOE 기반으로 근본 개선하고, Jig를 직접 개발해 사이클타임을 단축. 삼성전자 상생협력아카데미 연계 SCM 개선까지 수행.',
    metrics: [
      { k: 'C/T', v: '−49%', cls: 'g', c: 'Jig 개발·공정 재배치' },
      { k: '생산성(LOB)', v: '+24%', cls: 'g', c: '라인밸런싱 개선' },
      { k: '용착 불량', v: '15→0%', cls: 'g', c: 'DOE 조건 최적화' },
      { k: '설비', v: 'Jig 개발', cls: '', c: '기구설계·로봇티칭' },
    ],
    stack: ['DOE', 'LOB', 'C/T', 'Jig개발', '기구설계', '산업용접', '로봇티칭'],
  },
  {
    id: 'sol',
    tier: 0,
    co: '솔라엣지',
    color: COLORS.sol,
    role: '공정기술 엔지니어',
    start: ym(2023, 9),
    end: ym(2024, 12),
    pct: 100,
    crit: true,
    deps: ['elen'],
    slack: 0,
    problem:
      '생산·불량·ST 데이터가 엑셀 개별 파일로 파편화되어 있어 리포팅에 일 451분이 낭비되고, S/N 추적 부재로 필드 불량 리스크 범위를 측정할 수 없었음.',
    built:
      'Excel VBA·SQL·Power BI로 DB 통합 대시보드와 성적서 자동발행 파이프라인을 직접 구축하고, Power Apps·Power Automate로 S/N 기반 추적성 시스템과 MES 자체 개발까지 수행함.',
    rewind: 'solaredge',
    desc:
      '생산·불량·KPI·BOM·ST·워크오더·OPEX 데이터를 수집·정제해 DB·대시보드로 통합 운영. 검사성적서 자동발행과 S/N 추적성, 신제품 라인 MES 생산운영 체계를 구축 — 현장 공정 엔지니어링에서 데이터 엔지니어링으로의 전환점.',
    metrics: [
      { k: '사무공수', v: '−451분/일', cls: 'g', c: 'DB 통합·성적서 자동발행' },
      { k: 'ST(셋업)', v: '−50%', cls: 'g', c: '실데이터 기반 정규화' },
      { k: '추적성', v: 'S/N 기반', cls: '', c: '필드 리스크 측정 가능화' },
      { k: '시스템', v: 'MES·DB', cls: '', c: '공정 데이터 통합' },
    ],
    stack: ['Excel VBA', 'Python', 'SQL', 'Power BI', 'Power Apps', 'MES'],
  },
  {
    id: 'bridge',
    tier: 0,
    co: '역량 보강',
    color: COLORS.bridge,
    role: '데이터 엔지니어링 · SW 개발 · AI 활용 역량 보강',
    start: ym(2024, 11),
    end: ym(2025, 7),
    pct: 100,
    crit: true,
    deps: ['sol'],
    slack: 0,
    problem:
      '제조 현장 도메인 경험은 깊지만, 코드·모델로 문제를 직접 구현·배포하는 전문 데이터 엔지니어링·SW 개발 역량이 부족했음.',
    built:
      '메타코드 데이터분석 부트캠프(Python·SQL·ML)와 한화시스템 Beyond SW 부트캠프(React·FastAPI·DevOps)를 9개월간 병행 이수해 풀스택 실무 역량을 직접 보강함.',
    rewind: 'bridge',
    desc:
      '제조 도메인 위에 전문적인 데이터 엔지니어링 역량·SW 개발 역량·AI 활용 역량을 보강하기 위해 학습한 구간. 메타코드 데이터분석 부트캠프(2024.11–2025.04, 솔라엣지 재직 중 시작)와 한화시스템 Beyond SW 부트캠프(2025.01–2025.07)를 각각 이수해 현장 문제를 코드와 모델로 푸는 풀스택 실무 역량을 다짐.',
    metrics: [
      { k: '부트캠프', v: '2종 이수', cls: '', c: '데이터분석 · Beyond SW' },
      { k: '보강', v: '데이터·SW·AI', cls: 'g', c: '전문 역량 학습' },
      { k: '스택', v: 'Full-Stack', cls: '', c: 'React·FastAPI·ML' },
      { k: '기간', v: '9개월', cls: '', c: '데이터분석→SW 순차' },
    ],
    stack: ['Python', 'SQL', 'BI', 'ML', 'React', 'FastAPI', 'DevOps'],
  },
  {
    id: 'mir',
    tier: 0,
    co: '스타트업',
    color: COLORS.mir,
    role: '총괄본부장 / Director',
    start: ym(2025, 8),
    end: ym(2026, 8),
    pct: 62,
    crit: true,
    deps: ['bridge'],
    slack: 0,
    ongoing: true,
    problem:
      '뷰티 매장 운영이 디지털화되지 않아 고객 관리·매출 추적·조직 운영이 수작업으로 분산되어 있었고, 제품 개발·인프라·조직 OS 모두 처음부터 구축해야 했음.',
    built:
      'FastAPI 백엔드·RDS MySQL·ECS Fargate 인프라를 직접 설계·구축하고, CRM·키오스크 앱·Notion 조직 OS·RPA·AI MCP 자동화까지 제품 전반을 총괄 리딩함.',
    rewind: 'startup',
    desc:
      '총괄본부장으로 뷰티 통합 솔루션 제품군(CRM·키오스크·협업 SW·앱)을 총괄. FastAPI 백엔드와 RDS MySQL, AWS/GCP 인프라·CI/CD를 구축·운영하며, RPA와 AI(MCP) 기반 AX로 조직 업무를 자동 전환.',
    metrics: [
      { k: '제품', v: 'CRM·키오스크·앱', cls: '', c: '엔드투엔드 총괄' },
      { k: '인프라', v: 'AWS·GCP·CI/CD', cls: '', c: '풀스택 클라우드' },
      { k: '백엔드', v: 'FastAPI·RDS', cls: '', c: '서비스 아키텍처' },
      { k: '전환', v: 'RPA · AI MCP AX', cls: 'g', c: '업무 자동화' },
    ],
    stack: ['FastAPI', 'React', 'TypeScript', 'Electron', 'Rust', 'AWS', 'GCP', 'RPA', 'AI MCP', 'CI/CD'],
  },
]

// PROJECTS (tier 1) — nested under parent company, chronological per parent.
export const PROJECTS: Row[] = [
  // ── 은성 ──
  {
    id: 'p-vision',
    tier: 1,
    parent: 'eun',
    co: '은성 · 프로젝트',
    color: COLORS.eun,
    role: '비전 검사 자동화 도입',
    start: ym(2021, 3),
    end: ym(2021, 11),
    pct: 100,
    crit: false,
    deps: [],
    slack: 6,
    problem:
      '사출 파트 인서트·너트 누락과 배터리 모듈 역삽 등 육안 검사로는 잡기 어려운 불량이 출하 후 필드에서 발생하는 위험이 있었음.',
    built:
      '미적용 공정에 비전 검사 시스템을 직접 도입·설정해 외관·치수·역삽 자동 검출 체계를 구축하고 출하 불량을 0건 수준으로 끌어내림.',
    rewind: 'eunseong',
    desc:
      '배터리팩 외관·치수 검사를 비전검사로 자동화. 사출 파트 인서트·너트 누락, 배터리 모듈 역삽 방지 등 미적용 공정에 비전 검사를 도입해 출하 불량을 0건 수준으로 끌어내림.',
    metrics: [
      { k: '필드불량', v: '0건', cls: 'g', c: '출하·필드' },
      { k: '검사', v: '자동화', cls: '', c: '외관·치수·역삽 방지' },
    ],
    stack: ['비전검사', 'PFMEA', 'CP'],
  },
  {
    id: 'p-smartfac',
    slug: 'smart-factory',
    tier: 1,
    parent: 'eun',
    co: '은성 · 프로젝트',
    color: COLORS.eun,
    role: '중기청 상생 스마트팩토리 도입',
    start: ym(2021, 8),
    end: ym(2022, 1),
    pct: 100,
    crit: false,
    deps: [],
    slack: 5,
    problem:
      '재고·실적 데이터가 수작업 장부에 머물러 있어 현황 파악이 지연되고 데이터 오류가 반복되는 상황이었음.',
    built:
      '중기청 상생 스마트팩토리 지원사업을 직접 신청·수행해 Ecount ERP 도입, ERP 연계 바코드 관리 시스템, 모바일 태블릿 생산현황 시스템을 구축하고 데이터를 전산화함.',
    rewind: 'eunseong',
    desc:
      '중소기업진흥청 대기업상생 스마트팩토리 기초 솔루션 지원사업을 신청·수행. ERP(Ecount) 도입, ERP 연계 바코드 관리 시스템, 모바일 태블릿 생산현황 시스템으로 데이터를 전산화하고 업무 절차를 체계화.',
    metrics: [
      { k: 'ERP', v: 'Ecount 도입', cls: 'g', c: '전사 전산화' },
      { k: '물류', v: '바코드 연계', cls: '', c: '재고·실수 방지' },
      { k: '현장', v: '태블릿 현황', cls: '', c: '수작업 라인' },
    ],
    stack: ['Ecount ERP', '바코드', '모바일 태블릿', 'MES'],
  },
  {
    id: 'p-sparta',
    tier: 1,
    parent: 'eun',
    kind: 'study',
    co: '부트캠프 · 학습',
    color: COLORS.eun,
    role: '스파르타코딩클럽 앱·웹 개발 종합반',
    start: ym(2022, 1),
    end: ym(2022, 2),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem:
      '현장에서 엑셀·자동화 도구를 직접 만들어 쓰고 있었지만 정식 개발 기초가 없어 구현 범위가 한계에 부딪혔음.',
    built:
      '스파르타코딩클럽 앱·웹 개발 종합 과정을 이수해 앱·웹 구현, DB 연동, 배포를 학습하고 코딩 역량의 정식 기초를 다짐.',
    rewind: 'bridge',
    desc:
      '은성 재직 중이던 2022.01–2022.02에 이수한 앱/웹 개발 종합 과정. 앱·웹 구현, DB 연동, 배포를 학습하며 현장 엑셀·자동화 도구를 직접 만들던 흐름을 정식 개발 기초로 연결한 첫 코딩 학습.',
    metrics: [
      { k: '기간', v: '2022.01–02', cls: '', c: '은성 재직 중' },
      { k: '학습', v: '앱·웹·DB·배포', cls: '', c: '코딩 입문' },
    ],
    stack: ['앱 개발', '웹 개발', 'DB 연동', '배포'],
  },

  // ── 이랜텍 ──
  {
    id: 'p-line',
    slug: 'line-innovation',
    tier: 1,
    parent: 'elen',
    co: '이랜텍 · 프로젝트',
    color: COLORS.elen,
    role: '연간 생산라인 혁신 프로젝트',
    start: ym(2022, 11),
    end: ym(2023, 9),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem:
      '초음파 용착 불량(15%)으로 사출 케이스가 대량 폐기되고, Neck 공정 병목과 LOB 불균형이 라인 전체 생산성을 끌어내리고 있었음.',
    built:
      'DOE로 용착 조건을 최적화하고 커팅·검사 Jig를 직접 기구설계·제작해 C/T 49% 단축, LOB 재배치로 생산성 24%를 개선하며 연간 폐기·재작업 6,800만원을 절감함.',
    rewind: 'elentec',
    desc:
      '초음파 용착 불량으로 폐기되던 사출 케이스 낭비 개선에서 출발해 다양한 과제로 확장. 초음파 용착 조건 DOE로 불량률 15%→0%대, 커팅 Jig로 Neck 공정 C/T 31%↓, 검사 Jig 개조로 Core-pack Function Test C/T 49%↓, 소형 배터리팩 라인 LOB 개선으로 생산성 24%↑.',
    metrics: [
      { k: '용착 불량', v: '15→0%', cls: 'g', c: 'DOE 조건 최적화' },
      { k: 'C/T(Core)', v: '−49%', cls: 'g', c: '검사 Jig 개조 55→28s' },
      { k: '생산성', v: '+24%', cls: 'g', c: '소형팩 LOB 개선' },
      { k: '폐기·재작업', v: '연 6,800만↓', cls: 'g', c: '폐기 3,600만+재작업 3,200만' },
    ],
    stack: ['DOE', 'LOB', 'C/T', 'Jig개발', '초음파용착', 'Python', 'WBS/Gantt'],
  },
  {
    id: 'p-idle',
    slug: 'idle-equipment',
    tier: 1,
    parent: 'elen',
    co: '이랜텍 · 프로젝트',
    color: COLORS.elen,
    role: '유휴 설비 재활용 프로젝트',
    start: ym(2022, 12),
    end: ym(2023, 4),
    pct: 100,
    crit: false,
    deps: [],
    slack: 3,
    problem:
      '폐기 예정인 비전검사 설비 4대(개당 약 4천만원)가 자산으로 방치된 채 신규 설비 구매 비용이 별도 발생할 예정이었음.',
    built:
      '유휴 설비 4대의 재활용 방안을 직접 기획해 1대는 의료키트 반자동 조립 사급 장비로 전용하고 2대는 범용 비전 SW로 사출 인서트·너트 누락 및 역삽 방지 검사에 재투입함.',
    rewind: 'elentec',
    desc:
      '폐기 예정 유휴 비전검사 설비 4대(개당 약 4천만원)의 재활용 방안 모색. 1대는 의료키트 반자동 조립 사급 장비로 전용해 비전검사 시스템 비용을 일부 절약하고, 2대는 범용 비전 SW로 사출 인서트·너트 누락 검사와 배터리 모듈 역삽 방지에 활용.',
    metrics: [
      { k: '비용절감', v: '≈4백만원', cls: 'g', c: '견적가액 절감' },
      { k: '설비', v: '4대 전용', cls: '', c: '폐기 대신 재활용' },
    ],
    stack: ['비전검사', '설비 재활용', '품질 자동화'],
  },
  {
    id: 'p-samsung',
    slug: 'samsung-logistics',
    tier: 1,
    parent: 'elen',
    co: '삼성 상생아카데미 · 프로젝트',
    color: COLORS.elen,
    role: '삼성 제조리더 연계 — 물류 시스템 개선',
    start: ym(2023, 3),
    end: ym(2023, 5),
    pct: 100,
    crit: false,
    deps: [],
    slack: 4,
    problem:
      '제조·영업 간 재고 이관 프로세스가 전산화되어 있지 않아 재고 정확도가 낮고 과잉·부족 재고가 반복되었음.',
    built:
      '삼성전자 상생협력 아카데미 연계로 구매·영업·제조·생산관리 4직능 TF를 구성해 3개월간 프로젝트를 리딩하고, 면책 구역 지정과 재고 이관 전산 프로세스를 직접 개선해 재고회전율 17%를 높임.',
    rewind: 'elentec',
    desc:
      '삼성전자 상생협력 아카데미 제조 리더 양성 과정 연계. 삼성전자 멘토링을 지원받아 구매·영업·제조·생산관리 TF를 구성, 3개월간 프로젝트를 리딩하며 면책 구역 지정과 제조-영업 재고 이관 전산 프로세스를 개선.',
    metrics: [
      { k: '재고회전율', v: '+17%', cls: 'g', c: '프로젝트 KPI' },
      { k: 'TF', v: '4직능 통합', cls: '', c: '구매·영업·제조·생관' },
    ],
    stack: ['SCM', '재고관리', '3정5S', '프로세스 개선', 'PM'],
  },

  // ── 솔라엣지 ──
  {
    id: 'p-procdata',
    slug: 'process-data',
    tier: 1,
    parent: 'sol',
    co: '솔라엣지 · 프로젝트',
    color: COLORS.sol,
    role: '공정 데이터 관리 시스템 개발',
    start: ym(2023, 10),
    end: ym(2023, 12),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    award: '2023 MOC Best Employee',
    problem:
      '작업지시·생산계획·실적·불량이 엑셀 개별 파일로 파편화되어 있어 리포팅에 일 451분이 낭비되고 제품 ST를 실데이터로 측정할 수 없었음.',
    built:
      'Excel VBA·SQL·Power BI로 DB 통합 파이프라인, On-prem Gateway 자동 업데이트, 통합 대시보드, 보고서 Script 자동생성을 직접 구축해 사무공수 일 451분(연 약 5천만원)과 제품 ST 50%를 절감함.',
    rewind: 'solaredge',
    desc:
      '엑셀 개별 문서 관리를 데이터베이스 활용으로 전환해 업무를 자동화. 작업지시·생산계획·실적·불량을 DB로 저장하고 매뉴얼 입력 무결성 검증, On-premises Gateway 자동 업데이트, Power BI 통합 대시보드, 보고서 Script 자동생성을 구축. 사무공수 일 451분 감축(연 약 5천만원)·제품 ST 50% 감축.',
    metrics: [
      { k: '사무공수', v: '−451분/일', cls: 'g', c: '연 약 5천만원' },
      { k: '제품 ST', v: '−50%', cls: 'g', c: '실데이터 확보 기반' },
      { k: '데이터', v: 'DB 통합', cls: '', c: '무결성 검증·자동화' },
      { k: '수상', v: 'MOC Best', cls: 'g', c: '2023 올해의 직원' },
    ],
    stack: ['Excel VBA', 'SQL', 'Power BI', 'On-prem Gateway', 'Script 자동화'],
  },
  {
    id: 'p-trace',
    slug: 'traceability',
    tier: 1,
    parent: 'sol',
    co: '솔라엣지 · 프로젝트',
    color: COLORS.sol,
    role: '공정 추적성 관리 프로그램 개발',
    start: ym(2024, 3),
    end: ym(2024, 6),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    award: '2024 Core Value Award',
    problem:
      '필드에서 원자재 불량이 발견됐으나 수기 S/N 관리로는 영향 범위를 측정할 수 없어 리콜 범위 특정이 불가능한 상태였음.',
    built:
      'Power Apps 모바일 실적등록·체크리스트, S/N 검증·혼입 방지 공정 품질 검증, Power BI 추적 대시보드, Power Automate 검사성적서 자동발행을 직접 설계·구축함.',
    rewind: 'solaredge',
    desc:
      '필드 원자재 불량이 발견됐으나 수기 S/N 관리로 리스크 범위를 측정할 수 없던 문제에서 출발. Power Apps 모바일 실적등록·체크리스트, S/N 검증·부품 혼입 방지 등 공정 품질 검증을 적용하고, Power BI 추적과 Power Automate 검사성적서 자동발행을 구축.',
    metrics: [
      { k: '추적성', v: 'S/N 기반', cls: 'g', c: '리스크 범위 측정 가능화' },
      { k: '품질검증', v: '혼입 방지', cls: '', c: '미등록 제품 투입 차단' },
      { k: '수상', v: 'Core Value', cls: 'g', c: '2024 핵심가치상' },
    ],
    stack: ['Power Apps', 'Power BI', 'Power Automate', 'S/N 추적'],
  },
  {
    id: 'p-dv',
    slug: 'dv-data',
    tier: 1,
    parent: 'sol',
    co: '솔라엣지 · 프로젝트',
    color: COLORS.sol,
    role: '개발품 DV 데이터 전산 관리',
    start: ym(2024, 8),
    end: ym(2024, 10),
    pct: 100,
    crit: false,
    deps: [],
    slack: 2,
    problem:
      '한정된 DV 기간 내 다현장 데이터를 실시간으로 취합할 방법이 없어 고품질 데이터 확보와 현황 파악이 어려웠음.',
    built:
      'Google AppSheet 실적·불량 등록 앱, Python Matplotlib CPK 공정분석, Sheets 실시간 대시보드, Apps Script QR 이력추적 시스템을 직접 기획·구축함.',
    rewind: 'solaredge',
    desc:
      '한정된 DV(Design Validation) 기간에 고품질 데이터를 더 많이 확보하고 다현장 DV 현황을 실시간 파악하기 위해 기획. Google AppSheet 실적·불량 등록 앱, Python Matplotlib 공정분석(CPK), Sheets 실시간 대시보드, Apps Script QR 이력추적(EU 배터리 패스포트 대응 시험)을 구축.',
    metrics: [
      { k: 'DV 데이터', v: '확보량↑', cls: 'g', c: '한정 기간 내 고품질' },
      { k: '현황', v: '실시간', cls: '', c: '다현장 DV 가시화' },
      { k: '추적', v: 'QR 이력', cls: '', c: '배터리 패스포트 대응' },
    ],
    stack: ['AppSheet', 'Python', 'Matplotlib', 'Sheets', 'Apps Script', 'CPK'],
  },
  {
    id: 'p-mes',
    slug: 'mes-console',
    tier: 1,
    parent: 'sol',
    co: '솔라엣지 · 프로젝트',
    color: COLORS.sol,
    role: '신제품 라인 셋업 — MES 자체 개발',
    start: ym(2024, 10),
    end: ym(2024, 12),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem:
      '해외 신제품 라인 이관 셋업 중 설비 예산 30만불 초과 상황에서 MES 외주 개발비가 누락된 것을 확인, 외주 없이 MES를 확보해야 했음.',
    built:
      'Django REST 백엔드, React·Electron 프론트, OPC UA·TCP/IP ETL, PostgreSQL 아키텍처, Python Dash 실시간 대시보드까지 MES 풀스택을 직접 기획·설계·구현함(사업 종료로 중단).',
    rewind: 'solaredge',
    desc:
      '해외 신제품 라인을 한국으로 이관 받아 셋업하던 중, 설비 예산 30만불 초과 상황에서 MES 외주 개발비 누락을 확인 → MES 자체 개발을 기획·리딩. Django REST 백엔드, React·Electron 프론트, OPC UA·TCP/IP ETL, PostgreSQL 아키텍처, Python Dash 실시간 대시보드까지 풀스택으로 구현(사업 종료로 중단).',
    metrics: [
      { k: 'MES', v: '자체 개발', cls: 'g', c: '외주비 누락 대체' },
      { k: '풀스택', v: 'Django·React', cls: '', c: 'Electron·Dash' },
      { k: 'ETL', v: 'OPC UA', cls: '', c: '설비·비전 데이터 수집' },
    ],
    stack: ['Python', 'Django', 'React', 'TypeScript', 'Electron', 'PostgreSQL', 'OPC UA'],
  },

  // ── 역량 보강 (부트캠프, 별개 과정) ──
  {
    id: 'p-metacode',
    tier: 1,
    parent: 'bridge',
    kind: 'study',
    co: '부트캠프 · 학습',
    color: COLORS.bridge,
    role: '메타코드 데이터분석 부트캠프',
    start: ym(2024, 11),
    end: ym(2025, 4),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem: '현장에서 공정 데이터를 다뤄왔지만 Python·SQL·ML을 활용한 정식 분석·모델링 역량이 부족했음.',
    built:
      '메타코드 데이터분석 부트캠프(2024.11–2025.04)를 이수해 Python·SQL·BI·머신러닝을 체계적으로 학습하고 데이터 분석·모델링 역량을 보강함.',
    rewind: 'bridge',
    desc:
      '솔라엣지 재직 중이던 2024.11에 시작해 2025.04까지 이수한 데이터 분석 과정. Python·SQL·BI·머신러닝을 학습해 현장에서 다루던 공정 데이터를 정식 분석·모델링 역량으로 보강.',
    metrics: [
      { k: '기간', v: '2024.11–25.04', cls: '', c: '솔라엣지 재직 중 시작' },
      { k: '학습', v: 'Python·SQL·BI·ML', cls: '', c: '데이터 분석·모델링' },
    ],
    stack: ['Python', 'SQL', 'BI', '머신러닝'],
  },
  {
    id: 'p-hanwha',
    tier: 1,
    parent: 'bridge',
    kind: 'study',
    co: '부트캠프 · 학습',
    color: COLORS.bridge,
    role: '한화시스템 Beyond SW 부트캠프',
    start: ym(2025, 1),
    end: ym(2025, 7),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem: '데이터 분석 역량은 갖췄지만 현장 문제를 직접 코드로 구현·배포하는 풀스택 SW 개발 역량이 아직 부족했음.',
    built:
      '한화시스템 Beyond SW 부트캠프(2025.01–2025.07)를 이수해 Back/Front-end와 DevOps를 학습하고 풀스택 개발·배포 역량을 직접 보강함.',
    rewind: 'bridge',
    desc:
      '2025.01–2025.07 이수한 SW 개발 과정. Back/Front-end와 DevOps를 학습해 현장 문제를 직접 코드로 구현·배포하는 풀스택 개발 역량을 보강.',
    metrics: [
      { k: '기간', v: '2025.01–25.07', cls: '', c: '데이터분석 과정 이후' },
      { k: '학습', v: 'Back/Front·DevOps', cls: '', c: '풀스택 개발·배포' },
    ],
    stack: ['React', 'TypeScript', 'FastAPI', 'DevOps', 'CI/CD'],
  },

  // ── 스타트업 (뷰티 통합 솔루션 — 각 영역 직접 구축) ──
  {
    id: 'p-notion',
    slug: 'notion-os',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · 조직 OS',
    color: COLORS.mir,
    role: 'Notion OS — 조직 운영 시스템',
    start: ym(2025, 9),
    end: ym(2026, 8),
    pct: 60,
    crit: false,
    deps: [],
    slack: 0,
    ongoing: true,
    problem:
      '문서·의사결정·목표·개발 실행·운영 지식이 분산되어 있어 조직 운영의 단일 정보 소스(SSOT)가 없었고 빠른 실행에 마찰이 있었음.',
    built:
      'Notion 중심의 조직 운영 OS를 혼자 기획·설계·구축해 SSOT 거버넌스·백로그·PRD·Decision OS·OKR·Runbook·GitHub 연계 등 7개 하위 시스템을 현재까지 운영·고도화 중.',
    rewind: 'startup',
    scene: 'pipeline-dag', // 전용 씬(Notion OS DAG) — 회사 기본 되감기(pid-scheme) 대신 이쪽으로 직행.
    desc:
      '문서·의사결정·목표·개발 실행·운영 지식을 Notion 중심으로 연결한 조직 운영 OS를 혼자 기획·설계·구축하고 현재까지 운영·고도화 중. SSOT 거버넌스, 개발문서 허브, Jira 대체 백로그·에픽·PRD, Decision OS(Ledger·Action·Boost/Drag), OKR/KPI 체크인, 운영·보안 Runbook, GitHub·Drive·AI 연계와 Google Workspace 세팅까지 전부 직접 구성.',
    metrics: [
      { k: '설계', v: '7개 하위 시스템', cls: '', c: '문서·백로그·PRD·Decision·OKR·Runbook·연계' },
      { k: '원칙', v: 'SSOT', cls: '', c: '정본 위치·문서 생명주기' },
      { k: '운영', v: '현재까지', cls: 'g', c: '혼자 구축·고도화 중' },
    ],
    stack: ['Notion', 'Decision OS', 'OKR', 'SSOT', 'Google Workspace', 'GitHub 연계'],
  },
  {
    id: 'p-backend',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · 백엔드',
    color: COLORS.mir,
    role: '백엔드 — FastAPI·SQLAlchemy',
    start: ym(2025, 9),
    end: ym(2026, 8),
    pct: 60,
    crit: false,
    deps: [],
    slack: 0,
    ongoing: true,
    problem:
      '뷰티 솔루션 제품군의 비즈니스 API·인증·영속성·비동기 워커를 처음부터 설계·구축해야 했고 운영 안전성과 마이그레이션 안정성이 모두 요구되었음.',
    built:
      'FastAPI·SQLAlchemy·Alembic으로 백엔드를 직접 설계·구축하고 RDS MySQL 데이터 모델링, 비동기 잡 프레임워크, 런타임 시크릿 관리까지 아키텍처 전반을 담당함.',
    rewind: 'startup',
    desc:
      '비즈니스 API·영속성·인증·백그라운드 워커를 담당하는 백엔드를 FastAPI·SQLAlchemy·Alembic로 구축. RDS MySQL 데이터 모델링, 마이그레이션 안전성, 비동기 외부 API 잡 프레임워크, 런타임 시크릿을 설계.',
    metrics: [
      { k: '스택', v: 'FastAPI', cls: '', c: 'SQLAlchemy·Alembic' },
      { k: '데이터', v: 'RDS MySQL', cls: '', c: '모델링·마이그레이션' },
      { k: '워커', v: '백그라운드', cls: '', c: '스케줄러·비동기 잡' },
    ],
    stack: ['FastAPI', 'SQLAlchemy', 'Alembic', 'MySQL', 'RDS', 'SSM'],
  },
  {
    id: 'p-crm',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · CRM',
    color: COLORS.mir,
    role: 'CRM 제작 — React',
    start: ym(2025, 10),
    end: ym(2026, 8),
    pct: 60,
    crit: false,
    deps: [],
    slack: 0,
    ongoing: true,
    problem:
      '매장 운영자가 매출·고객 데이터를 한눈에 관리할 도구가 없어 운영 의사결정이 느리고 오류가 발생하고 있었음.',
    built:
      'Vite·React·TypeScript로 CRM 워크플로우 UI를 직접 제작하고 매출·고객 통계 대시보드, trace-id 기반 에러 핸들링, 폴링 운영 신뢰성 설계와 사용자 매뉴얼까지 구축함.',
    rewind: 'startup',
    desc:
      '매장 운영자가 매출·고객을 관리하는 CRM 워크플로우 UI를 Vite·React·TypeScript로 제작. 매출·고객 통계 대시보드, 에러 핸들링·trace-id 표면·폴링 등 운영 신뢰성 설계와 사용자 매뉴얼까지 포함.',
    metrics: [
      { k: '스택', v: 'React·Vite·TS', cls: '', c: 'CRM 워크플로우 UI' },
      { k: '기능', v: '통계 대시보드', cls: '', c: '매출·고객 통계' },
      { k: '운영', v: 'trace·폴링', cls: '', c: '에러 핸들링·관측성' },
    ],
    stack: ['React', 'Vite', 'TypeScript', 'TanStack Query'],
  },
  {
    id: 'p-kiosk-app',
    slug: 'kiosk-app',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · 키오스크',
    color: COLORS.mir,
    role: '키오스크 앱 — Electron·React',
    start: ym(2025, 10),
    end: ym(2026, 8),
    pct: 60,
    crit: false,
    deps: [],
    slack: 0,
    ongoing: true,
    problem:
      '매장 현장에서 동작해야 하는 키오스크 앱이 없었고, 디바이스·카메라·미디어 연동과 IPC 보안 경계를 모두 설계해야 했음.',
    built:
      'Electron·React·TypeScript로 키오스크 앱을 직접 제작하고 renderer/main/preload IPC 경계, 카메라·미디어 워크플로우, 디바이스 진단 연동을 설계·구현함.',
    rewind: 'startup',
    desc:
      '매장 현장 키오스크 애플리케이션을 Electron·React·TypeScript로 제작. 디바이스·미디어 워크플로우, renderer/main/preload IPC 경계, 카메라·진단 연동을 설계.',
    metrics: [
      { k: '스택', v: 'Electron·React', cls: '', c: '키오스크 앱' },
      { k: '경계', v: 'IPC 계층', cls: '', c: 'main·preload·renderer' },
      { k: '연동', v: '디바이스·미디어', cls: '', c: '카메라·진단' },
    ],
    stack: ['Electron', 'React', 'TypeScript', 'IPC'],
  },
  {
    id: 'p-kiosk-hw',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · 하드웨어',
    color: COLORS.mir,
    role: '키오스크 HW 프로토타입 설계',
    start: ym(2025, 12),
    end: ym(2026, 3),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem:
      '뷰티 매장 환경에 맞는 키오스크 하드웨어가 시중에 없어 매장 운영 조건에 맞는 프로토타입을 직접 기획·제작해야 했음.',
    built:
      '키오스크 HW 프로토타입을 직접 기획·기구 설계하고 외주 제작을 관리하며 매장 설치 환경에서의 사용성·조건을 검토함.',
    rewind: 'startup',
    desc:
      '뷰티 매장용 키오스크 하드웨어 프로토타입을 직접 기획·기구 설계. 외주 제작을 관리하고 매장 운영 환경에서의 사용성·설치 조건을 검토.',
    metrics: [
      { k: '설계', v: '기구 프로토타입', cls: '', c: '키오스크 HW' },
      { k: '관리', v: '외주 제작', cls: '', c: '제작·운영 검토' },
    ],
    stack: ['기구설계', 'HW 프로토타입', '외주관리'],
  },
  {
    id: 'p-infra',
    tier: 1,
    parent: 'mir',
    co: '스타트업 · 인프라',
    color: COLORS.mir,
    role: '인프라·관제 — ECS·Terraform·관측성',
    start: ym(2026, 2),
    end: ym(2026, 6),
    pct: 100,
    crit: false,
    deps: [],
    slack: 0,
    problem:
      '백엔드가 단일 EC2에서 운영되어 장애 시 수동 복구가 필요했고 배포 중 다운타임·비용 가시성 부재·에러 추적 불가 문제가 있었음.',
    built:
      'ECS Fargate Multi-AZ·Terraform IaC·ALB·ECR·SSM·Sentry·CloudWatch 전체 인프라와 관제 체계를 직접 설계·구축해 무중단 롤링 배포·자동 페일오버·예산 알람을 확보함.',
    rewind: 'startup',
    desc:
      '백엔드 런타임을 단일 EC2에서 컨테이너 오케스트레이션(ECS Fargate·Multi-AZ)으로 이전해 무중단 롤링 배포·자동 페일오버·셀프힐을 확보. 로드밸런싱·컨테이너 레지스트리·런타임 시크릿·검색엔진 등 서비스 구성과 에러 추적·로그·메트릭·예산 알람 기반 관제까지 IaC(Terraform)로 전면 코드화 — 전부 직접 설계·구축.',
    metrics: [
      { k: '런타임', v: 'ECS Fargate', cls: 'g', c: 'Multi-AZ 무중단 배포' },
      { k: 'IaC', v: 'Terraform', cls: '', c: '모듈·환경 분리' },
      { k: '관제', v: '관측성', cls: 'g', c: '에러·로그·메트릭·알람' },
      { k: '구성', v: '로드밸런싱·레지스트리', cls: '', c: '시크릿·검색엔진' },
    ],
    stack: ['AWS ECS Fargate', 'ALB', 'ECR', 'Terraform', 'SSM', 'Sentry', 'CloudWatch', 'Firebase'],
  },
  {
    id: 'p-radar',
    slug: 'work-radar',
    tier: 1,
    parent: 'mir',
    co: '개인 프로젝트',
    color: COLORS.self,
    role: 'Work Radar — Local-first AI 워크플로우 콕핏',
    start: ym(2026, 1),
    end: ym(2026, 8),
    pct: 55,
    crit: false,
    deps: [],
    slack: 0,
    ongoing: true,
    problem:
      '캘린더·PR·백로그·worktree·agent 세션이 각기 다른 앱에 흩어져 “지금 무엇을 해야 하는지”를 파악하는 데 운영 비용이 크게 들었음.',
    built:
      'Tauri·Rust로 Capture/Timeline/Control Room 등 11 서피스 local-first AI 콕핏을 직접 설계·구현하고 Google Calendar 양방향 동기화, MCP human-gate, bounded agent 실행(timeout·cost cap·kill)을 탑재함.',
    rewind: 'epilogue',
    desc:
      '캘린더·PR·백로그·worktree·agent 세션을 한 데스크톱 콕핏으로 묶어 “지금 무엇을 볼지”를 운영면 문제로 푼 local-first AI 콕핏. Capture/Timeline/Control Room 등 11 서피스, Google Calendar 양방향 동기화, MCP 게이트웨이 human-gate, agent bounded 실행(timeout·cost cap·kill)을 Tauri·Rust로 구현.',
    metrics: [
      { k: '서피스', v: '11종 통합', cls: '', c: 'capture·schedule·jobs·governance' },
      { k: '실행통제', v: 'bounded', cls: 'g', c: 'timeout·cost cap·kill' },
      { k: '안전', v: 'human gate', cls: 'g', c: '외부 write Rust 경계' },
    ],
    stack: ['Tauri 2', 'Rust', 'SQLite', 'React', 'TypeScript', 'MCP', 'Calendar API'],
  },
]

// flat render order: each company followed by its projects (chronological)
export const ROWS: Row[] = (() => {
  const out: Row[] = []
  COMPANIES.forEach((c) => {
    out.push(c)
    PROJECTS.filter((p) => p.parent === c.id).forEach((p) => out.push(p))
  })
  return out
})()

// MILESTONES (diamonds) — anchored on company rows
export interface Milestone {
  at: Date
  label: string
  row: string
}
export const MILES: Milestone[] = [
  { at: ym(2022, 11), label: 'IATF16949 · 운영경비 −85%', row: 'eun' },
  { at: ym(2023, 9), label: '생산성 +24% · C/T −49%', row: 'elen' },
  { at: ym(2024, 6), label: 'Core Value 수상 · ST −50%', row: 'sol' },
  { at: ym(2024, 12), label: '데이터 통합 · MOC Best', row: 'sol' },
  { at: ym(2025, 7), label: '데이터·SW·AI 역량 보강 완료', row: 'bridge' },
]

// Scorecard KPIs — 커리어 전체 헤드라인 지표(회사별 대표 성과)
export interface Kpi {
  cat: string
  cls: string
  n: string
  u: string
  nm: string
  delta: string
  spark: number[]
  color: string
  bar: number
}
export const KPIS: Kpi[] = [
  { cat: '은성 · 운영경비', cls: 'dn', n: '−85', u: '%', nm: '라인 운영구조 재설계', delta: '제조원가·OPEX 분석', spark: [100, 82, 64, 46, 30, 20, 15], color: COLORS.eun, bar: 85 },
  { cat: '이랜텍 · 공정 C/T', cls: 'dn', n: '−49', u: '%', nm: 'Jig 개발·LOB 개선', delta: '생산성 +24% 동반', spark: [100, 90, 78, 64, 52, 49], color: COLORS.elen, bar: 49 },
  { cat: '솔라엣지 · 사무공수', cls: 'dn', n: '−451', u: '분/일', nm: 'DB 통합·성적서 자동발행', delta: '연 약 5천만원', spark: [520, 480, 420, 360, 280, 200, 69], color: COLORS.sol, bar: 87 },
  { cat: '삼성 · 재고회전율', cls: 'up', n: '+17', u: '%', nm: 'SCM·재고 이관 개선', delta: '프로젝트 KPI', spark: [100, 104, 108, 112, 115, 117], color: '#8fa0b4', bar: 60 },
]

export interface Derived {
  t: string
  v: string
  tag: string
  d: string
  est: boolean
}
export const DERIVED: Derived[] = [
  {
    t: '제조 3社 + 데이터·SW·AI 역량 보강',
    v: '6년 5社',
    tag: '보강',
    d: '은성(생산관리)·이랜텍(공정 PM)·솔라엣지(공정기술)의 현장 경험 위에, 부트캠프 병행으로 전문적인 데이터 엔지니어링·SW 개발·AI 활용 역량을 보강해 스타트업 총괄본부장으로 합류. 도메인을 코드와 모델로 푸는 풀사이클 리더.',
    est: false,
  },
  {
    t: '프로젝트 포트폴리오',
    v: '16건',
    tag: '',
    d: '회사 5社 위에 자기주도로 기획·리딩한 16개 프로젝트 — 비전검사·스마트팩토리·라인혁신·물류 SCM·데이터/추적성·MES 자체개발, 그리고 스타트업에서 인프라(ECS·Terraform)·Notion OS·백엔드·CRM·키오스크 앱·HW까지 직접 구축. 수상 2회(MOC Best·Core Value).',
    est: false,
  },
]

type SkillItem = [string, number]
export type SkillGroup = [string, SkillItem[]]
export const SKILLS: SkillGroup[] = [
  [
    '현장·공정',
    [
      ['생산·공정관리', 1],
      ['LOB·C/T 분석', 1],
      ['DOE·PFMEA', 1],
      ['Jig·비전검사', 1],
      ['IATF16949·ERP/MES', 1],
    ],
  ],
  [
    '데이터·SW',
    [
      ['Python·SQL', 1],
      ['데이터 무결성·DB 설계', 1],
      ['Power BI·Apps', 1],
      ['React·TS·FastAPI', 1],
    ],
  ],
  [
    '클라우드·AI',
    [
      ['AWS·Terraform', 1],
      ['관측성·CI/CD', 1],
      ['AI MCP·Agent', 1],
    ],
  ],
]

export const REWIND_ROUTES: Record<string, string> = {
  eunseong: '/s/instrument-rack',
  elentec: '/s/weld-thermal',
  solaredge: '/s/mes-console',
  bridge: '/s/digital-twin',
  startup: '/s/pid-scheme',
  epilogue: '/s/radar-sonar',
}
