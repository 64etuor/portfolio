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
    role: "공정 추적성 관리 프로그램 개발",
  },
  summary: '필드에서 원자재 불량이 발견되었으나 수기 S/N 관리로 리스크 범위 측정이 불가했던 상황에서, Power Apps 기반 공정 추적성 관리 앱을 직접 기획·개발해 재발 방지 체계를 구축했습니다.',
  metrics: [
    { label: '수상', value: '2024 Core Value Award', note: '필드 원자재 불량 재발 방지 시스템 구현' },
    { label: 'S/N 관리', value: '수기 → 전산', note: '부품 혼입·공정 누락 방지 검증 로직으로 추적성 확보' },
    { label: '자동 성적서', value: '검사 즉시 발행', note: 'Power Automate로 검사 완료 시 성적서 서버 자동 등록' },
  ],
  stack: ['Power Apps', 'Power BI', 'Power Automate', 'SharePoint List'],
  sections: [
    {
      heading: '추진 배경',
      body: '필드에서 원자재 불량이 발견되었으나, S/N이 수기로만 관리되어 영향 범위를 정확히 파악할 수 없었습니다.\n\n문제 재발을 막기 위해 S/N 유효성 검증, 공정 이력 추적, 부품 사양 검증을 갖춘 모바일 앱 개발을 기획했습니다.',
    },
    {
      heading: '개발 내용',
      body: '- **Power Apps 앱**: S/N 유효성·고유성 검증, QR 기반 부품 사양 검증, 공정 이력 검증으로 조립 누락 방지, 모바일 체크리스트·사진 등록 기능\n- **Power Automate**: 검사 완료 시 성적서 서버 자동 발행, 이슈 발생 시 이메일·Teams 즉시 알림\n- **Power BI 대시보드**: 생산 이력·추적 데이터 실시간 조회 및 KPI 모니터링',
    },
    {
      heading: '성과',
      body: '수기 S/N 관리에서 전산 추적으로 전환해 **필드 불량 재발 방지 체계**를 구축했습니다.\n\n공정 품질 검증 기능(부품 혼입 방지, 조립 누락 차단)을 시스템에 내재화해 휴먼 에러를 원천 차단했습니다.\n\n이 성과로 **2024 Core Value Award**를 수상했습니다.',
    },
  ],
  gallery: [
    { src: '/projects/traceability/Pasted-image-20241202163306.png', caption: '앱 기본 화면 — 공정별 실적 등록' },
    { src: '/projects/traceability/Pasted-image-20241202163355.png', caption: '생산자 자주 검사 및 체크리스트' },
    { src: '/projects/traceability/Pasted-image-20241202163454.png', caption: '공정 이력 조회 화면' },
    { src: '/projects/traceability/Pasted-image-20241202163518.png', caption: '이슈 발생 시 Teams 채팅 즉시 알림' },
  ],
}
