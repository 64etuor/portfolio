import type { ProjectContent } from './types'

export const mes_console: ProjectContent = {
  slug: "mes-console",
  ganttId: "p-mes",
  order: 1,
  enabled: true,
  hero: {
    title: "신제품 자동화 라인 MES 자체 개발",
    company: "솔라엣지",
    companyKey: "sol",
    period: "2024.10–12",
    role: "기획·리딩, 백엔드·프론트엔드·DB 개발, 설비 연동",
  },
  summary: '신제품 자동화 라인 셋업 중, 설비 예산(30만 달러)이 이미 초과된 상태에서 MES 외주비가 예산에서 빠진 것을 발견했다. 외주 대신 Django·React·PostgreSQL 기반 MES를 직접 기획·개발해 3개월 만에 프로토타입을 완성했다. 사업 종료로 양산 전 중단됐다.',
  metrics: [
    { label: '개발 기간', value: '3개월', note: '외주 없이 프로토타입 완성' },
    { label: '스캔 응답', value: '≤150ms', note: 'Wi-Fi 환경 바코드 스캔 등록' },
    { label: '설비 연동', value: '3종', note: 'OPC UA · TCP/IP 비전 · MS Access' },
  ],
  stack: ['Python', 'Django', 'Django REST Framework', 'React', 'TypeScript', 'Electron', 'Material-UI', 'Ant Design', 'PostgreSQL', 'OPC UA'],
  sections: [
    {
      heading: '배경',
      body: '해외 설치 예정이던 신제품 라인이 한국 법인으로 이관되며 프로젝트를 맡았다.\n\n- 제품: 배터리 화재 방지용 **글라스울 파우치**\n- 라인: 비전 정렬·재단 → 투입 → 주입·밀봉 → 측정 → 비전 검사 → 적재까지 전 공정 자동화\n- 설비 예산 초과 상태에서 MES 외주비 누락 확인 → **자체 개발** 제안',
    },
    {
      heading: '한 일',
      body: '- **백엔드**: Django REST로 생산 실적 등록, S/N·Cell Grade·반제품 이력 검증 API\n- **작업자 화면**: React·TypeScript·Electron 기반 바코드 스캔 등록·제품 조회\n- **DB**: PostgreSQL로 공정·반제품 이력, Cell Grade 검증 스키마 설계\n- **데이터 연동**: OPC UA 설비, TCP/IP 비전 검사기, MS Access 구형 검사 장비',
    },
    {
      heading: '결과',
      body: '- 외주 개발 없이 **MES 프로토타입** 완성\n- 작업자 화면·검증 API·설비 데이터 수집까지 한 흐름으로 구현\n- 사업 종료로 라인 양산 전 프로젝트 중단',
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
