import type { ProjectContent } from './types'

export const kiosk_app: ProjectContent = {
  slug: 'kiosk-app',
  ganttId: 'p-kiosk-app',
  order: 11,
  enabled: true,
  hero: {
    title: '뷰티 매장 키오스크 — SW 아키텍처',
    company: '스타트업',
    companyKey: 'startup',
    period: '2025.08–',
    role: '뷰티 매장 키오스크 — SW 아키텍처',
  },
  summary:
    'Electron 기반 뷰티 매장 키오스크의 소프트웨어 아키텍처. UI(Renderer) · 백엔드(Main) · 디바이스 헬퍼의 다중 프로세스를 안전한 IPC 경계로 연결하고, 멀티 카메라 캡처·녹화·외부 AI 연동을 멱등성과 오프라인 무결성을 지키며 처리하도록 설계했다.',
  metrics: [
    { label: '아키텍처', value: '다중 프로세스', note: 'UI · 백엔드 · 디바이스 헬퍼' },
    { label: 'UI 구성', value: '컴포넌트 계층', note: '재사용 가능한 구조' },
    { label: '신뢰성', value: '멱등 처리', note: '중복 캡처·요청 방지' },
    { label: '오프라인', value: '로컬 저장', note: '세션·미디어 무결성 유지' },
    { label: '미디어', value: '캡처·녹화·장치제어', note: '멀티 카메라 파이프라인' },
  ],
  stack: [
    'Electron',
    'React / TypeScript',
    'IPC (Context Bridge)',
    '미디어 파이프라인',
    'WebGL / WebGPU',
    '로컬 DB',
  ],
  sections: [
    {
      heading: '계층 구조',
      body:
        'Electron 앱을 UI(Renderer) · 백엔드(Main) · 디바이스 헬퍼로 분리하고, 각 계층은 화이트리스트 기반의 안전한 IPC 경계로만 통신하도록 설계했다.\n\n- **Renderer (UI)** — 재사용 가능한 컴포넌트 계층으로 화면을 구성하고, 카메라 스트림과 미리보기 효과를 후처리 파이프라인에서 처리\n- **Preload (Context Bridge)** — 검증된 IPC 헬퍼만 렌더러에 노출해 권한을 최소화 (채널 화이트리스트 + 인자 검증)\n- **Main (백엔드)** — 미디어 작업·디바이스 제어·외부 연동·로컬 저장을 담당',
    },
    {
      heading: '미디어 · 디바이스 처리',
      body:
        '멀티 카메라 프리뷰·스틸 캡처·장기 녹화를 미디어 파이프라인으로 처리하고, 카메라 장치 식별과 권한 변경을 한 곳에서 일관되게 관리했다.\n\n- **멱등 처리** — 캡처·요청 명령에 고유 키를 부여해 중복 실행을 방지\n- **오프라인 무결성** — 세션·미디어·처리 기록을 로컬 DB에 저장해 네트워크 단절에도 데이터를 잃지 않도록 설계\n- **디바이스 추상화** — 운영체제별 카메라 장치 차이를 흡수해 동일한 인터페이스로 노출',
    },
    {
      heading: '외부 연동',
      body:
        '외부 AI 연동은 전처리 · 업로드 · 요청 · 결과 수집의 단계로 분리하고, 공급자 교체가 나머지 코드에 파급되지 않도록 연동 계층을 격리했다. 결과는 로컬에 저장한 뒤 화면 상태로 반영한다.',
    },
  ],
}
