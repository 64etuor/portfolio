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
    role: "기획, 앱 개발, 데이터 분석·시각화",
  },
  summary: '여러 현장에서 동시에 진행되는 DV(설계 검증) 데이터를 짧은 기간 안에 빠짐없이 모아야 했다. AppSheet 입력 앱, Google Sheets 실시간 대시보드, QR 이력 조회 시제품을 직접 만들었다. 여러 현장의 DV 현황을 한 곳에서 실시간으로 확인할 수 있게 됐다.',
  metrics: [
    { label: '대시보드 갱신', value: '5분 주기', note: '여러 현장 현황 자동 집계' },
    { label: '공정 능력 분석', value: 'CPK 자동화', note: 'Python으로 계산·차트 생성' },
    { label: '이력 추적', value: 'QR 시제품', note: 'EU 배터리 패스포트 대응 검토' },
  ],
  stack: ['Google AppSheet', 'Google Sheets', 'Google Apps Script', 'Python', 'Matplotlib'],
  sections: [
    {
      heading: '배경',
      body: '- DV 기간이 짧아 **고품질 데이터**를 빠르게 확보해야 함\n- 여러 현장에서 병행 진행 → 현황을 실시간으로 파악할 수단 필요\n- EU 배터리 패스포트 대응을 위한 이력 추적 체계 검토',
    },
    {
      heading: '한 일',
      body: '- **AppSheet 앱**: 모듈·BPU·System Rack별 생산 실적·불량 등록, S/N·공정 이력·부품 사양 검증\n- **실시간 대시보드**: Google Sheets + Apps Script로 현장별 현황 자동 집계\n- **데이터 분석**: Python Matplotlib로 CPK 등 공정 능력 지수 계산·차트화\n- **QR 이력 조회**: 제품 S/N QR 스캔 시 전체 생산 이력 표시 (Apps Script)',
    },
    {
      heading: '결과',
      body: '- 여러 현장의 DV 데이터를 **단일 플랫폼**에서 통합 관리\n- QR 이력 추적 시제품으로 EU 배터리 패스포트 대응 가능성 검증\n- 이후 MES 프로젝트 DB 설계의 기반으로 활용',
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
