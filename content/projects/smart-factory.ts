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
    role: "중기청 상생 스마트팩토리 도입",
  },
  summary:
    "중소기업진흥청 대기업 상생 지원 프로그램을 통해 은성에 ERP·바코드·모바일 태블릿 기반 스마트팩토리 기초 솔루션을 도입하여 생산 데이터를 전산화하고 업무 절차를 체계화했습니다.",
  metrics: [],
  stack: ["Ecount ERP", "바코드 시스템", "모바일 태블릿"],
  sections: [
    {
      heading: "추진 배경",
      body: "수작업 중심의 생산 현황 파악과 물류 관리로 인해 데이터 정확성이 낮고 업무 절차가 비체계적이었습니다. 중소기업진흥청 대기업 상생 지원 프로그램에 신청하여 스마트팩토리 기초 솔루션 도입을 추진했습니다.",
    },
    {
      heading: "수행 내용",
      body: "- 프로젝트 신청·매니지먼트·개발 요구사항 수립 전 과정 담당\n- **Ecount ERP** 도입으로 생산·재고·구매 데이터 전산화\n- ERP 연계 **바코드 관리 시스템** 도입 — 물류 실수 방지 및 실시간 재고 현황 파악\n- **모바일 태블릿** 활용 수작업 라인 생산현황 파악 시스템 도입",
    },
    {
      heading: "성과",
      body: "ERP·바코드·태블릿 세 가지 솔루션을 약 6개월 만에 현장에 안착시켜 생산 데이터의 **전산화 및 업무 절차 체계화**를 달성했습니다.\n\n정부 지원(중소기업진흥청)을 활용한 프로젝트로, 비용 부담을 최소화하면서 디지털 전환 기반을 마련했습니다.",
    },
  ],
}
