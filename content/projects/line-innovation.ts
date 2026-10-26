import type { ProjectContent } from './types'

export const line_innovation: ProjectContent = {
  slug: "line-innovation",
  ganttId: "p-line",
  order: 7,
  enabled: true,
  hero: {
    title: "연간 생산라인 혁신 프로젝트",
    company: "이랜텍",
    companyKey: "elen",
    period: "2022.11–2023.09",
    role: "과제 설정·실행, 업무 배분, 보고",
  },
  summary:
    "초음파 용착 불량을 잡는 과제로 시작해 10개월간 C/T 단축·LOB 개선·MES 도입까지 라인 전반으로 확장했다. 용착 불량률을 15%에서 0%대로 낮추고, 연간 약 1억 1천만원을 절감했다.",
  metrics: [
    { label: "연간 절감", value: "약 1.1억원", note: "재작업·폐기·생산성 합산" },
    { label: "용착 불량률", value: "15%→0%대", note: "DOE 조건 최적화" },
    { label: "생산성", value: "+24%", note: "소형 배터리팩 라인" },
    { label: "공정 C/T", value: "−24% / −49%", note: "Neck / Function Test" },
  ],
  stack: ["DOE", "Jig 설계", "MES", "WBS/Gantt", "Python", "3정5S"],
  sections: [
    {
      heading: "배경",
      body: "- 초음파 용착 불량으로 **사출 케이스 폐기**와 재작업 공수 낭비가 발생했다\n- 불량 해소 후 C/T·LOB·MES 과제를 더해 연간 프로젝트로 확장했다",
    },
    {
      heading: "한 일",
      body: "- **초음파 용착 DOE**로 불량 원인 규명, 조건 최적화\n- **커팅 Jig 개발**로 Neck 공정 C/T 단축 (16.72초 → 12.76초)\n- **검사 Jig 개조**로 Core-pack Function Test C/T 단축 (55초 → 28초)\n- 소형 배터리팩 라인 **LOB 재편성**\n- `MES` 기반 실시간 공정 분석, WBS·Gantt 업무 관리, Python 라벨 S/N 검증 프로그램 도입",
    },
    {
      heading: "절감 내역 (연 환산)",
      body: "- 재작업 공수 **약 3,200만원** (초당 임율 6.3원 기준)\n- 폐기 비용 **약 3,600만원** (단위 폐기 비용 7,688원 기준)\n- 생산성 향상 **약 4,437만원**",
    },
  ],
  links: [
    { label: '초음파 용착 DOE', href: '/s/weld-doe' },
    { label: 'LOB 라인 밸런싱', href: '/s/line-balance' },
  ],
}
