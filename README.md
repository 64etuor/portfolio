# portfolio — 박양하 3D 포트폴리오

Vite + React 19 + React Three Fiber 로 만든 3D 개인 포트폴리오.
이력서는 **JSON Resume 표준**(`src/data/resume.json`)으로 관리하고, 사이트의 Resume
섹션이 그 데이터를 그대로 렌더링한다. PDF/PPTX 내보내기는 자매 레포 `../deckforge`
(HTML→PDF/PPTX 툴킷)로 처리한다.

## 스택

| 영역 | 라이브러리 |
|------|-----------|
| 빌드 | Vite 8 (Rolldown) + TypeScript |
| UI | React 19 |
| 3D | three · @react-three/fiber · @react-three/drei · @react-three/postprocessing |
| 애니메이션 | motion (Framer Motion) · GSAP · @gsap/react |
| 스크롤 | lenis (부드러운 스크롤) |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| 아이콘 | lucide-react |
| 폰트 | Pretendard · Cormorant Garamond (Fontsource 셀프호스팅) |
| 디버그 | leva |
| 이력서 | JSON Resume (`@jsonresume/schema` 검증) |

## 실행

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버
npm run build      # 타입체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # 타입 검사만
npm run validate:resume   # resume.json 을 JSON Resume 스키마로 검증
```

## 구조

```
src/
  main.tsx           진입점 (폰트/CSS import)
  App.tsx            Lenis 스크롤 + 고정 3D 배경 + 섹션 조합
  index.css          Tailwind v4 + @theme 디자인 토큰
  three/
    Experience.tsx   R3F Canvas — 금속 토러스 노트 + Bloom 포스트프로세싱
  components/
    Nav.tsx
  sections/
    Hero.tsx · About.tsx · Resume.tsx · Contact.tsx
  data/
    resume.json      ← 이력서 원본 (JSON Resume 표준)
    resume.ts        타입 + 로더
  lib/utils.ts       cn() (shadcn 호환)
scripts/
  validate-resume.mjs
```

## 이력서 워크플로우

1. `src/data/resume.json` 만 수정한다 (JSON Resume 스키마).
2. `npm run validate:resume` 로 검증.
3. 사이트 Resume 섹션이 자동 반영된다.
4. PDF/PPTX 가 필요하면 `../deckforge` 로 HTML 을 렌더링해 내보낸다.

## 메모 / 다음 단계

- 현재 3D 배경의 `Environment preset="city"` 는 런타임에 HDRI 를 네트워크에서
  받는다. 완전 오프라인이 필요하면 로컬 `.hdr` 파일로 교체할 것.
- JS 번들이 ~1.35MB (three.js 포함). 필요시 `<Canvas>` 를 `React.lazy` 로
  코드 스플리팅해 초기 로드를 줄일 수 있다.
- shadcn/ui 컴포넌트는 `npx shadcn@latest init` 으로 추가 가능 (cva·tailwind-merge·
  clsx 는 이미 설치됨).
- Tailwind v4 는 `@tailwindcss/postcss`(PostCSS) 로 처리한다. Vite 8/rolldown 에서
  `@tailwindcss/vite` 플러그인이 변환을 누락하는 이슈가 있어 PostCSS 경로를 쓴다.
