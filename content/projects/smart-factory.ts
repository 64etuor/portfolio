import type { ProjectContent } from './types'

export const smart_factory: ProjectContent = {
  slug: "smart-factory",
  ganttId: "p-smartfac",
  order: 8,
  enabled: true,
  hero: {
    title: "중기청 상생 스마트팩토리 도입",
    company: "은성",
    companyKey: "eun",
    period: "2021.08–2022.01",
    role: "지원사업 신청, 프로젝트 관리, 개발 요구사항 정의",
  },
  summary:
    "수기 위주로 운영되던 은성의 데이터를 전산화하기 위해 중소기업진흥청 대기업 상생 지원사업을 신청·수행했다. ERP·바코드·태블릿을 약 6개월 만에 현장에 안착시켰다.",
  metrics: [
    { label: "도입 솔루션", value: "3종", note: "ERP·바코드·태블릿" },
    { label: "재원", value: "정부 지원", note: "중소기업진흥청 상생 프로그램" },
  ],
  stack: ["Ecount ERP", "바코드 시스템", "모바일 태블릿"],
  sections: [
    {
      heading: "배경",
      body: "- 생산 현황과 물류를 **수작업**으로 관리해 데이터 정확성이 낮았다\n- 업무 절차가 체계화되지 않아 지원사업으로 기초 솔루션 도입을 추진했다",
    },
    {
      heading: "한 일",
      body: "- 지원사업 신청, 프로젝트 관리, **개발 요구사항** 정의 전담\n- **Ecount ERP** 도입으로 생산·재고·구매 데이터 전산화\n- ERP 연동 **바코드**로 입출고 실수 방지, 실시간 재고 파악\n- **모바일 태블릿**으로 수작업 라인 생산 현황 집계",
    },
    {
      heading: "성과",
      body: "- 생산 데이터 **전산화**와 업무 절차 체계화\n- 정부 지원을 활용해 비용 부담을 줄이며 디지털 전환 기반 마련",
    },
  ],
}
