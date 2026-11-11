// 제목 세리프의 한글(Noto Serif KR 600) — 이 세그먼트에서만 쓰므로 전역(app/fonts.ts)이 아니라 여기서 로드.
// 라틴은 전역 Playfair Display(--font-display)를 쓴다(Cormorant Garamond 는 제거 — 세리프는 하나).
import '@fontsource/noto-serif-kr/600.css'
import '../projects.css'

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children
}
