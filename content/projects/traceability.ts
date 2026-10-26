import type { ProjectContent } from './types'

export const traceability: ProjectContent = {
  slug: "traceability",
  ganttId: "p-trace",
  order: 3,
  enabled: true,
  hero: {
    title: "공정 추적성 관리 프로그램 개발",
    company: "솔라엣지",
    companyKey: "sol",
    period: "2024.03–06",
    role: "기획, 앱 개발, 데이터 분석·시각화, UI/UX",
  },
  summary: '필드에서 원자재 불량이 발견됐지만 S/N을 수기로 관리해 영향 범위를 파악할 수 없었다. Power Apps 기반 공정 추적성 앱을 직접 기획·개발해 S/N 단위 추적과 공정 검증을 시스템에 넣었다. 이 성과로 2024 Core Value Award를 받았다.',
  metrics: [
    { label: '2024 수상', value: 'Core Value Award', note: '필드 불량 재발 방지 체계 구축' },
    { label: '불량 영향 범위', value: '즉시 확인', note: 'S/N 기준 생산 이력 추적' },
    { label: '검사성적서', value: '자동 발행', note: '검사 완료 시 서버 자동 등록' },
  ],
  stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List'],
  sections: [
    {
      heading: '배경',
      body: '- 필드에서 **원자재 불량** 발견\n- S/N 수기 관리로 불량 영향 범위 파악 불가\n- 재발 방지를 위해 S/N·공정 이력·부품 사양을 검증하는 모바일 앱 기획',
    },
    {
      heading: '한 일',
      body: '- **Power Apps 앱**: 공정별 실적·체크리스트·사진을 모바일로 등록\n- **공정 검증**: S/N 유효성·고유성, QR 부품 사양 검증, 이전 공정 미기록 제품 투입 차단\n- **Power Automate**: 검사성적서 자동 발행, 이슈 발생 시 메일·Teams 알림\n- **Power BI**: 생산 이력 추적, KPI 모니터링',
    },
    {
      heading: '결과',
      body: '- 수기 S/N 관리를 **전산 추적**으로 전환\n- 부품 혼입·조립 누락을 시스템에서 차단해 휴먼 에러 감소\n- 필드 불량 재발 방지 체계 구축',
    },
  ],
  gallery: [
    { src: '/projects/traceability/Pasted-image-20241202163306.png', caption: '앱 기본 화면 — 공정별 실적 등록' },
    { src: '/projects/traceability/Pasted-image-20241202163355.png', caption: '생산자 자주 검사 및 체크리스트' },
    { src: '/projects/traceability/Pasted-image-20241202163454.png', caption: '공정 이력 조회 화면' },
    { src: '/projects/traceability/Pasted-image-20241202163518.png', caption: '이슈 발생 시 Teams 채팅 즉시 알림' },
  ],
}
