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
    role: "과제 설정, 개선안 도출, 프로젝트 관리",
  },
  summary:
    "제조 창고의 재고 적체와 물류 비효율을 줄이기 위한 삼성전자 상생협력 아카데미 멘토링 과제다. 4개 부서 TF를 3개월간 리딩해 재고자산회전율을 17% 높였다.",
  metrics: [
    { label: "재고자산회전율", value: "+17%", note: "프로젝트 KPI" },
    { label: "TF 구성", value: "4개 부서", note: "구매·영업·제조·생산관리" },
    { label: "기간", value: "3개월", note: "삼성전자 멘토링" },
  ],
  stack: ["TF 구성·운영", "물류 프로세스 개선", "3정5S", "WBS/Gantt"],
  sections: [
    {
      heading: "배경",
      body: "- 제조 창고 **재고 적체**로 비용 낭비와 물류 흐름 비효율이 이어졌다\n- 삼성전자 제조리더 교육 연계 멘토링을 활용해 현장 개선 과제로 기획했다",
    },
    {
      heading: "한 일",
      body: "- 구매·영업·제조·생산관리 인원으로 **TF 구성**, 과제 설정부터 일정 관리까지 리딩\n- 제조→영업 **재고 이관 전산 프로세스** 개선\n- 창고 내 **면책 구역** 지정\n- 제조·영업 창고 **3정5S** 추진",
    },
    {
      heading: "성과",
      body: "- 재고자산회전율 개선으로 **프로젝트 KPI 달성**\n- 재고 이관 오류를 줄이고 창고 운영 투명성을 높였다",
    },
  ],
}
