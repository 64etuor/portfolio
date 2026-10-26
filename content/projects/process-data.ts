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
    role: "기획, DB 설계, 솔루션 개발, 데이터 분석·시각화",
  },
  summary: '생산 실적·공수·불량 데이터가 담당자별 엑셀 파일로 흩어져 있어 집계에 수작업이 많고 신뢰도가 낮았다. SharePoint DB로 통합하고 입력 솔루션과 Power BI 통합 대시보드를 직접 개발했다. 사무 공수를 하루 451분(연 약 5천만원) 줄였고 2023 MOC Best Employee를 받았다.',
  metrics: [
    { label: '사무 공수', value: '−451분/일', note: '연 약 5천만원 절감' },
    { label: '제품 ST', value: '−50%', note: '실 공수 데이터로 표준시간 정상화' },
    { label: '2023 수상', value: 'MOC Best Employee', note: '솔라엣지 MOC 최우수 직원' },
  ],
  stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List', 'Excel VBA', 'On-premises Gateway'],
  sections: [
    {
      heading: '배경',
      body: '- 생산 실적·공수·불량·OPEX 데이터가 **담당자별 엑셀**로 분산\n- 데이터 무결성 확보가 어렵고 집계에 수작업 공수 과다\n- KPI 보고 지연과 데이터 신뢰성 문제 반복',
    },
    {
      heading: '한 일',
      body: '- **입력 솔루션**: 워크오더·작업 이력·생산 계획·불량·OPEX·근태 등록, 입력값 검증\n- **Power BI 대시보드**: 생산 현황, ST/UPPH, OEE/Downtime, 불량, KPI, 공수, OPEX\n- **Power Automate**: 데이터 제출 시 dataset 자동 갱신·Teams 알림, 실패 시 관리자 알림\n- **On-premises Gateway**: 기존 Excel 쿼리와 서버를 자동 동기화해 업무 흐름 유지',
    },
    {
      heading: '결과',
      body: '- 공수·생산·불량을 **단일 대시보드**에서 집계\n- 수작업 집계를 없애 KPI 보고 자동화\n- ST 감축은 공정 개선이 아닌 **실 공수 데이터** 확보에 따른 정상화',
    },
  ],
  gallery: [
    { src: '/projects/process-data/Pasted-image-20241202161931.png', caption: '솔루션 — 랜딩 페이지' },
    { src: '/projects/process-data/Pasted-image-20241205182519.png', caption: '솔루션 — 미니 대시보드 (앱 내 생산 현황 요약)' },
    { src: '/projects/process-data/Pasted-image-20241205180919.png', caption: '솔루션 — 작업 이력 입력' },
    { src: '/projects/process-data/Pasted-image-20241205180948.png', caption: '솔루션 — 워크 오더 조회' },
    { src: '/projects/process-data/Pasted-image-20241205180904.png', caption: '솔루션 — 불량 내역 입력' },
    { src: '/projects/process-data/Pasted-image-20241205181022.png', caption: '솔루션 — 공정 이력 조회' },
    { src: '/projects/process-data/Pasted-image-20241205181008.png', caption: '솔루션 — 데이터 제출 확인 (Commit 시 Power BI dataset 자동 갱신 + Teams 알림 RPA)' },
    { src: '/projects/process-data/Pasted-image-20241205181302.png', caption: 'Power BI — 종합 생산 현황 및 지표' },
    { src: '/projects/process-data/Pasted-image-20241205181430.png', caption: 'Power BI — 개별 라인 생산 현황 및 세부 지표 (ST, UPPH)' },
    { src: '/projects/process-data/Pasted-image-20241205181555.png', caption: 'Power BI — 개별 라인 공정별 생산 현황 및 불량' },
    { src: '/projects/process-data/Pasted-image-20241205181909.png', caption: 'Power BI — 세부 공정별 생산 현황' },
    { src: '/projects/process-data/Pasted-image-20241205181957.png', caption: 'Power BI — OEE / Downtime 내역 및 공수 손실 금액 환산' },
    { src: '/projects/process-data/Pasted-image-20241205181756.png', caption: 'Power BI — 불량 현황 및 공수 손실 금액 환산' },
    { src: '/projects/process-data/Pasted-image-20241205181820.png', caption: 'Power BI — 불량 상세 내역' },
    { src: '/projects/process-data/Pasted-image-20241205182140.png', caption: 'Power BI — 작업오더별 세부 생산 정보 및 진행율' },
    { src: '/projects/process-data/Pasted-image-20241205181627.png', caption: 'Power BI — KPI' },
    { src: '/projects/process-data/Pasted-image-20241205181718.png', caption: 'Power BI — 공수 분석' },
    { src: '/projects/process-data/Pasted-image-20241205182230.png', caption: 'Power BI — HR 관련 페이지' },
    { src: '/projects/process-data/Pasted-image-20241205182304.png', caption: 'Power BI — 근태 현황' },
    { src: '/projects/process-data/Pasted-image-20241205182339.png', caption: 'Power BI — OPEX 비용 분석' },
  ],
}
