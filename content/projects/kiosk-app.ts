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
    role: 'SW 아키텍처 설계 · 프로세스 구조, 카메라·미디어 처리, 외부 AI 연동',
  },
  summary:
    '뷰티 매장에서 쓰는 Electron 기반 키오스크의 소프트웨어 구조를 설계했다. 화면·백엔드·장치 제어를 별도 프로세스로 나누고, 허용된 통신만 오가게 했다. 여러 카메라의 촬영·녹화와 외부 AI 연동을, 중복 실행 없이 네트워크가 끊겨도 데이터를 잃지 않게 처리한다.',
  metrics: [
    { label: '구조', value: '프로세스 분리', note: '화면 · 백엔드 · 장치 제어' },
    { label: '신뢰성', value: '중복 실행 차단', note: '촬영·요청마다 고유 키 부여' },
    { label: '오프라인', value: '로컬 저장', note: '네트워크가 끊겨도 데이터 유지' },
    { label: '미디어', value: '멀티 카메라', note: '촬영 · 녹화 · 장치 제어' },
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
      heading: '구조',
      body:
        '앱을 화면, 백엔드, 장치 제어로 나누고 미리 허용한 통로로만 통신하게 했다.\n\n- **화면** — 재사용 가능한 컴포넌트로 구성하고 카메라 미리보기·효과를 처리\n- **중간 연결층** — 검증된 기능만 화면에 노출해 권한을 최소화\n- **백엔드** — 미디어 처리·장치 제어·외부 연동·로컬 저장을 담당',
    },
    {
      heading: '카메라·미디어 처리',
      body:
        '여러 카메라의 미리보기·사진 촬영·장시간 녹화를 하나의 처리 흐름으로 다룬다.\n\n- 촬영·요청마다 고유 키를 붙여 **중복 실행을 방지**\n- 세션·사진·처리 기록을 로컬 DB에 저장해 **네트워크가 끊겨도 데이터 유지**\n- 운영체제별 카메라 차이를 감춰 **같은 방식으로 제어**',
    },
    {
      heading: '외부 AI 연동',
      body:
        '외부 AI 분석을 단계별로 나누고 나머지 코드와 분리했다.\n\n- 전처리 → 업로드 → 요청 → 결과 수집을 **단계별로 분리**\n- 공급자를 바꿔도 **다른 코드에 영향이 없도록** 연동 부분을 격리\n- 결과는 로컬에 먼저 저장한 뒤 화면에 반영',
    },
  ],
}
