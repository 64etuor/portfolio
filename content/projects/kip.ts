import type { ProjectContent } from './types'

export const kip: ProjectContent = {
  slug: 'kip',
  ganttId: 'p-kip',
  order: 12,
  enabled: true,
  hero: {
    title: 'KIP — 근거 우선 지식 패브릭 스타터킷',
    company: '개인 프로젝트',
    companyKey: 'startup',
    period: '2026.08–',
    role: '제품 설계, 검색 파이프라인, 파서 격리, 운영 문서 체계',
  },
  summary:
    'NAS 파일과 HWP/HWPX·PDF·PPTX·XLSX·Slack·메일에 흩어진 문서를 하나의 색인으로 모으고, 답변마다 근거가 된 원문 위치를 함께 제시하는 agent-first 지식 검색 기반. CLI(버전 고정 JSON)와 REST/OpenAPI·MCP 어댑터가 같은 애플리케이션 서비스를 호출해, 사람과 AI agent가 동일한 검색 의미론을 공유한다. 목표 문구와 구현 현황을 다른 문서로 분리해 "PRD에 썼으니 됐다"를 구조적으로 막은 것이 설계의 축이다.',
  metrics: [
    { label: '진입 경로', value: 'CLI · REST · MCP', note: '동일 use-case 서비스를 호출 — 의미론 parity' },
    { label: '파싱 속도', value: '19.2x', note: 'hybrid PDF 백엔드 전환 후 raw 파싱 (public PDF 6종)' },
    { label: '검색 품질', value: 'Recall@10 1.0000', note: 'MRR 0.9861 · ACL 유출 0건' },
    { label: '설계 결정', value: 'ADR 43건', note: '되돌릴 수 없는 선택을 근거와 함께 고정' },
    { label: '기준 스토어', value: 'PostgreSQL 18', note: 'lexical search 기본 · pgvector는 미승격' },
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
      heading: '문제 — 검색은 되는데 믿을 수가 없다',
      body:
        '사내 지식은 NAS 공유 폴더, 한글 문서, 스캔 PDF, 발표자료, 스프레드시트, 메신저에 흩어져 있다. 여기에 RAG를 붙이면 답은 나오지만 **그 답이 어디서 나왔는지 확인할 수 없어** 업무에 쓸 수 없다. 특히 한국 제조 현장 문서는 HWP/HWPX 비중이 높고 표가 의미의 대부분을 담는데, 일반 파서는 표를 문단으로 뭉개 근거 추적을 불가능하게 만든다.\n\n그래서 목표를 "잘 찾는 검색"이 아니라 **"근거를 항상 같이 내는 검색"**으로 잡았다. 모든 응답은 원문 위치(locator)를 동반하고, 그 locator가 실제 페이지·블록을 가리키는지 평가로 검증한다.',
    },
    {
      heading: '두 진입 경로, 하나의 서비스',
      body:
        'agent와 사람이 서로 다른 코드를 타면 의미론이 갈라진다. 그래서 edge를 얇게 두고 검색 서비스 하나만 두었다.\n\n- **agent/터미널:** 버전이 고정된 JSON을 출력하는 CLI — 파이프라인에 그대로 꽂힌다\n- **애플리케이션:** REST/OpenAPI + 선택형 MCP 어댑터 — SDK가 안정 계약을 소비\n\n`SearchRequest`의 mode와 filter는 CLI/REST/MCP/SDK가 동일하게 노출하고, 모든 edge가 같은 retrieval service를 호출한다. MCP edge는 프로토콜 2.0을 쓰되 legacy client 협상을 유지한다.',
    },
    {
      heading: '측정 전에는 승격하지 않는다',
      body:
        '이 프로젝트에서 가장 많이 한 일은 기능 추가가 아니라 **승격 거부**다.\n\n- `pgvector`는 기준 이미지에 설치돼 있지만 **semantic search는 비활성**이다. lexical 대비 이득을 평가로 입증하기 전까지 켜지 않는다.\n- Neo4j는 canonical store가 아니다. 향후 선택형 read projection으로만 취급한다.\n\n승인된 목표(PRD/TRD)와 현재 구현·측정 근거·남은 격차를 `PRODUCTION_DESIGN_ALIGNMENT.md`에 분리해 기록하고, 문서 첫머리에 "PRD의 목표 문구만 보고 현재 준비 상태를 추정하지 말 것"을 명시했다. 목표와 현실을 같은 문서에 두면 반드시 섞인다.',
    },
    {
      heading: '파서 격리 — 성능과 안전을 같이',
      body:
        'PDF 백엔드를 bounded Rust 엔진 기반 hybrid로 교체하면서 rollback 경로(`pymupdf`)를 명시적으로 남겼다. 유효한 Markdown 표는 `pdf_table` 단위로 승격하고, 표로 감지됐지만 구조화되지 않은 페이지만 선택적으로 PyMuPDF fallback을 태운다.\n\npublic PDF 6종 측정에서 **raw 파싱 19.2배, PostgreSQL 동기화 3.23배** 빨라지는 동안 lexical **Recall@10 1.0000 / MRR 0.9861**을 유지했고 **ACL 유출은 0건**이었다. 파서는 bounded 프로세스로 격리해(ADR-050) 손상된 입력이 서비스를 끌고 내려가지 못하게 했다.',
    },
    {
      heading: '전달물도 검증 대상이다',
      body:
        '인터넷 격리 환경에 넘길 때 작업 디렉터리를 그냥 압축하면 credential·로컬 DB·내부 plan이 함께 나간다. 그래서 결정적(deterministic) starter ZIP 빌더를 만들었다 — allowlist 기반으로 소스·잠긴 의존성·테스트·migration·contract·ontology·예제·운영 문서만 담고, 로컬 상태와 비밀·평가 자료·릴리스 바이너리는 제외한다.\n\n버전 manifest, 파일별 checksum, 외부 archive digest, path/expansion 방어, **비밀 내용 스캔**을 붙여 받는 쪽이 독립적으로 검증할 수 있게 했다. 정식 릴리스는 clean tree에서만 만든다.',
    },
  ],
  links: [{ label: 'GitHub', href: 'https://github.com/64etuor' }],
}
