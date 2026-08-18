import type { ProjectContent } from './types'

export const samsung_logistics: ProjectContent = {
  slug: "samsung-logistics",
  ganttId: "p-samsung",
  order: 5,
  enabled: true,
  hero: {
    title: "삼성 제조리더 연계 — 물류 시스템 개선",
    company: "이랜텍",
    companyKey: "elen",
    period: "2023.03–05",
    role: "삼성 제조리더 연계 — 물류 시스템 개선",
  },
  summary:
    "삼성전자 상생협력 아카데미 멘토링을 받아 이랜텍 제조 창고의 재고 비용 감축과 물류 흐름 개선을 목표로 3개월간 TF를 구성·리딩했습니다. 재고자산회전율 +17% 향상을 핵심 KPI로 달성했습니다.",
  metrics: [
    { label: "재고자산회전율", value: "+17%", note: "프로젝트 KPI" },
  ],
  stack: ["TF 구성·운영", "물류 프로세스 개선", "3정5S", "WBS/Gantt"],
  sections: [
    {
      heading: "추진 배경",
      body: "이랜텍 제조 창고에서 재고 적체로 인한 비용 낭비와 물류 흐름 비효율이 지속되고 있었습니다. 삼성전자 제조리더 교육 연계 과정의 멘토링 지원을 활용해 현장 개선 프로젝트를 기획했습니다.",
    },
    {
      heading: "수행 내용",
      body: "- 구매·영업·제조·생산관리 멤버로 **TF 구성**, 삼성전자 멘토링 지원 하에 3개월간 프로젝트 리딩\n- **면책 구역 지정** 및 제조-영업 재고 이관 전산 프로세스 개선\n- 제조·영업 창고 **3정5S** 추진으로 현장 정비 완료\n- 개선 과제 설정, 개선 방법 도출, 프로젝트 매니지먼트 전 과정 담당",
    },
    {
      heading: "성과",
      body: "**재고자산회전율 17% 향상** — 프로젝트 KPI 달성.\n\n면책 구역 지정과 전산 프로세스 개선을 통해 제조-영업 간 재고 이관 오류를 줄이고 창고 운영 투명성을 높였습니다.",
    },
  ],
}
