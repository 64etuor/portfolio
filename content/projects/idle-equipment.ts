import type { ProjectContent } from './types'

export const idle_equipment: ProjectContent = {
  slug: "idle-equipment",
  ganttId: "p-idle",
  order: 6,
  enabled: true,
  hero: {
    title: "유휴 설비 재활용 프로젝트",
    company: "이랜텍",
    companyKey: "elen",
    period: "2022.12–2023.04",
    role: "기획, 설비 활용 방안 검토, 협력사 협의",
  },
  summary:
    "폐기 예정이던 유휴 비전검사 장비 4대(대당 구입가 약 4천만원)를 비전 검사가 없던 공정에 재배치했다. 신규 설비 구매 비용 약 4백만원을 아끼고 사출·배터리 모듈 라인에 품질 검사를 도입했다.",
  metrics: [
    { label: "설비 비용 절감", value: "약 4백만원", note: "견적가액 기준" },
    { label: "재활용 장비", value: "4대", note: "대당 구입가 약 4천만원" },
    { label: "검사 신규 적용", value: "2개 공정", note: "사출 파트·배터리 모듈" },
  ],
  stack: ["비전검사 시스템", "다비치 비전", "TOS", "범용 비전 검사 소프트웨어"],
  sections: [
    {
      heading: "배경",
      body: "- 사내에 **유휴 비전검사 장비 4대**가 방치돼 폐기를 앞두고 있었다\n- 일부 공정에는 비전 검사가 적용되지 않아 품질 검사 공백이 있었다",
    },
    {
      heading: "한 일",
      body: "장비 4대의 활용처를 정하고 업체(다비치 비전, TOS) 협의와 실무를 전담했다.\n\n- 1대: 의료키트 반자동 조립 설비 제작 시 **사급 장비**로 지급\n- 1대: 범용 비전 SW로 사출 파트 **인서트·너트 누락 검사** 구현\n- 1대: 배터리 모듈 **역삽 방지 검사** 구현\n- 1대: 예비 장비로 보관",
    },
    {
      heading: "성과",
      body: "- 사급 지급으로 비전검사 시스템 **견적가 일부 절감**\n- 검사가 없던 사출·배터리 모듈 라인에 **품질 안전망** 확보",
    },
  ],
}
