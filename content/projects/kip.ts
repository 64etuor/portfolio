import type { ProjectContent } from './types'

export const kip: ProjectContent = {
  slug: 'kip',
  ganttId: 'p-kip',
  order: 12,
  enabled: true,
  hero: {
    title: 'KIP — 출처까지 함께 답하는 사내 문서 검색 (RAG)',
    company: '개인 프로젝트',
    companyKey: 'startup',
    period: '2026.08–',
    role: '1인 개발 · 설계, 검색 파이프라인, 문서 파싱',
  },
  summary:
    'RAG(검색 증강 생성) 기반 사내 문서 검색 시스템. 답변마다 근거가 된 원문 위치(페이지·표)를 함께 보여줘, 사람이 바로 확인하고 업무에 쓸 수 있게 했다. PDF 파싱을 19.2배 빠르게 하면서도 검색 정확도는 그대로 유지했다.',
  metrics: [
    { label: '파싱 속도', value: '19.2배', note: 'PDF 파싱 (공개 PDF 6종 기준)' },
    { label: 'DB 동기화', value: '3.23배', note: '파서 교체 후 DB 반영 속도' },
    { label: '검색 정확도', value: 'Recall@10 1.0', note: 'MRR 0.986 · 속도 개선 후에도 유지' },
    { label: '권한 밖 노출', value: '0건', note: '권한 없는 문서는 결과에서 차단' },
  ],
  stack: [
    'Python 3.12',
    'PostgreSQL 18',
    'FastAPI',
    'Typer',
    'Pydantic v2',
    'MCP',
    'Docker',
    'pdf-inspector',
    'Kordoc',
  ],
  sections: [
    {
      heading: '문제',
      body:
        '사내 문서는 NAS 공유 폴더, 한글(HWP) 문서, 스캔 PDF, 발표자료, 스프레드시트, 메신저에 흩어져 있다.\n\n- RAG를 붙이면 답은 나오지만 **출처를 확인할 수 없어** 업무에 쓰기 어렵다\n- 제조 현장 문서는 **HWP·스캔 PDF** 비중이 높다\n- 내용 대부분이 표에 있는데, 일반 파서는 **표를 문단으로 뭉갠다**\n- 그래서 목표를 "잘 찾는 검색"이 아니라 **"근거를 항상 같이 내는 검색"**으로 잡았다',
    },
    {
      heading: '어떻게 풀었나',
      body:
        '모든 답변에 원문 위치를 붙이고, 그 위치가 실제로 맞는지 자동 평가로 확인한다.\n\n- **CLI·REST API·MCP**가 같은 검색 엔진을 호출해 사람과 AI 에이전트가 같은 결과를 받는다\n- PDF 파서를 **Rust 기반 엔진**으로 교체하고, 표는 문단과 분리해 별도 단위로 추출\n- 파서를 **별도 프로세스로 격리**해 손상된 파일이 서비스를 멈추지 않게 함\n- 문제가 생기면 **이전 파서로 되돌릴 수 있는 경로**를 남김',
    },
    {
      heading: '결과',
      body:
        '공개 PDF 6종으로 파서 교체 전후를 측정했다.\n\n- PDF 파싱 **19.2배**, DB 동기화 3.23배 빨라짐\n- 속도를 올리는 동안 검색 정확도 **Recall@10 1.0 · MRR 0.986** 유지\n- 권한 밖 문서 노출 **0건**',
    },
    {
      heading: '지킨 원칙',
      body:
        '기능을 늘리기보다, 효과가 확인된 것만 켜는 데 집중했다.\n\n- 벡터 검색은 설치만 해두고 **효과가 측정되기 전까지 끔** (키워드 검색이 기본)\n- 목표 문서와 실제 구현 현황을 **따로 기록**해 계획을 완료로 착각하지 않게 함\n- 외부 전달용 패키지는 필요한 파일만 담고 **비밀정보 검사**를 거침\n- 받는 쪽이 **파일별 체크섬**으로 패키지를 직접 검증할 수 있음',
    },
  ],
  links: [{ label: 'GitHub', href: 'https://github.com/64etuor' }],
}
