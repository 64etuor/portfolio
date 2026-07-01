import type { ProjectContent } from './types'

export const notion_os: ProjectContent = {
  slug: 'notion-os',
  ganttId: 'p-notion',
  order: 10,
  enabled: true,
  hero: {
    title: 'Notion OS — 조직 운영 시스템',
    company: '스타트업',
    companyKey: 'startup',
    period: '2025.10–',
    role: 'Notion OS — 조직 운영 시스템',
  },
  summary:
    'Notion을 위키가 아니라 조직 운영 레이어로 설계한 프로젝트. 회의에서 나온 논의가 결정·액션·OKR·백로그·PRD·Runbook으로 흘러가도록 SSOT 기반 정보 아키텍처를 구축하고, AI가 회의록을 운영 상태로 라우팅하도록 스키마를 설계했다.',
  metrics: [
    { label: '하위 시스템', value: '7개', note: '문서 관리·개발 허브·백로그·Decision OS·OKR·Runbook·연계' },
    { label: '정보 원칙', value: 'SSOT', note: '정보 성격별 정본 위치 분리' },
    { label: '의사결정', value: '상태 머신', note: 'Proposed→Decided→Superseded 등' },
    { label: 'AI 경계', value: '사람 편집 우선', note: 'AI는 추출·라우팅, 사람이 최종 판단' },
    { label: '연계', value: 'GitHub · Google Drive', note: '코드 정본 / 산출물 보관소 분리' },
  ],
  stack: ['Notion', 'Notion DB / Relation', 'GitHub', 'Google Drive', 'AI Reconciliation (LLM)'],
  sections: [
    {
      heading: '문제와 목표',
      body:
        '초기 스타트업은 의사결정과 실행 속도가 빠르지만, 정보가 회의록·메신저·문서·GitHub·Drive에 흩어지면서 결정 근거, 최신 문서, 작업 상태, 목표 지표가 쉽게 유실된다.\n\n대표적인 손실 지점:\n\n- 회의에서 결정했지만 나중에 근거를 찾을 수 없음\n- 작업은 진행되지만 요구사항·PR·완료 기준이 분리됨\n- 문서가 늘어날수록 최신 문서와 과거 문서가 구분되지 않음\n- OKR이 실제 실행과 연결되지 않고 형식적 목표 관리로 끝남\n\n목표는 *정보의 역할, 정본 위치, 실행 흐름, 의사결정 상태, 목표 지표, 문서 생명주기*를 하나의 Notion 시스템 안에 구조화하는 것이었다.',
    },
    {
      heading: 'SSOT 정보 아키텍처',
      body:
        '가장 중요한 원칙은 **Single Source of Truth**다. 같은 정보를 여러 곳에 복사하지 않고, 정보의 성격에 따라 정본 위치를 나눈다.\n\n- 코드 사실·API contract·CI/CD·ADR → **GitHub** (코드와 함께 변하는 기술 사실)\n- 사람용 설명·온보딩·운영 절차·문서 색인 → **Notion 개발 문서 허브**\n- 작업 단위·담당자·상태·완료 조건·PR 링크 → **백로그** (`MIR-DEV`)\n- 제품 요구사항·사용자 시나리오 → **PRD** (1행 = 1프로젝트 × 1기능)\n- 계약·법무·재무·민감 파일 → **Google Drive** (복사 대신 링크)\n- 목표와 핵심 지표 → **OKR DB**\n- 의사결정과 액션 상태 → **Decision OS**\n\n개발 문서는 역할(Canonical / Index / Guide / Runbook / Decision / Reference / Archive)과 SSOT 위치, 검토 주기, 정리 우선순위(P0~P3)를 필드로 관리해, 팀원이 문서를 열었을 때 *이 문서를 기준으로 판단해도 되는지*를 즉시 알 수 있게 했다.',
    },
    {
      heading: 'Decision OS · OKR',
      body:
        '**Decision OS**는 회의나 논의에서 나온 내용을 조직이 실행·추적할 수 있는 상태로 바꾼다. 회의록은 사실의 기록이고, Decision Ledger와 Action Items는 운영 상태의 기록이다.\n\n- Decision Ledger는 결정의 "상태"를 관리하는 상태 머신: `Proposed` · `Decided` · `Revisit` · `Superseded` · `Archived` · `Dropped`\n- 모든 결정을 **Boost / Drag / Reversibility / Urgency** 축으로 평가해, 좋아 보이는 결정이 숨긴 비용을 드러냄\n- AI Reconciliation은 회의를 한 번에 요약하지 않고 atomic candidate로 쪼갠 뒤 objective / key_result / action / decision_candidate 등으로 분류·라우팅하고 schema를 검증\n\n**OKR**은 감시 도구가 아니라 정렬 도구다. Objective(방향) + Key Result(측정 결과) 구조에 SMART의 *Assignable*을 더해 책임자를 명확히 했고, 전사 회의에서는 "체크인 필요" 뷰의 현재값·신뢰도·코멘트만 업데이트하도록 운영을 단순화했다.\n\n설계 원칙상 **Decision Ledger는 OKR을 저장하지 않는다** — Objective/KR은 OKR DB로, 결정 후보는 Decision Ledger로, 실행 항목은 Action Items/백로그로 라우팅해 하나의 거대한 DB로 뭉치지 않게 했다.',
    },
    {
      heading: 'AI와 사람의 경계 · 결과',
      body:
        'AI 자동화를 도입하면서도 운영 신뢰성을 유지하기 위해 편집 경계를 설계했다.\n\n- AI는 결정·액션 후보 추출, 근거 문장·Boost/Drag 제안, 리뷰 필요 여부 표시\n- 사람이 편집한 필드는 AI가 덮어쓰지 않음\n- 충돌은 자동 병합하지 않고 Conflict로 두고, 새 결정이 기존 결정을 대체하면 Superseded로 전환\n\n결과적으로 조직의 논의가 기록에서 멈추지 않고 결정·목표·작업·PR·운영 문서로 이어지는 흐름을 만들었다. Mirrorless가 빠르게 움직이면서도 결정의 근거, 실행 상태, 목표 지표, 운영 지식을 잃지 않도록 하는 내부 운영 OS로 작동한다.',
    },
  ],
}
