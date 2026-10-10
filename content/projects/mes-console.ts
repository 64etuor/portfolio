import type { ProjectContent } from './types'

export const mes_console: ProjectContent = {
  slug: "mes-console",
  ganttId: "p-mes",
  order: 1,
  enabled: true,
  hero: {
    title: "신제품 라인 셋업 — MES 자체 개발",
    company: "솔라엣지",
    companyKey: "sol",
    period: "2024.10–12",
    role: "신제품 라인 셋업 — MES 자체 개발",
  },
  summary: '솔라엣지 신제품(배터리 화재 방지용 글라스울 파우치) 자동화 라인 셋업 중 MES 외주 개발비가 예산에서 누락된 것을 발견, 예산 초과 상황에서 React·Django·PostgreSQL 기반 MES를 직접 기획하고 3개월 만에 프로토타입까지 완성했습니다.',
  metrics: [
    { label: '무선 Latency', value: '≤150ms', note: '바코드 스캔 등록 응답 목표 — Wi-Fi 환경 달성' },
    { label: 'ETL 연동', value: '3종', note: 'OPC UA 설비 / OCV·IR 검사 장비 / TCP/IP 비전 데이터' },
    { label: '자체 개발', value: '외주비 절감', note: '설비 예산 30만 달러 초과 후 MES 개발비 누락 → 직접 개발 기획' },
  ],
  stack: ['Python', 'Django', 'Django REST Framework', 'React', 'TypeScript', 'Electron', 'Material-UI', 'Ant Design', 'PostgreSQL', 'OPC UA'],
  sections: [
    {
      heading: '추진 배경',
      body: '해외 설치 예정이던 신제품 자동화 라인이 한국으로 계획 변경되면서 프로젝트를 이관받았습니다. 제품은 배터리 화재 방지용 글라스울 파우치로, 롤 파우치 비전 정렬·재단 → 글라스울 투입 → 용액 주입·밀봉 → 크기·무게 측정 → 비전 검사 → 적재까지 전 공정이 자동화된 라인이었습니다.\n\n자동화 설비 예산 **30만 달러**가 이미 초과된 상황에서 MES 외주 개발비가 예산에서 빠진 것을 확인했습니다. 비용 절감을 위해 MES 자체 개발을 직접 기획·리딩했습니다.',
    },
    {
      heading: '개발 내용',
      body: '- **Backend (Django + DRF)**: 생산 실적 등록, S/N 유효성·Cell Grade 검증, 반제품 공정 이력 검증 API 구현\n- **Frontend (React + TypeScript + Electron)**: 바코드 스캔 기반 등록 폼, 제품 조회 화면 — Material-UI·Ant Design 적용\n- **Database (PostgreSQL 17)**: 공정 이력, 반제품 이력, Cell Grade 검증 스키마 설계\n- **ETL**: OPC UA 설비 데이터 수집 / Python·MS Access 기반 구형 OCV·IR 검사 장비 연동 / TCP/IP 비전 데이터 수집',
    },
    {
      heading: '성과',
      body: '무선(Wi-Fi) 환경에서 바코드 스캔 응답 Latency **150ms 이내** 달성.\n\n외주 없이 3개월 만에 프로토타입을 완성했으나, 사업 종료로 라인 양산 이전에 프로젝트가 중단되었습니다.',
    },
  ],
  gallery: [
    { src: '/projects/mes-console/Pasted-image-20241202155547.png', caption: '생산 실적 등록 화면 — 바코드 스캔 기반 수작업 라인 입력' },
    { src: '/projects/mes-console/Pasted-image-20241202155608.png', caption: '생산 실적 등록 화면 — 상세 폼' },
    { src: '/projects/mes-console/Pasted-image-20241202155628.png', caption: '제품 조회 화면 — Django ORM 기반 S/N 전체 이력 출력' },
    { src: '/projects/mes-console/Pasted-image-20241202160214.png', caption: 'S/N 유효성 검사 등록 폼' },
    { src: '/projects/mes-console/Pasted-image-20241202160230.png', caption: 'S/N 검사 결과 화면' },
    { src: '/projects/mes-console/Pasted-image-20241202160723.png', caption: 'Django REST Framework 백엔드 구조' },
  ],
}
