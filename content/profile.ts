import type { Profile } from './types';

/**
 * SSOT (Single Source of Truth) for 박양하's portfolio.
 *
 * Authored from his Obsidian vault (400_Areas/PORTFOLIO, 300_Projects, 900_Writings)
 * and src/data/resume.json. Korean copy is preserved verbatim where it is his own writing.
 *
 * Precedence: this file is the base layer. `overrides.ts` (DeepPartial) sits on top
 * and wins on conflict — see `index.ts` for the merge.
 */
export const profile: Profile = {
  identity: {
    name: '박양하',
    nameEn: 'Yangha Park',
    title: '생산운영 PM · 공정기술 엔지니어 · 데이터/AI 기반 시스템 빌더',
    tagline: '데이터 분석과 IT로 혁신을 추구하는 인문학 베이스 엔지니어',
    beliefs: [
      '관성에 따라 일하지 않는다',
      '품질과 타협하지 않는다',
      '불합리를 방치하지 않는다',
    ],
    quotes: [
      {
        text: '기존의 패러다임을 깨고 실체를 찾는 과정, 이런 활동들이 역사에 ‘혁신’으로 기록됩니다. 혁신의 실마리를 찾기 위해 항상 고민하고 생각합니다.',
        source: '박양하',
      },
      {
        text: '숫자와 데이터에만 매몰되지 않고 정말로 중대하고 긴급한 ‘실존하는 문제의 근본’을 파악하기 위해 항상 합리적인 회의주의를 가지고 업무에 임합니다.',
        source: '박양하',
      },
    ],
  },

  contact: {
    email: '64etuor@gmail.com',
    github: 'https://github.com/64etuor',
    githubPage: 'https://64etuor.github.io',
    url: 'https://yanghapark.com',
    blog: 'https://blog.yanghapark.com',
  },

  projects: [
    {
      id: 'kip',
      name: 'KIP — 출처까지 함께 답하는 사내 문서 검색 (RAG)',
      org: '개인 프로젝트',
      period: '2026.08 ~ 현재',
      role: '1인 개발 · 설계, 검색 파이프라인, 문서 파싱',
      background:
        'RAG 기반 사내 문서 검색 시스템. 답변마다 원문 위치(페이지·표)를 함께 제시해 바로 검증할 수 있도록 만드는 것이 목표. HWP·스캔 PDF·표 위주의 제조 문서를 정확히 읽어내는 것이 핵심 과제.',
      work: [
        'CLI·REST API·MCP가 같은 검색 엔진을 쓰도록 구성 — 사람과 AI 에이전트가 동일한 결과를 받음',
        '모든 답변에 원문 위치를 첨부하고, 그 위치가 실제로 맞는지 자동 평가로 검증',
        'PDF 파서를 Rust 기반 엔진으로 교체하고 표를 문단과 분리해 별도 단위로 추출',
        '파서를 별도 프로세스로 격리해 손상된 파일이 서비스를 멈추지 않게 하고, 권한 밖 문서 노출 차단',
      ],
      impact: [
        { metric: '파싱 속도', value: 'PDF 파싱 19.2배, DB 동기화 3.23배 향상' },
        { metric: '검색 정확도', value: '속도 개선 후에도 Recall@10 1.0 · MRR 0.986 유지, 권한 밖 문서 노출 0건' },
      ],
      tech: [
        'Python 3.12',
        'PostgreSQL 18',
        'FastAPI',
        'Typer',
        'Pydantic v2',
        'MCP',
        'Docker',
        'pgvector',
      ],
      domains: ['개발', 'AI', '데이터'],
      links: [{ label: 'GitHub', url: 'https://github.com/64etuor' }],
    },
    {
      id: 'work-radar',
      name: 'Work Radar — AI 에이전트를 함께 쓰는 개인 업무 관리 앱',
      org: '개인 프로젝트',
      period: '2026.05 ~ 현재',
      role: '1인 개발 · 기획, 프론트엔드, Rust 백엔드',
      background:
        '캘린더·GitHub PR·Notion 백로그·AI 에이전트 작업이 곳곳에 흩어져 "지금 무엇을 봐야 하는지" 놓치는 문제를 풀기 위한 데스크톱 앱. 할 일 수집, 일정 배치, 에이전트 실행, 회고를 한곳에서 처리.',
      work: [
        '할 일 수집함(아이젠하워 매트릭스)과 오늘의 타임라인을 한 화면에 구성',
        'Google Calendar 양방향 동기화 — OAuth(PKCE), 오프라인 쓰기 대기열과 재시도',
        '여러 저장소의 PR을 상태별(CI 실패·리뷰 대기·머지 가능)로 분류하고 AI 코드 리뷰를 제안으로 연결',
        'AI는 제안만, 반영은 사람이 승인 — GitHub·Notion·캘린더에 대한 외부 쓰기는 모두 승인 단계를 거침',
      ],
      impact: [
        { metric: '에이전트 통제', value: '실행 시간·턴 수·비용 상한과 강제 종료로 실행 범위 제한' },
        { metric: '범위 판단', value: '외부 도구와 겹치고 위험도가 높은 앱 내 코드 실행 기능은 구현 후 제거' },
      ],
      tech: [
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
        'MCP',
        'Google Calendar API',
        'Codex CLI',
        'Hermes ACP',
      ],
      domains: ['개발', 'AI', 'PM'],
      links: [
        { label: 'GitHub', url: 'https://github.com/64etuor' },
      ],
    },
    {
      id: 'startup-beauty-platform',
      name: '뷰티 매장 CRM·키오스크·앱 플랫폼',
      org: '스타트업',
      period: '2025.08 ~ 현재',
      role: '총괄본부장 · 제품 기획·일정 관리, 백엔드·인프라, 키오스크 HW',
      background:
        '뷰티 매장의 매출·고객 데이터를 전산화하고 CRM·키오스크·협업 SW·앱을 하나의 제품군으로 묶는 프로젝트. 제품 개발과 사내 AI 업무 자동화(AX)를 함께 담당.',
      work: [
        '제품 요구사항 정의, 기능 기획, 개발 일정 관리',
        'FastAPI 백엔드·MySQL(RDS) 데이터 모델 설계, AWS·GCP 인프라와 CI/CD 구축',
        '키오스크 하드웨어 기구 설계 및 외주 제작 관리',
        'RPA·MCP 기반 사내 업무 자동화 구축, 매출·고객 통계 대시보드 기획',
      ],
      impact: [],
      tech: [
        'FastAPI',
        'Python',
        'MySQL',
        'RDS',
        'AWS',
        'GCP',
        'CI/CD',
        'RPA',
        'MCP',
        'Electron',
        'React',
        'TypeScript',
      ],
      domains: ['개발', 'AI', 'PM', '하드웨어'],
      links: [],
    },
    {
      id: 'mes-newline-2410',
      name: '신제품 생산 라인 셋업 프로젝트 (자동화 설비 MES 자체 개발)',
      org: '아산 ETS / 솔라엣지테크놀로지스 코리아',
      period: '2024.10 ~ 2024.12 (약 3개월 · 프로토타입 완성, 사업 종료로 양산 전 중단)',
      role: '기획·리딩, MES 개발(백엔드·프론트엔드·DB), 설비·비전 검사 검증',
      background:
        '해외에 설치 예정이던 신제품(배터리 화재 방지용 글라스울 파우치) 자동화 라인이 한국 법인으로 이관됨. 설비 예산(30만 달러)이 이미 초과된 상태에서 MES 외주비가 예산에서 빠진 것을 발견하고 자체 개발을 제안.',
      work: [
        '설비(OPC UA)·비전 검사기(TCP/IP)·구형 검사 장비(MS Access) 데이터 수집 연동',
        'Django REST 백엔드, React·Electron 작업자 화면, PostgreSQL DB 설계',
        'Python Dash로 실시간 공정 현황 대시보드 구현',
      ],
      impact: [
        { metric: 'MES 내재화', value: '외주 없이 3개월 만에 프로토타입 완성' },
        { metric: '응답 속도', value: 'Wi-Fi 환경에서 바코드 스캔 등록 150ms 이내' },
      ],
      tech: [
        'Python',
        'Django',
        'Django REST Framework',
        'React',
        'TypeScript',
        'Electron',
        'PostgreSQL',
        'OPC UA',
        'TCP/IP',
        'Python Dash',
        'MS Access',
      ],
      domains: ['제조', '개발', '데이터', '하드웨어'],
      links: [],
    },
    {
      id: 'dv-data-2408',
      name: '개발품 DV 데이터 전산 관리 프로젝트',
      org: '솔라엣지테크놀로지스 코리아',
      period: '2024.08 ~ 2024.10 (약 2개월)',
      role: '기획, 앱 개발, 데이터 분석·시각화',
      background:
        'DV(설계 검증) 기간은 짧은데 여러 현장에서 동시에 진행되어, 데이터를 빠짐없이 모으고 진행 상황을 실시간으로 보기 위해 기획.',
      work: [
        'AppSheet로 생산실적·불량 등록 앱 제작',
        'Google Sheets 실시간 대시보드, Python으로 공정능력(CPK) 분석',
        'QR로 제품 S/N의 생산 이력을 조회하는 추적 시스템 시제품 — EU 배터리 패스포트 대응 검토',
      ],
      impact: [
        { metric: '현황 공유', value: '여러 현장의 DV 진행 상황을 실시간으로 확인' },
      ],
      tech: [
        'Google AppSheet',
        'Python',
        'Matplotlib',
        'Google Sheets',
        'Apps Script',
        'QR Code',
        'CPK',
      ],
      domains: ['제조', '데이터', '품질', '개발'],
      links: [],
    },
    {
      id: 'traceability-2403',
      name: '공정 추적성 관리 프로그램 개발 프로젝트',
      org: '솔라엣지테크놀로지스 코리아',
      period: '2024.03 ~ 2024.06 (약 3개월)',
      role: '기획, 앱 개발, 데이터 분석·시각화, UI/UX',
      background:
        '현장에서 원자재 불량이 발견됐지만 S/N을 수기로 관리하고 있어 영향 범위를 파악할 수 없었음. 재발 방지를 위해 시작.',
      work: [
        'Power Apps 모바일 앱으로 공정별 실적·체크리스트 등록',
        '이전 공정 기록이 없는 제품의 다음 공정 투입 차단, S/N 검증, 부품 혼입 방지',
        'Power BI로 생산 이력 추적, Power Automate로 검사성적서 자동 발행',
      ],
      impact: [
        { metric: '추적성', value: 'S/N 기준으로 불량 영향 범위를 바로 확인 가능' },
      ],
      awards: ['2024 Core Value Award'],
      tech: [
        'Power Apps',
        'Power BI',
        'Power Automate',
        'S/N 추적',
        'UI/UX',
      ],
      domains: ['제조', '품질', '데이터', '개발'],
      links: [],
    },
    {
      id: 'process-data-2310',
      name: '공정 데이터 관리 시스템 개발 프로젝트',
      org: '솔라엣지테크놀로지스 코리아',
      period: '2023.10 ~ 2023.12 (약 3개월)',
      role: '기획, DB 설계, 솔루션 개발, 데이터 분석·시각화',
      background:
        '엑셀 파일로 따로 관리하던 생산 데이터를 DB로 옮겨, 입력 오류를 줄이고 보고·분석을 자동화하기 위해 기획.',
      work: [
        'Excel VBA 입력 도구 개발 — 작업지시·생산계획·실적·불량을 DB에 저장하고 입력값 검증',
        'On-premises Gateway로 서버 데이터 자동 갱신, 기존 보고서를 스크립트로 자동 생성',
        'Power BI 통합 대시보드 구축 (생산·불량·KPI·공수)',
      ],
      impact: [
        { metric: '사무 공수', value: '하루 451분 감축', krw: '연 약 5천만원' },
        { metric: '제품 ST(표준시간)', value: '50% 감축' },
      ],
      awards: ['2023 MOC Best Employee'],
      tech: [
        'Excel VBA',
        'Power BI',
        'On-premises Gateway',
        'Database',
        'Script 자동화',
        'UI/UX',
      ],
      domains: ['제조', '데이터', '품질', '개발'],
      links: [],
    },
    {
      id: 'samsung-logistics-2303',
      name: '삼성 제조 리더 교육 연계 과정 — 물류 시스템 개선 프로젝트',
      org: '삼성전자 상생협력 아카데미 / 이랜텍',
      period: '2023.03 ~ 2023.05 (약 3개월)',
      role: '과제 설정, 개선안 도출, 프로젝트 관리',
      background: '제조 창고의 재고 비용을 줄이고 물류 흐름을 개선하기 위한 삼성전자 멘토링 과제.',
      work: [
        '구매·영업·제조·생산관리 인원으로 TF를 꾸려 3개월간 리딩',
        '제조→영업 재고 이관 전산 프로세스 개선, 면책 구역 지정',
        '제조·영업 창고 3정 5S',
      ],
      impact: [
        { metric: '재고자산회전율', value: '17% 향상' },
      ],
      tech: ['SCM', '재고 관리', '3정 5S', '프로세스 개선', 'PM'],
      domains: ['제조', 'PM', '데이터'],
      links: [],
    },
    {
      id: 'idle-equipment-2212',
      name: '유휴 설비 재활용 프로젝트',
      org: '다비치 비전, TOS / 이랜텍',
      period: '2022.12 ~ 2023.04 (약 5개월)',
      role: '기획, 설비 활용 방안 검토, 협력사 협의',
      background:
        '대당 약 4천만원에 구입한 유휴 비전 검사 장비 4대를 폐기하지 않고, 비전 검사가 없던 공정에 재배치.',
      work: [
        '1대: 의료키트 반자동 조립 설비 제작 시 비전 검사 장비로 지급',
        '2대: 범용 비전 SW로 사출 인서트·너트 누락 검사, 배터리 모듈 역삽 방지 검사에 적용',
        '1대: 예비 장비로 보관',
      ],
      impact: [
        { metric: '비용 절감', value: '비전 시스템 견적가 약 4백만원 절감' },
        { metric: '품질', value: '검사가 없던 공정에 비전 검사 도입' },
      ],
      tech: ['비전 검사', '설비 재활용', '품질 검사 자동화'],
      domains: ['제조', '품질', '하드웨어'],
      links: [],
    },
    {
      id: 'line-innovation-2211',
      name: '연간 생산라인 혁신 프로젝트',
      org: '이랜텍',
      period: '2022.11 ~ 2023.09 (약 10개월)',
      role: '과제 설정·실행, 업무 배분, 보고',
      background:
        '초음파 용착 불량으로 버려지던 사출 케이스와 재작업 낭비를 줄이려고 시작해, 라인 전반의 개선 과제로 확장.',
      work: [
        '초음파 용착 조건 DOE로 불량률 15% → 0%대',
        '커팅 Jig 개발로 Neck 공정 C/T 24% 단축, 검사 Jig 개조로 Function Test C/T 49% 단축',
        '소형 배터리팩 라인 LOB 개선으로 생산성 24% 향상',
        'MES 기반 실시간 공정 분석, WBS·간트 차트 업무 관리, Python 라벨 S/N 검증 프로그램 도입',
      ],
      impact: [
        { metric: '연간 절감', value: '약 1억 1천만원 (재작업 3,200만 · 폐기 3,600만 · 생산성 4,437만)' },
      ],
      tech: [
        'DOE',
        '초음파 용착',
        'Jig 개발',
        'LOB 분석',
        'MES',
        'WBS/Gantt',
        'Python',
        '3정 5S',
      ],
      domains: ['제조', '품질', 'PM', '하드웨어', '데이터'],
      links: [],
    },
    {
      id: 'smart-factory-2108',
      name: '중소기업진흥청 대기업상생 스마트 팩토리 도입 프로젝트',
      org: '중소기업진흥청 / 은성',
      period: '2021.08 ~ 2022.01 (약 6개월)',
      role: '지원사업 신청, 프로젝트 관리, 개발 요구사항 정의',
      background:
        '수기 위주로 운영되던 회사의 데이터를 전산화하기 위해 중소기업진흥청 스마트 팩토리 지원사업을 신청·수행.',
      work: [
        'Ecount ERP 도입',
        'ERP 연동 바코드로 입출고 실수 방지 및 재고 현황 파악',
        '태블릿으로 수작업 라인 생산 현황 실시간 집계',
      ],
      impact: [],
      tech: ['Ecount ERP', '바코드 관리 시스템', '모바일 태블릿', 'MES'],
      domains: ['제조', 'PM', '데이터'],
      links: [],
    },
  ],

  experience: [
    {
      company: '스타트업',
      title: '총괄본부장 / Director',
      period: '2025.08 ~ 현재',
      summary:
        '뷰티 매장 대상 제품군(CRM·키오스크·협업 SW·앱) 개발과 AX 기반 업무 시스템 구축 총괄.',
      highlights: [
        'CRM·키오스크·협업 SW·앱 제품 요구사항 정의, 기능 기획 및 개발 일정 관리',
        'FastAPI 백엔드, RDS MySQL 데이터 모델링, AWS·GCP 인프라 및 CI/CD 구축',
        '키오스크 하드웨어 프로토타입 기구 설계, 외주 제작 관리 및 운영 검토',
        'RPA·AI MCP 서버 기반 AX 업무 시스템 기획 및 구축',
      ],
    },
    {
      company: '솔라엣지테크놀로지스 코리아',
      title: '공정기술 엔지니어',
      period: '2023.09 ~ 2024.12',
      summary:
        '생산·불량·KPI·ST·OPEX 데이터 수집/정제와 DB·대시보드 운영, 신제품 라인 MES 생산운영 체계 구축.',
      highlights: [
        '생산현황·불량·KPI·BOM·ST·워크오더·OPEX 데이터 수집, 정제 및 DB/대시보드 운영',
        '공정 LOB 분석, Jig 개발, 작업 방식 개선을 통한 ST 관리 및 공정 개선 수행',
        '검사성적서 자동 발행 체계, S/N 기반 추적성 관리 및 생산·검사 데이터 수집 프로그램 개발',
        '신제품 라인 MES 생산운영 체계 구축, PFMEA·CP·PFD·SOP 작성 및 번역',
      ],
    },
    {
      company: '이랜텍',
      title: '생산라인 PM / 파트장',
      period: '2022.11 ~ 2023.09',
      summary: '생산라인 Capa·LOB·C/T 분석 기반 생산성 개선과 용착 공정 DOE·불량 개선 활동.',
      highlights: [
        '생산라인 Capa·LOB·공정 C/T 분석 및 생산성 개선 과제 수행',
        '설비 관리, 스팟·레이저·초음파 용착 공정 DOE, 공정 조건 검증 및 불량 개선 활동',
        'Jig 개발 및 검사 공정 개선을 통한 LOB 개선',
        '삼성전자 상생협력아카데미 연계 SCM 개선, 재고·물류 흐름 분석',
      ],
    },
    {
      company: '은성에스아이티',
      title: '생산관리 과장 · 2차전지 배터리팩 생산 총괄',
      period: '2020.08 ~ 2022.11',
      summary: '배터리팩·정수기 부품·자동차 와이어링 하네스 생산운영 및 생산관리 총괄.',
      highlights: [
        '배터리팩·정수기 부품·자동차 와이어링 하네스 생산운영 및 생산관리 총괄',
        'Capa·투입 공수·생산실적·자재 사용량·재고 흐름 기반 제조원가 및 운영비 구조 분석',
        '자재 공급단가 검토, 생산계획 최적화, 인원·공수 운영 및 재고 관리 개선',
        'ERP·생산현황·자재현황 시스템 도입, SQ·ISO·IATF 16949 인증 관리',
      ],
    },
  ],

  skills: [
    {
      name: '데이터 · 개발 · 시스템',
      keywords: [
        'Python',
        'SQL',
        'FastAPI',
        'Django',
        'React',
        'TypeScript',
        'Electron',
        'Rust',
        'Tauri',
        'MySQL/RDS',
        'PostgreSQL',
        'AWS',
        'GCP',
        'CI/CD',
        'Power BI',
        'Power Apps',
        'BI',
        'ML',
      ],
    },
    {
      name: '제조 · 공정 · 품질',
      keywords: [
        '생산계획/실적',
        '인원/공수',
        '자재/재고/원가',
        'MES',
        'ERP',
        'LOB 분석',
        'C/T 분석',
        'DOE',
        'PFMEA/CP/PFD/SOP',
        'SQ/ISO/IATF 16949',
      ],
    },
    {
      name: 'AI · 자동화',
      keywords: [
        'MCP',
        'RPA',
        'AI Agent',
        'LLM 워크플로우',
        'Codex CLI',
        'Hermes ACP',
        'AX 업무 시스템',
      ],
    },
    {
      name: 'PM · 협업',
      keywords: [
        '프로젝트 매니지먼트',
        'WBS/Gantt',
        '요구사항 정의',
        'Notion',
        'GitHub',
        'Jira',
        'Google Workspace',
        'SAP',
        'Oracle Agile',
      ],
    },
  ],

  industrialSkills: [
    {
      name: '공정기술 · 설비 · 설계',
      keywords: [
        'PFMEA/CP/PFD/SOP',
        '산업용접(스팟·레이저·초음파)',
        'LOB 분석',
        'Jig 개발',
        '기구 설계',
        '설비 PM/BM',
        '4M 관리',
        '비전 검사',
        '로봇 티칭',
        'Draftsight',
        'QueryCAD',
      ],
    },
  ],

  education: [
    {
      institution: 'Kirana College (호주)',
      area: 'Social Media Marketing',
      period: '2018.04 ~ 2019.04',
      note: '졸업',
    },
    {
      institution: 'CTIC International College (호주)',
      area: 'Business Administration',
      period: '2017.02 ~ 2018.02',
      note: '졸업',
    },
    {
      institution: '한국외국어대학교 서울캠퍼스',
      area: '이탈리아어',
      period: '2005.03 ~ 2006.03',
      note: '중퇴',
    },
    {
      institution: '대입 검정고시',
      area: '합격',
      period: '2004.08',
      note: '검정고시',
    },
  ],

  training: [
    {
      name: '매경TEST 최우수',
      org: '매일경제신문사',
      period: '2026.07',
      summary: '경제경영 이해력 인증시험',
    },
    {
      name: 'TOEIC 930',
      org: 'YBM 한국TOEIC위원회',
      period: '2023.01',
      summary: '영어 공인 어학 성적',
    },
    {
      name: '플레이데이터 — 한화시스템 Beyond SW 부트캠프',
      org: '플레이데이터',
      period: '2025.01 ~ 2025.07',
      summary: 'Back/Front-end · DevOps',
    },
    {
      name: '메타코드 데이터 분석 부트캠프',
      org: '메타코드',
      period: '2024.11 ~ 2025.04',
      summary: 'Python · SQL · BI · 머신러닝',
    },
    {
      name: '삼성전자 상생협력아카데미 제조 리더 양성 과정 1기',
      org: '삼성전자 상생협력아카데미',
      period: '2023.03 ~ 2023.07',
      summary: 'SPS · 공정 혁신 · 물류 SCM',
    },
    {
      name: '스파르타코딩클럽 앱 개발 · 웹개발 종합반',
      org: '스파르타코딩클럽',
      period: '2022.01 ~ 2022.02',
      summary: '앱/웹 구현 · DB 연동 · 배포',
    },
  ],

  writing: [
    {
      title: '글 쓰는 이유',
      kind: 'essay',
      year: '2012',
      quote:
        '나는 그러므로 이제부터 쓰는 법을 알기 위하여 쓴다. 또 잿빛 바다에서 나오는 길을 찾기 위해서 쓴다. 관찰되기 위해 쓴다. 흉내내지 않기 위해 쓴다. 내가 되기 위해 쓴다.',
    },
    {
      title: '상냥함에 관한 이야기',
      kind: 'essay',
      year: '2026',
      quote:
        '상냥함은 남을 위해 자기를 조금 접는 일이다. 그것은 기질이라기보다 버릇에 가깝고, 버릇이라기보다 오래 지켜 온 마음의 자세에 가깝다.',
    },
    {
      title: '내가 결혼하지 못하는 이유에 대한 변',
      kind: 'essay',
      year: '2021',
      quote:
        '행복한 가정은 대게 서로 비슷비슷하고, 불행한 가정은 제각기 다른 이유로 불행하다. 행복하게 사는 사람들을 흉내만 내도 되는 일이 아닌가.',
    },
    {
      title: '점을 본 이야기 — 100억과 배우자',
      kind: 'essay',
      year: '2021',
      quote:
        '문장 하나하나 구구절절이 나보다 나를 더 잘 아는 것처럼 쓰인 저 글들을 보니… 사실 운세를 점치는 시도가 애초에 운세 따윈 믿을 게 못 된다는 자신의 믿음을 검증하려는 의미 같다.',
    },
    {
      title: '존재증명',
      kind: 'poem',
      year: '2021',
      quote: '외로움이란 먹어도 먹어도 배부르지 않은 것이어서, / 고로, 나는, 여기에 존재한다.',
    },
    {
      title: '바벨의 거울',
      kind: 'poem',
      year: '2026',
      quote:
        '들을 심산이 없는 것들은 하나가 있든, 둘이 있든, 벌판에 서더라도 스스로 굴을 파고 갇히는 외로운 족속들이 되어… 대번 까놓고 보니 이건 영락 없는 거울이라!',
    },
  ],

  metrics: [
    { metric: '운영경비(OPEX)', value: '−85%', note: '데이터 기반 운영 개선' },
    { metric: '제품 ST', value: '−50%', note: '실 데이터 확보 기반 정규화' },
    { metric: '공정 C/T', value: '24~49% 단축', note: 'Neck 24% / Core-pack Function Test 49%' },
    { metric: '초음파 용착 불량율', value: '15% → 0%대', note: 'DOE 기반 조건 개선' },
    { metric: '생산성', value: '+24%', krw: '연 4,437만원', note: '소형 배터리팩 라인 LOB 개선' },
    { metric: '사무 공수', value: '−451분/일', krw: '연 약 5천만원', note: 'DB 자동화 전환' },
    { metric: '재고자산회전율', value: '+17%', note: '삼성 물류 개선 프로젝트 KPI' },
    { metric: '필드 원자재 불량 추적', value: '리스크 범위 측정 가능화', note: 'S/N 추적성 도입' },
  ],
};
