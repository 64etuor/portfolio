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
    'Electron 기반 살롱 키오스크의 소프트웨어 아키텍처. Renderer(UI) · Main(Electron backend) · Python helper의 3계층을 IPC로 연결하고, 멀티 카메라 캡처·녹화·외부 AI 시뮬레이션을 멱등성과 오프라인 무결성을 지키며 처리하도록 설계했다.',
  metrics: [
    { label: '아키텍처', value: 'IPC 다중 프로세스', note: 'Renderer / Main / Python' },
    { label: 'UI 구성', value: 'Atomic Design', note: 'atom·molecule·organism·page' },
    { label: '멱등성', value: 'ULID + LRU', note: '중복 캡처/시뮬레이션 명령 방지' },
    { label: '로컬 저장', value: 'SQLite (WAL)', note: '오프라인 환경 무결성 유지' },
    { label: '미디어', value: 'FFmpeg · GStreamer · V4L2', note: '캡처·녹화·장치 제어' },
  ],
  stack: [
    'Electron',
    'React / TypeScript',
    'Zustand (store)',
    'Context Bridge (preload)',
    'Python (v4l2-ctl)',
    'FFmpeg / GStreamer',
    'WebGL / WebGPU',
    'SQLite (WAL)',
  ],
  sections: [
    {
      heading: '계층 구조',
      body:
        'Electron 앱을 세 계층으로 분리하고, 각 계층은 안전한 IPC 브릿지로만 통신한다.\n\n- **Renderer (UI)** — Atomic Design으로 구성. `CameraStream.atom` → `CameraController.molecule` → `CameraOverlay.organism` → `Home.page`. 상태는 `useCamera` / `useCapture` / `useSimulation` 스토어로 관리하고, `getUserMedia` 스트림을 WebGL/WebGPU 후처리 파이프라인에 전달\n- **Preload (Context Bridge)** — `window.KioskBridge` 네임스페이스에 IPC 헬퍼를 노출하되 채널 화이트리스트와 인자 검증으로 보안 확보 (`Camera.list()`, `Capture.trigger()`, `Simulation.request()`)\n- **Main (Electron backend)** — 핸들러·서비스·DB가 실제 미디어 작업과 외부 연동을 수행\n- **Python Helper** — Linux에서 `v4l2-ctl`로 장치 목록/컨트롤을 추출하고, 미지원 환경은 `ffmpeg avfoundation` / `system_profiler`로 대체',
    },
    {
      heading: '메인 프로세스 설계',
      body:
        '메인 프로세스는 명령의 신뢰성과 장치 일관성을 책임진다.\n\n- **IpcManager** — `withIdempotency` 래퍼가 ULID 기반 멱등성을 LRU 캐시로 보장해, 캡처·시뮬레이션·녹화 같은 중복 명령을 방지\n- **DeviceRegistry** — `/dev/video*` ↔ 브라우저 `mediaDeviceId`를 한 곳에서 매칭. 권한 변경 시 목록을 재배포\n- **핸들러** — `CameraHandler`(Python 호출) · `CaptureHandler`(FFmpeg 스틸+썸네일+DB) · `RecordHandler`(장기 녹화 세션) · `SimulationHandler`(외부 AI 요청 준비·결과 수집)\n- **서비스** — `ServiceRegistry`가 `FFmpegService` · `CameraService` · `ExternalApiClient` · `AssetUploader` 등을 싱글턴으로 관리\n- **DB** — SQLite(WAL)에 세션·미디어·업로드 큐·시뮬레이션 기록을 저장해 오프라인에서도 무결성 유지',
    },
    {
      heading: '데이터 흐름',
      body:
        '카메라 장치부터 AI 시뮬레이션까지의 처리 흐름:\n\n- **장치 동기화** — Renderer가 `Camera.list` 호출 → `CameraService`가 장치 수집 → `DeviceRegistry`가 `/dev/video*` ↔ `mediaDeviceId` 매칭 후 목록 전달\n- **프리뷰** — 선택 장치로 `getUserMedia`, WebGL/WebGPU 파이프라인에서 미리보기 효과 적용 (메인 결과와 파라미터 동기화)\n- **스틸 캡처** — `Capture.trigger` → FFmpeg 고품질 캡처 → 썸네일·DB 갱신 → 완료 이벤트 브로드캐스트\n- **녹화** — `RecordHandler`가 `MediaPipeline`(FFmpeg/GStreamer)으로 세션 관리, 진행/완료 이벤트 전송\n- **AI 시뮬레이션** — FFmpeg 전처리 → `AssetUploader`로 업로드 → 외부 헤어/염색 시뮬레이션 API 호출 → 결과를 DB/CDN에 저장 후 스토어 업데이트\n\n외부 AI 공급자는 언제든 교체될 수 있으므로 엔드포인트·인증 정보를 `ExternalApiClient`에 격리해, 공급자 변경이 나머지 코드에 파급되지 않게 했다.',
    },
  ],
}
