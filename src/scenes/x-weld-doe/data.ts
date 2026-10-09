// 사실·라벨·타임라인 — profile.ts line-innovation-2211 기준.

export const TL = {
  hornLift: [1.3, 2.4] as const, // 혼 상승·페이드
  ripFade: [1.4, 2.7] as const,
  runs: [0.9, 2.7] as const, // DOE 런 등장
  fit: [2.5, 4.5] as const, // 곡면 적합
  descent: [4.5, 6.4] as const, // 경사 하강 → 최적 창
  opt: [6.1, 7.0] as const,
  cost: [6.3, 7.3] as const,
  ambient: 7.5,
  loop: 24, // 앰비언트 주기(초)
}

export const BG = '#060508'

export interface Copy {
  kicker: string
  title: string
  factors: string
  phases: [string, string, string, string]
  timeLabel: string
  low: string
  high: string
  counterLabel: string
  counterFrom: string
  final: string
  rework: string
  reworkNote: string
  scrap: string
  scrapNote: string
  axisA: string
  axisP: string
  axisD: string
  start: string
  opt: string
  legend: [string, string, string]
  aria: string
}

export const COPY: Record<'ko' | 'en', Copy> = {
  ko: {
    kicker: '이랜텍 · 생산라인 개선 · 2022.11–2023.09',
    title: '초음파 용착 DOE',
    factors: '진폭 × 가압력 × 시간',
    phases: ['용착 불량', 'DOE 런', '응답 곡면 적합', '최적 조건 창'],
    timeLabel: '용착 시간',
    low: 'low',
    high: 'high',
    counterLabel: '초음파 용착 불량률',
    counterFrom: '15% → 0%대',
    final: '0%대',
    rework: '재작업 공수비용 −3,200만원/년',
    reworkNote: '초당 임율 6.3원 기준',
    scrap: '폐기 비용 −3,600만원/년',
    scrapNote: '단위 폐기 비용 7,688원 기준',
    axisA: '진폭 →',
    axisP: '가압력 →',
    axisD: '불량률 %',
    start: '기존 조건 · 15%',
    opt: '최적 조건 창',
    legend: ['시간 low', '시간 high', '중심점'],
    aria: '초음파 용착 DOE 응답 곡면: 불량률 15%에서 0%대로',
  },
  en: {
    kicker: 'Elentec · Line improvement · 2022.11–2023.09',
    title: 'Ultrasonic welding DOE',
    factors: 'Amplitude × Pressure × Weld time',
    phases: ['Weld defects', 'DOE runs', 'Response surface fit', 'Optimal window'],
    timeLabel: 'Weld time',
    low: 'low',
    high: 'high',
    counterLabel: 'Ultrasonic weld defect rate',
    counterFrom: '15% → ~0%',
    final: '~0%',
    rework: 'Rework labor −₩32M/yr',
    reworkNote: 'at ₩6.3 per labor-second',
    scrap: 'Scrap cost −₩36M/yr',
    scrapNote: 'at ₩7,688 per scrapped unit',
    axisA: 'Amplitude →',
    axisP: 'Pressure →',
    axisD: 'Defect %',
    start: 'Previous setting · 15%',
    opt: 'Optimal window',
    legend: ['time low', 'time high', 'center'],
    aria: 'Ultrasonic welding DOE response surface: defect rate 15% to ~0%',
  },
}
