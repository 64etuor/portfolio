import type { ProjectContent } from './types'

export const dv_data: ProjectContent = {
  slug: "dv-data",
  ganttId: "p-dv",
  order: 2,
  enabled: true,
  hero: {
    title: "개발품 DV 데이터 전산 관리",
    company: "솔라엣지",
    companyKey: "sol",
    period: "2024.08–10",
    role: "개발품 DV 데이터 전산 관리",
  },
  summary: '한정된 DV(Design Verification) 기간 동안 여러 현장의 공정 데이터를 고품질로 확보하기 위해 Google AppSheet 앱·Sheets 대시보드·QR 이력 추적 시스템을 직접 기획하고 개발했습니다.',
  metrics: [
    { label: '대시보드 갱신', value: '5분 주기', note: '여러 현장 DV 현황 실시간 통합 파악' },
    { label: 'QR 이력 추적', value: 'S/N 기반', note: 'EU 배터리 패스포트 대응 프로토타입 — Apps Script 구현' },
    { label: '데이터 분석', value: 'CPK 포함', note: 'Python Matplotlib 공정 능력 지수 자동 계산 및 차트 생성' },
  ],
  stack: ['Google AppSheet', 'Google Sheets', 'Google Apps Script', 'Python', 'Matplotlib'],
  sections: [
    {
      heading: '추진 배경',
      body: 'DV 단계는 기간이 한정되어 있어 짧은 시간 안에 고품질 데이터를 최대한 확보해야 했습니다. 동시에 여러 현장에서 병행 진행되는 DV 현황을 실시간으로 파악하고, EU 배터리 패스포트 대응을 위한 QR 이력 추적 체계를 마련하기 위해 프로젝트를 기획했습니다.',
    },
    {
      heading: '개발 내용',
      body: '- **AppSheet 앱**: 모듈·BPU·System Rack 별 생산 실적·불량 내역 등록, S/N 유효성·고유성·공정 이력·부품 사양 검증 로직 내장\n- **데이터 분석 (Python Matplotlib)**: CPK 등 공정 능력 지수 자동 계산 및 차트 생성\n- **실시간 대시보드**: Google Sheets + Apps Script — 5분 주기 자동 갱신, 현장별 현황 집계\n- **QR 이력 조회**: Apps Script 기반 — 제품 S/N QR 스캔 시 전체 생산 이력 자동 표시 (프로토타입)',
    },
    {
      heading: '성과',
      body: '단기 DV 기간 동안 다수 현장의 데이터를 단일 플랫폼에서 통합 관리했습니다.\n\nQR 기반 이력 추적 프로토타입을 완성해 EU 배터리 패스포트 대응 가능성을 검증했으며, 이 경험은 후속 MES 프로젝트의 데이터베이스 설계 기반으로 활용되었습니다.',
    },
  ],
  gallery: [
    { src: '/projects/dv-data/batch_2024-12-09-08-29-05-1.png', caption: 'AppSheet 작업 화면 — 모듈 생산 실적 입력' },
    { src: '/projects/dv-data/batch_2024-12-09-08-40-47.png', caption: 'AppSheet 작업 화면 — BPU 등록' },
    { src: '/projects/dv-data/batch_2024-12-08-23-42-23-1.png', caption: 'Google Sheets 데이터 및 쿼리 화면' },
    { src: '/projects/dv-data/batch_2024-12-08-23-39-34.png', caption: 'Google Sheets 실시간 대시보드' },
    { src: '/projects/dv-data/batch_2024-12-09-08-37-33.png', caption: 'QR Code 생산 이력 조회 화면' },
  ],
}
