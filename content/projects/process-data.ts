import type { ProjectContent } from './types'

export const process_data: ProjectContent = {
  slug: "process-data",
  ganttId: "p-procdata",
  order: 4,
  enabled: true,
  hero: {
    title: "공정 데이터 관리 시스템 개발",
    company: "솔라엣지",
    companyKey: "sol",
    period: "2023.10–12",
    role: "공정 데이터 관리 시스템 개발",
  },
  summary: '엑셀 개별 파일로 분산 관리되던 생산 실적·공수·불량 데이터를 SharePoint 데이터베이스로 통합하고, Power Apps 입력 솔루션과 Power BI 통합 대시보드를 자체 개발해 사무 공수 451분/일 절감 및 제품 ST 50% 감축을 달성했습니다.',
  metrics: [
    { label: '사무 공수', value: '−451분/일', note: '엑셀 수작업 → DB 자동화 전환 / 연간 약 5천만원 절감' },
    { label: '제품 ST', value: '−50%', note: '실 공수 데이터 근거 확보 → ST 정상화 (공정 개선이 아닌 데이터 근거 확보)' },
    { label: '수상', value: '2023 MOC Best Employee', note: '솔라엣지 MOC 전체 최우수 직원' },
  ],
  stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List', 'Excel VBA', 'On-premises Gateway'],
  sections: [
    {
      heading: '추진 배경',
      body: '생산 실적·공수·불량·OPEX 등 공정 핵심 데이터가 담당자별 엑셀 파일로 분산되어 있었습니다. 데이터 무결성 확보가 어렵고, 집계에 많은 수작업 공수가 소요되어 KPI 보고 지연과 데이터 신뢰성 문제가 반복되었습니다.',
    },
    {
      heading: '개발 내용',
      body: '- **Power Apps 솔루션**: 워크오더·작업 이력·생산 계획·불량 내역·OPEX·근태 등록·조회 화면 구현, 수동 입력 데이터 무결성 검증 로직 내장\n- **Power BI 통합 대시보드**: 종합 생산 현황, ST/UPPH, OEE/Downtime, 불량 분석, KPI, 공수 분석, OPEX 비용 페이지 구성\n- **Power Automate RPA**: 데이터 Commit 시 Power BI dataset 자동 업데이트 + Teams 알림, 업데이트 실패 시 관리자 알람\n- **On-premises Gateway**: Excel 쿼리 ↔ Microsoft 서버 자동 동기화로 기존 업무 흐름 단절 최소화',
    },
    {
      heading: '성과',
      body: '엑셀 수작업 공수 **451분/일** 절감 → 연간 약 **5천만원** 절감 효과.\n\n실 공수 데이터 확보를 근거로 제품 ST를 **50% 감축** (공정 개선이 아닌 데이터 기반 정상화).\n\n공수·생산 현황·불량을 단일 대시보드에서 투명하게 집계한 성과로 **2023 MOC Best Employee**를 수상했습니다.',
    },
  ],
  gallery: [
    { src: '/projects/process-data/Pasted-image-20241202161931.png', caption: '솔루션 랜딩 페이지' },
    { src: '/projects/process-data/Pasted-image-20241205182519.png', caption: '솔루션 미니 대시보드 — 앱 내 생산 현황 요약' },
    { src: '/projects/process-data/Pasted-image-20241205180919.png', caption: '작업 이력 입력 화면' },
    { src: '/projects/process-data/Pasted-image-20241205181022.png', caption: '공정 이력 조회 화면' },
    { src: '/projects/process-data/Pasted-image-20241205181302.png', caption: 'Power BI — 종합 생산 현황 및 KPI 지표' },
    { src: '/projects/process-data/Pasted-image-20241205181957.png', caption: 'Power BI — OEE / Downtime 공수 손실 금액 환산' },
  ],
}
