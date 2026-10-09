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
    role: "연간 생산라인 혁신 프로젝트",
  },
  summary:
    "초음파 용착 불량 제거를 시작으로 10개월간 공정 C/T 단축·LOB 개선·MES 도입 등 다양한 생산라인 혁신 과제를 리딩했습니다. 불량률 15%→0%, 연환산 폐기·재작업비 약 6,800만원 절감, 생산성 +24% 달성.",
  metrics: [
    { label: "초음파 용착 불량률", value: "15%→0%" },
    { label: "Neck 공정 C/T", value: "−24%", note: "16.72sec → 12.76sec" },
    { label: "Core-pack FT C/T", value: "−49%", note: "55sec → 28sec" },
    { label: "소형팩 라인 생산성", value: "+24%", note: "연환산 4,437만원 절감" },
  ],
  stack: ["DOE", "Jig 설계", "MES", "WBS/Gantt", "Python", "3정5S"],
  sections: [
    {
      heading: "추진 배경",
      body: "초음파 용착 불량으로 사출물 케이스가 폐기되고 재작업 공수가 낭비되는 문제를 해소하기 위해 프로젝트를 시작했습니다. 이후 공정 C/T 단축·LOB 개선·MES 도입 등 다양한 혁신 과제를 추가하며 연간 프로젝트로 확장했습니다.",
    },
    {
      heading: "수행 내용",
      body: "- **초음파 용착 조건 DOE** 실험으로 불량 원인 규명, 파라미터 최적화 → 불량률 15%→0%대\n- **커팅 Jig 개발**로 Neck 공정 C/T 단축 (16.72sec → 12.76sec)\n- **검사 Jig 개조**로 Core-pack Function Test C/T 단축 (55sec → 28sec)\n- 소형 배터리팩 라인 **LOB 재편성**으로 생산성 24% 향상\n- `MES` 활용 공정 현황 실시간 분석 프로세스 도입\n- WBS·Gantt Chart·공유 업무 보드를 통한 인적 자원·프로젝트 관리 체계화\n- 3정5S 활동, 생산관련 문서 불합리 개선, 엑셀 자동화 양식 제작\n- 라벨 프린트 S/N 유효성 검증 프로그램 **Python** 개발",
    },
    {
      heading: "성과",
      body: "- 재작업 공수 비용 **연 환산 3,200만원 절감** (초당 임율 6.3원 기준)\n- 폐기 비용 **연환산 3,600만원 절감** (단위 폐기 비용 7,688원 기준)\n- 소형팩 라인 생산성 향상에 따른 **연환산 4,437만원 절감**\n\n품질·속도·비용 세 축을 동시에 개선한 10개월 멀티트랙 혁신 프로젝트였습니다.",
    },
  ],
}
